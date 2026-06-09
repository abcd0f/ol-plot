export const DrawEvent = {
  /** 开始绘制（落笔） */
  DRAW_START: 'drawstart',
  /** 完成一次绘制 */
  DRAW_END: 'drawend',
  /** 绘制被中止 */
  DRAW_ABORT: 'drawabort',
  /** 开始拖拽顶点 */
  MODIFY_START: 'modifystart',
  /** 拖拽顶点结束 */
  MODIFY_END: 'modifyend',
  /** 点击选中要素 */
  SELECT: 'select',
  /** 取消选中 */
  DESELECT: 'deselect',
  /** 删除选中要素 */
  DELETE: 'delete',
} as const;

export type DrawEventType = (typeof DrawEvent)[keyof typeof DrawEvent];
