import Map from 'ol/Map';
import Point from 'ol/geom/Point';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { BaseTool } from '../core/BaseTool';

export class PointTool extends BaseTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, config);
    this.drawType = DrawType.Point;
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    return new Point(coordinates[0]);
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 1) return;
    (this.activeFeature.getGeometry() as Point).setCoordinates(coordinates[0]);
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return [(this.activeFeature.getGeometry() as Point).getCoordinates()];
  }

  getPointCount(): number {
    return this.activeFeature ? 1 : 0;
  }

  updatePoint(index: number, coordinate: number[]): void {
    if (index !== 0) return;
    this.setCoordinates([coordinate]);
  }

  getPosition(): number[] | null {
    if (!this.activeFeature) return null;
    return (this.activeFeature.getGeometry() as Point).getCoordinates();
  }
}
