import Map from 'ol/Map';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
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
import { buildModifyStyle, buildArc, getArcControlPoints } from '../utils';

export class ArcTool extends BaseTool {
  private handleSource: VectorSource;
  private handleLayer: VectorLayer;
  private handleModify: Modify;
  private syncing = false;

  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Arc, config);

    // 禁用默认的 Modify，使用自定义 handle 进行编辑
    this.modifyManager.setActive(false);

    const ns = this.config.nodeStyle;

    // 创建 handle 图层用于显示编辑控制点
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

    // 创建 handle 修改交互
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

    this.bindArcEvents();
  }

  private bindArcEvents(): void {
    // 绘制完成后保存控制点
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      const geom = feature.getGeometry() as LineString;
      // 从几何中获取用户原始点击的坐标（保存在 _plotCoordinates 中）
      const originalCoords = (geom as any)._plotCoordinates as number[][] | undefined;
      if (originalCoords && originalCoords.length >= 3) {
        feature.set('controlPoints', originalCoords.slice(0, 3));
      } else {
        // 降级方案：从几何反推
        const controlPoints = getArcControlPoints(geom);
        feature.set('controlPoints', controlPoints);
      }
      feature.set('plotType', 'arc');
    });

    // 选中要素时显示控制点
    this.eventBus.on(DrawEvent.SELECT, ({ feature }: { feature: Feature }) => {
      this.showHandles(feature);
    });

    // 取消选中时隐藏控制点
    this.eventBus.on(DrawEvent.DESELECT, () => {
      this.hideHandles();
    });
  }

  private showHandles(feature: Feature): void {
    this.hideHandles();
    const controlPoints = feature.get('controlPoints') as number[][] | undefined;
    if (!controlPoints) return;

    // 创建三个控制点 handle
    controlPoints.forEach((pt, i) => {
      const handle = new Feature(new Point(pt));
      handle.set('_handleIndex', i);
      // 监听 handle 位置变化
      handle.getGeometry()!.on('change', () => this.syncFromHandles());
      this.handleSource.addFeature(handle);
    });
  }

  private hideHandles(): void {
    this.handleSource.clear();
  }

  /**
   * 从 handle 同步到 feature 几何
   */
  private syncFromHandles(): void {
    if (this.syncing || !this.activeFeature) return;
    this.syncing = true;

    // 获取所有 handle 并按索引排序
    const handles = this.handleSource.getFeatures();
    const sorted = handles.sort((a, b) => a.get('_handleIndex') - b.get('_handleIndex'));
    const controlPoints = sorted.map((h) => (h.getGeometry() as Point).getCoordinates());

    // 更新 feature 的控制点
    this.activeFeature.set('controlPoints', controlPoints);

    // 重新生成圆弧几何
    const geom = this.activeFeature.getGeometry() as LineString;
    geom.setCoordinates(buildArc(controlPoints));

    this.syncing = false;
  }

  // ─── Abstract implementations ─────────────────────────────────────────────

  /**
   * 从坐标数组创建圆弧几何
   */
  protected createGeometry(coordinates: number[][]): Geometry {
    return new LineString(buildArc(coordinates));
  }

  /**
   * 添加圆弧要素
   */
  addFeature(coordinates: number[][]): Feature {
    const feature = super.addFeature(coordinates);
    feature.set('plotType', 'arc');
    feature.set('controlPoints', coordinates.slice(0, 3));
    return feature;
  }

  /**
   * 设置坐标
   */
  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 3) return;

    // 保存控制点
    this.activeFeature.set('controlPoints', coordinates.slice(0, 3));

    // 更新几何
    const geom = this.activeFeature.getGeometry() as LineString;
    geom.setCoordinates(buildArc(coordinates));

    // 刷新 handle 显示
    this.refreshHandles();
  }

  /**
   * 获取坐标
   */
  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.get('controlPoints') as number[][]) || [];
  }

  /**
   * 获取控制点数量
   */
  getPointCount(): number {
    return this.activeFeature ? 3 : 0;
  }

  /**
   * 更新指定索引的控制点
   */
  updatePoint(index: number, coordinate: number[]): void {
    if (index < 0 || index > 2) return;
    const coords = this.getCoordinates();
    if (coords.length < 3) return;
    coords[index] = coordinate;
    this.setCoordinates(coords);
  }

  // ─── Convenience API ─────────────────────────────────────────────────────

  /**
   * 程序化添加圆弧
   * @param start 圆弧起点
   * @param end 圆弧终点
   * @param pointOnArc 圆弧经过点
   */
  addArc(start: number[], end: number[], pointOnArc: number[]): Feature {
    return this.addFeature([start, end, pointOnArc]);
  }

  /**
   * 获取圆弧起点
   */
  getStart(): number[] | null {
    const coords = this.getCoordinates();
    return coords.length >= 1 ? coords[0] : null;
  }

  /**
   * 获取圆弧终点
   */
  getEnd(): number[] | null {
    const coords = this.getCoordinates();
    return coords.length >= 2 ? coords[1] : null;
  }

  /**
   * 获取圆弧经过点
   */
  getPointOnArc(): number[] | null {
    const coords = this.getCoordinates();
    return coords.length >= 3 ? coords[2] : null;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * 刷新 handle 显示
   */
  private refreshHandles(): void {
    if (!this.activeFeature) return;
    const controlPoints = this.activeFeature.get('controlPoints') as number[][] | undefined;
    if (!controlPoints) return;

    const handles = this.handleSource.getFeatures().sort((a, b) => a.get('_handleIndex') - b.get('_handleIndex'));

    // 如果 handle 数量不匹配，重新创建
    if (handles.length !== controlPoints.length) {
      this.showHandles(this.activeFeature);
      return;
    }

    // 更新 handle 位置
    this.syncing = true;
    handles.forEach((h, i) => {
      (h.getGeometry() as Point).setCoordinates(controlPoints[i]);
    });
    this.syncing = false;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  destroy(): void {
    this.hideHandles();
    this.map.removeInteraction(this.handleModify);
    this.map.removeLayer(this.handleLayer);
    super.destroy();
  }
}
