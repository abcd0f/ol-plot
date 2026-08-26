import Map from 'ol/Map';
import LineString from 'ol/geom/LineString';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { BaseTool } from '../core/BaseTool';

/**
 * 自由手绘线工具类，继承自基础工具类。
 */
export class FreehandLineTool extends BaseTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.FreehandLine, config);
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
    const coordinates = this.getCoordinates();
    if (index < 0 || index >= coordinates.length) return;
    coordinates[index] = coordinate;
    this.setCoordinates(coordinates);
  }
}
