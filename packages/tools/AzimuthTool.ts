import Map from 'ol/Map';
import Feature from 'ol/Feature';
import GeometryCollection from 'ol/geom/GeometryCollection';
import type Geometry from 'ol/geom/Geometry';
import { getDistance } from 'ol/sphere';
import { toLonLat } from 'ol/proj';
import type { MeasurePlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { HandleBasedTool } from '../core/HandleBasedTool';
import { AzimuthManager, calculateBearing } from '../helper/azimuth';
import { buildAzimuthGeometries } from '../geometry/azimuth';

export class AzimuthTool extends HandleBasedTool {
  private azimuthManager: AzimuthManager;

  constructor(map: Map, config?: MeasurePlotConfig) {
    super(map, DrawType.Azimuth, config);
    this.azimuthManager = new AzimuthManager(map, this.eventBus, this.config);
  }

  protected getPlotType(): string {
    return 'azimuth';
  }

  protected onHandleSync(controlPoints: number[][]): void {
    if (!this.activeFeature) return;
    const points = controlPoints.slice(0, 2);
    const geom = this.activeFeature.getGeometry() as GeometryCollection;
    const [line, circle] = buildAzimuthGeometries(points);
    this.activeFeature.set('controlPoints', points);
    geom.set('_controlPoints', points);
    geom.setGeometries([line, circle]);
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    const geom = new GeometryCollection(buildAzimuthGeometries(coordinates.slice(0, 2)));
    geom.set('_controlPoints', coordinates.slice(0, 2));
    return geom;
  }

  protected createFeature(coordinates: number[][]): Feature {
    const feature = super.createFeature(coordinates);
    feature.set('plotType', 'azimuth');
    feature.set('controlPoints', coordinates.slice(0, 2));
    this.azimuthManager.attachFeature(feature);
    return feature;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 2) return;
    const points = coordinates.slice(0, 2);
    const geom = this.activeFeature.getGeometry() as GeometryCollection;
    const [line, circle] = buildAzimuthGeometries(points);
    this.activeFeature.set('controlPoints', points);
    geom.set('_controlPoints', points);
    geom.setGeometries([line, circle]);
    this.handleManager.refresh(points);
  }

  getCoordinates(): number[][] {
    return this.activeFeature ? ((this.activeFeature.get('controlPoints') as number[][] | undefined) ?? []) : [];
  }

  getPointCount(): number {
    return this.activeFeature ? 2 : 0;
  }

  updatePoint(index: number, coordinate: number[]): void {
    if (index !== 0 && index !== 1) return;
    const points = this.getCoordinates();
    if (points.length < 2) return;
    points[index] = coordinate;
    this.setCoordinates(points);
  }

  getDistance(): number {
    const points = this.getCoordinates();
    if (points.length < 2) return 0;
    const projection = this.map.getView().getProjection();
    return getDistance(toLonLat(points[0], projection), toLonLat(points[1], projection));
  }

  getAzimuth(): number {
    const points = this.getCoordinates();
    if (points.length < 2) return 0;
    const projection = this.map.getView().getProjection();
    return calculateBearing(toLonLat(points[0], projection), toLonLat(points[1], projection));
  }

  clearFeatures(): this {
    this.azimuthManager.clear();
    return super.clearFeatures();
  }

  destroy(): void {
    this.azimuthManager.destroy();
    super.destroy();
  }
}
