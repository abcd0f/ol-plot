import Map from 'ol/Map';
import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import Style, { type StyleFunction, type StyleLike } from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import type {
  AlarmPointStyleConfig,
  InternalPlotConfig,
  ImageConfig,
  ImagePointConfig,
  ResolvedPlotConfig,
} from '../../kernel/types/config';
import type { PlotFeatureData, PlotRestoreOptions, PlotDrawType } from '../../kernel/types/data';
import { DrawType } from '../../kernel/constants/drawType';
import { ToolState } from '../../kernel/constants/toolState';
import { DrawEvent } from '../../kernel/constants/events';
import { mergeConfig, mergeRuntimeConfig } from '../../kernel/constants';
import { buildFeatureStyle } from '../../shared-style/feature';
import { buildDrawStyle } from '../../shared-style/draw';
import { buildSelectStyle } from '../../shared-style/select';
import { buildModifyStyle } from '../../shared-style/modify';
import { buildFlowLineStyle } from '../../plots/flowLine/style';
import { EventBus } from './EventBus';
import { FeatureStore } from './FeatureStore';
import { SelectManager } from '../interactions/SelectManager';
import { ModifyManager } from '../interactions/ModifyManager';
import { CursorManager } from '../interactions/CursorManager';
import { PlotRuntime } from './PlotRuntime';
import { HandleManager } from '../../shared-runtime-helpers/handle';
import { MeasureManager } from '../../plots/measure/measure';
import { AreaMeasureManager } from '../../plots/areaMeasure/areaMeasure';
import { AzimuthManager } from '../../plots/azimuth/azimuth';
import {
  buildStyleFromData,
  getFeatureStyleData,
  projectPlotDataCoordinates,
  resolveStyleData,
  serializeFeature,
  setFeatureStyleData,
} from '../../kernel/utils/data';
import { buildImagePointStyle, mergeImageConfig, resolveImageConfig } from '../../plots/imagePoint/style';
import { buildAlarmPointStyle, resolveAlarmPointConfig } from '../../plots/alarmPoint/style';
import { buildRangeRingsStyle } from '../../plots/rangeRings/style';
import { PlotAnimator } from '../../shared-runtime-helpers/animator';
import { DRAW_TYPE_BY_PLOT_TYPE, HANDLE_PLOT_TYPES, PLOT_DEFS, PLOT_TYPE_BY_DRAW_TYPE } from '../../plots/registry';

const DRAW_TYPE_PROPERTY = '_drawType';
export type PlotManagerConfig = InternalPlotConfig & Pick<ImagePointConfig, 'image'>;

/** 统一管理多种标绘工具的绘制、编辑和数据持久化。 */
export class PlotManager {
  protected map: Map;
  protected config: ResolvedPlotConfig;
  protected eventBus: EventBus;
  protected layerManager: FeatureStore;
  protected selectManager: SelectManager;
  protected modifyManager: ModifyManager;
  protected cursorManager: CursorManager;
  protected runtime: PlotRuntime;
  protected handleManager: HandleManager;
  protected measureManager: MeasureManager;
  protected areaMeasureManager: AreaMeasureManager;
  protected azimuthManager: AzimuthManager;
  protected activeFeature: Feature | null = null;
  protected activeDrawType: DrawType | null = null;
  protected state: ToolState = ToolState.Idle;

  private eventWrappers = new globalThis.Map<
    string,
    globalThis.Map<(...args: any[]) => void, (...args: any[]) => void>
  >();
  private readonly animator = new PlotAnimator();
  private phase = 0;
  private flowElapsedTime = 0;
  private alarmFrameElapsed = 0;
  private imageConfig: ImageConfig;
  private activeDrawStyle: StyleFunction = () => undefined;
  private featureStyleCache = new globalThis.Map<DrawType, StyleLike>();
  private selectStyleCache = new globalThis.Map<DrawType, StyleFunction>();
  private modifyStyleCache = new globalThis.Map<DrawType, Style[]>();

