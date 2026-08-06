import type { ResolvedPlotConfig } from '../types/config';

export const DEFAULT_CONFIG: ResolvedPlotConfig = {
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
    labelStyle: {
      padding: '2px 6px',
      background: 'rgba(0,0,0,0.65)',
      color: '#fff',
      fontSize: '12px',
      lineHeight: '1.4',
      borderRadius: '3px',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
    },
  },
  areaMeasure: {
    unit: 'auto',
    labelStyle: {
      padding: '2px 6px',
      background: 'rgba(0,0,0,0.65)',
      color: '#fff',
      fontSize: '12px',
      lineHeight: '1.4',
      borderRadius: '3px',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
    },
  },
  flowLine: {
    arrowColor: '',
    arrowSpacing: 48,
    speed: 60,
  },
};
