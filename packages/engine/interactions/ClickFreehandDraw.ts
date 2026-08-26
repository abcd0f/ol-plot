import Feature from 'ol/Feature';
import Map from 'ol/Map';
import MapBrowserEventType from 'ol/MapBrowserEventType';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import Interaction from 'ol/interaction/Interaction';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import type { StyleFunction } from 'ol/style/Style';
import BaseEvent from 'ol/events/Event';

type ClickFreehandGeometry = LineString | Polygon;
type ClickFreehandGeometryType = 'LineString' | 'Polygon';

class ClickFreehandDrawEvent extends BaseEvent {
  feature?: Feature<ClickFreehandGeometry>;

  constructor(type: string, feature?: Feature<ClickFreehandGeometry>) {
    super(type);
    this.feature = feature;
  }
}

/**
 * 自由线交互：
 * - 第一次点击确定起点
 * - 鼠标移动时持续采样坐标
 * - 第二次点击确定终点并提交要素
 */
export class ClickFreehandDraw extends Interaction {
  private readonly source: VectorSource;
  private readonly sketchSource = new VectorSource();
  private readonly sketchLayer: VectorLayer;
  private readonly canStartDraw: (event: MapBrowserEvent<any>) => boolean;
  private readonly geometryType: ClickFreehandGeometryType;

  private sketchFeature: Feature<ClickFreehandGeometry> | null = null;
  private points: number[][] = [];
  private lastPixel: number[] | null = null;
  private sketching = false;

  constructor(
    map: Map,
    source: VectorSource,
    style: StyleFunction,
    canStartDraw: (event: MapBrowserEvent<any>) => boolean,
    geometryType: ClickFreehandGeometryType = 'LineString',
  ) {
    super();
    this.source = source;
    this.canStartDraw = canStartDraw;
    this.geometryType = geometryType;
    this.sketchLayer = new VectorLayer({
      source: this.sketchSource,
      style,
    });
    this.sketchLayer.setMap(map);
  }

  handleEvent(event: MapBrowserEvent<any>): boolean {
    if (!this.getActive()) return true;

    if (event.type === MapBrowserEventType.POINTERMOVE) {
      if (!this.sketching) return true;
      this.appendPoint(event.coordinate, event.pixel);
      return false;
    }

    if (event.type === MapBrowserEventType.POINTERDRAG) {
      if (!this.sketching) return true;
      this.appendPoint(event.coordinate, event.pixel);
      return false;
    }

    if (event.type === MapBrowserEventType.POINTERDOWN) {
      return !this.sketching;
    }

    if (event.type !== MapBrowserEventType.CLICK) {
      return !this.sketching;
    }

    if (!this.sketching) {
      if (!this.canStartDraw(event)) return true;
      this.startDrawing(event.coordinate, event.pixel);
    } else {
      this.finishDrawing(event.coordinate, event.pixel);
    }

    return false;
  }

  isSketching(): boolean {
    return this.sketching;
  }

  abortDrawing(): void {
    if (!this.sketching) return;
    this.sketchSource.clear();
    this.sketchFeature = null;
    this.points = [];
    this.sketching = false;
    this.dispatchEvent(new ClickFreehandDrawEvent('drawabort'));
  }

  destroy(): void {
    this.sketchSource.clear();
    this.sketchFeature = null;
    this.points = [];
    this.lastPixel = null;
    this.sketching = false;
    this.sketchLayer.setMap(null);
  }

  private startDrawing(coordinate: number[], pixel: number[]): void {
    this.points = [coordinate.slice()];
    this.lastPixel = pixel.slice();
    this.sketchFeature = new Feature(this.createGeometry(this.points));
    this.sketchSource.addFeature(this.sketchFeature);
    this.sketching = true;
    this.dispatchEvent(new ClickFreehandDrawEvent('drawstart', this.sketchFeature));
  }

  private appendPoint(coordinate: number[], pixel?: number[]): void {
    if (!this.sketchFeature) return;

    const point = coordinate.slice();
    if (pixel && this.lastPixel) {
      const dx = pixel[0] - this.lastPixel[0];
      const dy = pixel[1] - this.lastPixel[1];
      if (dx * dx + dy * dy <= 16) return;
    }

    const lastPoint = this.points[this.points.length - 1];
    if (lastPoint && lastPoint.length === point.length && lastPoint.every((value, index) => value === point[index])) {
      return;
    }

    this.points.push(point);
    this.lastPixel = pixel?.slice() ?? this.lastPixel;
    this.updateGeometry(this.sketchFeature.getGeometry()!, this.points);
  }

  private finishDrawing(coordinate: number[], pixel: number[]): void {
    this.appendPoint(coordinate, pixel);
    if (!this.sketchFeature) return;

    if (this.points.length === 1) {
      this.points.push(this.points[0].slice());
      this.updateGeometry(this.sketchFeature.getGeometry()!, this.points);
    }

    const feature = this.sketchFeature;
    this.sketchSource.removeFeature(feature);
    this.source.addFeature(feature);
    this.sketchFeature = null;
    this.points = [];
    this.lastPixel = null;
    this.sketching = false;
    this.dispatchEvent(new ClickFreehandDrawEvent('drawend', feature));
  }

  private createGeometry(points: number[][]): ClickFreehandGeometry {
    if (this.geometryType === 'Polygon') return new Polygon([this.createClosedRing(points)]);
    return new LineString(points);
  }

  private updateGeometry(geometry: ClickFreehandGeometry, points: number[][]): void {
    if (this.geometryType === 'Polygon') {
      (geometry as Polygon).setCoordinates([this.createClosedRing(points)]);
      return;
    }

    (geometry as LineString).setCoordinates(points);
  }

  private createClosedRing(points: number[][]): number[][] {
    if (points.length === 0) return [];

    const ring = points.map((point) => point.slice());
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