  constructor(map: Map, config?: PlotManagerConfig) {
    this.map = map;
    this.config = mergeConfig(config);
    this.imageConfig = resolveImageConfig(config?.image);
    this.activeDrawStyle = buildDrawStyle(this.config);
    this.runtime = new PlotRuntime({
      map,
      config: this.config,
      featureStyle: this.createLayerStyle(),
      drawStyle: (feature, resolution) => this.activeDrawStyle(feature, resolution),
      prepareDrawnFeature: (feature, drawType) => {
        this.prepareFeature(feature, drawType);
        if (drawType === DrawType.FlowLine || drawType === DrawType.AlarmPoint) this.ensureAnimation();
      },
      onActiveFeatureChange: (feature) => {
        this.activeFeature = feature;
      },
      onStateChange: (state) => {
        this.state = state;
      },
      onDrawTypeChange: (drawType) => {
        this.activeDrawType = drawType;
      },
    });
    this.eventBus = this.runtime.eventBus;
    this.layerManager = this.runtime.layerManager;
    this.selectManager = this.runtime.selectManager;
    this.modifyManager = this.runtime.modifyManager;
    this.cursorManager = this.runtime.cursorManager;
    this.selectManager.setStyle(this.createSelectStyle());
    this.modifyManager.setStyle(this.createModifyStyle());

    this.handleManager = new HandleManager(map, this.eventBus, this.config, (controlPoints) =>
      this.runtime.editorController.updateControlPoints(controlPoints),
    );
    this.runtime.configureHandleEditor({
      interaction: this.handleManager.handleModify,
      layer: this.handleManager.handleLayer,
      getEditMode: (feature) => (this.isFeatureHandleBased(feature) ? 'handles' : 'feature'),
      getControlPoints: (feature) => this.extractCoordinates(feature),
      updateControlPoints: (_feature, controlPoints) => this.syncHandleGeometry(controlPoints),
      show: (controlPoints, feature) => {
        const styleData = getFeatureStyleData(feature);
        if (styleData) this.handleManager.setStyleConfig(mergeRuntimeConfig(this.config, styleData));
        else this.handleManager.setStyleConfig(this.config);
        this.handleManager.show(controlPoints);
      },
      hide: () => this.handleManager.hide(),
      destroy: () => this.handleManager.destroy(),
    });
    this.measureManager = new MeasureManager(
      map,
      this.eventBus,
      this.config,
      (feature, drawType) => this.getFeatureDrawType(feature, drawType) === DrawType.Measure,
    );
    this.areaMeasureManager = new AreaMeasureManager(
      map,
      this.eventBus,
      this.config,
      (feature, drawType) => this.getFeatureDrawType(feature, drawType) === DrawType.AreaMeasure,
    );
    this.azimuthManager = new AzimuthManager(
      map,
      this.eventBus,
      this.config,
      (feature, drawType) => this.getFeatureDrawType(feature, drawType) === DrawType.Azimuth,
    );

    this.bindManagerEvents();
  }

  /** 设置当前绘制工具，传入 null 可停止绘制。 */
  setActiveTool(drawType: PlotDrawType | null): this {
    this.activeDrawType = drawType ? this.normalizeDrawType(drawType) : null;
    this.activeDrawStyle = buildDrawStyle(this.config);
    this.runtime.setDrawTool(
      this.activeDrawType,
      this.activeDrawType ? (feature, resolution) => this.activeDrawStyle(feature, resolution) : undefined,
    );

    return this;
  }

  /** 获取当前绘制工具。 */
  getActiveTool(): DrawType | null {
    return this.activeDrawType;
  }

  /** 获取管理器状态。 */
  getState(): ToolState {
    return this.state;
  }

