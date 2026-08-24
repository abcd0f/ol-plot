import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import Circle from 'ol/geom/Circle';
import GeometryCollection from 'ol/geom/GeometryCollection';
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
} from '../types/config';
import type { PlotFeatureData, PlotRestoreOptions, PlotDrawType } from '../types/data';
import { DrawType } from '../constants/drawType';
import { ToolState } from '../constants/toolState';
import { DrawEvent } from '../constants/events';
import { mergeConfig, mergeRuntimeConfig } from '../constants';
import { buildFeatureStyle } from '../style/feature';
import { buildDrawStyle } from '../style/draw';
import { buildSelectStyle } from '../style/select';
import { buildModifyStyle } from '../style/modify';
import { buildFlowLineStyle } from '../style/flowLine';
import { EventBus } from './EventBus';
import { LayerManager } from './LayerManager';
import { SelectManager } from './SelectManager';
import { ModifyManager } from './ModifyManager';
import { DrawManager } from './DrawManager';
import { CursorManager } from './CursorManager';
import { HandleManager } from '../helper/handle';
import { MeasureManager } from '../helper/measure';
import { AreaMeasureManager } from '../helper/areaMeasure';
import { AzimuthMeasureManager } from '../helper/azimuthMeasure';
import { buildRectangle, getRectangleControlPoints } from '../geometry/rectangle';
import { buildEllipse, getEllipseControlPoints } from '../geometry/ellipse';
import { buildSector, getSectorControlPoints, normalizeSectorControlPoints } from '../geometry/sector';
import { buildArc, getArcControlPoints } from '../geometry/arc';
import { buildStraightArrow } from '../geometry/arrow/straight';
import { buildTaperedArrow } from '../geometry/arrow/tapered';
import { buildLineArrowGeometries } from '../geometry/arrow/line';
import { buildDoubleArrow, normalizeDoubleArrowControlPoints } from '../geometry/arrow/double';
import { buildFlagGeometries, getFlagControlPoints, normalizeFlagControlPoints } from '../geometry/flag';
import { dist } from '../utils';
import {
  buildStyleFromData,
  getFeatureStyleData,
  projectPlotDataCoordinates,
  resolveStyleData,
  serializeFeature,
  setFeatureStyleData,
} from '../utils/data';
import { isEditableTarget } from '../utils/keyboard';
import { buildImagePointStyle, mergeImageConfig, resolveImageConfig } from '../style/imagePoint';
import { buildAlarmPointStyle, resolveAlarmPointConfig } from '../style/alarmPoint';

const DRAW_TYPE_PROPERTY = '_drawType';
const HANDLE_PLOT_TYPES = new Set([
  'rectangle',
  'ellipse',
  'sector',
  'straightArrow',
  'taperedArrow',
  'lineArrow',
  'doubleArrow',
  'arc',
  'flag',
]);

export type PlotManagerConfig = InternalPlotConfig & Pick<ImagePointConfig, 'image'>;

export class PlotManager {
  protected map: Map;
  protected config: ResolvedPlotConfig;
  protected eventBus: EventBus;
  protected layerManager: LayerManager;
  protected selectManager: SelectManager;
  protected modifyManager: ModifyManager;
  protected cursorManager: CursorManager;
  protected handleManager: HandleManager;
  protected measureManager: MeasureManager;
  protected areaMeasureManager: AreaMeasureManager;
  protected azimuthMeasureManager: AzimuthMeasureManager;
  protected activeFeature: Feature | null = null;
  protected activeDrawType: DrawType | null = null;
  protected state: ToolState = ToolState.Idle;

