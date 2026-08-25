import OLMap from 'ol/Map';
import Overlay from 'ol/Overlay';
import GeometryCollection from 'ol/geom/GeometryCollection';
import { getDistance } from 'ol/sphere';
import { toLonLat } from 'ol/proj';
import { unByKey } from 'ol/Observable';
import type Feature from 'ol/Feature';
import type { EventsKey } from 'ol/events';
import type { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';
import type { EventBus } from '../core/EventBus';
import type { DistanceUnit, ResolvedPlotConfig } from '../types/config';

const METERS_PER_NAUTICAL_MILE = 1852;

export class AzimuthManager {
  private map: OLMap;
  private unit: DistanceUnit;
  private labelStyle: Partial<CSSStyleDeclaration>;
  private groups = new Map<Feature, Overlay>();
  private changeKeys = new Map<Feature, EventsKey>();
  private sketchOverlay: Overlay | null = null;
  private sketchKey: EventsKey | null = null;
  private shouldHandleFeature: (feature: Feature, drawType?: DrawType) => boolean;

  constructor(
    map: OLMap,
    eventBus: EventBus,
    config: ResolvedPlotConfig,
    shouldHandleFeature: (feature: Feature, drawType?: DrawType) => boolean = () => true,
  ) {
    this.map = map;
    this.unit = config.measure.unit!;
    this.labelStyle = config.measure.labelStyle!;
    this.shouldHandleFeature = shouldHandleFeature;

    eventBus.on(DrawEvent.DRAW_START, ({ feature, drawType }: { feature: Feature; drawType?: DrawType }) => {
      if (!this.shouldHandleFeature(feature, drawType)) return;
      const geom = feature.getGeometry() as GeometryCollection;
      this.sketchOverlay = this.createOverlay();
      this.map.addOverlay(this.sketchOverlay);
      this.sketchKey = geom.on('change', () => this.render(this.sketchOverlay!, geom));
      this.render(this.sketchOverlay, geom);
    });
    eventBus.on(DrawEvent.DRAW_END, ({ feature, drawType }: { feature: Feature; drawType?: DrawType }) => {
      if (!this.shouldHandleFeature(feature, drawType)) return;
      this.stopSketch();
      this.attachFeature(feature);
    });
    eventBus.on(DrawEvent.DRAW_ABORT, () => this.stopSketch());
    eventBus.on(DrawEvent.DELETE, ({ feature }: { feature: Feature }) => {
      if (this.groups.has(feature)) this.removeFeature(feature);
    });
  }

  /** 为要素创建方位角标签。 */
  attachFeature(feature: Feature): void {
    this.removeFeature(feature);
    const geom = feature.getGeometry() as GeometryCollection;
    const overlay = this.createOverlay();
    this.map.addOverlay(overlay);
    this.groups.set(feature, overlay);
    this.changeKeys.set(feature, geom.on('change', () => this.render(overlay, geom)));
    this.render(overlay, geom);
  }

  /** 更新标签样式配置。 */
  setStyleConfig(config: ResolvedPlotConfig): void {
    this.unit = config.measure.unit!;
    this.labelStyle = config.measure.labelStyle!;
    this.groups.forEach((overlay, feature) => {
      Object.assign(overlay.getElement()?.style ?? {}, this.labelStyle);
      this.render(overlay, feature.getGeometry() as GeometryCollection);
    });
    if (this.sketchOverlay) Object.assign(this.sketchOverlay.getElement()?.style ?? {}, this.labelStyle);
  }

  /** 移除要素对应的标签。 */
  removeFeature(feature: Feature): void {
    const overlay = this.groups.get(feature);
    if (overlay) this.map.removeOverlay(overlay);
    this.groups.delete(feature);
    const key = this.changeKeys.get(feature);
    if (key) unByKey(key);
    this.changeKeys.delete(feature);
  }

  /** 清除全部标签。 */
  clear(): void {
    this.stopSketch();
    [...this.groups.keys()].forEach((feature) => this.removeFeature(feature));
  }

  /** 销毁管理器。 */
  destroy(): void {
    this.clear();
  }

  private stopSketch(): void {
    if (this.sketchKey) unByKey(this.sketchKey);
    this.sketchKey = null;
    if (this.sketchOverlay) this.map.removeOverlay(this.sketchOverlay);
    this.sketchOverlay = null;
  }

  private render(overlay: Overlay, geom: GeometryCollection): void {
    const points = (geom.get('_controlPoints') as number[][] | undefined) ?? [];
    if (points.length < 2) {
      overlay.getElement()!.innerText = '';
      return;
    }
    const [start, end] = points;
    const startLonLat = toLonLat(start, this.map.getView().getProjection());
    const endLonLat = toLonLat(end, this.map.getView().getProjection());
    const distance = getDistance(startLonLat, endLonLat);
    const azimuth = calculateBearing(startLonLat, endLonLat);
    overlay.getElement()!.innerText = `${this.format(distance)} · 方位角 ${azimuth.toFixed(2)}°`;
    overlay.setPosition([(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]);
  }

  private format(length: number): string {
    if (this.unit === 'km') return `${(length / 1000).toFixed(2)} km`;
    if (this.unit === 'nm') return `${(length / METERS_PER_NAUTICAL_MILE).toFixed(2)} nm`;
    return `${length.toFixed(2)} m`;
  }

  private createOverlay(): Overlay {
    const element = document.createElement('div');
    Object.assign(element.style, this.labelStyle);
    return new Overlay({ element, offset: [0, -12], positioning: 'bottom-center', stopEvent: false });
  }
}

/** 计算起点到终点的地理方位角。 */
export function calculateBearing(start: number[], end: number[]): number {
  const phi1 = (start[1] * Math.PI) / 180;
  const phi2 = (end[1] * Math.PI) / 180;
  const deltaLambda = ((end[0] - start[0]) * Math.PI) / 180;
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const degrees = (Math.atan2(y, x) * 180) / Math.PI;
  return (degrees + 360) % 360;
}
