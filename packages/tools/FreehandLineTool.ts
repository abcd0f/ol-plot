import Map from 'ol/Map';
import LineString from 'ol/geom/LineString';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { BaseTool } from '../core/BaseTool';

export class FreehandLineTool extends BaseTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, config);
    this.drawType = DrawType.FreehandLine;
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    return new LineString(coordinates);
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature) return;
    (this.activeFeature.getGeometry() as LineString).setCoordinates(coordinates);
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.getGeometry() as LineString).getCoordinates();
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
}
