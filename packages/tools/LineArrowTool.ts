import Map from 'ol/Map';
import Feature from 'ol/Feature';
import GeometryCollection from 'ol/geom/GeometryCollection';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { HandleBasedTool } from '../core/HandleBasedTool';
import { buildLineArrowGeometries } from '../geometry/arrow/line';

/**
 * 线箭头（LineArrow）绘制工具类，继承自 HandleBasedTool。
 *
 * 仅由两个控制点确定：
 *  - P0: 箭尾点
 *  - P1: 箭头尖端点
 *
 * 图形由 GeometryCollection 组成：
 *  - LineString: 箭身（P0 → P1），仅描边无填充
 *  - Polygon: 实心箭头头部（三角形），填充 + 描边
 *
 * 编辑模式：
 * 禁用默认 ModifyManager，使用 HandleManager 创建独立的 handle 图层，
 * 只暴露两个控制点供拖拽编辑，拖拽时重新生成箭头几何。
 */
export class LineArrowTool extends HandleBasedTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.LineArrow, config);
  }

  // ─── HandleBasedTool implementations ──────────────────────────────────────

  protected getPlotType(): string {
    return 'lineArrow';
  }

  protected onHandleSync(controlPoints: number[][]): void {
    if (!this.activeFeature) return;
    this.activeFeature.set('controlPoints', controlPoints);
    const geom = this.activeFeature.getGeometry() as GeometryCollection;
    const [line, arrowHead] = buildLineArrowGeometries(controlPoints);
    geom.setGeometries([line, arrowHead]);
  }

  // ─── Abstract implementations ─────────────────────────────────────────────

  protected createGeometry(coordinates: number[][]): Geometry {
    const [line, arrowHead] = buildLineArrowGeometries(coordinates);
    return new GeometryCollection([line, arrowHead]);
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
    const [line, arrowHead] = buildLineArrowGeometries(coordinates);
    geom.setGeometries([line, arrowHead]);
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

  addArrow(start: number[], end: number[]): Feature {
    return this.addFeature([start, end]);
  }

  getStart(): number[] | null {
    const coords = this.getCoordinates();
    if (coords.length < 2) return null;
    return coords[0];
  }

  getEnd(): number[] | null {
    const coords = this.getCoordinates();
    if (coords.length < 2) return null;
    return coords[1];
  }

  getLength(): number {
    const coords = this.getCoordinates();
    if (coords.length < 2) return 0;
    const [p0, p1] = coords;
    return Math.sqrt((p1[0] - p0[0]) ** 2 + (p1[1] - p0[1]) ** 2);
  }
}
