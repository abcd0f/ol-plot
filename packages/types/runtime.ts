import type Feature from 'ol/Feature';

/** 单工具与多工具适配器共享的运行时状态。 */
export type RuntimeState = 'idle' | 'drawing' | 'editing';

/** 共享编辑控制器使用的编辑模式。 */
export type EditMode = 'none' | 'feature' | 'handles';

export interface EditorAdapter {
  getEditMode(feature: Feature): Exclude<EditMode, 'none'>;
  getControlPoints?(feature: Feature): number[][];
  updateControlPoints?(feature: Feature, points: number[][]): void;
}
