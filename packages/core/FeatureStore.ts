import Map from 'ol/Map';
import Collection from 'ol/Collection';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import type Feature from 'ol/Feature';
import type { StyleLike } from 'ol/style/Style';

/** Owns the business feature source, layer, and shared selection collection. */
export class FeatureStore {
  protected readonly map: Map;
  protected readonly source: VectorSource;
  protected readonly layer: VectorLayer;
  protected readonly selectedFeatures: Collection<Feature>;

  constructor(map: Map, style: StyleLike) {
    this.map = map;
    this.source = new VectorSource();
    this.layer = new VectorLayer({ source: this.source, style });
    this.selectedFeatures = new Collection<Feature>();
    map.addLayer(this.layer);
  }

  getSource(): VectorSource { return this.source; }
  getLayer(): VectorLayer { return this.layer; }
  getSelectedFeatures(): Collection<Feature> { return this.selectedFeatures; }
  getFeatures(): Feature[] { return this.source.getFeatures() as Feature[]; }
  appendFeature(feature: Feature): void { this.source.addFeature(feature as any); }
  removeFeature(feature: Feature): void {
    this.selectedFeatures.remove(feature as any);
    this.source.removeFeature(feature as any);
  }
  hasFeature(feature: Feature): boolean { return this.source.hasFeature(feature as any); }
  clear(): void { this.selectedFeatures.clear(); this.source.clear(); }
  destroy(): void { this.clear(); this.map.removeLayer(this.layer); }
}
