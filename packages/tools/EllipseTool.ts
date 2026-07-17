import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { HandleBasedTool } from '../core/HandleBasedTool';
import { buildEllipse, getEllipseControlPoints } from '../geometry/ellipse';

export class EllipseTool extends HandleBasedTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Ellipse, config);
  }

  // ─── HandleBasedTool implementations ──────────────────────────────────────

  protected getPlotType(): string {
    return 'ellipse';
  }

  protected onHandleSync(controlPoints: number[][]): void {
    if (!this.activeFeature) return;
    this.activeFeature.set('controlPoints', controlPoints);
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildEllipse(controlPoints));
  }

  protected extractControlPoints(geom: Geometry): number[][] {
    return getEllipseControlPoints(geom as Polygon);
  }

  // ─── Abstract implementations ─────────────────────────────────────────────

  protected createGeometry(coordinates: number[][]): Geometry {
    return new Polygon(buildEllipse(coordinates));
  }

  addFeature(coordinates: number[][]): Feature {
    const feature = super.addFeature(coordinates);
    feature.set('plotType', 'ellipse');
    feature.set('controlPoints', coordinates.slice(0, 2));
    return feature;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 2) return;
    this.activeFeature.set('controlPoints', coordinates.slice(0, 2));
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildEllipse(coordinates));
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

  addEllipse(center: number[], edgePoint: number[]): Feature {
    return this.addFeature([center, edgePoint]);
  }

  getCenter(): number[] | null {
    const coords = this.getCoordinates();
    if (coords.length < 1) return null;
    return coords[0];
  }

  getRadii(): { rx: number; ry: number } | null {
    const coords = this.getCoordinates();
    if (coords.length < 2) return null;
    const [center, edgePoint] = coords;
    const rx = Math.abs(edgePoint[0] - center[0]);
    const ry = Math.abs(edgePoint[1] - center[1]);
    return { rx, ry };
  }
}
