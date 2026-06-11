import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
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
import { buildModifyStyle } from '../style/modify';
import { buildRectangle, getRectangleControlPoints } from '../geometry/rectangle';

/**
 * 矩形绘制工具类，继承自BaseTool
 * 通过两个控制点（对角点）确定矩形，支持自定义编辑手柄
 */
export class RectangleTool extends BaseTool {
  private handleSource: VectorSource;
  private handleLayer: VectorLayer;
  private handleModify: Modify;
  private syncing = false;

  /**
   * 构造函数
   * @param map 地图实例
   * @param config 绘制配置参数
   */
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Rectangle, config);

    // 禁用默认的 ModifyManager，使用自定义 handle 编辑
    this.modifyManager.setActive(false);

    const ns = this.config.nodeStyle;

    // 创建 handle 图层
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

    // 创建自定义 Modify 交互
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

    this.bindRectEvents();
  }

  /**
   * 绑定矩形相关的事件监听器
   */
  private bindRectEvents(): void {
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      // 绘制结束后存储控制点
      const geom = feature.getGeometry() as Polygon;
      const controlPoints = getRectangleControlPoints(geom);
      feature.set('plotType', 'rectangle');
      feature.set('controlPoints', controlPoints);
    });

    this.eventBus.on(DrawEvent.SELECT, ({ feature }: { feature: Feature }) => {
      this.showHandles(feature);
    });

    this.eventBus.on(DrawEvent.DESELECT, () => {
      this.hideHandles();
    });
  }

  /**
   * 显示编辑手柄
   */
  private showHandles(feature: Feature): void {
    this.hideHandles();
    const controlPoints = feature.get('controlPoints') as number[][] | undefined;
    if (!controlPoints) return;

    controlPoints.forEach((pt, i) => {
      const handle = new Feature(new Point(pt));
      handle.set('_handleIndex', i);
      handle.getGeometry()!.on('change', () => this.syncFromHandles());
      this.handleSource.addFeature(handle);
    });
  }

  /**
   * 隐藏编辑手柄
   */
  private hideHandles(): void {
    this.handleSource.clear();
  }

  /**
   * 从手柄同步到几何图形
   */
  private syncFromHandles(): void {
    if (this.syncing || !this.activeFeature) return;
    this.syncing = true;

    const handles = this.handleSource.getFeatures();
    const controlPoints = handles
      .sort((a, b) => a.get('_handleIndex') - b.get('_handleIndex'))
      .map((h) => (h.getGeometry() as Point).getCoordinates());

    // 更新 feature 中存储的控制点
    this.activeFeature.set('controlPoints', controlPoints);

    // 重新计算矩形几何
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildRectangle(controlPoints));

    this.syncing = false;
  }

  // ─── Abstract implementations ─────────────────────────────────────────────

  /**
   * 创建矩形几何图形
   * @param coordinates 坐标数组，仅使用前两个点（对角点）
   * @returns Polygon几何图形对象
   */
  protected createGeometry(coordinates: number[][]): Geometry {
    return new Polygon(buildRectangle(coordinates.slice(0, 2)));
  }

  /**
   * 添加矩形要素
   * @param startPoint 起始点坐标
   * @param endPoint 结束点坐标
   * @returns 创建的要素对象
   */
  addRectangle(startPoint: number[], endPoint: number[]): Feature {
    return this.addFeature([startPoint, endPoint]);
  }

  /**
   * 设置当前要素的坐标
   * @param coordinates 坐标数组，仅使用前两个点
   */
  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 2) return;

    // 存储控制点
    this.activeFeature.set('controlPoints', coordinates.slice(0, 2));

    // 更新几何
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildRectangle(coordinates.slice(0, 2)));

    // 刷新手柄
    this.refreshHandles();
  }

  /**
   * 获取当前要素的坐标
   * @returns 控制点坐标数组 [startPoint, endPoint]
   */
  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.get('controlPoints') as number[][]) || [];
  }

  /**
   * 获取当前要素的点数
   * @returns 控制点数量（始终为2）
   */
  getPointCount(): number {
    return this.activeFeature ? 2 : 0;
  }

  /**
   * 更新指定索引处的点坐标
   * @param index 要更新的点的索引（0为起始点，1为结束点）
   * @param coordinate 新的坐标值
   */
  updatePoint(index: number, coordinate: number[]): void {
    if (index !== 0 && index !== 1) return;
    const coords = this.getCoordinates();
    if (coords.length < 2) return;
    coords[index] = coordinate;
    this.setCoordinates(coords);
  }

  // ─── Convenience API ──────────────────────────────────────────────────────

  /**
   * 获取矩形中心点
   * @returns 中心点坐标，如果无活动要素则返回null
   */
  getCenter(): number[] | null {
    const coords = this.getCoordinates();
    if (coords.length < 2) return null;
    return [(coords[0][0] + coords[1][0]) / 2, (coords[0][1] + coords[1][1]) / 2];
  }

  /**
   * 获取矩形宽度
   * @returns 宽度值
   */
  getWidth(): number {
    const coords = this.getCoordinates();
    if (coords.length < 2) return 0;
    return Math.abs(coords[1][0] - coords[0][0]);
  }

  /**
   * 获取矩形高度
   * @returns 高度值
   */
  getHeight(): number {
    const coords = this.getCoordinates();
    if (coords.length < 2) return 0;
    return Math.abs(coords[1][1] - coords[0][1]);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * 刷新编辑手柄位置
   */
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

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * 销毁工具，清理所有资源
   */
  destroy(): void {
    this.hideHandles();
    this.map.removeInteraction(this.handleModify);
    this.map.removeLayer(this.handleLayer);
    super.destroy();
  }
}
