import type Feature from 'ol/Feature';
import type { EditMode, EditorAdapter } from '../types/runtime';

export interface EditorControllerOptions {
  onModeChange?: (mode: EditMode, feature: Feature | null) => void;
}

/** Coordinates feature and handle editing behind one small protocol. */
export class EditorController {
  private adapter: EditorAdapter;
  private readonly onModeChange?: EditorControllerOptions['onModeChange'];
  private feature: Feature | null = null;
  private mode: EditMode = 'none';

  constructor(adapter: EditorAdapter, options: EditorControllerOptions = {}) {
    this.adapter = adapter;
    this.onModeChange = options.onModeChange;
  }
  getFeature(): Feature | null { return this.feature; }
  getMode(): EditMode { return this.mode; }
  setAdapter(adapter: EditorAdapter): void {
    this.adapter = adapter;
    if (this.feature) this.setMode(adapter.getEditMode(this.feature));
  }
  select(feature: Feature): EditMode {
    this.feature = feature;
    this.setMode(this.adapter.getEditMode(feature));
    return this.mode;
  }
  clear(): void { this.feature = null; this.setMode('none'); }
  setMode(mode: EditMode): void {
    if (this.mode === mode && (mode === 'none' || this.feature)) return;
    this.mode = mode;
    this.onModeChange?.(mode, this.feature);
  }
  getControlPoints(): number[][] {
    return this.feature && this.adapter.getControlPoints ? this.adapter.getControlPoints(this.feature) : [];
  }
  updateControlPoints(points: number[][]): void {
    if (this.feature && this.adapter.updateControlPoints) this.adapter.updateControlPoints(this.feature, points);
  }
}
