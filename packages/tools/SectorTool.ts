import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { HandleBasedTool } from '../core/HandleBasedTool';
import { buildSector, getSectorAngles } from '../geometry/sector';
import { dist } from '../utils';

/** 通过圆心、起始半径点和终止方向点绘制并编辑扇形。 */
export class SectorTool extends HandleBasedTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Sector, config);
    // 扇形只使用 HandleManager 编辑，避免默认 Modify 显示几何采样顶点。
    this.modifyManager.setActive(false);
  }
  protected getPlotType(): string {
    return 'sector';
  }

  protected extractControlPoints(geom: Geometry): number[][] {
    return ((geom.get('_controlPoints') as number[][] | undefined) ?? []).slice(0, 3);
  }
  protected onHandleSync(controlPoints: number[][]): void {
    if (!this.activeFeature) return;
    const points = controlPoints.slice(0, 3);
    const geom = this.activeFeature.getGeometry() as Polygon;
    this.activeFeature.set('controlPoints', points);
    geom.setCoordinates(buildSector(points));
    geom.set('_controlPoints', points);
  }
  protected createGeometry(coordinates: number[][]): Geometry {
    const points = coordinates.slice(0, 3);
    const geom = new Polygon(buildSector(points));
    geom.set('_controlPoints', points);
    return geom;
  }
  protected createFeature(coordinates: number[][]): Feature {
    const points = coordinates.slice(0, 3);
    const feature = super.createFeature(points);
    feature.set('plotType', 'sector');
    feature.set('controlPoints', points);
    return feature;
  }
  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 3) return;
    const points = coordinates.slice(0, 3);
    this.activeFeature.set('controlPoints', points);
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildSector(points));
    geom.set('_controlPoints', points);
    this.handleManager.refresh(points);
  }
  getCoordinates(): number[][] {
    return this.activeFeature ? ((this.activeFeature.get('controlPoints') as number[][] | undefined) ?? []) : [];
  }
  getPointCount(): number {
    return this.activeFeature ? 3 : 0;
  }
  updatePoint(index: number, coordinate: number[]): void {
    if (index < 0 || index > 2) return;
    const points = this.getCoordinates();
    if (points.length < 3) return;
    points[index] = coordinate;
    this.setCoordinates(points);
  }
  getCenter(): number[] | null {
    const points = this.getCoordinates();
    return points.length > 0 ? points[0] : null;
  }
  getRadius(): number {
    const points = this.getCoordinates();
    return points.length >= 2 ? dist(points[0], points[1]) : 0;
  }
  getAngles(): { start: number; end: number } | null {
    return getSectorAngles(this.getCoordinates());
  }
}
