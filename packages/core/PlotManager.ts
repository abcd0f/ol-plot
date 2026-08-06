import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import Circle from 'ol/geom/Circle';
import GeometryCollection from 'ol/geom/GeometryCollection';
import type Geometry from 'ol/geom/Geometry';
import Style, { type StyleFunction } from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import type { InternalPlotConfig, ImagePointConfig, ResolvedPlotConfig } from '../types/config';
import type { PlotFeatureData, PlotRestoreOptions, PlotDrawType } from '../types/data';
import { DrawType } from '../constants/drawType';
import { ToolState } from '../constants/toolState';
import { DrawEvent } from '../constants/events';
import { mergeConfig } from '../constants';
import { buildFeatureStyle } from '../style/feature';
import { buildDrawStyle } from '../style/draw';
import { buildSelectStyle } from '../style/select';
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
import { buildRectangle, getRectangleControlPoints } from '../geometry/rectangle';
import { buildEllipse, getEllipseControlPoints } from '../geometry/ellipse';
import { buildSector, getSectorControlPoints, normalizeSectorControlPoints } from '../geometry/sector';
import { buildArc, getArcControlPoints } from '../geometry/arc';
import { buildStraightArrow } from '../geometry/arrow/straight';
import { buildTaperedArrow } from '../geometry/arrow/tapered';
import { buildLineArrowGeometries } from '../geometry/arrow/line';
import { buildDoubleArrow, normalizeDoubleArrowControlPoints } from '../geometry/arrow/double';
import { buildFlagGeometries, getFlagControlPoints } from '../geometry/flag';
import { dist } from '../utils';
import { buildStyleFromData, projectPlotDataCoordinates, serializeFeature, setFeatureStyleData } from '../utils/data';

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
  private lastFrameTime = 0;
  private imageConfig: Required<ImagePointConfig>['image'];
  private pointStyle: Style;
  private imageStyle: Style;
  private draggingHandleIndex: number | null = null;

  constructor(map: Map, config?: PlotManagerConfig) {
    this.map = map;
    this.config = mergeConfig(config);
    this.eventBus = new EventBus();

    const flowStyle = buildFlowLineStyle(this.config, () => this.phase);
    this.imageConfig = {
      src: config?.image?.src || '',
      scale: config?.image?.scale ?? 1,
      anchor: config?.image?.anchor ?? [0.5, 0.5],
      opacity: config?.image?.opacity ?? 1,
    };
    this.pointStyle = this.createPointStyle();
    this.imageStyle = this.createImageStyle();

    this.layerManager = new LayerManager(map, this.createLayerStyle(flowStyle));
    this.selectManager = new SelectManager(map, this.layerManager.getLayer(), this.config, this.eventBus);
    this.selectManager.setStyle(this.createSelectStyle(flowStyle));
    this.modifyManager = new ModifyManager(map, this.selectManager.getSelectedFeatures(), this.config, this.eventBus);
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

    this.bindEvents();

    this.handleKeyDown = (e: KeyboardEvent) => {
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
      this.drawManager = new DrawManager(
        this.map,
        this.layerManager.getLayer(),
        this.eventBus,
        this.activeDrawType,
        buildDrawStyle(this.config),
        () => this.selectManager.isEmpty(),
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

  getFeatures(): Feature[] {
    return this.layerManager.getFeatures();
  }

  getFeatureData(feature: Feature): PlotFeatureData {
    const drawType = this.getFeatureDrawType(feature) ?? this.activeDrawType ?? DrawType.Line;
    return serializeFeature(feature, drawType, this.config, this.map.getView().getProjection());
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
        if (options.applyStyle !== false && drawType !== DrawType.FlowLine) {
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
    this.activeFeature = null;
    this.handleManager.hide();
    this.handleManager.handleModify.setActive(false);
    this.modifyManager.setActive(false);
    this.cursorManager.setActive(false);
    this.layerManager.clear();
    this.stopFlowAnimation();
    this.state = this.activeDrawType ? ToolState.Drawing : ToolState.Idle;
    return this;
  }

  destroy(): void {
    this.revision += 1;
    document.removeEventListener('keydown', this.handleKeyDown);
    this.stopFlowAnimation();
    this.drawManager?.destroy();
    this.cursorManager.destroy();
    this.handleManager.destroy();
    this.selectManager.destroy();
    this.modifyManager.destroy();
    this.measureManager.destroy();
    this.areaMeasureManager.destroy();
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
    if ((drawType === DrawType.Polygon || drawType === DrawType.AreaMeasure) && index >= coords.length - 1) return;

    coords[index] = coordinate;
    if ((drawType === DrawType.Polygon || drawType === DrawType.AreaMeasure) && index === 0 && coords.length > 1) {
      coords[coords.length - 1] = coordinate;
    }
    this.setCoordinates(coords);
  }

  updateImageConfig(imageConfig: ImagePointConfig['image']): void {
    if (!imageConfig) return;

    this.imageConfig = {
      src: imageConfig.src || this.imageConfig.src,
      scale: imageConfig.scale ?? this.imageConfig.scale,
      anchor: imageConfig.anchor ?? this.imageConfig.anchor,
      opacity: imageConfig.opacity ?? this.imageConfig.opacity,
    };
    this.imageStyle = this.createImageStyle();

    this.layerManager.getLayer().changed();
  }

  private bindEvents(): void {
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature, drawType }: { feature: Feature; drawType: DrawType }) => {
      const revision = this.revision;
      const normalizedType = this.normalizeDrawType(drawType);
      this.prepareFeature(feature, normalizedType);
      if (normalizedType === DrawType.FlowLine) this.ensureFlowAnimation();

      setTimeout(() => {
        if (revision !== this.revision || !this.layerManager.hasFeature(feature)) return;
        this.activeFeature = feature;
        this.selectManager.selectFeature(feature);
      }, 0);
    });

    this.eventBus.on(DrawEvent.SELECT, ({ feature }: { feature: Feature }) => {
      this.activeFeature = feature;
      this.state = ToolState.Editing;
      this.syncEditMode(feature);
      this.cursorManager.setActive(true);
    });

    this.eventBus.on(DrawEvent.DESELECT, () => {
      this.activeFeature = null;
      this.state = this.activeDrawType ? ToolState.Drawing : ToolState.Idle;
      this.handleManager.hide();
      this.handleManager.handleModify.setActive(false);
      this.modifyManager.setActive(false);
      this.cursorManager.setActive(false);
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
      case DrawType.ImagePoint:
        return new Point(coordinates[0]);
      case DrawType.Line:
      case DrawType.FlowLine:
      case DrawType.FreehandLine:
      case DrawType.Measure:
        return new LineString(coordinates);
      case DrawType.Polygon:
      case DrawType.AreaMeasure:
        return new Polygon([coordinates]);
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
        const [pole, flag] = buildFlagGeometries(coordinates.slice(0, 2));
        return new GeometryCollection([pole, flag]);
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
      case DrawType.ImagePoint:
        (geom as Point).setCoordinates(coordinates[0]);
        break;
      case DrawType.Line:
      case DrawType.FlowLine:
      case DrawType.FreehandLine:
      case DrawType.Measure:
        (geom as LineString).setCoordinates(coordinates);
        break;
      case DrawType.Polygon:
      case DrawType.AreaMeasure:
        (geom as Polygon).setCoordinates([coordinates]);
        break;
      case DrawType.Circle:
        if (coordinates.length >= 2) {
          (geom as Circle).setCenter(coordinates[0]);
          (geom as Circle).setRadius(dist(coordinates[0], coordinates[1]));
        }
        break;
      case DrawType.Rectangle:
        this.updateHandleGeometry(feature, geom, drawType, coordinates.slice(0, 2), buildRectangle(coordinates.slice(0, 2)));
        break;
      case DrawType.Ellipse:
        this.updateHandleGeometry(feature, geom, drawType, coordinates.slice(0, 2), buildEllipse(coordinates.slice(0, 2)));
        break;
      case DrawType.Sector: {
        const points = normalizeSectorControlPoints(coordinates.slice(0, 3));
        this.updateHandleGeometry(feature, geom, drawType, points, buildSector(points));
        break;
      }
      case DrawType.StraightArrow:
        this.updateHandleGeometry(feature, geom, drawType, coordinates.slice(0, 2), buildStraightArrow(coordinates.slice(0, 2)));
        break;
      case DrawType.TaperedArrow:
        this.updateHandleGeometry(feature, geom, drawType, coordinates.slice(0, 2), buildTaperedArrow(coordinates.slice(0, 2)));
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
        const points = coordinates.slice(0, 2);
        const [pole, flag] = buildFlagGeometries(points);
        feature.set('controlPoints', points);
        geom.set('_controlPoints', points);
        (geom as GeometryCollection).setGeometries([pole, flag]);
        this.handleManager.refresh(points);
        break;
      }
    }

    this.updateFlowAnimationState();
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
    this.updateFlowAnimationState();
  }

  private attachFeatureRuntime(feature: Feature, drawType: DrawType): void {
    if (drawType === DrawType.Measure) this.measureManager.attachFeature(feature);
    if (drawType === DrawType.AreaMeasure) this.areaMeasureManager.attachFeature(feature);
    if (drawType === DrawType.FlowLine) this.ensureFlowAnimation();
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
      case DrawType.ImagePoint:
        return [(geom as Point).getCoordinates()];
      case DrawType.Line:
      case DrawType.FlowLine:
      case DrawType.FreehandLine:
      case DrawType.Measure:
        return (geom as LineString).getCoordinates();
      case DrawType.Polygon:
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
      return [
        controlPoints[0],
        [previous[1][0] + dx, previous[1][1] + dy],
        [previous[2][0] + dx, previous[2][1] + dy],
      ];
    }

    return normalizeSectorControlPoints(controlPoints.slice(0, 3), this.draggingHandleIndex === 2 ? 2 : 1);
  }

  private createLayerStyle(flowStyle: StyleFunction): StyleFunction {
    const baseStyle = buildFeatureStyle(this.config);

    return (feature, resolution) => {
      const drawType = this.getFeatureDrawType(feature as Feature);
      if (drawType === DrawType.FlowLine) return flowStyle(feature, resolution);
      if (drawType === DrawType.Point) return this.pointStyle;
      if (drawType === DrawType.ImagePoint) return this.imageStyle;
      return baseStyle;
    };
  }

  private createSelectStyle(flowStyle: StyleFunction): StyleFunction {
    const selectStyles = buildSelectStyle(this.config);

    return (feature, resolution) => {
      const drawType = this.getFeatureDrawType(feature as Feature);
      if (drawType === DrawType.FlowLine) {
        const flowStyles = flowStyle(feature, resolution);
        const list = Array.isArray(flowStyles) ? flowStyles : flowStyles ? [flowStyles] : [];
        return [...list, ...selectStyles];
      }
      if (drawType === DrawType.ImagePoint) return this.imageStyle;
      return selectStyles;
    };
  }

  private createPointStyle(): Style {
    const ns = this.config.nodeStyle;
    return new Style({
      image: new CircleStyle({
        radius: ns.radius ?? 6,
        fill: new Fill({ color: ns.fill ?? '#ffffff' }),
        stroke: new Stroke({
          color: ns.stroke ?? this.config.strokeColor,
          width: ns.strokeWidth ?? 2,
        }),
      }),
    });
  }

  private createImageStyle(): Style {
    if (!this.imageConfig.src) return this.pointStyle;

    return new Style({
      image: new Icon({
        src: this.imageConfig.src,
        scale: this.imageConfig.scale,
        anchor: this.imageConfig.anchor,
        opacity: this.imageConfig.opacity,
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
      }),
    });
  }

  private ensureFlowAnimation(): void {
    if ((this.config.flowLine.speed ?? 60) <= 0 || !this.hasFlowLines()) return;
    this.startFlowAnimation();
  }

  private updateFlowAnimationState(): void {
    if (this.hasFlowLines()) {
      this.ensureFlowAnimation();
    } else {
      this.stopFlowAnimation();
    }
  }

  private hasFlowLines(): boolean {
    return this.layerManager
      .getSource()
      .getFeatures()
      .some((feature) => this.getFeatureDrawType(feature as Feature) === DrawType.FlowLine);
  }

  private startFlowAnimation(): void {
    if (this.animationFrame !== null) return;

    const tick = (time: number) => {
      if (this.lastFrameTime === 0) this.lastFrameTime = time;
      const delta = Math.min(time - this.lastFrameTime, 100);
      this.lastFrameTime = time;
      this.phase += ((this.config.flowLine.speed ?? 60) * delta) / 1000;
      this.layerManager.getLayer().changed();
      this.map.render();
      this.animationFrame = requestAnimationFrame(tick);
    };

    this.lastFrameTime = 0;
    this.animationFrame = requestAnimationFrame(tick);
  }

  private stopFlowAnimation(): void {
    if (this.animationFrame === null) return;
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.lastFrameTime = 0;
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
  [DrawType.ImagePoint]: 'imagePoint',
  [DrawType.Line]: 'line',
  [DrawType.FlowLine]: 'flowLine',
  [DrawType.FreehandLine]: 'freehandLine',
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
  [DrawType.AreaMeasure]: 'areaMeasure',
};

function moved(a: number[], b: number[]): boolean {
  return Math.abs(a[0] - b[0]) > 1e-9 || Math.abs(a[1] - b[1]) > 1e-9;
}
