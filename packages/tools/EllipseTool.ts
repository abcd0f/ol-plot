import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Modify from 'ol/interaction/Modify';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';
import { BaseTool } from '../core/BaseTool';
import { buildModifyStyle } from '../style/modify';
import { buildEllipse, getEllipseControlPoints } from '../geometry/ellipse';

export class EllipseTool extends BaseTool {
  private handleSource: VectorSource;
  private handleLayer: VectorLayer;
  private handleModify: Modify;
  private syncing = false;

  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Ellipse, config);

    this.modifyManager.setActive(false);

    const ns = this.config.nodeStyle;

    this.handleSource = new VectorSource();
    this.handleLayer = new VectorLayer({
      source: this.handleSource,
      style: new Style({
        image: new CircleStyle({
          radius: ns.radius ?? 6,
          fill: new Fill({ color: ns.fill ?? '#ffffff' }),
          stroke: new Stroke({
            color: ns.stroke ?? this.config.strokeColor,
            width: ns.strokeWidth ?? 2,
          }),
        }),
      }),
    });
    map.addLayer(this.handleLayer);

    this.handleModify = new Modify({
      source: this.handleSource,
      style: buildModifyStyle(this.config),
    });
    this.handleModify.on('modifystart', () => {
      this.eventBus.emit(DrawEvent.MODIFY_START);
    });
    this.handleModify.on('modifyend', () => {
      this.eventBus.emit(DrawEvent.MODIFY_END, { features: this.activeFeature ? [this.activeFeature] : [] });
    });
    map.addInteraction(this.handleModify);

    this.bindEllipseEvents();
  }

  private bindEllipseEvents(): void {
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      const geom = feature.getGeometry() as Polygon;
      const controlPoints = getEllipseControlPoints(geom);
      feature.set('plotType', 'ellipse');
      feature.set('controlPoints', controlPoints);
    });

    this.eventBus.on(DrawEvent.SELECT, ({ feature }: { feature: Feature }) => {
      this.showHandles(feature);
    });

    this.eventBus.on(DrawEvent.DESELECT, () => {
      this.hideHandles();
    });
  }

  private showHandles(feature: Feature): void {
    this.hideHandles();
    const controlPoints = feature.get('controlPoints') as number[][] | undefined;
    if (!controlPoints) return;

    controlPoints.forEach((pt, i) => {
      const handle = new Feature(new Point(pt));
      handle.set('_handleIndex', i);
      handle.getGeometry()!.on('change', () => this.syncFromHandles());
      this.handleSource.addFeature(handle);
    });
  }

  private hideHandles(): void {
    this.handleSource.clear();
  }

  private syncFromHandles(): void {
    if (this.syncing || !this.activeFeature) return;
    this.syncing = true;

    const handles = this.handleSource.getFeatures();
    const controlPoints = handles
      .sort((a, b) => a.get('_handleIndex') - b.get('_handleIndex'))
      .map((h) => (h.getGeometry() as Point).getCoordinates());

    this.activeFeature.set('controlPoints', controlPoints);
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildEllipse(controlPoints));

    this.syncing = false;
  }

  // ─── Abstract implementations ─────────────────────────────────────────────

  protected createGeometry(coordinates: number[][]): Geometry {
    return new Polygon(buildEllipse(coordinates));
  }

  addFeature(coordinates: number[][]): Feature {
    const feature = super.addFeature(coordinates);
    feature.set('plotType', 'ellipse');
    feature.set('controlPoints', coordinates.slice(0, 2));
    return feature;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 2) return;
    this.activeFeature.set('controlPoints', coordinates.slice(0, 2));
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildEllipse(coordinates));
    this.refreshHandles();
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.get('controlPoints') as number[][]) || [];
  }

  getPointCount(): number {
    return this.activeFeature ? 2 : 0;
  }

  updatePoint(index: number, coordinate: number[]): void {
    if (index !== 0 && index !== 1) return;
    const coords = this.getCoordinates();
    if (coords.length < 2) return;
    coords[index] = coordinate;
    this.setCoordinates(coords);
  }

  // ─── Convenience API ──────────────────────────────────────────────────────

  addEllipse(p1: number[], p2: number[]): Feature {
    return this.addFeature([p1, p2]);
  }

  getCenter(): number[] | null {
    const coords = this.getCoordinates();
    if (coords.length < 2) return null;
    return [(coords[0][0] + coords[1][0]) / 2, (coords[0][1] + coords[1][1]) / 2];
  }

  getRadii(): [number, number] | null {
    const coords = this.getCoordinates();
    if (coords.length < 2) return null;
    return [Math.abs(coords[1][0] - coords[0][0]) / 2, Math.abs(coords[1][1] - coords[0][1]) / 2];
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private refreshHandles(): void {
    if (!this.activeFeature) return;
    const controlPoints = this.activeFeature.get('controlPoints') as number[][] | undefined;
    if (!controlPoints) return;

    const handles = this.handleSource.getFeatures().sort((a, b) => a.get('_handleIndex') - b.get('_handleIndex'));
    if (handles.length !== controlPoints.length) {
      this.showHandles(this.activeFeature);
      return;
    }

    this.syncing = true;
    handles.forEach((h, i) => {
      (h.getGeometry() as Point).setCoordinates(controlPoints[i]);
    });
    this.syncing = false;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  destroy(): void {
    this.hideHandles();
    this.map.removeInteraction(this.handleModify);
    this.map.removeLayer(this.handleLayer);
    super.destroy();
  }
}
