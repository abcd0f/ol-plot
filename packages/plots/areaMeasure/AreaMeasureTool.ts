import Map from 'ol/Map';
import type Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import type { AreaMeasurePlotConfig } from '../../kernel/types/config';
import { DrawType } from '../../kernel/constants/drawType';
import { BaseTool } from '../../engine/tool/BaseTool';
import { AreaMeasureManager } from './areaMeasure';

export class AreaMeasureTool extends BaseTool {
  private areaMeasureManager: AreaMeasureManager;

  constructor(map: Map, config?: AreaMeasurePlotConfig) {
    super(map, DrawType.AreaMeasure, config);
    this.areaMeasureManager = new AreaMeasureManager(map, this.eventBus, this.config);
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    return new Polygon([coordinates]);
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature) return;
    (this.activeFeature.getGeometry() as Polygon).setCoordinates([coordinates]);
  }

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

  protected createFeature(coordinates: number[][]): Feature {
    const feature = super.createFeature(coordinates);
    this.areaMeasureManager.attachFeature(feature);
    return feature;
  }

  clearFeatures(): this {
    this.areaMeasureManager.clear();
    return super.clearFeatures();
  }

  setStyleConfig(config?: AreaMeasurePlotConfig): this {
    return super.setStyleConfig(config);
  }

  destroy(): void {
    this.areaMeasureManager.destroy();
    super.destroy();
  }
}
