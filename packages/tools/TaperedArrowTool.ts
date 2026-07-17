import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { HandleBasedTool } from '../core/HandleBasedTool';
import { buildTaperedArrow } from '../geometry/arrow/tapered';

/**
 * 斜箭头（TaperedArrow）绘制工具类，继承自 HandleBasedTool。
 *
 * 仅由两个控制点确定：
 *  - P0: 箭尾中心点
 *  - P1: 箭头尖端点
 *
 * 编辑模式：
 * 禁用默认 ModifyManager，使用 HandleManager 创建独立的 handle 图层，
 * 只暴露两个控制点供拖拽编辑，拖拽时重新生成箭头 Polygon。
 *
 * 箭头结构特点：
 *  - 箭身宽度从尾部到头部逐渐增大（非矩形箭身）
 *  - 尾部最窄，中部逐渐变宽，箭头头部最宽
 *  - 左右完全对称
 */
export class TaperedArrowTool extends HandleBasedTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.TaperedArrow, config);
  }

  // ─── HandleBasedTool implementations ──────────────────────────────────────

  protected getPlotType(): string {
    return 'taperedArrow';
  }

  protected onHandleSync(controlPoints: number[][]): void {
    if (!this.activeFeature) return;
    this.activeFeature.set('controlPoints', controlPoints);
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildTaperedArrow(controlPoints));
  }

  // ─── Abstract implementations ─────────────────────────────────────────────

  protected createGeometry(coordinates: number[][]): Geometry {
    return new Polygon(buildTaperedArrow(coordinates));
  }

  addFeature(coordinates: number[][]): Feature {
    const feature = super.addFeature(coordinates);
    feature.set('plotType', 'taperedArrow');
    feature.set('controlPoints', coordinates.slice(0, 2));
    return feature;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 2) return;
    this.activeFeature.set('controlPoints', coordinates.slice(0, 2));
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildTaperedArrow(coordinates));
    this.handleManager.refresh(coordinates.slice(0, 2));
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
   * 程序化添加一个斜箭头
   * @param start 箭尾中心点坐标
   * @param end 箭头尖端点坐标
   * @returns 创建的要素对象
   */
  addArrow(start: number[], end: number[]): Feature {
    return this.addFeature([start, end]);
  }

  /**
   * 获取箭尾中心点坐标
   * @returns 箭尾中心坐标，如果无活动要素则返回 null
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
}
