import OlMap from 'ol/Map';
import Draw, { type Options as DrawOptions } from 'ol/interaction/Draw';
import VectorSource from 'ol/source/Vector';
import OlFeature from 'ol/Feature';
import type { Geometry, LineString } from 'ol/geom';
import type { StyleLike } from 'ol/style/Style';

import { DrawEvent } from '../../constants/index';
import { safeRemoveInteraction } from '../../utils/index';
import type { EventDispatcher } from './EventDispatcher';

export class DrawingSystem {
  private drawInteraction: Draw | null = null;
  private isActive = false;

  constructor(
    private map: OlMap,
    private source: VectorSource<OlFeature<Geometry>>,
    private eventDispatcher: EventDispatcher,
    private buildDrawStyle: () => StyleLike,
    private buildInteractionOptions: () => DrawOptions,
    private onDrawEnd?: (feature: OlFeature<LineString>) => void,
  ) {}

  mount(): void {
    if (this.drawInteraction) return;

    const options = this.buildInteractionOptions();
    this.drawInteraction = new Draw(options);

    this.drawInteraction.on('drawstart', (e) => {
      this.isActive = true;
      this.eventDispatcher.emit(DrawEvent.DRAW_START, {
        feature: e.feature as OlFeature<Geometry>,
        tool: {} as any,
      });
    });

    this.drawInteraction.on('drawend', (e) => {
      const feature = e.feature as OlFeature<LineString>;
      this.eventDispatcher.emit(DrawEvent.DRAW_END, {
        feature: feature as OlFeature<Geometry>,
        tool: {} as any,
      });
      setTimeout(() => this.onDrawEnd?.(feature), 0);
    });

    this.drawInteraction.on('drawabort', () => {
      this.isActive = false;
      this.eventDispatcher.emit(DrawEvent.DRAW_ABORT, { tool: {} as any });
    });

    this.map.addInteraction(this.drawInteraction);
  }

  unmount(): void {
    safeRemoveInteraction(this.map, this.drawInteraction);
    this.drawInteraction = null;
    this.isActive = false;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  setIsActive(active: boolean): void {
    this.isActive = active;
  }
}
