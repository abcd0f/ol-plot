import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { HandleBasedTool } from '../core/HandleBasedTool';
import { buildRectangle, getRectangleControlPoints } from '../geometry/rectangle';

/**
 * 矩形绘制工具类，继承自 HandleBasedTool
 * 通过两个控制点（对角点）确定矩形，支持自定义编辑手柄
 */
export class RectangleTool extends HandleBasedTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Rectangle, config);
  }

  // ─── HandleBasedTool implementations ──────────────────────────────────────

  protected getPlotType(): string {
    return 'rectangle';
  }

  protected onHandleSync(controlPoints: number[][]): void {
    if (!this.activeFeature) return;
    this.activeFeature.set('controlPoints', controlPoints);
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildRectangle(controlPoints));
  }

  protected extractControlPoints(geom: Geometry): number[][] {
    return getRectangleControlPoints(geom as Polygon);
  }

  // ─── Abstract implementations ─────────────────────────────────────────────

  protected createGeometry(coordinates: number[][]): Geometry {
    return new Polygon(buildRectangle(coordinates.slice(0, 2)));
  }

  addFeature(coordinates: number[][]): Feature {
    const feature = super.addFeature(coordinates);
    feature.set('plotType', 'rectangle');
    feature.set('controlPoints', coordinates.slice(0, 2));
    return feature;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 2) return;
    this.activeFeature.set('controlPoints', coordinates.slice(0, 2));
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildRectangle(coordinates.slice(0, 2)));
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

  addRectangle(startPoint: number[], endPoint: number[]): Feature {
    return this.addFeature([startPoint, endPoint]);
  }

  getCenter(): number[] | null {
    const coords = this.getCoordinates();
    if (coords.length < 2) return null;
    return [(coords[0][0] + coords[1][0]) / 2, (coords[0][1] + coords[1][1]) / 2];
  }

  getWidth(): number {
    const coords = this.getCoordinates();
    if (coords.length < 2) return 0;
    return Math.abs(coords[1][0] - coords[0][0]);
  }

  getHeight(): number {
    const coords = this.getCoordinates();
    if (coords.length < 2) return 0;
    return Math.abs(coords[1][1] - coords[0][1]);
  }
}