  private drawManager: DrawManager | null = null;
  private handleKeyDown: (e: KeyboardEvent) => void;
  private revision = 0;
  private eventWrappers = new globalThis.Map<
    string,
    globalThis.Map<(...args: any[]) => void, (...args: any[]) => void>
  >();
  private animationFrame: number | null = null;
  private phase = 0;
  private flowElapsedTime = 0;
  private lastFrameTime = 0;
  private imageConfig: ImageConfig;
  private activeDrawStyle: StyleFunction = () => undefined;
  private featureStyleCache = new globalThis.Map<DrawType, StyleLike>();
  private selectStyleCache = new globalThis.Map<DrawType, StyleFunction>();
  private modifyStyleCache = new globalThis.Map<DrawType, Style[]>();
  private draggingHandleIndex: number | null = null;

  constructor(map: Map, config?: PlotManagerConfig) {
    this.map = map;
    this.config = mergeConfig(config);
    this.eventBus = new EventBus();

    this.imageConfig = resolveImageConfig(config?.image);

    this.layerManager = new LayerManager(map, this.createLayerStyle());
    this.selectManager = new SelectManager(map, this.layerManager.getLayer(), this.config, this.eventBus);
    this.selectManager.setStyle(this.createSelectStyle());
    this.modifyManager = new ModifyManager(map, this.selectManager.getSelectedFeatures(), this.config, this.eventBus);
    this.modifyManager.setStyle(this.createModifyStyle());
    this.modifyManager.setActive(false);

    this.handleManager = new HandleManager(map, this.eventBus, this.config, (controlPoints) =>
      this.syncHandleGeometry(controlPoints),
    );
    this.handleManager.handleModify.setActive(false);
    this.handleManager.handleModify.on('modifystart', (event) => {
      const feature = event.features.item(0);
      this.draggingHandleIndex = feature?.get('_handleIndex') ?? null;
    });
    this.handleManager.handleModify.on('modifyend', () => {
      if (this.isActiveFeatureHandleBased()) {
        this.eventBus.emit(DrawEvent.MODIFY_END, {
          features: this.activeFeature ? [this.activeFeature] : [],
        });
      }
      this.draggingHandleIndex = null;
    });

    this.cursorManager = new CursorManager(map, () => [this.modifyManager.getOverlayLayer()]);
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
    this.azimuthMeasureManager = new AzimuthMeasureManager(
      map,
      this.eventBus,
      this.config,
      (feature, drawType) => this.getFeatureDrawType(feature, drawType) === DrawType.AzimuthMeasure,
    );

    this.bindEvents();

    this.handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.activeFeature) {
        this.deleteActiveFeature();
      }
    };
    document.addEventListener('keydown', this.handleKeyDown);
  }

  setActiveTool(drawType: PlotDrawType | null): this {
    this.revision += 1;
    this.drawManager?.abortDrawing();
    this.drawManager?.destroy();
    this.drawManager = null;
    this.selectManager.clearSelection();
    this.activeDrawType = drawType ? this.normalizeDrawType(drawType) : null;
    this.state = this.activeDrawType ? ToolState.Drawing : ToolState.Idle;

    if (this.activeDrawType) {
      this.activeDrawStyle = buildDrawStyle(this.config);
      this.drawManager = new DrawManager(
        this.map,
        this.layerManager.getLayer(),
        this.eventBus,
        this.activeDrawType,
        (feature, resolution) => this.activeDrawStyle(feature, resolution),
        () => this.config.continuousDraw || this.config.editOnSelect === false || this.selectManager.isEmpty(),
      );
    }

    return this;
  }

  getActiveTool(): DrawType | null {
    return this.activeDrawType;
  }

  getState(): ToolState {
    return this.state;
  }

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
    if (config.azimuthMeasure) {
      this.config = mergeRuntimeConfig(this.config, { azimuthMeasure: config.azimuthMeasure });
    }
    if (drawType === DrawType.ImagePoint && config.image) {
      this.imageConfig = mergeImageConfig(this.imageConfig, config.image);
      styleData.image = { ...this.imageConfig };
    }
    if (drawType === DrawType.AlarmPoint && config.alarm) {
      styleData.alarm = { ...mergeAlarmPointConfig(this.config.alarm, config.alarm) };
    }

    setFeatureStyleData(this.activeFeature, styleData);
    this.selectManager.setStyle(null);
    if (drawType === DrawType.FlowLine) {
      this.activeFeature.setStyle(undefined);
      this.updateAnimationState();
    } else {
      this.activeFeature.setStyle(buildStyleFromData(styleData));
    }
    if (HANDLE_PLOT_TYPES.has(this.getPlotType(drawType))) {
      this.handleManager.setStyleConfig(mergeRuntimeConfig(this.config, styleData));
    }

    this.selectManager.setStyle(this.createSelectStyle());
    this.modifyManager.setStyle(this.createModifyStyle());
    this.azimuthMeasureManager.setStyleConfig(mergeRuntimeConfig(this.config, config));
    this.activeFeature.changed();
    this.layerManager.getLayer().changed();
    this.updateAnimationState();
    return this;
  }

  getFeatures(): Feature[] {
    return this.layerManager.getFeatures();
  }

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

  getPlotData(): PlotFeatureData[] {
    return this.getFeatures().map((feature) => this.getFeatureData(feature));
  }

  getStructuredData(): PlotFeatureData[] {
    return this.getPlotData();
  }

  restorePlotData(data: PlotFeatureData | PlotFeatureData[], options: PlotRestoreOptions = {}): Feature[] {
    if (options.clear) this.clearFeatures();

    const list = Array.isArray(data) ? data : [data];
    return list.map((item) => {
      const drawType = this.normalizeDrawType(item.type);
      const projectedItem = projectPlotDataCoordinates(item, this.map.getView().getProjection());
      const feature = this.createFeature(drawType, projectedItem.controlPoints ?? projectedItem.coordinates);
      if (item.id !== undefined) feature.setId(item.id);
      Object.entries(item.properties ?? {}).forEach(([key, value]) => feature.set(key, value));
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

  loadPlotData(data: PlotFeatureData | PlotFeatureData[], options: PlotRestoreOptions = {}): Feature[] {
    return this.restorePlotData(data, options);
  }

  clearFeatures(): this {
    this.revision += 1;
    this.drawManager?.abortDrawing();
    this.selectManager.clearSelection();
    this.measureManager.clear();
    this.areaMeasureManager.clear();
    this.azimuthMeasureManager.clear();
    this.activeFeature = null;
    this.handleManager.hide();
    this.handleManager.handleModify.setActive(false);
    this.modifyManager.setActive(false);
    this.cursorManager.setActive(false);
    this.layerManager.clear();
    this.stopAnimation();
    this.state = this.activeDrawType ? ToolState.Drawing : ToolState.Idle;
    return this;
  }

  destroy(): void {
    this.revision += 1;
    document.removeEventListener('keydown', this.handleKeyDown);
    this.stopAnimation();
    this.drawManager?.destroy();
    this.cursorManager.destroy();
    this.handleManager.destroy();
    this.selectManager.destroy();
    this.modifyManager.destroy();
    this.measureManager.destroy();
    this.areaMeasureManager.destroy();
    this.azimuthMeasureManager.destroy();
    this.layerManager.destroy();
    this.eventBus.clear();
    this.eventWrappers.clear();
    this.activeFeature = null;
    this.activeDrawType = null;
    this.state = ToolState.Idle;
  }

  on(event: string, handler: (...args: any[]) => void): this {
    const wrapper = (...args: any[]) => handler(...args.map((arg) => this.withStructuredData(arg)));
    if (!this.eventWrappers.has(event)) this.eventWrappers.set(event, new globalThis.Map());
    this.eventWrappers.get(event)!.set(handler, wrapper);
    this.eventBus.on(event, wrapper);
    return this;
  }

  off(event: string, handler: (...args: any[]) => void): this {
    const wrapper = this.eventWrappers.get(event)?.get(handler);
    this.eventBus.off(event, wrapper ?? handler);
    this.eventWrappers.get(event)?.delete(handler);
    return this;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature) return;
    const drawType = this.getFeatureDrawType(this.activeFeature);
    if (!drawType) return;
    this.updateFeatureGeometry(this.activeFeature, drawType, coordinates);
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return this.extractCoordinates(this.activeFeature);
  }

  getPointCount(): number {
    return this.getCoordinates().length;
  }

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

  updateImageConfig(imageConfig: ImagePointConfig['image']): void {
    if (!imageConfig) return;

    this.mergeImageConfig(imageConfig);
    this.invalidateStyleCache(DrawType.ImagePoint);
    this.layerManager.getLayer().changed();
  }

  updateAlarmConfig(alarmConfig: AlarmPointStyleConfig): void {
    if (!alarmConfig) return;

    this.config = mergeRuntimeConfig(this.config, { alarm: alarmConfig });
    this.invalidateStyleCache(DrawType.AlarmPoint);
    this.updateAnimationState();
    this.layerManager.getLayer().changed();
  }

  private bindEvents(): void {
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature, drawType }: { feature: Feature; drawType: DrawType }) => {
      const revision = this.revision;
      const normalizedType = this.normalizeDrawType(drawType);
      this.prepareFeature(feature, normalizedType);
      if (normalizedType === DrawType.FlowLine || normalizedType === DrawType.AlarmPoint) this.ensureAnimation();

      setTimeout(() => {
        if (revision !== this.revision || !this.layerManager.hasFeature(feature)) return;
        if (this.config.continuousDraw) {
          this.selectManager.clearSelection();
          return;
        }
        this.drawManager?.setActive(false);
        if (!this.config.autoEdit) return;
        this.activeFeature = feature;
        this.selectManager.selectFeature(feature);
      }, 0);
    });

    this.eventBus.on(DrawEvent.SELECT, ({ feature, source }: { feature: Feature; source?: 'user' | 'draw' }) => {
      if (source !== 'draw' && this.config.editOnSelect === false) {
        this.selectManager.clearSelection();
        return;
      }
      this.activeFeature = feature;
      this.state = ToolState.Editing;
      this.syncEditMode(feature);
      this.cursorManager.setActive(true);
    });

    this.eventBus.on(DrawEvent.DESELECT, () => {
      this.activeFeature = null;
      this.state = this.activeDrawType ? ToolState.Drawing : ToolState.Idle;
      this.drawManager?.setActive(true);
      this.handleManager.hide();
      this.handleManager.handleModify.setActive(false);
      this.modifyManager.setActive(false);
      this.cursorManager.setActive(false);
    });

    this.eventBus.on(DrawEvent.DRAW_START, () => {
      if (this.config.editOnSelect === false && !this.selectManager.isEmpty()) this.selectManager.clearSelection();
    });

    this.eventBus.on(DrawEvent.MODIFY_START, () => {
      this.cursorManager.setDragging(true);
    });

    this.eventBus.on(DrawEvent.MODIFY_END, () => {
      this.cursorManager.setDragging(false);
    });
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

    const geom = feature.getGeometry();
    const controlPoints = coordinates ?? this.extractControlPoints(drawType, geom);
    if (controlPoints.length > 0) {
      const normalized = this.normalizeControlPoints(drawType, controlPoints);
      feature.set('controlPoints', normalized);
      geom?.set('_controlPoints', normalized);
    }
  }

  private createGeometry(drawType: DrawType, coordinates: number[][]): Geometry {
    switch (drawType) {
      case DrawType.Point:
      case DrawType.AlarmPoint:
      case DrawType.ImagePoint:
        return new Point(coordinates[0]);
      case DrawType.Line:
      case DrawType.FlowLine:
      case DrawType.FreehandLine:
      case DrawType.Measure:
      case DrawType.AzimuthMeasure:
        return new LineString(drawType === DrawType.AzimuthMeasure ? coordinates.slice(0, 2) : coordinates);
      case DrawType.Polygon:
      case DrawType.FreehandPolygon:
      case DrawType.AreaMeasure:
        return new Polygon([closeRing(coordinates)]);
      case DrawType.Circle:
        return new Circle(coordinates[0], coordinates[1] ? dist(coordinates[0], coordinates[1]) : 0);
      case DrawType.Rectangle:
        return new Polygon(buildRectangle(coordinates.slice(0, 2)));
      case DrawType.Ellipse:
        return new Polygon(buildEllipse(coordinates.slice(0, 2)));
      case DrawType.Sector: {
        const points = normalizeSectorControlPoints(coordinates.slice(0, 3));
        return new Polygon(buildSector(points));
      }
      case DrawType.StraightArrow:
        return new Polygon(buildStraightArrow(coordinates.slice(0, 2)));
      case DrawType.TaperedArrow:
        return new Polygon(buildTaperedArrow(coordinates.slice(0, 2)));
      case DrawType.LineArrow: {
        const [line, arrowHead] = buildLineArrowGeometries(coordinates.slice(0, 2));
        return new GeometryCollection([line, arrowHead]);
      }
      case DrawType.DoubleArrow: {
        const points = normalizeDoubleArrowControlPoints(coordinates.slice(0, 5));
        return new Polygon(buildDoubleArrow(points));
      }
      case DrawType.Arc:
        return new LineString(buildArc(coordinates.slice(0, 3)));
      case DrawType.Flag: {
        const points = normalizeFlagControlPoints(coordinates.slice(0, 2));
        const [pole, flag] = buildFlagGeometries(points);
        const geom = new GeometryCollection([pole, flag]);
        geom.set('_controlPoints', points);
        return geom;
      }
      default:
        return new LineString(coordinates);
    }
  }

  private updateFeatureGeometry(feature: Feature, drawType: DrawType, coordinates: number[][]): void {
    const geom = feature.getGeometry();
    if (!geom) return;

    switch (drawType) {
      case DrawType.Point:
      case DrawType.AlarmPoint:
      case DrawType.ImagePoint:
        (geom as Point).setCoordinates(coordinates[0]);
        break;
      case DrawType.Line:
      case DrawType.FlowLine:
      case DrawType.FreehandLine:
      case DrawType.Measure:
      case DrawType.AzimuthMeasure:
        (geom as LineString).setCoordinates(
          drawType === DrawType.AzimuthMeasure ? coordinates.slice(0, 2) : coordinates,
        );
        break;
      case DrawType.Polygon:
      case DrawType.FreehandPolygon:
      case DrawType.AreaMeasure:
        (geom as Polygon).setCoordinates([closeRing(coordinates)]);
        break;
      case DrawType.Circle:
        if (coordinates.length >= 2) {
          (geom as Circle).setCenter(coordinates[0]);
          (geom as Circle).setRadius(dist(coordinates[0], coordinates[1]));
        }
        break;
      case DrawType.Rectangle:
        this.updateHandleGeometry(
          feature,
          geom,
          drawType,
          coordinates.slice(0, 2),
          buildRectangle(coordinates.slice(0, 2)),
        );
        break;
      case DrawType.Ellipse:
        this.updateHandleGeometry(
          feature,
          geom,
          drawType,
          coordinates.slice(0, 2),
          buildEllipse(coordinates.slice(0, 2)),
        );
        break;
      case DrawType.Sector: {
        const points = normalizeSectorControlPoints(coordinates.slice(0, 3));
        this.updateHandleGeometry(feature, geom, drawType, points, buildSector(points));
        break;
      }
      case DrawType.StraightArrow:
        this.updateHandleGeometry(
          feature,
          geom,
          drawType,
          coordinates.slice(0, 2),
          buildStraightArrow(coordinates.slice(0, 2)),
        );
        break;
      case DrawType.TaperedArrow:
        this.updateHandleGeometry(
          feature,
          geom,
          drawType,
          coordinates.slice(0, 2),
          buildTaperedArrow(coordinates.slice(0, 2)),
        );
        break;
      case DrawType.LineArrow: {
        const points = coordinates.slice(0, 2);
        const [line, arrowHead] = buildLineArrowGeometries(points);
        feature.set('controlPoints', points);
        geom.set('_controlPoints', points);
        (geom as GeometryCollection).setGeometries([line, arrowHead]);
        this.handleManager.refresh(points);
        break;
      }
      case DrawType.DoubleArrow: {
        const points = normalizeDoubleArrowControlPoints(coordinates.slice(0, 5));
        this.updateHandleGeometry(feature, geom, drawType, points, buildDoubleArrow(points));
        break;
      }
      case DrawType.Arc: {
        const points = coordinates.slice(0, 3);
        feature.set('controlPoints', points);
        geom.set('_controlPoints', points);
        (geom as LineString).setCoordinates(buildArc(points));
        this.handleManager.refresh(points);
        break;
      }
      case DrawType.Flag: {
        const points = normalizeFlagControlPoints(coordinates.slice(0, 2));
        const [pole, flag] = buildFlagGeometries(points);
        feature.set('controlPoints', points);
        geom.set('_controlPoints', points);
        (geom as GeometryCollection).setGeometries([pole, flag]);
        this.handleManager.refresh(points);
        break;
      }
    }

    this.updateAnimationState();
  }

  private updateHandleGeometry(
    feature: Feature,
    geom: Geometry,
    drawType: DrawType,
    controlPoints: number[][],
    coordinates: number[][][],
  ): void {
    const points = this.normalizeControlPoints(drawType, controlPoints);
    feature.set('controlPoints', points);
    geom.set('_controlPoints', points);
    (geom as Polygon).setCoordinates(coordinates);
    this.handleManager.refresh(points);
  }

  private syncHandleGeometry(controlPoints: number[][]): void {
    if (!this.activeFeature) return;
    const drawType = this.getFeatureDrawType(this.activeFeature);
    const geom = this.activeFeature.getGeometry();
    if (!drawType || !geom) return;

    if (drawType === DrawType.Sector) {
      const points = this.resolveSectorDraggedControlPoints(controlPoints);
      this.activeFeature.set('controlPoints', points);
      geom.set('_controlPoints', points);
      (geom as Polygon).setCoordinates(buildSector(points));
      this.handleManager.refreshExcept(points, this.draggingHandleIndex);
      return;
    }

    this.updateFeatureGeometry(this.activeFeature, drawType, controlPoints);
  }

  private syncEditMode(feature: Feature): void {
    const plotType = feature.get('plotType') as string | undefined;
    const isHandleBased = !!plotType && HANDLE_PLOT_TYPES.has(plotType);

    if (isHandleBased) {
      const controlPoints = this.extractCoordinates(feature);
      this.modifyManager.setActive(false);
      const drawType = this.getFeatureDrawType(feature);
      const styleData = getFeatureStyleData(feature);
      if (drawType && styleData) this.handleManager.setStyleConfig(mergeRuntimeConfig(this.config, styleData));
      else this.handleManager.setStyleConfig(this.config);
      this.handleManager.show(controlPoints);
      this.handleManager.handleModify.setActive(true);
      this.cursorManager.setEditableLayers(() => [this.handleManager.handleLayer]);
      return;
    }

    this.handleManager.hide();
    this.handleManager.handleModify.setActive(false);
    this.modifyManager.setActive(true);
    this.cursorManager.setEditableLayers(() => [this.modifyManager.getOverlayLayer()]);
  }

  private deleteActiveFeature(): void {
    const feature = this.activeFeature!;
    this.revision += 1;
    this.selectManager.clearSelection();
    this.cursorManager.setActive(false);
    this.layerManager.removeFeature(feature);
    this.eventBus.emit(DrawEvent.DELETE, { feature });
    this.updateAnimationState();
  }

  private attachFeatureRuntime(feature: Feature, drawType: DrawType): void {
    if (drawType === DrawType.Measure) this.measureManager.attachFeature(feature);
    if (drawType === DrawType.AzimuthMeasure) this.azimuthMeasureManager.attachFeature(feature);
    if (drawType === DrawType.AreaMeasure) this.areaMeasureManager.attachFeature(feature);
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

  private extractControlPoints(drawType: DrawType, geom: Geometry | undefined): number[][] {
    if (!geom) return [];

    switch (drawType) {
      case DrawType.Point:
      case DrawType.AlarmPoint:
      case DrawType.ImagePoint:
        return [(geom as Point).getCoordinates()];
      case DrawType.Line:
      case DrawType.FlowLine:
      case DrawType.FreehandLine:
      case DrawType.Measure:
      case DrawType.AzimuthMeasure:
        return (geom as LineString).getCoordinates();
      case DrawType.Polygon:
      case DrawType.FreehandPolygon:
      case DrawType.AreaMeasure:
        return (geom as Polygon).getCoordinates()[0] ?? [];
      case DrawType.Circle: {
        const circle = geom as Circle;
        const center = circle.getCenter();
        return [center, [center[0] + circle.getRadius(), center[1]]];
      }
      case DrawType.Rectangle:
        return getRectangleControlPoints(geom as Polygon);
      case DrawType.Ellipse:
        return getEllipseControlPoints(geom as Polygon);
      case DrawType.Sector:
        return getSectorControlPoints(geom as Polygon);
      case DrawType.Arc: {
        const original = (geom as any)._plotCoordinates as number[][] | undefined;
        if (original && original.length >= 3) return original.slice(0, 3);
        const stored = geom.get('_controlPoints') as number[][] | undefined;
        return stored ?? getArcControlPoints(geom as LineString);
      }
      case DrawType.Flag:
        return getFlagControlPoints(geom as GeometryCollection);
      default:
        return (geom.get('_controlPoints') as number[][] | undefined) ?? [];
    }
  }

  private normalizeControlPoints(drawType: DrawType, controlPoints: number[][]): number[][] {
    if (drawType === DrawType.Sector) return normalizeSectorControlPoints(controlPoints.slice(0, 3));
    if (drawType === DrawType.DoubleArrow) return normalizeDoubleArrowControlPoints(controlPoints.slice(0, 5));
    if (
      drawType === DrawType.Rectangle ||
      drawType === DrawType.Ellipse ||
      drawType === DrawType.StraightArrow ||
      drawType === DrawType.TaperedArrow ||
      drawType === DrawType.LineArrow ||
      drawType === DrawType.Flag
    ) {
      return controlPoints.slice(0, 2);
    }
    if (drawType === DrawType.Arc) return controlPoints.slice(0, 3);
    return controlPoints;
  }

  private resolveSectorDraggedControlPoints(controlPoints: number[][]): number[][] {
    if (controlPoints.length < 3) return controlPoints;

    const previous = this.getCoordinates();
    if (previous.length < 3) return normalizeSectorControlPoints(controlPoints.slice(0, 3));

    const centerMoved = this.draggingHandleIndex === 0 || moved(previous[0], controlPoints[0]);

    if (centerMoved && this.draggingHandleIndex !== 1 && this.draggingHandleIndex !== 2) {
      const dx = controlPoints[0][0] - previous[0][0];
      const dy = controlPoints[0][1] - previous[0][1];
      return [controlPoints[0], [previous[1][0] + dx, previous[1][1] + dy], [previous[2][0] + dx, previous[2][1] + dy]];
    }

    return normalizeSectorControlPoints(controlPoints.slice(0, 3), this.draggingHandleIndex === 2 ? 2 : 1);
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
    if (this.animationFrame !== null) return;

    const tick = (time: number) => {
      if (this.lastFrameTime === 0) this.lastFrameTime = time;
      const delta = Math.min(time - this.lastFrameTime, 100);
      const hasFlowLine = this.hasAnimatedFlowLines();
      const hasAlarmPoint = this.hasAlarmPoints();

      if (!hasFlowLine && !hasAlarmPoint) {
        this.stopAnimation();
        return;
      }

      if (hasFlowLine || delta >= this.getAlarmFrameInterval()) {
        this.lastFrameTime = time;
        if (hasFlowLine) {
          this.flowElapsedTime += delta;
          this.phase += ((this.config.flowLine.speed ?? 60) * delta) / 1000;
        }
        this.layerManager.getLayer().changed();
        this.map.render();
      }

      this.animationFrame = requestAnimationFrame(tick);
    };

    this.lastFrameTime = 0;
    this.animationFrame = requestAnimationFrame(tick);
  }

  private stopAnimation(): void {
    if (this.animationFrame === null) return;
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.lastFrameTime = 0;
    this.flowElapsedTime = 0;
    this.phase = 0;
  }

  private isActiveFeatureHandleBased(): boolean {
    const plotType = this.activeFeature?.get('plotType') as string | undefined;
    return !!plotType && HANDLE_PLOT_TYPES.has(plotType);
  }

  private getFeatureDrawType(feature: Feature, fallback?: DrawType): DrawType | null {
    return (feature.get(DRAW_TYPE_PROPERTY) as DrawType | undefined) ?? fallback ?? this.getDrawTypeByPlotType(feature);
  }

  private getDrawTypeByPlotType(feature: Feature): DrawType | null {
    const plotType = feature.get('plotType') as string | undefined;
    if (!plotType) return null;

    const entry = Object.entries(PLOT_TYPE_BY_DRAW_TYPE).find(([, value]) => value === plotType);
    return (entry?.[0] as DrawType | undefined) ?? null;
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

const PLOT_TYPE_BY_DRAW_TYPE: Record<DrawType, string> = {
  [DrawType.Point]: 'point',
  [DrawType.AlarmPoint]: 'alarmPoint',
  [DrawType.ImagePoint]: 'imagePoint',
  [DrawType.Line]: 'line',
  [DrawType.FlowLine]: 'flowLine',
  [DrawType.FreehandLine]: 'freehandLine',
  [DrawType.FreehandPolygon]: 'freehandPolygon',
  [DrawType.Polygon]: 'polygon',
  [DrawType.Rectangle]: 'rectangle',
  [DrawType.Circle]: 'circle',
  [DrawType.Ellipse]: 'ellipse',
  [DrawType.Sector]: 'sector',
  [DrawType.StraightArrow]: 'straightArrow',
  [DrawType.TaperedArrow]: 'taperedArrow',
  [DrawType.LineArrow]: 'lineArrow',
  [DrawType.DoubleArrow]: 'doubleArrow',
  [DrawType.Arc]: 'arc',
  [DrawType.Flag]: 'flag',
  [DrawType.Measure]: 'measure',
  [DrawType.AzimuthMeasure]: 'azimuthMeasure',
  [DrawType.AreaMeasure]: 'areaMeasure',
};

function closeRing(coordinates: number[][]): number[][] {
  if (coordinates.length === 0) return [];

  const ring = coordinates.map((point) => point.slice());
  const first = ring[0];
  const last = ring[ring.length - 1];

  if (ring.length === 1) {
    ring.push(first.slice(), first.slice());
    return ring;
  }

  if (!last || !coordinatesEqual(first, last)) {
    ring.push(first.slice());
  }

  return ring;
}

function coordinatesEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function moved(a: number[], b: number[]): boolean {
  return Math.abs(a[0] - b[0]) > 1e-9 || Math.abs(a[1] - b[1]) > 1e-9;
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
