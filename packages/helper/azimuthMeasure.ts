import OLMap from 'ol/Map';
import Overlay from 'ol/Overlay';
import LineString from 'ol/geom/LineString';
import Circle from 'ol/geom/Circle';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import { getDistance } from 'ol/sphere';
import { getTransform } from 'ol/proj';
import { unByKey } from 'ol/Observable';
import type { EventsKey } from 'ol/events';
import type { EventBus } from '../core/EventBus';
import type { AzimuthMeasureConfig, MeasureUnit, ResolvedPlotConfig } from '../types/config';
import { DrawEvent } from '../constants/events';
import type { DrawType } from '../constants/drawType';

const METERS_PER_NAUTICAL_MILE = 1852;

export class AzimuthMeasureManager {
  private map: OLMap;
  private circleSource: VectorSource;
  private circleLayer: VectorLayer<VectorSource>;
  private unit: MeasureUnit;
  private labelStyle: Partial<CSSStyleDeclaration>;
  private groups = new Map<Feature, Overlay>();
  private circleGroups = new Map<Feature, Feature<Circle>>();
  private changeKeys = new Map<Feature, EventsKey>();
  private sketchOverlay: Overlay | null = null;
  private sketchCircle: Feature<Circle> | null = null;
  private sketchKey: EventsKey | null = null;
  private shouldHandleFeature: (feature: Feature, drawType?: DrawType) => boolean;

  constructor(
    map: OLMap,
    eventBus: EventBus,
    config: ResolvedPlotConfig,
    shouldHandleFeature: (feature: Feature, drawType?: DrawType) => boolean = () => true,
  ) {
    this.map = map;
    this.applyConfig(config.azimuthMeasure);
    this.circleSource = new VectorSource();
    this.circleLayer = new VectorLayer({
      source: this.circleSource,
      style: this.createCircleStyle(config),
    });
    this.map.addLayer(this.circleLayer);
    this.shouldHandleFeature = shouldHandleFeature;

    eventBus.on(DrawEvent.DRAW_START, ({ feature, drawType }: { feature: Feature; drawType?: DrawType }) => {
      if (!this.shouldHandleFeature(feature, drawType)) return;
      const geom = feature.getGeometry() as LineString;
      this.sketchKey = geom.on('change', () => this.renderSketch(geom));
      this.renderSketch(geom);
    });
    eventBus.on(DrawEvent.DRAW_END, ({ feature, drawType }: { feature: Feature; drawType?: DrawType }) => {
      if (!this.shouldHandleFeature(feature, drawType)) return;
      this.stopSketch();
      this.attachFeature(feature);
    });
    eventBus.on(DrawEvent.DRAW_ABORT, () => this.stopSketch());
    eventBus.on(DrawEvent.DELETE, ({ feature }: { feature: Feature }) => {
      if (!this.shouldHandleFeature(feature)) return;
      this.removeFeature(feature);
    });
  }

  attachFeature(feature: Feature): void {
    this.removeFeature(feature);
    const geom = feature.getGeometry() as LineString;
    const overlay = this.createOverlay();
    this.map.addOverlay(overlay);
    this.groups.set(feature, overlay);
    const circleFeature = new Feature(new Circle([0, 0], 0));
    this.circleSource.addFeature(circleFeature);
    this.circleGroups.set(feature, circleFeature);
    this.changeKeys.set(feature, geom.on('change', () => this.render(overlay, geom)));
    this.render(overlay, geom);
  }

  setStyleConfig(config: ResolvedPlotConfig): void {
    this.applyConfig(config.azimuthMeasure);
    this.circleLayer.setStyle(this.createCircleStyle(config));
    this.groups.forEach((overlay, feature) => {
      this.applyLabelStyle(overlay);
      this.render(overlay, feature.getGeometry() as LineString);
    });
    if (this.sketchOverlay) this.applyLabelStyle(this.sketchOverlay);
  }

  removeFeature(feature: Feature): void {
    const overlay = this.groups.get(feature);
    if (overlay) {
      this.map.removeOverlay(overlay);
      this.groups.delete(feature);
    }
    const circleFeature = this.circleGroups.get(feature);
    if (circleFeature) {
      this.circleSource.removeFeature(circleFeature);
      this.circleGroups.delete(feature);
    }
    const key = this.changeKeys.get(feature);
    if (key) {
      unByKey(key);
      this.changeKeys.delete(feature);
    }
  }

