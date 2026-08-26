import type BaseLayer from 'ol/layer/Base';
import type { EditMode } from '../types/runtime';

export interface InteractionToggle { setActive(active: boolean): void; }
export interface DrawToggle extends InteractionToggle { abortDrawing(): void; }
export interface CursorToggle {
  setActive(active: boolean): void;
  setDragging(dragging: boolean): void;
  setEditableLayers?(provider: () => BaseLayer[]): void;
}
export interface InteractionCoordinatorOptions {
  draw?: DrawToggle;
  select: InteractionToggle;
  modify: InteractionToggle;
  handleModify?: InteractionToggle;
  cursor: CursorToggle;
  handleLayer?: BaseLayer;
  modifyOverlayLayer?: BaseLayer;
}

/** 协调互斥的 OpenLayers 编辑交互。 */
export class InteractionCoordinator {
  private readonly options: InteractionCoordinatorOptions;
  private editMode: EditMode = 'none';
  private drawing = false;

  constructor(options: InteractionCoordinatorOptions) {
    this.options = options;
    this.options.select.setActive(true);
    this.options.modify.setActive(false);
    this.options.handleModify?.setActive(false);
    this.options.cursor.setActive(false);
  }
  /** 设置绘制交互状态。 */
  setDrawing(active: boolean): void {
    this.drawing = active;
    this.options.draw?.setActive(active);
    if (active) this.setEditMode('none');
  }
  /** 中止当前绘制。 */
  abortDrawing(): void { this.options.draw?.abortDrawing(); this.drawing = false; }
  /** 更新绘制交互。 */
  setDraw(draw: DrawToggle | null): void {
    this.options.draw = draw ?? undefined;
    if (draw) draw.setActive(this.drawing);
  }
  /** 配置手柄修改交互。 */
  configureHandleInteraction(handleModify: InteractionToggle, handleLayer: BaseLayer): void {
    this.options.handleModify = handleModify;
    this.options.handleLayer = handleLayer;
    handleModify.setActive(this.editMode === 'handles');
  }
  /** 切换互斥编辑模式。 */
  setEditMode(mode: EditMode): void {
    this.editMode = mode;
    this.options.modify.setActive(mode === 'feature');
    this.options.handleModify?.setActive(mode === 'handles');
    this.options.cursor.setActive(mode !== 'none');
    if (mode === 'handles' && this.options.handleLayer) {
      this.options.cursor.setEditableLayers?.(() => [this.options.handleLayer!]);
    } else if (mode === 'feature' && this.options.modifyOverlayLayer) {
      this.options.cursor.setEditableLayers?.(() => [this.options.modifyOverlayLayer!]);
    }
  }
  /** 设置拖拽状态。 */
  setDragging(dragging: boolean): void { this.options.cursor.setDragging(dragging); }
  /** 获取编辑模式。 */
  getEditMode(): EditMode { return this.editMode; }
  /** 判断是否处于绘制态。 */
  isDrawing(): boolean { return this.drawing; }
}
