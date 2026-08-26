import Map from 'ol/Map';
import Modify from 'ol/interaction/Modify';
import type Collection from 'ol/Collection';
import type Feature from 'ol/Feature';
import type VectorLayer from 'ol/layer/Vector';
import type { StyleLike } from 'ol/style/Style';
import type { EventBus } from '../runtime/EventBus';
import type { ResolvedPlotConfig } from '../../kernel/types/config';
import { DrawEvent } from '../../kernel/constants/events';
import { buildModifyStyle } from '../../shared-style/modify';

/**
 * 修改管理器类，用于处理地图要素的修改操作
 */
export class ModifyManager {
  private map: Map;
  private modify: Modify;
  private eventBus: EventBus;

  /**
   * 构造函数
   * @param map 地图实例
   * @param features 要素集合，用于修改操作
   * @param config 绘制配置对象
   * @param eventBus 事件总线实例
   */
  constructor(map: Map, features: Collection<Feature>, config: ResolvedPlotConfig, eventBus: EventBus) {
    this.map = map;
    this.eventBus = eventBus;

    // 创建修改交互实例
    this.modify = new Modify({
      features: features as any,
      style: buildModifyStyle(config),
    });

    // 监听修改开始事件
    this.modify.on('modifystart', () => {
      this.eventBus.emit(DrawEvent.MODIFY_START);
    });

    // 监听修改结束事件
    this.modify.on('modifyend', (e) => {
      const features = e.features.getArray();
      if (features.length > 0) this.eventBus.emit(DrawEvent.MODIFY_END, { features });
    });

    // 将修改交互添加到地图中
    this.map.addInteraction(this.modify);
  }

  /**
   * 设置修改交互的激活状态
   * @param active 是否激活
   */
  setActive(active: boolean): void {
    this.modify.setActive(active);
  }

  /**
   * 覆盖 Modify 交互覆盖层使用的样式。
   */
  setStyle(style: StyleLike): void {
    this.modify.getOverlay().setStyle(style);
  }

  getOverlayLayer(): VectorLayer {
    return this.modify.getOverlay();
  }

  /**
   * 销毁修改管理器，移除交互
   */
  destroy(): void {
    this.map.removeInteraction(this.modify);
  }
}
