import OlMap from 'ol/Map';
import Modify from 'ol/interaction/Modify';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import OlFeature from 'ol/Feature';
import OlStyle from 'ol/style/Style';
import { Point } from 'ol/geom';
import type { Geometry, LineString } from 'ol/geom';

import { DrawEvent, ZIndex } from '../../constants/index';
import { safeRemoveInteraction } from '../../utils/index';
import type { EventDispatcher } from './EventDispatcher';

export class EditingSystem {
  private modifyInteraction: Modify | null = null;
  private selectedFeature: OlFeature<LineString> | null = null;
  private vertexSource: VectorSource<OlFeature<Point>>;
  private vertexLayer: VectorLayer<VectorSource<OlFeature<Point>>>;

  constructor(
    private map: OlMap,
    private layer: VectorLayer<VectorSource<OlFeature<Geometry>>>,
    private eventDispatcher: EventDispatcher,
    buildVertexStyle: () => OlStyle,
  ) {
    this.vertexSource = new VectorSource<OlFeature<Point>>();
    this.vertexLayer = new VectorLayer({
      source: this.vertexSource,
      style: buildVertexStyle(),
      zIndex: ZIndex.VERTEX_LAYER,
      properties: { id: 'vertex', drawToolType: 'vertex' },
    });
    this.map.addLayer(this.vertexLayer);
  }

  enter(feature: OlFeature<LineString>): void {
    if (this.selectedFeature === feature) return;

    this.exit();
    this.selectedFeature = feature;

    this.renderVertexHandles(feature);
    this.mountModify(feature);
  }

  exit(): void {
    this.unmountModify();
    this.clearVertexHandles();
    this.selectedFeature = null;
  }

  getSelectedFeature(): OlFeature<LineString> | null {
    return this.selectedFeature;
  }

  private mountModify(feature: OlFeature<LineString>): void {
    const modifySource = new VectorSource({
      features: [feature as OlFeature<Geometry>],
    });

    this.modifyInteraction = new Modify({
      source: modifySource,
      style: new OlStyle({}),
      hitDetection: this.layer,
      insertVertexCondition: () => false,
    });

    this.modifyInteraction.on('modifystart', () => {
      this.eventDispatcher.emit(DrawEvent.MODIFY_START, {
        features: [feature as OlFeature<Geometry>],
        tool: {} as any,
      });
    });

    this.modifyInteraction.on('modifyend', () => {
      this.renderVertexHandles(feature);
      this.eventDispatcher.emit(DrawEvent.MODIFY_END, {
        features: [feature as OlFeature<Geometry>],
        tool: {} as any,
      });
    });

    this.map.addInteraction(this.modifyInteraction);
  }

  private unmountModify(): void {
    safeRemoveInteraction(this.map, this.modifyInteraction);
    this.modifyInteraction = null;
  }

  private renderVertexHandles(feature: OlFeature<LineString>): void {
    this.clearVertexHandles();
    const geom = feature.getGeometry();
    if (!geom) return;
    geom.getCoordinates().forEach((coord) => {
      this.vertexSource.addFeature(new OlFeature({ geometry: new Point(coord) }));
    });
  }

  private clearVertexHandles(): void {
    this.vertexSource?.clear();
  }

  destroy(): void {
    this.exit();
    this.map.removeLayer(this.vertexLayer);
    (this.vertexSource as unknown) = null;
    (this.vertexLayer as unknown) = null;
  }
}
