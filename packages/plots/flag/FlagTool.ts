import Map from 'ol/Map';
import Feature from 'ol/Feature';
import GeometryCollection from 'ol/geom/GeometryCollection';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../../kernel/types/config';
import { DrawType } from '../../kernel/constants/drawType';
import { HandleBasedTool } from '../../engine/tool/HandleBasedTool';
import { buildFlagGeometries, getFlagControlPoints, normalizeFlagControlPoints } from './geometry';

/**
 * 旗帜（Flag）绘制工具类，继承自 HandleBasedTool。
 *
 * 由两个控制点确定：
 *  - P0: 旗面贴杆侧的一个顶点
 *  - P1: 旗杆尾部横向平移到旗面尾边后的点
 *
 * 比例关系：
 *  - poleLength = |P1.y - P0.y|（用户直接控制）
 *  - flagHeight = poleLength × 0.4
 *  - flagWidth  = flagHeight × 2.5
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

  // ─── HandleBasedTool 实现 ─────────────────────────────────────────────────

  protected getPlotType(): string {
    return 'flag';
  }

  protected onHandleSync(controlPoints: number[][]): void {
    if (!this.activeFeature) return;
    const points = normalizeFlagControlPoints(controlPoints.slice(0, 2));
    this.activeFeature.set('controlPoints', points);
    const geom = this.activeFeature.getGeometry() as GeometryCollection;
    const [pole, flag] = buildFlagGeometries(points);
    geom.setGeometries([pole, flag]);
    geom.set('_controlPoints', points);
    this.handleManager.refresh(points);
  }

  protected extractControlPoints(geom: Geometry): number[][] {
    return getFlagControlPoints(geom as GeometryCollection);
  }

  protected normalizeControlPoints(controlPoints: number[][]): number[][] {
    return normalizeFlagControlPoints(controlPoints.slice(0, 2));
  }

  // ─── 抽象方法实现 ─────────────────────────────────────────────────────────

  protected createGeometry(coordinates: number[][]): Geometry {
    const points = normalizeFlagControlPoints(coordinates.slice(0, 2));
    const [pole, flag] = buildFlagGeometries(points);
    const geom = new GeometryCollection([pole, flag]);
    geom.set('_controlPoints', points);
    return geom;
  }

  protected createFeature(coordinates: number[][]): Feature {
    const points = normalizeFlagControlPoints(coordinates.slice(0, 2));
    const feature = super.createFeature(points);
    feature.set('plotType', 'flag');
    feature.set('controlPoints', points);
    return feature;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 2) return;
    const points = normalizeFlagControlPoints(coordinates.slice(0, 2));
    this.activeFeature.set('controlPoints', points);
    const geom = this.activeFeature.getGeometry() as GeometryCollection;
    const [pole, flag] = buildFlagGeometries(points);
    geom.setGeometries([pole, flag]);
    geom.set('_controlPoints', points);
    this.handleManager.refresh(points);
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
