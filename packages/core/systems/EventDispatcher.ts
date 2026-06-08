import type { DrawToolEventMap, DrawToolEventHandler } from '../../types/index';
import type { DrawEvent } from '../../constants';

export class EventDispatcher {
  private listeners: Map<DrawEvent, Set<Function>> = new Map();

  on<E extends DrawEvent>(event: E, handler: DrawToolEventHandler<E>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off<E extends DrawEvent>(event: E, handler?: DrawToolEventHandler<E>): void {
    if (!handler) {
      this.listeners.delete(event);
    } else {
      this.listeners.get(event)?.delete(handler);
    }
  }

  emit<E extends DrawEvent>(event: E, payload: DrawToolEventMap[E]): void {
    this.listeners.get(event)?.forEach((fn) => (fn as any)(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}
