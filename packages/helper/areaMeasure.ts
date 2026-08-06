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

  constructor(map: OLMap, eventBus: EventBus, config: ResolvedPlotConfig) {
    this.map = map;
    this.unit = config.areaMeasure.unit!;
    this.labelStyle = config.areaMeasure.labelStyle!;

    eventBus.on(DrawEvent.DRAW_START, ({ feature }: { feature: Feature }) => {
      const geom = feature.getGeometry() as Polygon;
      this.sketchKey = geom.on('change', () => this.render(this.sketchGroup, geom));
      this.render(this.sketchGroup, geom);
    });

    eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      this.stopSketch();
      this.attachFeature(feature);
    });

    eventBus.on(DrawEvent.DRAW_ABORT, () => this.stopSketch());

    eventBus.on(DrawEvent.DELETE, ({ feature }: { feature: Feature }) => {
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
      geom.on('change', () => this.render(group, geom)),
    );
    this.render(group, geom);
  }

  removeFeature(feature: Feature): void {
    const group = this.groups.get(feature);
    if (group) {
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
  }

  private render(group: Overlay[], geom: Polygon): void {
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
    if (this.unit === 'square-meter') return `${area.toFixed(2)} m²`;
    if (this.unit === 'square-kilometer') return `${(area / 1000000).toFixed(2)} km²`;
    return area > 1000000 ? `${(area / 1000000).toFixed(2)} km²` : `${area.toFixed(2)} m²`;
  }

  private createOverlay(): Overlay {
    const element = document.createElement('div');
    Object.assign(element.style, this.labelStyle);
    return new Overlay({ element, offset: [0, -12], positioning: 'bottom-center', stopEvent: false });
  }
}