  /** 更新当前活动要素的样式配置。 */
  setStyleConfig(config?: PlotManagerConfig): this {
    if (!this.activeFeature || !config) return this;

    const drawType = this.getFeatureDrawType(this.activeFeature);
    if (!drawType) return this;

    const currentStyle = getFeatureStyleData(this.activeFeature);
    const baseConfig = currentStyle ? mergeRuntimeConfig(this.config, currentStyle) : this.config;
    const styleData = resolveStyleData(
      baseConfig,
      config,
      drawType === DrawType.FlowLine,
      drawType === DrawType.AlarmPoint,
    );
    if (drawType === DrawType.ImagePoint && config.image) {
      this.imageConfig = mergeImageConfig(this.imageConfig, config.image);
      styleData.image = { ...this.imageConfig };
    }
    if (drawType === DrawType.AlarmPoint && config.alarm) {
      styleData.alarm = { ...mergeAlarmPointConfig(this.config.alarm, config.alarm) };
    }
    if (
      drawType === DrawType.RangeRings &&
      config.rangeRings &&
      (config.rangeRings.spacing !== undefined || config.rangeRings.unit !== undefined)
    ) {
      this.activeFeature.set(
        'rangeRingsSpacing',
        config.rangeRings.spacing ?? this.activeFeature.get('rangeRingsSpacing') ?? this.config.rangeRings.spacing,
      );
      this.activeFeature.set(
        'rangeRingsUnit',
        config.rangeRings.unit ?? this.activeFeature.get('rangeRingsUnit') ?? this.config.rangeRings.unit,
      );
      this.updateFeatureGeometry(this.activeFeature, drawType, this.extractCoordinates(this.activeFeature));
    }

    setFeatureStyleData(this.activeFeature, styleData);
    this.selectManager.setStyle(null);
    if (drawType === DrawType.FlowLine) {
      this.activeFeature.setStyle(undefined);
      this.updateAnimationState();
    } else if (drawType === DrawType.RangeRings) {
      this.activeFeature.setStyle(buildRangeRingsStyle(mergeRuntimeConfig(this.config, styleData)));
    } else {
      this.activeFeature.setStyle(buildStyleFromData(styleData));
    }
    if (HANDLE_PLOT_TYPES.has(this.getPlotType(drawType))) {
      this.handleManager.setStyleConfig(mergeRuntimeConfig(this.config, styleData));
    }
    if (drawType === DrawType.Azimuth) this.azimuthManager.setStyleConfig(mergeRuntimeConfig(this.config, styleData));

    this.selectManager.setStyle(this.createSelectStyle());
    this.modifyManager.setStyle(this.createModifyStyle());
    this.activeFeature.changed();
    this.layerManager.getLayer().changed();
    this.updateAnimationState();
    return this;
  }

  /** 获取全部标绘要素。 */
  getFeatures(): Feature[] {
    return this.layerManager.getFeatures();
  }

  /** 序列化指定要素。 */
  getFeatureData(feature: Feature): PlotFeatureData {
    const drawType = this.getFeatureDrawType(feature) ?? this.activeDrawType ?? DrawType.Line;
    const data = serializeFeature(feature, drawType, this.config, this.map.getView().getProjection());
    const imageConfig = this.getImageConfig();
    if (drawType === DrawType.ImagePoint && !data.style.image && (imageConfig.src || imageConfig.label?.text)) {
      data.style = {
        ...data.style,
        image: {
          ...imageConfig,
          label: imageConfig.label ? { ...imageConfig.label } : undefined,
        },
      };
    }
    return data;
  }

  /** 序列化全部标绘要素。 */
  getPlotData(): PlotFeatureData[] {
    return this.getFeatures().map((feature) => this.getFeatureData(feature));
  }

  /** 获取结构化标绘数据。 */
  getStructuredData(): PlotFeatureData[] {
    return this.getPlotData();
  }

  /** 从序列化数据恢复要素。 */
  restorePlotData(data: PlotFeatureData | PlotFeatureData[], options: PlotRestoreOptions = {}): Feature[] {
    if (options.clear) this.clearFeatures();

    const list = Array.isArray(data) ? data : [data];
    return list.map((item) => {
      const drawType = this.normalizeDrawType(item.type);
      const projectedItem = projectPlotDataCoordinates(item, this.map.getView().getProjection());
      const feature = this.createFeature(drawType, projectedItem.controlPoints ?? projectedItem.coordinates);
      if (item.id !== undefined) feature.setId(item.id);
      if (item.rangeRingsSpacing) feature.set('rangeRingsSpacing', item.rangeRingsSpacing);
      if (item.rangeRingsUnit) feature.set('rangeRingsUnit', item.rangeRingsUnit);
      Object.entries(item.properties ?? {}).forEach(([key, value]) => feature.set(key, value));
      if (drawType === DrawType.RangeRings) {
        this.updateFeatureGeometry(feature, drawType, projectedItem.controlPoints ?? projectedItem.coordinates);
      }
      if (item.plotType) feature.set('plotType', item.plotType);
      if (projectedItem.controlPoints) {
        feature.set(
          'controlPoints',
          projectedItem.controlPoints.map((point) => [...point]),
        );
      }
      if (item.style) {
        setFeatureStyleData(feature, item.style);
        if (options.applyStyle !== false && drawType === DrawType.AlarmPoint && item.style.alarm) {
          feature.setStyle(buildStyleFromData(item.style));
        } else if (options.applyStyle !== false && drawType === DrawType.RangeRings) {
          feature.setStyle(buildRangeRingsStyle(mergeRuntimeConfig(this.config, item.style)));
        } else if (
          options.applyStyle !== false &&
          drawType === DrawType.ImagePoint &&
          (item.style.image?.src || item.style.image?.label?.text)
        ) {
          feature.setStyle(this.createImageStyle(item.style.image));
        } else if (
          options.applyStyle !== false &&
          drawType !== DrawType.FlowLine &&
          drawType !== DrawType.ImagePoint &&
          drawType !== DrawType.AlarmPoint
        ) {
          feature.setStyle(buildStyleFromData(item.style));
        }
      }
      this.attachFeatureRuntime(feature, drawType);
      return feature;
    });
  }

