import type { ResolvedPlotConfig } from '../types/config';

/** 标绘工具默认配置。 */
export const DEFAULT_CONFIG: ResolvedPlotConfig = {
  /** 允许编辑 */
  editable: true,
  /** 绘制结束后自动编辑 */
  autoEditAfterDraw: true,
  /** 不连续绘制 */
  continuousDraw: false,
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
    /** 距离单位：米 */
    unit: 'm',
    /** 测距标签样式 */
    labelStyle: {
      /** 标签内边距 */
      padding: '2px 6px',
      /** 标签背景色 */
      background: 'rgba(0,0,0,0.65)',
      /** 标签文字颜色 */
      color: '#fff',
      /** 标签字号 */
      fontSize: '12px',
      /** 标签行高 */
      lineHeight: '1.4',
      /** 标签圆角 */
      borderRadius: '3px',
      /** 标签文本不换行 */
      whiteSpace: 'nowrap',
      /** 标签不响应鼠标事件 */
      pointerEvents: 'none',
    },
  },
  /** 测面配置 */
  areaMeasure: {
    /** 面积单位：平方米 */
    unit: 'm',
    /** 面积标签样式 */
    labelStyle: {
      /** 标签内边距 */
      padding: '2px 6px',
      /** 标签背景色 */
      background: 'rgba(0,0,0,0.65)',
      /** 标签文字颜色 */
      color: '#fff',
      /** 标签字号 */
      fontSize: '12px',
      /** 标签行高 */
      lineHeight: '1.4',
      /** 标签圆角 */
      borderRadius: '3px',
      /** 标签文本不换行 */
      whiteSpace: 'nowrap',
      /** 标签不响应鼠标事件 */
      pointerEvents: 'none',
    },
  },
  /** 距离环配置 */
  rangeRings: {
    /** 相邻距离环间距 */
    spacing: 10,
    /** 距离环单位：千米 */
    unit: 'km',
  },
  /** 流向线配置 */
  flowLine: {
    /** 箭头颜色，空值表示使用线颜色 */
    arrowColor: '',
    /** 箭头间距（像素） */
    arrowSpacing: 48,
    /** 箭头流动速度 */
    speed: 60,
  },
  /** 图片点配置 */
  image: {
    /** 图片地址 */
    src: '',
    /** 图片缩放比例 */
    scale: 1,
    /** 图片锚点比例 */
    anchor: [0.5, 0.5],
    /** 图片不透明度 */
    opacity: 1,
  },
  /** 告警点配置 */
  alarm: {
    /** 核心点半径（像素） */
    radius: 9,
    /** 告警主色 */
    color: '#ff3b30',
    /** 核心点填充色 */
    fill: '#ff3b30',
    /** 核心点描边色 */
    stroke: '#ffffff',
    /** 核心点描边宽度 */
    strokeWidth: 2,
    /** 扩散环最大半径（像素） */
    pulseRadius: 30,
    /** 扩散环描边宽度 */
    pulseStrokeWidth: 2,
    /** 动画周期（毫秒） */
    duration: 1200,
    /** 扩散环数量 */
    rings: 2,
    /** 扩散环最大不透明度 */
    haloOpacity: 0.42,
    /** 核心点最小不透明度 */
    minOpacity: 0.56,
    /** 核心点最大不透明度 */
    maxOpacity: 1,
    /** 动画帧率 */
    frameRate: 30,
  },
  /** 悬停提示配置 */
  hint: {
    /** 提示文本 */
    text: '点击进入编辑',
    /** 是否启用提示 */
    enabled: true,
    /** 提示元素样式 */
    style: {
      /** 定位方式 */
      position: 'absolute',
      /** 层级 */
      zIndex: '1',
      /** 默认隐藏 */
      display: 'none',
      /** 提示内边距 */
      padding: '4px 8px',
      /** 提示圆角 */
      borderRadius: '4px',
      /** 提示背景色 */
      background: 'rgba(0, 0, 0, 0.72)',
      /** 提示文字颜色 */
      color: '#fff',
      /** 提示字号 */
      fontSize: '12px',
      /** 提示行高 */
      lineHeight: '1.4',
      /** 提示文本不换行 */
      whiteSpace: 'nowrap',
      /** 提示不响应鼠标事件 */
      pointerEvents: 'none',
      /** 相对光标偏移 */
      transform: 'translate(10px, 10px)',
    },
  },
};
