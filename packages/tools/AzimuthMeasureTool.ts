import Map from 'ol/Map';
import type Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import type Geometry from 'ol/geom/Geometry';
import type { AzimuthMeasurePlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { mergeRuntimeConfig } from '../constants';
import { BaseTool } from '../core/BaseTool';
import { AzimuthMeasureManager } from '../helper/azimuthMeasure';

export class AzimuthMeasureTool extends BaseTool {
  private azimuthMeasureManager: AzimuthMeasureManager;

  constructor(map: Map, config?: AzimuthMeasurePlotConfig) {
    super(map, DrawType.AzimuthMeasure, config);
    this.azimuthMeasureManager = new AzimuthMeasureManager(map, this.eventBus, this.config);
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    return new LineString(coordinates);
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature) return;
    (this.activeFeature.getGeometry() as LineString).setCoordinates(coordinates.slice(0, 2));
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

  protected createFeature(coordinates: number[][]): Feature {
    const feature = super.createFeature(coordinates.slice(0, 2));
    this.azimuthMeasureManager.attachFeature(feature);
    return feature;
  }

  clearFeatures(): this {
    this.azimuthMeasureManager.clear();
    return super.clearFeatures();
  }

  setStyleConfig(config?: AzimuthMeasurePlotConfig): this {
    const result = super.setStyleConfig(config);
    if (config) this.azimuthMeasureManager.setStyleConfig(mergeRuntimeConfig(this.config, config));
    return result;
  }

  destroy(): void {
    this.azimuthMeasureManager.destroy();
    super.destroy();
  }
}
