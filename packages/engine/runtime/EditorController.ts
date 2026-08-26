import type Feature from 'ol/Feature';
import type { EditMode, EditorAdapter } from '../types/runtime';

export interface EditorControllerOptions {
  onModeChange?: (mode: EditMode, feature: Feature | null) => void;
}

/** 通过统一协议协调要素编辑与手柄编辑。 */
export class EditorController {
  private adapter: EditorAdapter;
  private readonly onModeChange?: EditorControllerOptions['onModeChange'];
  private feature: Feature | null = null;
  private mode: EditMode = 'none';

  constructor(adapter: EditorAdapter, options: EditorControllerOptions = {}) {
    this.adapter = adapter;
    this.onModeChange = options.onModeChange;
  }
  /** 获取当前编辑要素。 */
  getFeature(): Feature | null { return this.feature; }
  /** 获取当前编辑模式。 */
  getMode(): EditMode { return this.mode; }
  /** 更新编辑适配器。 */
  setAdapter(adapter: EditorAdapter): void {
    this.adapter = adapter;
    if (this.feature) this.setMode(adapter.getEditMode(this.feature));
  }
  /** 选中要素并切换编辑模式。 */
  select(feature: Feature): EditMode {
    this.feature = feature;
    this.setMode(this.adapter.getEditMode(feature));
    return this.mode;
  }
  /** 清除当前编辑状态。 */
  clear(): void { this.feature = null; this.setMode('none'); }
  /** 设置编辑模式。 */
  setMode(mode: EditMode): void {
    if (this.mode === mode && (mode === 'none' || this.feature)) return;
    this.mode = mode;
    this.onModeChange?.(mode, this.feature);
  }
  /** 获取当前要素控制点。 */
  getControlPoints(): number[][] {
    return this.feature && this.adapter.getControlPoints ? this.adapter.getControlPoints(this.feature) : [];
  }
  /** 更新当前要素控制点。 */
  updateControlPoints(points: number[][]): void {
    if (this.feature && this.adapter.updateControlPoints) this.adapter.updateControlPoints(this.feature, points);
  }
}
