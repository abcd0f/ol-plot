import type Feature from 'ol/Feature';

/** Runtime state shared by single-tool and multi-tool adapters. */
export type RuntimeState = 'idle' | 'drawing' | 'editing';

/** Editing strategy used by the shared editor controller. */
export type EditMode = 'none' | 'feature' | 'handles';

export interface EditorAdapter {
  getEditMode(feature: Feature): Exclude<EditMode, 'none'>;
  getControlPoints?(feature: Feature): number[][];
  updateControlPoints?(feature: Feature, points: number[][]): void;
}
