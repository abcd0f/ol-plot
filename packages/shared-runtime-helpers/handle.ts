import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Modify from 'ol/interaction/Modify';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import type { EventBus } from '../engine/runtime/EventBus';
import type { ResolvedPlotConfig } from '../kernel/types/config';
import { DrawEvent } from '../kernel/constants/events';
import { buildModifyStyle } from '../shared-style/modify';

export type SyncCallback = (controlPoints: number[][]) => void;

export class HandleManager {
  handleSource: VectorSource;
  handleLayer: VectorLayer;
  handleModify: Modify;

  private map: Map;
  private eventBus: EventBus;
  private onSync: SyncCallback;
  private syncing = false;

  constructor(map: Map, eventBus: EventBus, config: ResolvedPlotConfig, onSync: SyncCallback) {
    this.map = map;
    this.eventBus = eventBus;
    this.onSync = onSync;

    this.handleSource = new VectorSource();
    this.handleLayer = new VectorLayer({
      source: this.handleSource,
      style: this.createHandleStyle(config),
    });
    map.addLayer(this.handleLayer);

    this.handleModify = new Modify({
      source: this.handleSource,
      style: buildModifyStyle(config),
    });
    this.handleModify.on('modifystart', () => {
      this.eventBus.emit(DrawEvent.MODIFY_START);
    });
    this.handleModify.on('modifyend', () => {
      // 工具类会在修改结束时携带当前要素派发事件。
    });
    map.addInteraction(this.handleModify);
  }

  setStyleConfig(config: ResolvedPlotConfig): void {
    this.handleLayer.setStyle(this.createHandleStyle(config));
    this.handleModify.getOverlay().setStyle(buildModifyStyle(config));
    this.handleLayer.changed();
  }

  show(controlPoints: number[][] | undefined): void {
    this.hide();
    if (!controlPoints || controlPoints.length === 0) return;

    controlPoints.forEach((pt, i) => {
      const handle = new Feature(new Point(pt));
      handle.set('_handleIndex', i);
      handle.getGeometry()!.on('change', () => this.sync());
      this.handleSource.addFeature(handle);
    });
  }

  hide(): void {
    this.handleSource.clear();
  }

  getControlPoints(): number[][] {
    return this.handleSource
      .getFeatures()
      .sort((a, b) => a.get('_handleIndex') - b.get('_handleIndex'))
      .map((h) => (h.getGeometry() as Point).getCoordinates());
  }

  refresh(controlPoints: number[][] | undefined): void {
    if (!controlPoints) return;

    const handles = this.handleSource.getFeatures().sort((a, b) => a.get('_handleIndex') - b.get('_handleIndex'));

    if (handles.length !== controlPoints.length) {
      this.show(controlPoints);
      return;
    }

    this.syncing = true;
    handles.forEach((h, i) => {
      (h.getGeometry() as Point).setCoordinates(controlPoints[i]);
    });
    this.syncing = false;
  }

  refreshExcept(controlPoints: number[][] | undefined, excludedIndex: number | null): void {
    if (!controlPoints) return;

    const handles = this.handleSource.getFeatures().sort((a, b) => a.get('_handleIndex') - b.get('_handleIndex'));

    if (handles.length !== controlPoints.length) return;

    this.syncing = true;
    handles.forEach((h, i) => {
      if (i === excludedIndex) return;
      (h.getGeometry() as Point).setCoordinates(controlPoints[i]);
    });
    this.syncing = false;
  }

  setOnSync(onSync: SyncCallback): void {
    this.onSync = onSync;
  }

  destroy(): void {
    this.hide();
    this.map.removeInteraction(this.handleModify);
    this.map.removeLayer(this.handleLayer);
  }

  private sync(): void {
    if (this.syncing) return;
    this.syncing = true;

    const controlPoints = this.getControlPoints();
    this.onSync(controlPoints);

    this.syncing = false;
  }

  private createHandleStyle(config: ResolvedPlotConfig): Style {
    const ns = config.nodeStyle;
    return new Style({
      image: new CircleStyle({
        radius: ns.radius ?? 6,
        fill: new Fill({ color: ns.fill ?? '#ffffff' }),
        stroke: new Stroke({
          color: ns.stroke ?? config.strokeColor,
          width: ns.strokeWidth ?? 2,
        }),
      }),
    });
  }
}
