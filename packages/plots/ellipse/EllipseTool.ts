import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../../kernel/types/config';
import { DrawType } from '../../kernel/constants/drawType';
import { HandleBasedTool } from '../../engine/tool/HandleBasedTool';
import { buildEllipse, type EllipseRadii, getEllipseCenter, getEllipseControlPoints } from './geometry';
import { projectedDistanceMeters } from '../../kernel/utils';

export class EllipseTool extends HandleBasedTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Ellipse, config);
  }

  protected getPlotType(): string {
    return 'ellipse';
  }

  protected onHandleSync(controlPoints: number[][]): void {
    if (!this.activeFeature) return;
    const points = controlPoints.slice(0, 2);
    this.activeFeature.set('controlPoints', points);
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildEllipse(points));
    geom.set('_controlPoints', points);
  }

  protected extractControlPoints(geom: Geometry): number[][] {
    return getEllipseControlPoints(geom as Polygon);
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    const points = coordinates.slice(0, 2);
    const geom = new Polygon(buildEllipse(points));
    geom.set('_controlPoints', points);
    return geom;
  }

  protected createFeature(coordinates: number[][]): Feature {
    const feature = super.createFeature(coordinates);
    feature.set('plotType', 'ellipse');
    feature.set('controlPoints', coordinates.slice(0, 2));
    return feature;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 2) return;
    const points = coordinates.slice(0, 2);
    this.activeFeature.set('controlPoints', points);
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildEllipse(points));
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

  getCenter(): number[] | null {
    const coords = this.getCoordinates();
    if (coords.length < 2) return null;
    return getEllipseCenter(coords);
  }

  getRadii(): EllipseRadii | null {
    const coords = this.getCoordinates();
    if (coords.length < 2) return null;
    const projection = this.map.getView().getProjection();
    const center = getEllipseCenter(coords);
    const rx = projectedDistanceMeters(center, [coords[1][0], center[1]], projection);
    const ry = projectedDistanceMeters(center, [center[0], coords[1][1]], projection);
    return Object.assign([rx, ry] as [number, number], { rx, ry });
  }
}
