import BaseEvent from 'ol/events/Event';
import Target from 'ol/events/Target';

/** Internal event that carries typed payload through OL's event system */
class PlotEvent extends BaseEvent {
  constructor(type: string, public readonly data: any[]) {
    super(type);
  }
}

type Handler = (...args: any[]) => void;

/**
 * EventBus built on top of OL's Target / BaseEvent so all dispatched
 * events are first-class OL events and can interop with OL listeners.
 */
export class EventBus extends Target {
  // event type → (original handler → OL wrapper)
  private wrappers = new Map<string, Map<Handler, (e: BaseEvent) => void>>();

  on(event: string, handler: Handler): void {
    if (!this.wrappers.has(event)) this.wrappers.set(event, new Map());
    const wrapper = (e: BaseEvent) => handler(...(e as PlotEvent).data);
    this.wrappers.get(event)!.set(handler, wrapper);
    this.addEventListener(event, wrapper as any);
  }

  off(event: string, handler: Handler): void {
    const wrapper = this.wrappers.get(event)?.get(handler);
    if (!wrapper) return;
    this.removeEventListener(event, wrapper as any);
    this.wrappers.get(event)!.delete(handler);
  }

  emit(event: string, ...args: any[]): void {
    this.dispatchEvent(new PlotEvent(event, args));
  }

  clear(): void {
    this.wrappers.forEach((handlers, type) => {
      handlers.forEach(wrapper => this.removeEventListener(type, wrapper as any));
    });
    this.wrappers.clear();
  }
}
