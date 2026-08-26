import Map from 'ol/Map';
import Select from 'ol/interaction/Select';
import { click } from 'ol/events/condition';
import Collection from 'ol/Collection';
import type Feature from 'ol/Feature';
import type VectorLayer from 'ol/layer/Vector';
import type { StyleLike } from 'ol/style/Style';
import type { EventBus } from '../runtime/EventBus';
import type { ResolvedPlotConfig } from '../../kernel/types/config';
import { DrawEvent } from '../../kernel/constants/events';
import { buildSelectStyle } from '../../shared-style/select';

/** 放宽窄线要素的命中范围，便于选择。 */
export const FEATURE_HIT_TOLERANCE = 8;

/**
 * 选择管理器类，用于处理地图要素的选择交互
 */
export class SelectManager {
  private map: Map;
  private select: Select;
  private eventBus: EventBus;
  private selectionStyle: StyleLike | null;
  private previousStyles = new WeakMap<Feature, ReturnType<Feature['getStyle']>>();

  /**
   * 构造函数，初始化选择管理器
   * @param map 地图实例
   * @param layer 要进行选择操作的矢量图层
   * @param config 绘制配置对象
   * @param eventBus 事件总线实例
   */
  constructor(
    map: Map,
    layer: VectorLayer,
    config: ResolvedPlotConfig,
    eventBus: EventBus,
    selectedFeatures?: Collection<Feature>,
  ) {
    this.map = map;
    this.eventBus = eventBus;
    this.selectionStyle = buildSelectStyle(config);

    // 创建选择交互实例，配置选择条件、样式等参数
    this.select = new Select({
      layers: [layer],
      condition: click,
      hitTolerance: FEATURE_HIT_TOLERANCE,
      style: null,
      multi: false,
      features: selectedFeatures,
    });

    // 监听选择事件，根据选中或取消选中的要素触发相应的事件
    this.select.on('select', (e) => {
      e.deselected.forEach((feature) => this.restoreStyle(feature as Feature));
      if (e.selected.length > 0) {
        this.applyStyle(e.selected[0] as Feature);
        this.eventBus.emit(DrawEvent.SELECT, { feature: e.selected[0] });
      } else if (e.deselected.length > 0) {
        this.eventBus.emit(DrawEvent.DESELECT, { features: e.deselected });
      }
    });

    this.map.addInteraction(this.select);
  }

  /**
   * 获取当前选中的要素集合
   * @returns 选中的要素集合
   */
  getSelectedFeatures(): Collection<Feature> {
    return this.select.getFeatures() as Collection<Feature>;
  }

  /**
   * 当前是否没有任何选中要素
   * @returns 无选中时返回 true
   */
  isEmpty(): boolean {
    return this.select.getFeatures().getLength() === 0;
  }

  /** 以编程方式选中要素（如绘制完成后）。 */
  /**
   * 程序化选择指定要素（例如绘制完成后）
   * @param feature 要选择的要素
   */
  selectFeature(feature: Feature): void {
    const col = this.select.getFeatures();
    col.forEach((selected) => this.restoreStyle(selected as Feature));
    col.clear();
    col.push(feature as any);
    this.applyStyle(feature);
    this.eventBus.emit(DrawEvent.SELECT, { feature });
  }

  /**
   * 清除当前选择
   */
  clearSelection(): void {
    const features = this.select.getFeatures();
    features.forEach((feature) => this.restoreStyle(feature as Feature));
    features.clear();
    this.eventBus.emit(DrawEvent.DESELECT, { features: [] });
  }

  /**
   * 设置选择交互的激活状态
   * @param active 是否激活
   */
  setActive(active: boolean): void {
    this.select.setActive(active);
  }

  /**
   * 覆盖 Select 交互使用的样式。
   */
  setStyle(style: StyleLike | null): void {
    this.select.getFeatures().forEach((feature) => this.restoreStyle(feature as Feature));
    this.selectionStyle = style;
    this.select.getFeatures().forEach((feature) => this.applyStyle(feature as Feature));
  }

  /**
   * 销毁选择管理器，移除地图上的选择交互
   */
  destroy(): void {
    this.select.getFeatures().forEach((feature) => this.restoreStyle(feature as Feature));
    this.map.removeInteraction(this.select);
  }

  private applyStyle(feature: Feature): void {
    if (!this.selectionStyle) return;
    if (!this.previousStyles.has(feature)) this.previousStyles.set(feature, feature.getStyle());
    feature.setStyle(this.selectionStyle);
  }

  private restoreStyle(feature: Feature): void {
    if (!this.previousStyles.has(feature)) return;
    feature.setStyle(this.previousStyles.get(feature));
    this.previousStyles.delete(feature);
  }
}
