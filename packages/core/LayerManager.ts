import Map from 'ol/Map';
import type { StyleLike } from 'ol/style/Style';
import { FeatureStore } from './FeatureStore';

/** Backward-compatible name for the shared feature store. */
export class LayerManager extends FeatureStore {
  constructor(map: Map, style: StyleLike) {
    super(map, style);
  }
}
