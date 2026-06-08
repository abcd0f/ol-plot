import type OlMap from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type VectorSource from 'ol/source/Vector';
import type OlFeature from 'ol/Feature';
import type { Geometry, LineString } from 'ol/geom';
import type { MapBrowserEvent } from 'ol';

import { DrawingSystem } from './DrawingSystem';
import { EditingSystem } from './EditingSystem';
import { EventDispatcher } from './EventDispatcher';

export enum ToolState {
  DRAWING_IDLE = 'drawing_idle',
  DRAWING_ACTIVE = 'drawing_active',
  EDITING = 'editing',
  DISABLED = 'disabled',
}

export class StateManager {
  private state: ToolState = ToolState.DISABLED;
  private mapClickHandler: ((e: MapBrowserEvent<any>) => void) | null = null;

  constructor(
    private map: OlMap,
    private layer: VectorLayer<VectorSource<OlFeature<Geometry>>>,
    private source: VectorSource<OlFeature<Geometry>>,
    private eventDispatcher: EventDispatcher,
    private drawingSystem: DrawingSystem,
    private editingSystem: EditingSystem,
    private hitTestFn: (e: MapBrowserEvent<any>) => OlFeature<LineString> | null,
  ) {}

  enterDrawingIdle(): void {
    if (this.state === ToolState.DISABLED) {
      this.editingSystem.exit();
      this.state = ToolState.DRAWING_IDLE;
      this.drawingSystem.mount();
      this.registerMapClickHandler();
    }
  }

  enterDrawingActive(): void {
    this.drawingSystem.setIsActive(true);
    this.state = ToolState.DRAWING_ACTIVE;
  }

  enterEditing(feature: OlFeature<LineString>): void {
    this.drawingSystem.unmount();
    this.state = ToolState.EDITING;
    this.editingSystem.enter(feature);
  }

  enterDisabled(): void {
    this.drawingSystem.unmount();
    this.editingSystem.exit();
    this.unregisterMapClickHandler();
    this.state = ToolState.DISABLED;
  }

  getState(): ToolState {
    return this.state;
  }

  private registerMapClickHandler(): void {
    if (this.mapClickHandler) return;

    this.mapClickHandler = (e: MapBrowserEvent<any>) => {
      if (this.state !== ToolState.EDITING) return;

      const hit = this.hitTestFn(e);
      if (hit) {
        this.enterEditing(hit);
      } else {
        this.enterDrawingIdle();
      }
    };

    this.map.on('singleclick', this.mapClickHandler as any);
  }

  private unregisterMapClickHandler(): void {
    if (this.mapClickHandler) {
      this.map.un('singleclick', this.mapClickHandler as any);
      this.mapClickHandler = null;
    }
  }
}
