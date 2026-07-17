import Map from 'ol/Map';
import Feature from 'ol/Feature';
import GeometryCollection from 'ol/geom/GeometryCollection';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { HandleBasedTool } from '../core/HandleBasedTool';
import { buildFlagGeometries, getFlagControlPoints } from '../geometry/flag';

/**
 * 旗帜（Flag）绘制工具类，继承自 HandleBasedTool。
 *
 * 由两个控制点确定：
 *  - P0: 旗杆顶部（旗帜附着点，同时也是旗面左上角）
 *  - P1: 旗杆底部平移旗帜宽度后的点
 *
 * 比例关系：
 *  - flagWidth  = |P1.x - P0.x|（用户直接控制）
 *  - poleLength = |P1.y - P0.y|（用户直接控制）
 *  - flagHeight = poleLength × 0.4（自动缩放）
 *
 * 图形由 GeometryCollection 组成：
 *  - LineString: 旗杆（从 poleBottom 到 P0），仅描边无填充
 *  - Polygon: 旗面矩形，填充 + 描边
 *
 * 编辑模式：
 * 禁用默认 ModifyManager，使用 HandleManager 创建独立的 handle 图层，
 * 只暴露两个控制点（P0 / P1）供拖拽编辑，拖拽时重新生成旗帜几何。
 */
export class FlagTool extends HandleBasedTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Flag, config);
  }

  // ─── HandleBasedTool implementations ──────────────────────────────────────

  protected getPlotType(): string {
    return 'flag';
  }

  protected onHandleSync(controlPoints: number[][]): void {
    if (!this.activeFeature) return;
    this.activeFeature.set('controlPoints', [...controlPoints]);
    const geom = this.activeFeature.getGeometry() as GeometryCollection;
    const [pole, flag] = buildFlagGeometries(controlPoints);
    geom.setGeometries([pole, flag]);
  }

  protected extractControlPoints(geom: Geometry): number[][] {
    return getFlagControlPoints(geom as GeometryCollection);
  }

  // ─── Abstract implementations ─────────────────────────────────────────────

  protected createGeometry(coordinates: number[][]): Geometry {
    const [pole, flag] = buildFlagGeometries(coordinates);
    return new GeometryCollection([pole, flag]);
  }

  addFeature(coordinates: number[][]): Feature {
    const feature = super.addFeature(coordinates);
    feature.set('plotType', 'flag');
    feature.set('controlPoints', coordinates.slice(0, 2));
    return feature;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 2) return;
    this.activeFeature.set('controlPoints', coordinates.slice(0, 2));
    const geom = this.activeFeature.getGeometry() as GeometryCollection;
    const [pole, flag] = buildFlagGeometries(coordinates);
    geom.setGeometries([pole, flag]);
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
   * 程序化添加一面旗帜。
   *
   * @param poleTop          旗杆顶部（旗帜附着点）
   * @param poleBottomOffset  旗杆底部 + 旗帜宽度偏移的点
   * @returns 创建的要素对象
   */
  addFlag(poleTop: number[], poleBottomOffset: number[]): Feature {
    return this.addFeature([poleTop, poleBottomOffset]);
  }

  /**
   * 获取旗杆长度。
   *
   * @returns 旗杆长度，如果无活动要素则返回 0
   */
  getPoleLength(): number {
    const coords = this.getCoordinates();
    if (coords.length < 2) return 0;
    return Math.abs(coords[1][1] - coords[0][1]);
  }

  /**
   * 获取旗帜宽度。
   *
   * @returns 旗帜宽度，如果无活动要素则返回 0
   */
  getFlagWidth(): number {
    const coords = this.getCoordinates();
    if (coords.length < 2) return 0;
    return Math.abs(coords[1][0] - coords[0][0]);
  }
}