  /** restorePlotData 的别名。 */
  loadPlotData(data: PlotFeatureData | PlotFeatureData[], options: PlotRestoreOptions = {}): Feature[] {
    return this.restorePlotData(data, options);
  }

  /** 清空全部标绘要素。 */
  clearFeatures(): this {
    this.measureManager.clear();
    this.areaMeasureManager.clear();
    this.azimuthManager.clear();
    this.runtime.clearFeatures();
    this.stopAnimation();
    return this;
  }

  /** 销毁管理器及其交互。 */
  destroy(): void {
    this.stopAnimation();
    this.measureManager.destroy();
    this.areaMeasureManager.destroy();
    this.azimuthManager.destroy();
    this.runtime.destroy();
    this.eventWrappers.clear();
    this.activeDrawType = null;
  }

  /** 订阅标绘事件。 */
  on(event: string, handler: (...args: any[]) => void): this {
    const wrapper = (...args: any[]) => handler(...args.map((arg) => this.withStructuredData(arg)));
    if (!this.eventWrappers.has(event)) this.eventWrappers.set(event, new globalThis.Map());
    this.eventWrappers.get(event)!.set(handler, wrapper);
    this.eventBus.on(event, wrapper);
    return this;
  }

  /** 取消订阅标绘事件。 */
  off(event: string, handler: (...args: any[]) => void): this {
    const wrapper = this.eventWrappers.get(event)?.get(handler);
    this.eventBus.off(event, wrapper ?? handler);
    this.eventWrappers.get(event)?.delete(handler);
    return this;
  }

