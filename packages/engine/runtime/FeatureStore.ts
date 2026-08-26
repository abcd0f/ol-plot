import Map from 'ol/Map';
import Collection from 'ol/Collection';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import type Feature from 'ol/Feature';
import type { StyleLike } from 'ol/style/Style';

/** 管理业务要素源、图层及共享选择集合。 */
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

  /** 获取要素源。 */
  getSource(): VectorSource { return this.source; }
  /** 获取要素图层。 */
  getLayer(): VectorLayer { return this.layer; }
  /** 获取共享选择集合。 */
  getSelectedFeatures(): Collection<Feature> { return this.selectedFeatures; }
  /** 获取全部要素。 */
  getFeatures(): Feature[] { return this.source.getFeatures() as Feature[]; }
  /** 添加要素。 */
  appendFeature(feature: Feature): void { this.source.addFeature(feature as any); }
  /** 移除要素。 */
  removeFeature(feature: Feature): void {
    this.selectedFeatures.remove(feature as any);
    this.source.removeFeature(feature as any);
  }
  /** 判断要素是否存在。 */
  hasFeature(feature: Feature): boolean { return this.source.hasFeature(feature as any); }
  /** 清空要素与选择集合。 */
  clear(): void { this.selectedFeatures.clear(); this.source.clear(); }
  /** 销毁要素图层。 */
  destroy(): void { this.clear(); this.map.removeLayer(this.layer); }
}
