import Map from 'ol/Map';
import Circle from 'ol/geom/Circle';
import type Geometry from 'ol/geom/Geometry';
import type Feature from 'ol/Feature';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { BaseTool } from '../core/BaseTool';

function dist(a: number[], b: number[]): number {
  return Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
}

export class CircleTool extends BaseTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, config);
    this.drawType = DrawType.Circle;
  }

  /**
   * coordinates[0] = center, coordinates[1] = a point on the circumference.
   * Radius is derived from the distance between them.
   */
  protected createGeometry(coordinates: number[][]): Geometry {
    const center = coordinates[0];
    const radius = dist(center, coordinates[1]);
    return new Circle(center, radius);
  }

  /**
   * Convenience method: add a circle from center + radius directly.
   * @param center map-projection coordinates [x, y]
   * @param radius radius in map units (metres in EPSG:3857)
   */
  addCircle(center: number[], radius: number): Feature {
    return this.addFeature([center, [center[0] + radius, center[1]]]);
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 2) return;
    const geom = this.activeFeature.getGeometry() as Circle;
    geom.setCenter(coordinates[0]);
    geom.setRadius(dist(coordinates[0], coordinates[1]));
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    const geom = this.activeFeature.getGeometry() as Circle;
    const center = geom.getCenter();
    return [center, [center[0] + geom.getRadius(), center[1]]];
  }

  getPointCount(): number {
    return this.activeFeature ? 2 : 0;
  }

  updatePoint(index: number, coordinate: number[]): void {
    if (index !== 0 && index !== 1) return;
    const coords = this.getCoordinates();
    coords[index] = coordinate;
    this.setCoordinates(coords);
  }

  getCenter(): number[] | null {
    if (!this.activeFeature) return null;
    return (this.activeFeature.getGeometry() as Circle).getCenter();
  }

  getRadius(): number {
    if (!this.activeFeature) return 0;
    return (this.activeFeature.getGeometry() as Circle).getRadius();
  }

  setRadius(radius: number): void {
    if (!this.activeFeature) return;
    (this.activeFeature.getGeometry() as Circle).setRadius(radius);
  }

  setCenter(center: number[]): void {
    if (!this.activeFeature) return;
    (this.activeFeature.getGeometry() as Circle).setCenter(center);
  }
}
