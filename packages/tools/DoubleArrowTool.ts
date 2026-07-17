import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { HandleBasedTool } from '../core/HandleBasedTool';
import { buildDoubleArrow, normalizeDoubleArrowControlPoints } from '../geometry/arrow/double';

/**
 * 双箭头绘制工具类，继承自 HandleBasedTool。
 *
 * 控制点定义：
 *  - P0 / P1: 双箭头底部两侧点
 *  - P2 / P3: 两个箭头尖端点
 *  - P4: 中间连接点，绘制完成后自动生成，可在编辑时拖拽
 *
 * 编辑模式：
 * 禁用默认 ModifyManager，使用 HandleManager 暴露 5 个控制点，拖拽时重新生成箭头 Polygon。
 */
export class DoubleArrowTool extends HandleBasedTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.DoubleArrow, config);
  }

  // ─── HandleBasedTool implementations ──────────────────────────────────────

  protected getPlotType(): string {
    return 'doubleArrow';
  }

  protected onHandleSync(controlPoints: number[][]): void {
    if (!this.activeFeature || controlPoints.length < 3) return;

    const normalized = normalizeDoubleArrowControlPoints(controlPoints);
    this.activeFeature.set('controlPoints', normalized);
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildDoubleArrow(normalized));
  }

  protected normalizeControlPoints(controlPoints: number[][]): number[][] {
    return normalizeDoubleArrowControlPoints(controlPoints);
  }

  // ─── Abstract implementations ─────────────────────────────────────────────

  protected createGeometry(coordinates: number[][]): Geometry {
    return new Polygon(buildDoubleArrow(coordinates));
  }

  addFeature(coordinates: number[][]): Feature {
    const normalized = normalizeDoubleArrowControlPoints(coordinates);
    const feature = new Feature({ geometry: this.createGeometry(normalized) });
    feature.set('plotType', 'doubleArrow');
    feature.set('controlPoints', normalized);
    this.layerManager.addFeature(feature);
    return feature;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 3) return;

    const normalized = normalizeDoubleArrowControlPoints(coordinates);
    this.activeFeature.set('controlPoints', normalized);
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildDoubleArrow(normalized));
    this.handleManager.refresh(normalized);
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.get('controlPoints') as number[][]) || [];
  }

  getPointCount(): number {
    return this.getCoordinates().length;
  }

  updatePoint(index: number, coordinate: number[]): void {
    const coords = this.getCoordinates();
    if (index < 0 || index >= coords.length) return;

    coords[index] = coordinate;
    this.setCoordinates(coords);
  }

  // ─── Convenience API ──────────────────────────────────────────────────────

  /**
   * 程序化添加一个双箭头。
   */
  addDoubleArrow(p1: number[], p2: number[], p3: number[], p4?: number[], connPoint?: number[]): Feature {
    return this.addFeature([p1, p2, p3, ...(p4 ? [p4] : []), ...(connPoint ? [connPoint] : [])]);
  }

  /**
   * 获取中间连接点坐标。
   */
  getConnectionPoint(): number[] | null {
    const coords = this.getCoordinates();
    return coords.length >= 5 ? coords[4] : null;
  }
}
