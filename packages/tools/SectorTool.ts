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
import { buildModifyStyle } from '../utils';
import { buildSector, getSectorControlPoints } from '../utils/sector';

export class SectorTool extends BaseTool {
  private handleSource: VectorSource;
  private handleLayer: VectorLayer;
  private handleModify: Modify;
  private syncing = false;

  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Sector, config);

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

    this.bindSectorEvents();
  }

  private bindSectorEvents(): void {
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      const geom = feature.getGeometry() as Polygon;
      const controlPoints = getSectorControlPoints(geom);
      feature.set('plotType', 'sector');
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
    const sorted = handles.sort((a, b) => a.get('_handleIndex') - b.get('_handleIndex'));
    const controlPoints = sorted.map((h) => (h.getGeometry() as Point).getCoordinates());

    const prevControlPoints = this.activeFeature.get('controlPoints') as number[][];
    const [center, radiusPoint, anglePoint] = controlPoints;

    const radiusDist = Math.sqrt((radiusPoint[0] - center[0]) ** 2 + (radiusPoint[1] - center[1]) ** 2);
    const angleDist = Math.sqrt((anglePoint[0] - center[0]) ** 2 + (anglePoint[1] - center[1]) ** 2);

    const prevRadius = Math.sqrt(
      (prevControlPoints[1][0] - prevControlPoints[0][0]) ** 2 +
        (prevControlPoints[1][1] - prevControlPoints[0][1]) ** 2,
    );

    // 判断哪个端点被拖拽了（距离发生变化的那个决定新半径）
    let radius: number;
    if (Math.abs(radiusDist - prevRadius) > Math.abs(angleDist - prevRadius)) {
      radius = radiusDist;
    } else {
      radius = angleDist;
    }

    if (radius > 0) {
      const startAngle = Math.atan2(radiusPoint[1] - center[1], radiusPoint[0] - center[0]);
      controlPoints[1] = [center[0] + radius * Math.cos(startAngle), center[1] + radius * Math.sin(startAngle)];
      (sorted[1].getGeometry() as Point).setCoordinates(controlPoints[1]);

      const endAngle = Math.atan2(anglePoint[1] - center[1], anglePoint[0] - center[0]);
      controlPoints[2] = [center[0] + radius * Math.cos(endAngle), center[1] + radius * Math.sin(endAngle)];
      (sorted[2].getGeometry() as Point).setCoordinates(controlPoints[2]);
    }

    this.activeFeature.set('controlPoints', controlPoints);
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildSector(controlPoints));

    this.syncing = false;
  }

  // ─── Abstract implementations ─────────────────────────────────────────────

  protected createGeometry(coordinates: number[][]): Geometry {
    return new Polygon(buildSector(coordinates));
  }

  addFeature(coordinates: number[][]): Feature {
    const feature = super.addFeature(coordinates);
    feature.set('plotType', 'sector');
    feature.set('controlPoints', coordinates.slice(0, 3));
    return feature;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 3) return;
    this.activeFeature.set('controlPoints', coordinates.slice(0, 3));
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildSector(coordinates));
    this.refreshHandles();
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.get('controlPoints') as number[][]) || [];
  }

  getPointCount(): number {
    return this.activeFeature ? 3 : 0;
  }

  updatePoint(index: number, coordinate: number[]): void {
    if (index < 0 || index > 2) return;
    const coords = this.getCoordinates();
    if (coords.length < 3) return;
    coords[index] = coordinate;
    this.setCoordinates(coords);
  }

  // ─── Convenience API ──────────────────────────────────────────────────────

  addSector(center: number[], radiusPoint: number[], anglePoint: number[]): Feature {
    return this.addFeature([center, radiusPoint, anglePoint]);
  }

  getCenter(): number[] | null {
    const coords = this.getCoordinates();
    if (coords.length < 1) return null;
    return coords[0];
  }

  getRadius(): number {
    const coords = this.getCoordinates();
    if (coords.length < 2) return 0;
    const [center, radiusPoint] = coords;
    return Math.sqrt((radiusPoint[0] - center[0]) ** 2 + (radiusPoint[1] - center[1]) ** 2);
  }

  getAngles(): { start: number; end: number } | null {
    const coords = this.getCoordinates();
    if (coords.length < 3) return null;
    const [center, radiusPoint, anglePoint] = coords;
    const start = Math.atan2(radiusPoint[1] - center[1], radiusPoint[0] - center[0]);
    const end = Math.atan2(anglePoint[1] - center[1], anglePoint[0] - center[0]);
    return { start, end };
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
