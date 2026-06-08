import Map from 'ol/Map';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { BaseTool } from '../core/BaseTool';

export class PolygonTool extends BaseTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, config);
    this.drawType = DrawType.Polygon;
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    return new Polygon([coordinates]);
  }

  /** coordinates: outer ring points, e.g. [[x1,y1],[x2,y2],...] */
  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature) return;
    (this.activeFeature.getGeometry() as Polygon).setCoordinates([coordinates]);
  }

  /** Returns the outer ring coordinates */
  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.getGeometry() as Polygon).getCoordinates()[0] ?? [];
  }

  getPointCount(): number {
    const coords = this.getCoordinates();
    return coords.length > 1 ? coords.length - 1 : coords.length;
  }

  updatePoint(index: number, coordinate: number[]): void {
    const coords = this.getCoordinates();
    if (index < 0 || index >= coords.length - 1) return;
    coords[index] = coordinate;
    if (index === 0) coords[coords.length - 1] = coordinate;
    this.setCoordinates(coords);
  }
}
