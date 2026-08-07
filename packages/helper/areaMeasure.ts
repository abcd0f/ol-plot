import OLMap from 'ol/Map';
import Overlay from 'ol/Overlay';
import Polygon from 'ol/geom/Polygon';
import { getArea } from 'ol/sphere';
import { unByKey } from 'ol/Observable';
import type Feature from 'ol/Feature';
import type { EventsKey } from 'ol/events';
import type { EventBus } from '../core/EventBus';
import type { AreaMeasureUnit, ResolvedPlotConfig } from '../types/config';
import { DrawEvent } from '../constants/events';
import type { DrawType } from '../constants/drawType';

const SQUARE_METERS_PER_SQUARE_NAUTICAL_MILE = 1852 * 1852;

interface Label {
  position: number[];
  text: string;
}

export class AreaMeasureManager {
  private map: OLMap;
  private unit: AreaMeasureUnit;
  private labelStyle: Partial<CSSStyleDeclaration>;

  private groups = new Map<Feature, Overlay[]>();
  private changeKeys = new Map<Feature, EventsKey>();
  private sketchGroup: Overlay[] = [];
  private sketchKey: EventsKey | null = null;
  private renderFrame: number | null = null;
  private dirtyRenders = new Map<Overlay[], Polygon>();
  private shouldHandleFeature: (feature: Feature, drawType?: DrawType) => boolean;

  constructor(
    map: OLMap,
    eventBus: EventBus,
    config: ResolvedPlotConfig,
    shouldHandleFeature: (feature: Feature, drawType?: DrawType) => boolean = () => true,
  ) {
    this.map = map;
    this.unit = config.areaMeasure.unit!;
    this.labelStyle = config.areaMeasure.labelStyle!;
    this.shouldHandleFeature = shouldHandleFeature;

    eventBus.on(DrawEvent.DRAW_START, ({ feature, drawType }: { feature: Feature; drawType?: DrawType }) => {
      if (!this.shouldHandleFeature(feature, drawType)) return;
      const geom = feature.getGeometry() as Polygon;
      this.sketchKey = geom.on('change', () => this.requestRender(this.sketchGroup, geom));
      this.renderNow(this.sketchGroup, geom);
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
    const geom = feature.getGeometry() as Polygon;
    const group: Overlay[] = [];
    this.groups.set(feature, group);
    this.changeKeys.set(
      feature,
      geom.on('change', () => this.requestRender(group, geom)),
    );
    this.renderNow(group, geom);
  }

  setStyleConfig(config: ResolvedPlotConfig): void {
    this.unit = config.areaMeasure.unit!;
    this.labelStyle = config.areaMeasure.labelStyle!;

    this.groups.forEach((group, feature) => {
      this.applyLabelStyle(group);
      this.renderNow(group, feature.getGeometry() as Polygon);
    });
    this.applyLabelStyle(this.sketchGroup);
    const sketchGeom = this.dirtyRenders.get(this.sketchGroup);
    if (sketchGeom) this.renderNow(this.sketchGroup, sketchGeom);
  }

  removeFeature(feature: Feature): void {
    const group = this.groups.get(feature);
    if (group) {
      this.dirtyRenders.delete(group);
      group.forEach((o) => this.map.removeOverlay(o));
      this.groups.delete(feature);
    }

    const key = this.changeKeys.get(feature);
    if (key) {
      unByKey(key);
      this.changeKeys.delete(feature);
    }
  }

  private stopSketch(): void {
    if (this.sketchKey) {
      unByKey(this.sketchKey);
      this.sketchKey = null;
    }
    this.dirtyRenders.delete(this.sketchGroup);
    this.sketchGroup.forEach((o) => this.map.removeOverlay(o));
    this.sketchGroup.length = 0;
  }

  clear(): void {
    this.stopSketch();
    for (const feature of [...this.groups.keys()]) {
      this.removeFeature(feature);
    }
  }

  destroy(): void {
    this.clear();
    if (this.renderFrame !== null) {
      cancelAnimationFrame(this.renderFrame);
      this.renderFrame = null;
    }
    this.dirtyRenders.clear();
  }

  private requestRender(group: Overlay[], geom: Polygon): void {
    this.dirtyRenders.set(group, geom);
    if (this.renderFrame !== null) return;

    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = null;
      const pending = [...this.dirtyRenders.entries()];
      this.dirtyRenders.clear();
      pending.forEach(([dirtyGroup, dirtyGeom]) => this.renderNow(dirtyGroup, dirtyGeom));
    });
  }

  private renderNow(group: Overlay[], geom: Polygon): void {
    const labels = this.computeLabels(geom);

    while (group.length < labels.length) {
      const overlay = this.createOverlay();
      this.map.addOverlay(overlay);
      group.push(overlay);
    }
    while (group.length > labels.length) {
      this.map.removeOverlay(group.pop()!);
    }

    labels.forEach((label, i) => {
      group[i].getElement()!.innerText = label.text;
      group[i].setPosition(label.position);
    });
  }

  private computeLabels(geom: Polygon): Label[] {
    const ring = geom.getCoordinates()[0] ?? [];
    if (ring.length < 4) return [];

    const projection = this.map.getView().getProjection();
    const area = Math.abs(getArea(geom, { projection }));
    return [{ position: geom.getInteriorPoint().getCoordinates(), text: this.format(area) }];
  }

  private format(area: number): string {
    if (this.unit === 'km') return `${(area / 1000000).toFixed(2)} km²`;
    if (this.unit === 'nm') return `${(area / SQUARE_METERS_PER_SQUARE_NAUTICAL_MILE).toFixed(2)} nm²`;
    return `${area.toFixed(2)} m²`;
  }

  private createOverlay(): Overlay {
    const element = document.createElement('div');
    Object.assign(element.style, this.labelStyle);
    return new Overlay({ element, offset: [0, -12], positioning: 'bottom-center', stopEvent: false });
  }

  private applyLabelStyle(group: Overlay[]): void {
    group.forEach((overlay) => {
      const element = overlay.getElement();
      if (element) Object.assign(element.style, this.labelStyle);
    });
  }
}
