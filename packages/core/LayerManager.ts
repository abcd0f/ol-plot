import Map from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import type Feature from 'ol/Feature';
import type Style from 'ol/style/Style';

/**
 * 图层管理器类，用于管理矢量图层及其数据源
 */
export class LayerManager {
  private map: Map;
  private source: VectorSource;
  private layer: VectorLayer;

  /**
   * 构造函数，初始化图层管理器
   * @param map 地图实例
   * @param style 图层样式
   */
  constructor(map: Map, style: Style) {
    this.map = map;
    this.source = new VectorSource();
    this.layer = new VectorLayer({ source: this.source, style });
    map.addLayer(this.layer);
  }

  /**
   * 获取矢量数据源
   * @returns 返回当前图层的矢量数据源
   */
  getSource(): VectorSource {
    return this.source;
  }

  /**
   * 获取矢量图层
   * @returns 返回当前管理的矢量图层
   */
  getLayer(): VectorLayer {
    return this.layer;
  }

  /**
   * 获取所有要素
   * @returns 返回数据源中的所有要素数组
   */
  getFeatures(): Feature[] {
    return this.source.getFeatures() as Feature[];
  }

  /**
   * 添加要素到数据源
   * @param feature 要添加的要素
   */
  addFeature(feature: Feature): void {
    this.source.addFeature(feature as any);
  }

  /**
   * 从数据源中移除指定要素
   * @param feature 要移除的要素
   */
  removeFeature(feature: Feature): void {
    this.source.removeFeature(feature as any);
  }

  /**
   * 清空数据源中的所有要素
   */
  clear(): void {
    this.source.clear();
  }

  /**
   * 销毁图层管理器，从地图中移除图层并清空数据源
   */
  destroy(): void {
    this.map.removeLayer(this.layer);
    this.source.clear();
  }
}