  /** 设置当前活动要素的控制点。 */
  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature) return;
    const drawType = this.getFeatureDrawType(this.activeFeature);
    if (!drawType) return;
    this.updateFeatureGeometry(this.activeFeature, drawType, coordinates);
  }

  /** 获取当前活动要素的控制点。 */
  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return this.extractCoordinates(this.activeFeature);
  }

  /** 获取当前活动要素的控制点数量。 */
  getPointCount(): number {
    return this.getCoordinates().length;
  }

  /** 更新指定控制点。 */
  updatePoint(index: number, coordinate: number[]): void {
    const coords = this.getCoordinates();
    if (index < 0 || index >= coords.length) return;

    const drawType = this.activeFeature ? this.getFeatureDrawType(this.activeFeature) : null;
    if (
      (drawType === DrawType.Polygon || drawType === DrawType.FreehandPolygon || drawType === DrawType.AreaMeasure) &&
      index >= coords.length - 1
    )
      return;

    coords[index] = coordinate;
    if (
      (drawType === DrawType.Polygon || drawType === DrawType.FreehandPolygon || drawType === DrawType.AreaMeasure) &&
      index === 0 &&
      coords.length > 1
    ) {
      coords[coords.length - 1] = coordinate;
    }
    this.setCoordinates(coords);
  }

  /** 更新图片点全局配置。 */
  updateImageConfig(imageConfig: ImagePointConfig['image']): void {
    if (!imageConfig) return;

    this.mergeImageConfig(imageConfig);
    this.invalidateStyleCache(DrawType.ImagePoint);
    this.layerManager.getLayer().changed();
  }

  /** 更新告警点全局配置。 */
  updateAlarmConfig(alarmConfig: AlarmPointStyleConfig): void {
    if (!alarmConfig) return;

    this.config = mergeRuntimeConfig(this.config, { alarm: alarmConfig });
    this.invalidateStyleCache(DrawType.AlarmPoint);
    this.updateAnimationState();
    this.layerManager.getLayer().changed();
  }

  private bindManagerEvents(): void {
    this.eventBus.on(DrawEvent.DELETE, () => this.updateAnimationState());
  }

  private createFeature(drawType: DrawType, coordinates: number[][]): Feature {
    const feature = new Feature({ geometry: this.createGeometry(drawType, coordinates) });
    this.prepareFeature(feature, drawType, coordinates);
    this.layerManager.appendFeature(feature);
    return feature;
  }

  private prepareFeature(feature: Feature, drawType: DrawType, coordinates?: number[][]): void {
    feature.set(DRAW_TYPE_PROPERTY, drawType);
    feature.set('plotType', this.getPlotType(drawType));
    if (drawType === DrawType.RangeRings) {
      feature.set('rangeRingsSpacing', this.config.rangeRings.spacing);
      feature.set('rangeRingsUnit', this.config.rangeRings.unit);
    }

    const geom = feature.getGeometry();
    const controlPoints = coordinates ?? this.extractControlPoints(drawType, geom);
    if (controlPoints.length > 0) {
      const normalized = this.normalizeControlPoints(drawType, controlPoints);
      feature.set('controlPoints', normalized);
      geom?.set('_controlPoints', normalized);
    }
  }

  private createGeometry(drawType: DrawType, coordinates: number[][]): Geometry {
    return PLOT_DEFS[drawType].build(coordinates, {
      config: this.config,
      projection: this.map.getView().getProjection(),
    });
  }

  private updateFeatureGeometry(feature: Feature, drawType: DrawType, coordinates: number[][]): void {
    const geometry = feature.getGeometry();
    if (!geometry) return;

    const definition = PLOT_DEFS[drawType];
    const points = this.normalizeControlPoints(drawType, coordinates);
    definition.update(geometry, points, {
      config: this.config,
      projection: this.map.getView().getProjection(),
      feature,
    });
    feature.set('controlPoints', points);
    geometry.set('_controlPoints', points);
    if (definition.editMode === 'handles') this.handleManager.refresh(points);
    this.updateAnimationState();
  }

  private syncHandleGeometry(controlPoints: number[][]): void {
    if (!this.activeFeature) return;
    const drawType = this.getFeatureDrawType(this.activeFeature);
    const geom = this.activeFeature.getGeometry();
    if (!drawType || !geom) return;

    this.updateFeatureGeometry(this.activeFeature, drawType, controlPoints);
  }

  private attachFeatureRuntime(feature: Feature, drawType: DrawType): void {
    if (drawType === DrawType.Measure) this.measureManager.attachFeature(feature);
    if (drawType === DrawType.AreaMeasure) this.areaMeasureManager.attachFeature(feature);
    if (drawType === DrawType.Azimuth) this.azimuthManager.attachFeature(feature);
    if (drawType === DrawType.FlowLine || drawType === DrawType.AlarmPoint) this.ensureAnimation();
  }

  private extractCoordinates(feature: Feature): number[][] {
    const drawType = this.getFeatureDrawType(feature);
    const controlPoints = feature.get('controlPoints') as number[][] | undefined;
    if (controlPoints) return controlPoints;

    const geom = feature.getGeometry();
    if (!geom) return [];

    if (drawType) return this.extractControlPoints(drawType, geom);
    return [];
  }

  private extractControlPoints(drawType: DrawType, geometry: Geometry | undefined): number[][] {
    return geometry ? PLOT_DEFS[drawType].extract(geometry) : [];
  }

  private normalizeControlPoints(drawType: DrawType, controlPoints: number[][]): number[][] {
    return PLOT_DEFS[drawType].normalize?.(controlPoints) ?? controlPoints;
  }

  private createLayerStyle(): StyleFunction {
    return (feature, resolution) => {
      const drawType = this.getFeatureDrawType(feature as Feature) ?? DrawType.Line;
      return this.renderStyle(this.getFeatureStyle(drawType), feature, resolution);
    };
  }

  private createSelectStyle(): StyleFunction {
    return (feature, resolution) => {
      const drawType = this.getFeatureDrawType(feature as Feature) ?? DrawType.Line;
      if (drawType === DrawType.FlowLine) {
        const flowStyles = this.renderStyle(this.getFeatureStyle(drawType), feature, resolution);
        const list = Array.isArray(flowStyles) ? flowStyles : flowStyles ? [flowStyles] : [];
        const selectStyles = this.getSelectStyle(drawType)(feature, resolution);
        const selectList = Array.isArray(selectStyles) ? selectStyles : selectStyles ? [selectStyles] : [];
        return [...list, ...selectList];
      }
      if (drawType === DrawType.ImagePoint || drawType === DrawType.AlarmPoint) {
        const styleData = getFeatureStyleData(feature as Feature);
        if (styleData) return buildStyleFromData(styleData);
        return this.renderStyle(this.getFeatureStyle(drawType), feature, resolution);
      }
      return this.getSelectStyle(drawType)(feature, resolution);
    };
  }

  private createModifyStyle(): StyleFunction {
    return (feature) => {
      const drawType = this.activeFeature
        ? this.getFeatureDrawType(this.activeFeature)
        : this.getFeatureDrawType(feature as Feature);
      return this.getModifyStyle(drawType ?? DrawType.Line);
    };
  }

  private getFeatureStyle(drawType: DrawType): StyleLike {
    const cached = this.featureStyleCache.get(drawType);
    if (cached) return cached;

    const config = this.config;
    let style: StyleLike;
    if (drawType === DrawType.FlowLine) {
      style = buildFlowLineStyle(config, (feature) => this.getFlowPhase(feature));
    } else if (drawType === DrawType.Point) {
      style = this.createPointStyle(config);
    } else if (drawType === DrawType.AlarmPoint) {
      style = this.createAlarmStyle(config.alarm);
    } else if (drawType === DrawType.ImagePoint) {
      style = this.createImageStyle(this.getImageConfig());
    } else if (drawType === DrawType.RangeRings) {
      style = buildRangeRingsStyle(config);
    } else {
      style = buildFeatureStyle(config);
    }

    this.featureStyleCache.set(drawType, style);
    return style;
  }

  private getSelectStyle(drawType: DrawType): StyleFunction {
    const cached = this.selectStyleCache.get(drawType);
    if (cached) return cached;

    const style = buildSelectStyle(this.config);
    this.selectStyleCache.set(drawType, style);
    return style;
  }

  private getModifyStyle(drawType: DrawType): Style[] {
    const cached = this.modifyStyleCache.get(drawType);
    if (cached) return cached;

    const style = buildModifyStyle(this.config);
    this.modifyStyleCache.set(drawType, style);
    return style;
  }

  private createPointStyle(config: ResolvedPlotConfig): Style {
    const ns = config.nodeStyle;
    return new Style({
      image: new CircleStyle({
        radius: ns.radius ?? 6,
        fill: new Fill({ color: ns.fill ?? '#ffffff' }),
        stroke: new Stroke({
          color: ns.stroke ?? config.strokeColor,
          width: ns.strokeWidth ?? 2,
        }),
      }),
    });
  }

  private createImageStyle(imageConfig: ImageConfig): Style {
    return buildImagePointStyle(imageConfig, this.config.nodeStyle, this.config.strokeColor);
  }

  private createAlarmStyle(alarmConfig: AlarmPointStyleConfig): Style {
    return buildAlarmPointStyle(alarmConfig, this.config.nodeStyle, this.config.strokeColor);
  }

  private renderStyle(style: StyleLike, feature: any, resolution: number): ReturnType<StyleFunction> {
    return typeof style === 'function' ? style(feature, resolution) : style;
  }

  private getImageConfig(): ImageConfig {
    return resolveImageConfig(this.imageConfig);
  }

  private invalidateStyleCache(drawType?: DrawType): void {
    if (!drawType) {
      this.featureStyleCache.clear();
      this.selectStyleCache.clear();
      this.modifyStyleCache.clear();
      return;
    }

    this.featureStyleCache.delete(drawType);
    this.selectStyleCache.delete(drawType);
    this.modifyStyleCache.delete(drawType);
  }

  private mergeImageConfig(imageConfig: ImageConfig): void {
    this.imageConfig = mergeImageConfig(this.imageConfig, imageConfig);
  }

  private ensureAnimation(): void {
    if (!this.hasAnimatedFlowLines() && !this.hasAlarmPoints()) return;
    this.startAnimation();
  }

  private updateAnimationState(): void {
    if (this.hasAnimatedFlowLines() || this.hasAlarmPoints()) {
      this.ensureAnimation();
    } else {
      this.stopAnimation();
    }
  }

  private hasAnimatedFlowLines(): boolean {
    const defaultSpeed = this.config.flowLine.speed ?? 60;
    return this.layerManager
      .getSource()
      .getFeatures()
      .some((feature) => {
        const plotFeature = feature as Feature;
        if (this.getFeatureDrawType(plotFeature) !== DrawType.FlowLine) return false;
        return (getFeatureStyleData(plotFeature)?.flowLine?.speed ?? defaultSpeed) > 0;
      });
  }

  private getFlowPhase(feature: Feature): number {
    const speed = getFeatureStyleData(feature)?.flowLine?.speed;
    if (speed === undefined) return this.phase;
    return (speed * this.flowElapsedTime) / 1000;
  }

  private hasAlarmPoints(): boolean {
    return this.layerManager
      .getSource()
      .getFeatures()
      .some((feature) => this.getFeatureDrawType(feature as Feature) === DrawType.AlarmPoint);
  }

  private getAlarmFrameInterval(): number {
    const defaultFrameRate = resolveAlarmPointConfig(
      this.config.alarm,
      this.config.nodeStyle,
      this.config.strokeColor,
    ).frameRate;
    const frameRate = this.layerManager
      .getSource()
      .getFeatures()
      .reduce((maxFrameRate, feature) => {
        const plotFeature = feature as Feature;
        if (this.getFeatureDrawType(plotFeature) !== DrawType.AlarmPoint) return maxFrameRate;
        const alarmConfig = getFeatureStyleData(plotFeature)?.alarm ?? this.config.alarm;
        const resolved = resolveAlarmPointConfig(alarmConfig, this.config.nodeStyle, this.config.strokeColor);
        return Math.max(maxFrameRate, resolved.frameRate);
      }, defaultFrameRate);

    return 1000 / frameRate;
  }

  private startAnimation(): void {
    this.animator.start(() => this.hasAnimatedFlowLines() || this.hasAlarmPoints(), (delta) => {
      const hasFlowLine = this.hasAnimatedFlowLines();
      const hasAlarmPoint = this.hasAlarmPoints();
      this.alarmFrameElapsed += delta;
      if (hasFlowLine || delta === 0 || (hasAlarmPoint && this.alarmFrameElapsed >= this.getAlarmFrameInterval())) {
        this.alarmFrameElapsed = 0;
        if (hasFlowLine) {
          this.flowElapsedTime += delta;
          this.phase += ((this.config.flowLine.speed ?? 60) * delta) / 1000;
        }
        this.layerManager.getLayer().changed();
        this.map.render();
      }
    });
  }

  private stopAnimation(): void {
    this.animator.stop();
    this.alarmFrameElapsed = 0;
    this.flowElapsedTime = 0;
    this.phase = 0;
  }

  private isFeatureHandleBased(feature: Feature): boolean {
    const plotType = feature.get('plotType') as string | undefined;
    return !!plotType && HANDLE_PLOT_TYPES.has(plotType);
  }

  private getFeatureDrawType(feature: Feature, fallback?: DrawType): DrawType | null {
    return (feature.get(DRAW_TYPE_PROPERTY) as DrawType | undefined) ?? fallback ?? this.getDrawTypeByPlotType(feature);
  }

  private getDrawTypeByPlotType(feature: Feature): DrawType | null {
    const plotType = feature.get('plotType') as string | undefined;
    if (!plotType) return null;

    return DRAW_TYPE_BY_PLOT_TYPE.get(plotType) ?? null;
  }

  private getPlotType(drawType: DrawType): string {
    return PLOT_TYPE_BY_DRAW_TYPE[drawType] ?? drawType;
  }

  private normalizeDrawType(drawType: PlotDrawType): DrawType {
    if (Object.values(DrawType).includes(drawType as DrawType)) return drawType as DrawType;
    throw new Error(`Unsupported draw type: ${drawType}`);
  }

  private withStructuredData(arg: any): any {
    if (!arg || typeof arg !== 'object') return arg;

    if (arg.feature instanceof Feature) {
      return {
        ...arg,
        data: this.getFeatureData(arg.feature),
      };
    }

    if (Array.isArray(arg.features)) {
      return {
        ...arg,
        dataList: arg.features.map((feature: Feature) => this.getFeatureData(feature)),
      };
    }

    return arg;
  }
}

function mergeAlarmPointConfig(
  base: AlarmPointStyleConfig | undefined,
  update: AlarmPointStyleConfig | undefined,
): AlarmPointStyleConfig {
  return {
    ...base,
    ...update,
  };
}
