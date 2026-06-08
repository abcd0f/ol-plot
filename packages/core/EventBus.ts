import BaseEvent from 'ol/events/Event';
import Target from 'ol/events/Target';

/** 通过OL的事件系统携带类型有效负载的内部事件 */
class PlotEvent extends BaseEvent {
  constructor(
    type: string,
    public readonly data: any[],
  ) {
    super(type);
  }
}

type Handler = (...args: any[]) => void;

/**
 * 事件总线类，用于管理事件的订阅、发布和取消订阅
 * 继承自Target类，提供事件处理机制
 */
export class EventBus extends Target {
  /**
   * 存储事件类型到处理器映射的包装器
   * 结构：事件名 -> (处理器 -> 包装函数)
   */
  private wrappers = new Map<string, Map<Handler, (e: BaseEvent) => void>>();

  /**
   * 订阅事件
   * @param event - 事件名称
   * @param handler - 事件处理器函数
   */
  on(event: string, handler: Handler): void {
    // 如果事件类型不存在，则创建新的处理器映射
    if (!this.wrappers.has(event)) this.wrappers.set(event, new Map());
    // 创建包装函数，将事件数据传递给处理器
    const wrapper = (e: BaseEvent) => handler(...(e as PlotEvent).data);
    // 将包装函数存储到对应事件的处理器映射中
    this.wrappers.get(event)!.set(handler, wrapper);
    // 添加事件监听器
    this.addEventListener(event, wrapper as any);
  }

  /**
   * 取消订阅事件
   * @param event - 事件名称
   * @param handler - 要移除的事件处理器函数
   */
  off(event: string, handler: Handler): void {
    // 获取对应的包装函数
    const wrapper = this.wrappers.get(event)?.get(handler);
    if (!wrapper) return;
    // 移除事件监听器
    this.removeEventListener(event, wrapper as any);
    // 从包装器映射中删除处理器
    this.wrappers.get(event)!.delete(handler);
  }

  /**
   * 发布事件
   * @param event - 事件名称
   * @param args - 传递给事件处理器的参数列表
   */
  emit(event: string, ...args: any[]): void {
    // 派发PlotEvent事件实例
    this.dispatchEvent(new PlotEvent(event, args));
  }

  /**
   * 清空所有事件订阅
   */
  clear(): void {
    // 遍历所有事件类型和对应的处理器，移除所有事件监听器
    this.wrappers.forEach((handlers, type) => {
      handlers.forEach((wrapper) => this.removeEventListener(type, wrapper as any));
    });
    // 清空包装器映射
    this.wrappers.clear();
  }
}
