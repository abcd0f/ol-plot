import Map from 'ol/Map';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { BaseTool } from '../core/BaseTool';

export class FreehandPolygonTool extends BaseTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.FreehandPolygon, config);
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    return new Polygon([this.closeRing(coordinates)]);
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature) return;
    (this.activeFeature.getGeometry() as Polygon).setCoordinates([this.closeRing(coordinates)]);
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.getGeometry() as Polygon).getCoordinates()[0] ?? [];
  }

  getPointCount(): number {
    const coordinates = this.getCoordinates();
    return coordinates.length > 1 ? coordinates.length - 1 : coordinates.length;
  }

  updatePoint(index: number, coordinate: number[]): void {
    const coordinates = this.getCoordinates();
    if (index < 0 || index >= coordinates.length - 1) return;

    coordinates[index] = coordinate;
    if (index === 0) coordinates[coordinates.length - 1] = coordinate;
    this.setCoordinates(coordinates);
  }

  private closeRing(coordinates: number[][]): number[][] {
    if (coordinates.length === 0) return [];

    const ring = coordinates.map((point) => point.slice());
    const first = ring[0];
    const last = ring[ring.length - 1];

    if (ring.length === 1) {
      ring.push(first.slice(), first.slice());
      return ring;
    }

    if (!last || !this.coordinatesEqual(first, last)) {
      ring.push(first.slice());
    }

    return ring;
  }

  private coordinatesEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((value, index) => value === b[index]);
  }
}
