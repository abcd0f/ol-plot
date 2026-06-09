/**
 * 工具内部生命周期状态。
 *
 * 由 BaseTool 自动维护，业务层无需感知或切换：
 *  - Idle：尚未初始化或已销毁
 *  - Drawing：绘制态，点击空白处开始绘制
 *  - Editing：编辑态，已选中某个要素并显示其顶点节点
 */
export enum ToolState {
  /** 空闲（未激活 / 已销毁） */
  Idle = 'idle',
  /** 绘制态 */
  Drawing = 'drawing',
  /** 编辑态（已选中要素） */
  Editing = 'editing',
}
