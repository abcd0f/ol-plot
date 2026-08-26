import Map from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type BaseLayer from 'ol/layer/Base';
import type { Pixel } from 'ol/pixel';
import type { EventsKey } from 'ol/events';
import { unByKey } from 'ol/Observable';
import type { CursorHintConfig } from '../types/config';

type EditableLayerProvider = () => BaseLayer[];

/** 更新可选要素与可编辑手柄对应的地图光标和提示。 */
export class CursorManager {
  private map: Map;
  private getEditableLayers: EditableLayerProvider;
  private getSelectableLayers: EditableLayerProvider;
  private pointerMoveKey: EventsKey;
  private active = false;
  private dragging = false;
  private cursorApplied = false;
  private previousCursor = '';
  private hitTolerance: number;
  private pendingPixel: Pixel | null = null;
  private hitTestFrame: number | null = null;
  private hint: HTMLDivElement;

  constructor(
    map: Map,
    getEditableLayers: EditableLayerProvider,
    hitTolerance = 8,
    getSelectableLayers: EditableLayerProvider = () => [],
    hintConfig: CursorHintConfig = {},
  ) {
    this.map = map;
    this.getEditableLayers = getEditableLayers;
    this.getSelectableLayers = getSelectableLayers;
    this.hitTolerance = hitTolerance;

    this.hint = document.createElement('div');
    this.hint.textContent = hintConfig.text ?? '';
    Object.assign(this.hint.style, hintConfig.style);
    if (hintConfig.enabled === false) this.hint.hidden = true;
    this.map.getViewport().appendChild(this.hint);

    this.pointerMoveKey = this.map.on('pointermove', (e) => this.handlePointerMove(e as any));
  }

  /** 设置编辑光标是否启用。 */
  setActive(active: boolean): void {
    this.active = active;
    if (!active) this.dragging = false;
    this.cancelPendingHitTest();
    this.restoreCursor();
    this.hideHint();
  }

  /** 设置手柄拖拽状态。 */
  setDragging(dragging: boolean): void {
    this.dragging = dragging;
    if (!this.active) return;

    if (dragging) {
      this.applyCursor('grabbing');
    } else {
      this.restoreCursor();
    }
  }

  /** 更新可编辑图层提供器。 */
  setEditableLayers(getEditableLayers: EditableLayerProvider): void {
    this.getEditableLayers = getEditableLayers;
    this.restoreCursor();
  }

  /** 移除监听和提示元素。 */
  destroy(): void {
    unByKey(this.pointerMoveKey);
    this.cancelPendingHitTest();
    this.restoreCursor();
    this.hint.remove();
  }

  private handlePointerMove(e: MapBrowserEvent<PointerEvent>): void {
    if (e.dragging || this.dragging) {
      this.cancelPendingHitTest();
      if (!this.dragging) {
        this.restoreCursor();
        this.hideHint();
      }
      return;
    }

    this.pendingPixel = e.pixel.slice() as Pixel;
    if (this.hitTestFrame !== null) return;

    this.hitTestFrame = requestAnimationFrame(() => {
      this.hitTestFrame = null;
      const pixel = this.pendingPixel;
      this.pendingPixel = null;
      if (this.dragging || !pixel) return;
      this.updateCursorForPixel(pixel);
    });
  }

  private updateCursorForPixel(pixel: Pixel): void {
    if (this.active) {
      if (this.isOverEditablePoint(pixel)) {
        this.applyCursor('grab');
      } else {
        this.restoreCursor();
      }
      this.hideHint();
      return;
    }

    if (this.isOverSelectableFeature(pixel)) {
      this.applyCursor('pointer');
      this.showHint(pixel);
    } else {
      this.restoreCursor();
      this.hideHint();
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

  private isOverSelectableFeature(pixel: Pixel): boolean {
    const selectableLayers = this.getSelectableLayers();
    if (selectableLayers.length === 0) return false;

    return (
      this.map.forEachFeatureAtPixel(pixel, () => true, {
        hitTolerance: this.hitTolerance,
        layerFilter: (layer) => selectableLayers.includes(layer),
      }) === true
    );
  }

  private showHint(pixel: Pixel): void {
    if (this.hint.hidden) return;
    this.hint.style.left = `${pixel[0]}px`;
    this.hint.style.top = `${pixel[1]}px`;
    this.hint.style.display = 'block';
  }

  private hideHint(): void {
    this.hint.style.display = 'none';
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
