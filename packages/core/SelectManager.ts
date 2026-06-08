import Map from 'ol/Map';
import Select from 'ol/interaction/Select';
import { click } from 'ol/events/condition';
import Collection from 'ol/Collection';
import type Feature from 'ol/Feature';
import type VectorLayer from 'ol/layer/Vector';
import type { EventBus } from './EventBus';
import type { PlotConfig } from '../types/config';
import { DrawEvent } from '../constants/events';
import { buildSelectStyle } from '../utils';

export class SelectManager {
  private map: Map;
  private select: Select;
  private eventBus: EventBus;

  constructor(map: Map, layer: VectorLayer, config: Required<PlotConfig>, eventBus: EventBus) {
    this.map = map;
    this.eventBus = eventBus;

    this.select = new Select({
      layers: [layer],
      condition: click,
      style: buildSelectStyle(config),
      multi: false,
    });

    this.select.on('select', (e) => {
      if (e.selected.length > 0) {
        this.eventBus.emit(DrawEvent.SELECT, { feature: e.selected[0] });
      } else if (e.deselected.length > 0) {
        this.eventBus.emit(DrawEvent.DESELECT, { features: e.deselected });
      }
    });

    this.map.addInteraction(this.select);
  }

  getSelectedFeatures(): Collection<Feature> {
    return this.select.getFeatures() as Collection<Feature>;
  }

  /** Programmatically select a feature (e.g. after drawing completes) */
  selectFeature(feature: Feature): void {
    const col = this.select.getFeatures();
    col.clear();
    col.push(feature as any);
    this.eventBus.emit(DrawEvent.SELECT, { feature });
  }

  clearSelection(): void {
    this.select.getFeatures().clear();
    this.eventBus.emit(DrawEvent.DESELECT, { features: [] });
  }

  setActive(active: boolean): void {
    this.select.setActive(active);
  }

  destroy(): void {
    this.map.removeInteraction(this.select);
  }
}
