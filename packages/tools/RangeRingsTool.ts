import Map from 'ol/Map';
import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import GeometryCollection from 'ol/geom/GeometryCollection';
import type { StyleLike } from 'ol/style/Style';
import { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';
import type { InternalPlotConfig, RangeRingsPlotConfig } from '../types/config';
import type { PlotFeatureData, PlotRestoreOptions } from '../types/data';
import { buildRangeRingsGeometries } from '../geometry/rangeRings';
import { HandleBasedTool } from '../core/HandleBasedTool';
import { buildRangeRingsStyle } from '../style/rangeRings';

/** Distance rings tool. Two points define the center and maximum radius. */
export class RangeRingsTool extends HandleBasedTool {
  constructor(map: Map, config?: RangeRingsPlotConfig) {
    super(map, DrawType.RangeRings, config);
    this.layerManager.getLayer().setStyle(this.createFeatureStyle());
    this.selectManager.setStyle(buildRangeRingsStyle(this.config));
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      feature.set('rangeRingsSpacing', this.config.rangeRings.spacing);
      feature.set('rangeRingsUnit', this.config.rangeRings.unit);
    });
  }

  protected getPlotType(): string {
    return 'rangeRings';
  }

  protected createFeatureStyle(): StyleLike {
    return buildRangeRingsStyle(this.config);
  }

  protected onHandleSync(controlPoints: number[][]): void {
    if (!this.activeFeature) return;
    const points = controlPoints.slice(0, 2);
    const geom = this.activeFeature.getGeometry() as GeometryCollection;
    const next = buildRangeRingsGeometries(
      points,
      this.activeFeature.get('rangeRingsSpacing') ?? this.config.rangeRings.spacing,
      this.activeFeature.get('rangeRingsUnit') ?? this.config.rangeRings.unit,
      this.map.getView().getProjection(),
    );
    this.activeFeature.set('controlPoints', points);
    geom.set('_controlPoints', points);
    geom.set('rangeRingsSpacing', next.get('rangeRingsSpacing'));
    geom.set('rangeRingsUnit', next.get('rangeRingsUnit'));
    geom.setGeometries(next.getGeometries());
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    const geom = buildRangeRingsGeometries(
      coordinates.slice(0, 2),
      this.config.rangeRings.spacing,
      this.config.rangeRings.unit,
      this.map.getView().getProjection(),
    );
    return geom;
  }

  protected createFeature(coordinates: number[][]): Feature {
    const feature = super.createFeature(coordinates);
    feature.set('plotType', 'rangeRings');
    feature.set('controlPoints', coordinates.slice(0, 2));
    feature.set('rangeRingsSpacing', this.config.rangeRings.spacing);
    feature.set('rangeRingsUnit', this.config.rangeRings.unit);
    return feature;
  }

  restorePlotData(data: PlotFeatureData | PlotFeatureData[], options: PlotRestoreOptions = {}): Feature[] {
    const features = super.restorePlotData(data, options);
    features.forEach((feature) => {
      const points = (feature.get('controlPoints') as number[][] | undefined) ?? [];
      const spacing = feature.get('rangeRingsSpacing') ?? this.config.rangeRings.spacing;
      const unit = feature.get('rangeRingsUnit') ?? this.config.rangeRings.unit;
      feature.setGeometry(buildRangeRingsGeometries(points, spacing, unit, this.map.getView().getProjection()));
      feature.setStyle(buildRangeRingsStyle(this.config));
    });
    return features;
  }

  setStyleConfig(config?: InternalPlotConfig): this {
    if (this.activeFeature && config?.rangeRings) {
      if (config.rangeRings.spacing !== undefined) {
        this.activeFeature.set('rangeRingsSpacing', config.rangeRings.spacing);
      }
      if (config.rangeRings.unit !== undefined) {
        this.activeFeature.set('rangeRingsUnit', config.rangeRings.unit);
      }
      this.onHandleSync(this.getCoordinates());
    }
    super.setStyleConfig(config);
    this.activeFeature?.setStyle(buildRangeRingsStyle(this.config));
    this.selectManager.setStyle(buildRangeRingsStyle(this.config));
    return this;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 2) return;
    this.onHandleSync(coordinates);
    this.handleManager.refresh(coordinates.slice(0, 2));
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
}
