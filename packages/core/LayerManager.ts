import Map from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import type Feature from 'ol/Feature';
import type Style from 'ol/style/Style';

export class LayerManager {
  private map: Map;
  private source: VectorSource;
  private layer: VectorLayer;

  constructor(map: Map, style: Style) {
    this.map = map;
    this.source = new VectorSource();
    this.layer = new VectorLayer({ source: this.source, style });
    map.addLayer(this.layer);
  }

  getSource(): VectorSource {
    return this.source;
  }

  getLayer(): VectorLayer {
    return this.layer;
  }

  getFeatures(): Feature[] {
    return this.source.getFeatures() as Feature[];
  }

  addFeature(feature: Feature): void {
    this.source.addFeature(feature as any);
  }

  clear(): void {
    this.source.clear();
  }

  destroy(): void {
    this.map.removeLayer(this.layer);
    this.source.clear();
  }
}
