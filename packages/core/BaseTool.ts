import Map from 'ol/Map';
import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';
import { EventBus } from './EventBus';
import { LayerManager } from './LayerManager';
import { DrawManager } from './DrawManager';
import { SelectManager } from './SelectManager';
import { ModifyManager } from './ModifyManager';
import { mergeConfig, buildFeatureStyle } from '../utils';

export abstract class BaseTool {
  protected map: Map;
  protected config: Required<PlotConfig>;
  protected drawType!: DrawType;

  protected eventBus: EventBus;
  protected layerManager: LayerManager;
  protected drawManager: DrawManager;
  protected selectManager: SelectManager;
  protected modifyManager: ModifyManager;

  protected activeFeature: Feature | null = null;

  constructor(map: Map, config?: PlotConfig) {
    this.map = map;
    this.config = mergeConfig(config);

    this.eventBus = new EventBus();
    this.layerManager = new LayerManager(map, buildFeatureStyle(this.config));
    this.drawManager = new DrawManager(map, this.layerManager.getSource(), this.eventBus);
    this.selectManager = new SelectManager(map, this.layerManager.getLayer(), this.config, this.eventBus);
    this.modifyManager = new ModifyManager(
      map,
      this.selectManager.getSelectedFeatures(),
      this.config,
      this.eventBus,
    );

    this.bindEvents();
  }

  private bindEvents(): void {
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      this.activeFeature = feature;
      this.drawManager.deactivate();
      this.selectManager.setActive(true);
      this.modifyManager.setActive(true);
      this.selectManager.selectFeature(feature);
    });

    this.eventBus.on(DrawEvent.SELECT, ({ feature }: { feature: Feature }) => {
      this.activeFeature = feature;
    });

    this.eventBus.on(DrawEvent.DESELECT, () => {
      this.activeFeature = null;
    });
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  activate(): this {
    this.selectManager.setActive(false);
    this.modifyManager.setActive(false);
    this.selectManager.clearSelection();
    this.activeFeature = null;
    this.drawManager.activate(this.drawType);
    return this;
  }

  deactivate(): this {
    this.drawManager.deactivate();
    this.selectManager.setActive(true);
    this.modifyManager.setActive(true);
    return this;
  }

  destroy(): void {
    this.drawManager.destroy();
    this.selectManager.destroy();
    this.modifyManager.destroy();
    this.layerManager.destroy();
    this.eventBus.clear();
  }

  // ─── Load from data ───────────────────────────────────────────────────────

  /**
   * Create a feature from coordinates and add it to the layer.
   * Coordinates must be in the map projection (e.g. EPSG:3857).
   * Use `ol/proj.fromLonLat` to convert from WGS84 lon/lat first.
   *
   * @returns the created Feature so you can pass it to selectFeature() if needed
   */
  addFeature(coordinates: number[][]): Feature {
    const feature = new Feature({ geometry: this.createGeometry(coordinates) });
    this.layerManager.addFeature(feature);
    return feature;
  }

  /**
   * Programmatically select a feature: sets it as the active feature and
   * shows its vertex handles so it can be edited immediately.
   */
  selectFeature(feature: Feature): this {
    this.drawManager.deactivate();
    this.selectManager.setActive(true);
    this.modifyManager.setActive(true);
    this.activeFeature = feature;
    this.selectManager.selectFeature(feature);
    return this;
  }

  // ─── Features ─────────────────────────────────────────────────────────────

  getFeatures(): Feature[] {
    return this.layerManager.getFeatures();
  }

  clearFeatures(): this {
    this.selectManager.clearSelection();
    this.activeFeature = null;
    this.layerManager.clear();
    return this;
  }

  // ─── Draw type ────────────────────────────────────────────────────────────

  setDrawType(type: DrawType): this {
    this.drawType = type;
    return this;
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  on(event: string, handler: (...args: any[]) => void): this {
    this.eventBus.on(event, handler);
    return this;
  }

  off(event: string, handler: (...args: any[]) => void): this {
    this.eventBus.off(event, handler);
    return this;
  }

  // ─── Abstract API ─────────────────────────────────────────────────────────

  /** Build the geometry for this tool type from a flat coordinate array. */
  protected abstract createGeometry(coordinates: number[][]): Geometry;

  abstract setCoordinates(coordinates: number[][]): void;
  abstract getCoordinates(): number[][];
  abstract getPointCount(): number;
  abstract updatePoint(index: number, coordinate: number[]): void;
}
