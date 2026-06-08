import Map from 'ol/Map';
import Modify from 'ol/interaction/Modify';
import type Collection from 'ol/Collection';
import type Feature from 'ol/Feature';
import type { EventBus } from './EventBus';
import type { PlotConfig } from '../types/config';
import { DrawEvent } from '../constants/events';
import { buildModifyStyle } from '../utils';

export class ModifyManager {
  private map: Map;
  private modify: Modify;
  private eventBus: EventBus;

  constructor(
    map: Map,
    features: Collection<Feature>,
    config: Required<PlotConfig>,
    eventBus: EventBus,
  ) {
    this.map = map;
    this.eventBus = eventBus;

    this.modify = new Modify({
      features: features as any,
      style: buildModifyStyle(config),
    });

    this.modify.on('modifystart', () => {
      this.eventBus.emit(DrawEvent.MODIFY_START);
    });

    this.modify.on('modifyend', (e) => {
      const features = e.features.getArray();
      if (features.length > 0) this.eventBus.emit(DrawEvent.MODIFY_END, { features });
    });

    this.map.addInteraction(this.modify);
  }

  setActive(active: boolean): void {
    this.modify.setActive(active);
  }

  destroy(): void {
    this.map.removeInteraction(this.modify);
  }
}
