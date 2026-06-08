export const DrawEvent = {
  DRAW_START: 'drawstart',
  DRAW_END: 'drawend',
  DRAW_ABORT: 'drawabort',
  MODIFY_START: 'modifystart',
  MODIFY_END: 'modifyend',
  SELECT: 'select',
  DESELECT: 'deselect',
} as const;

export type DrawEventType = (typeof DrawEvent)[keyof typeof DrawEvent];
