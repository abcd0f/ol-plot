import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import GeometryCollection from 'ol/geom/GeometryCollection';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Modify from 'ol/interaction/Modify';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';
import { BaseTool } from '../core/BaseTool';
import { buildModifyStyle } from '../utils';
import { buildLineArrowGeometries } from '../utils/lineArrow';

/**
 * 线箭头（LineArrow）绘制工具类，继承自 BaseTool。
 *
 * 仅由两个控制点确定：
 *  - P0: 箭尾点
 *  - P1: 箭头尖端点
 *
 * 图形由 GeometryCollection 组成：
 *  - LineString: 箭身（P0 → P1），仅描边无填充
 *  - Polygon: 实心箭头头部（三角形），填充 + 描边
 *
 * 与 StraightArrowTool / TaperedArrowTool 相同的 handle 编辑模式：
 * 禁用默认 ModifyManager，创建独立的 handle 图层，
 * 只暴露两个控制点供拖拽编辑，拖拽时重新生成箭头几何。
 */
export class LineArrowTool extends BaseTool {
  private handleSource: VectorSource;
  private handleLayer: VectorLayer;
  private handleModify: Modify;
  private syncing = false;

  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.LineArrow, config);

    // 禁用默认 ModifyManager（GeometryCollection 不能直接用 Modify 编辑）
    this.modifyManager.setActive(false);

    const ns = this.config.nodeStyle;

    // 创建独立的 handle 图层，仅显示 P0、P1 两个控制点
    this.handleSource = new VectorSource();
    this.handleLayer = new VectorLayer({
      source: this.handleSource,
      style: new Style({
        image: new CircleStyle({
          radius: ns.radius ?? 6,
          fill: new Fill({ color: ns.fill ?? '#ffffff' }),
          stroke: new Stroke({
            color: ns.stroke ?? this.config.strokeColor,
            width: ns.strokeWidth ?? 2,
          }),
        }),
      }),
    });
    map.addLayer(this.handleLayer);

    // 创建独立的 Modify interaction，绑定到 handle 图层
    this.handleModify = new Modify({
      source: this.handleSource,
      style: buildModifyStyle(this.config),
    });
    this.handleModify.on('modifystart', () => {
      this.eventBus.emit(DrawEvent.MODIFY_START);
    });
    this.handleModify.on('modifyend', () => {
      this.eventBus.emit(DrawEvent.MODIFY_END, { features: this.activeFeature ? [this.activeFeature] : [] });
    });
    map.addInteraction(this.handleModify);

    this.bindArrowEvents();
  }

  private bindArrowEvents(): void {
    // 绘制完成后，从 geometry 属性中读取 geometryFunction 存入的原始控制点
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      const geom = feature.getGeometry() as GeometryCollection;
      const controlPoints = geom.get('_controlPoints') as number[][] | undefined;
      feature.set('plotType', 'lineArrow');
      feature.set('controlPoints', controlPoints || []);
    });

    this.eventBus.on(DrawEvent.SELECT, ({ feature }: { feature: Feature }) => {
      this.showHandles(feature);
    });

    this.eventBus.on(DrawEvent.DESELECT, () => {
      this.hideHandles();
    });
  }

  private showHandles(feature: Feature): void {
    this.hideHandles();
    const controlPoints = feature.get('controlPoints') as number[][] | undefined;
    if (!controlPoints || controlPoints.length < 2) return;

    controlPoints.forEach((pt, i) => {
      const handle = new Feature(new Point(pt));
      handle.set('_handleIndex', i);
      handle.getGeometry()!.on('change', () => this.syncFromHandles());
      this.handleSource.addFeature(handle);
    });
  }

  private hideHandles(): void {
    this.handleSource.clear();
  }

  private syncFromHandles(): void {
    if (this.syncing || !this.activeFeature) return;
    this.syncing = true;

    const handles = this.handleSource.getFeatures();
    const controlPoints = handles
      .sort((a, b) => a.get('_handleIndex') - b.get('_handleIndex'))
      .map((h) => (h.getGeometry() as Point).getCoordinates());

    this.activeFeature.set('controlPoints', controlPoints);
    const geom = this.activeFeature.getGeometry() as GeometryCollection;
    const [lineString, arrowHead] = buildLineArrowGeometries(controlPoints);
    geom.setGeometries([lineString, arrowHead]);

    this.syncing = false;
  }

  // ─── Abstract implementations ─────────────────────────────────────────────

  protected createGeometry(coordinates: number[][]): Geometry {
    const [lineString, arrowHead] = buildLineArrowGeometries(coordinates);
    return new GeometryCollection([lineString, arrowHead]);
  }

  addFeature(coordinates: number[][]): Feature {
    const feature = super.addFeature(coordinates);
    feature.set('plotType', 'lineArrow');
    feature.set('controlPoints', coordinates.slice(0, 2));
    return feature;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 2) return;
    this.activeFeature.set('controlPoints', coordinates.slice(0, 2));
    const geom = this.activeFeature.getGeometry() as GeometryCollection;
    const [lineString, arrowHead] = buildLineArrowGeometries(coordinates);
    geom.setGeometries([lineString, arrowHead]);
    this.refreshHandles();
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.get('controlPoints') as number[][]) || [];
  }

  getPointCount(): number {
    return this.activeFeature ? 2 : 0;
  }

  updatePoint(index: number, coordinate: number[]): void {
    if (index !== 0 && index !== 1) return;
    const coords = this.getCoordinates();
    if (coords.length < 2) return;
    coords[index] = coordinate;
    this.setCoordinates(coords);
  }

  // ─── Convenience API ──────────────────────────────────────────────────────

  /**
   * 程序化添加一个线箭头
   * @param start 箭尾点坐标
   * @param end 箭头尖端点坐标
   * @returns 创建的要素对象
   */
  addArrow(start: number[], end: number[]): Feature {
    return this.addFeature([start, end]);
  }

  /**
   * 获取箭尾点坐标
   * @returns 箭尾坐标，如果无活动要素则返回 null
   */
  getStart(): number[] | null {
    const coords = this.getCoordinates();
    if (coords.length < 2) return null;
    return coords[0];
  }

  /**
   * 获取箭头尖端点坐标
   * @returns 箭头尖端坐标，如果无活动要素则返回 null
   */
  getEnd(): number[] | null {
    const coords = this.getCoordinates();
    if (coords.length < 2) return null;
    return coords[1];
  }

  /**
   * 获取箭头长度（P0 到 P1 的欧几里得距离）
   * @returns 箭头长度，如果无活动要素则返回 0
   */
  getLength(): number {
    const coords = this.getCoordinates();
    if (coords.length < 2) return 0;
    const [p0, p1] = coords;
    return Math.sqrt((p1[0] - p0[0]) ** 2 + (p1[1] - p0[1]) ** 2);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private refreshHandles(): void {
    if (!this.activeFeature) return;
    const controlPoints = this.activeFeature.get('controlPoints') as number[][] | undefined;
    if (!controlPoints) return;

    const handles = this.handleSource.getFeatures().sort((a, b) => a.get('_handleIndex') - b.get('_handleIndex'));
    if (handles.length !== controlPoints.length) {
      this.showHandles(this.activeFeature);
      return;
    }

    this.syncing = true;
    handles.forEach((h, i) => {
      (h.getGeometry() as Point).setCoordinates(controlPoints[i]);
    });
    this.syncing = false;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  destroy(): void {
    this.hideHandles();
    this.map.removeInteraction(this.handleModify);
    this.map.removeLayer(this.handleLayer);
    super.destroy();
  }
}