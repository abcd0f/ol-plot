import type { PlotConfig } from '../types/config';

export const DEFAULT_CONFIG: Required<PlotConfig> = {
  /** 线颜色 */
  strokeColor: '#2196f3',
  /** 线宽度 */
  strokeWidth: 2,
  /** 背景填充色 */
  fillColor: 'rgba(33, 150, 243, 0.15)',
  /** 虚线配置 */
  lineDash: [],
  /** 节点样式 */
  nodeStyle: {
    /** 节点半径 */
    radius: 6,
    /** 节点填充色 */
    fill: '#ffffff',
    /** 节点线颜色 */
    stroke: '#2196f3',
    /** 节点线宽度 */
    strokeWidth: 2,
  },
  /** 测距配置 */
  measure: {
    /** 显示模式：总距离 */
    mode: 'total',
    /** 距离单位：自动 */
    unit: 'auto',
  },
};
