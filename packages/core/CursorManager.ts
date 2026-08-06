import Map from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type BaseLayer from 'ol/layer/Base';
import type { Pixel } from 'ol/pixel';
import type { EventsKey } from 'ol/events';
import { unByKey } from 'ol/Observable';

type EditableLayerProvider = () => BaseLayer[];

/**
 * Updates the map cursor when editable handles are hovered.
 */
export class CursorManager {
  private map: Map;
  private getEditableLayers: EditableLayerProvider;
  private pointerMoveKey: EventsKey;
  private active = false;
  private dragging = false;
  private cursorApplied = false;
  private previousCursor = '';
  private hitTolerance: number;
  private pendingPixel: Pixel | null = null;
  private hitTestFrame: number | null = null;

  constructor(map: Map, getEditableLayers: EditableLayerProvider, hitTolerance = 8) {
    this.map = map;
    this.getEditableLayers = getEditableLayers;
    this.hitTolerance = hitTolerance;

    this.pointerMoveKey = this.map.on('pointermove', (e) => this.handlePointerMove(e as any));
  }

  setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      this.dragging = false;
      this.cancelPendingHitTest();
      this.restoreCursor();
    }
  }

  setDragging(dragging: boolean): void {
    this.dragging = dragging;
    if (!this.active) return;

    if (dragging) {
      this.applyCursor('grabbing');
    } else {
      this.restoreCursor();
    }
  }

  setEditableLayers(getEditableLayers: EditableLayerProvider): void {
    this.getEditableLayers = getEditableLayers;
    this.restoreCursor();
  }

  destroy(): void {
    unByKey(this.pointerMoveKey);
    this.cancelPendingHitTest();
    this.restoreCursor();
  }

  private handlePointerMove(e: MapBrowserEvent<PointerEvent>): void {
    if (!this.active || this.dragging) {
      this.cancelPendingHitTest();
      return;
    }

    this.pendingPixel = e.pixel.slice() as Pixel;
    if (this.hitTestFrame !== null) return;

    this.hitTestFrame = requestAnimationFrame(() => {
      this.hitTestFrame = null;
      const pixel = this.pendingPixel;
      this.pendingPixel = null;
      if (!this.active || this.dragging || !pixel) return;
      this.updateCursorForPixel(pixel);
    });
  }

  private updateCursorForPixel(pixel: Pixel): void {
    if (this.isOverEditablePoint(pixel)) {
      this.applyCursor('grab');
    } else {
      this.restoreCursor();
    }
  }

  private cancelPendingHitTest(): void {
    this.pendingPixel = null;
    if (this.hitTestFrame === null) return;
    cancelAnimationFrame(this.hitTestFrame);
    this.hitTestFrame = null;
  }

  private isOverEditablePoint(pixel: Pixel): boolean {
    const editableLayers = this.getEditableLayers();
    if (editableLayers.length === 0) return false;

    return (
      this.map.forEachFeatureAtPixel(pixel, () => true, {
        hitTolerance: this.hitTolerance,
        layerFilter: (layer) => editableLayers.includes(layer),
      }) === true
    );
  }

  private applyCursor(cursor: string): void {
    const viewport = this.map.getViewport();
    if (!this.cursorApplied) {
      this.previousCursor = viewport.style.cursor;
      this.cursorApplied = true;
    }
    viewport.style.cursor = cursor;
  }

  private restoreCursor(): void {
    if (!this.cursorApplied) return;
    this.map.getViewport().style.cursor = this.previousCursor;
    this.cursorApplied = false;
    this.previousCursor = '';
  }
}