  clear(): void {
    this.stopSketch();
    for (const feature of [...this.groups.keys()]) this.removeFeature(feature);
  }

  destroy(): void {
    this.clear();
    this.map.removeLayer(this.circleLayer);
  }

  private applyConfig(config: AzimuthMeasureConfig): void {
    this.unit = config.unit!;
    this.labelStyle = config.labelStyle!;
  }

  private renderSketch(geom: LineString): void {
    if (!this.sketchOverlay) {
      this.sketchOverlay = this.createOverlay();
      this.map.addOverlay(this.sketchOverlay);
    }
    if (!this.sketchCircle) {
      this.sketchCircle = new Feature(new Circle([0, 0], 0));
      this.circleSource.addFeature(this.sketchCircle);
    }
    this.renderCircle(this.sketchCircle, geom);
    this.render(this.sketchOverlay, geom);
  }

  private stopSketch(): void {
    if (this.sketchKey) {
      unByKey(this.sketchKey);
      this.sketchKey = null;
    }
    if (this.sketchOverlay) {
      this.map.removeOverlay(this.sketchOverlay);
      this.sketchOverlay = null;
    }
    if (this.sketchCircle) {
      this.circleSource.removeFeature(this.sketchCircle);
      this.sketchCircle = null;
    }
  }

  private render(overlay: Overlay, geom: LineString): void {
    const coords = geom.getCoordinates();
    if (coords.length < 2) {
      overlay.setPosition(undefined);
      return;
    }
    const [start, end] = this.toLonLat(coords[0], coords[coords.length - 1]);
    const distance = getDistance(start, end);
    const bearing = this.getBearing(start, end);
    overlay.getElement()!.innerText = `距离 ${this.formatDistance(distance)} · 方位角 ${bearing.toFixed(2)}°`;
    overlay.setPosition(coords[coords.length - 1]);
    const circleFeature = overlay === this.sketchOverlay
      ? this.sketchCircle
      : this.findCircleFeature(overlay);
    if (circleFeature) this.renderCircle(circleFeature, geom);
  }

  private renderCircle(feature: Feature<Circle>, geom: LineString): void {
    const coords = geom.getCoordinates();
    if (coords.length < 2) {
      feature.setGeometry(new Circle(coords[0] ?? [0, 0], 0));
      return;
    }
    const start = coords[0];
    const end = coords[coords.length - 1];
    const radius = Math.hypot(end[0] - start[0], end[1] - start[1]);
    feature.setGeometry(new Circle(start, radius));
  }

  private findCircleFeature(overlay: Overlay): Feature<Circle> | null {
    for (const [feature, featureOverlay] of this.groups) {
      if (featureOverlay === overlay) return this.circleGroups.get(feature) ?? null;
    }
    return null;
  }

  private toLonLat(start: number[], end: number[]): [number[], number[]] {
    const transform = getTransform(this.map.getView().getProjection(), 'EPSG:4326');
    const values = [start[0], start[1], end[0], end[1]];
    transform(values, values, 2, 2);
    return [values.slice(0, 2), values.slice(2, 4)];
  }

  private getBearing(start: number[], end: number[]): number {
    const lat1 = (start[1] * Math.PI) / 180;
    const lat2 = (end[1] * Math.PI) / 180;
    const deltaLon = ((end[0] - start[0]) * Math.PI) / 180;
    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
    return (Math.atan2(y, x) * 180) / Math.PI < 0
      ? ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
      : (Math.atan2(y, x) * 180) / Math.PI;
  }

  private formatDistance(distance: number): string {
    if (this.unit === 'km') return `${(distance / 1000).toFixed(2)} km`;
    if (this.unit === 'nm') return `${(distance / METERS_PER_NAUTICAL_MILE).toFixed(2)} nm`;
    return `${distance.toFixed(2)} m`;
  }

  private createOverlay(): Overlay {
    const element = document.createElement('div');
    Object.assign(element.style, this.labelStyle);
    return new Overlay({ element, offset: [0, -12], positioning: 'bottom-center', stopEvent: false });
  }

  private createCircleStyle(config: ResolvedPlotConfig): Style {
    return new Style({
      stroke: new Stroke({ color: config.strokeColor, width: config.strokeWidth }),
      fill: new Fill({ color: config.fillColor }),
    });
  }

  private applyLabelStyle(overlay: Overlay): void {
    const element = overlay.getElement();
    if (element) Object.assign(element.style, this.labelStyle);
  }
}
