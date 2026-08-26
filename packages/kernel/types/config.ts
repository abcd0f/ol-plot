import type { AreaUnits, Units } from '@turf/helpers';

export interface NodeStyle {
  /** 节点半径（像素）。 */
  radius?: number;
  /** 节点填充色。 */
  fill?: string;
  /** 节点描边色。 */
  stroke?: string;
  /** 节点描边宽度。 */
  strokeWidth?: number;
}

export type MeasureMode = 'total' | 'segment' | 'both';

/** Turf 支持的距离单位。 */
export type DistanceUnit = Units;

/** Turf 支持的面积单位。 */
export type AreaUnit = AreaUnits;

export interface MeasureConfig {
  /** 测距标签显示模式。 */
  mode?: MeasureMode;
  /** 距离单位。 */
  unit?: DistanceUnit;
  /** 标签样式。 */
  labelStyle?: Partial<CSSStyleDeclaration>;
}

export interface AreaMeasureConfig {
  /** 面积单位。 */
  unit?: AreaUnit;
  /** 标签样式。 */
  labelStyle?: Partial<CSSStyleDeclaration>;
}

export interface RangeRingsConfig {
  /** 相邻距离环的数值间距。 */
  spacing?: number;
  /** 间距与环标签使用的单位。 */
  unit?: DistanceUnit;
}

export interface FlowLineConfig {
  /** 流动箭头颜色。 */
  arrowColor?: string;
  /** 箭头间距（像素）。 */
  arrowSpacing?: number;
  /** 流动速度。 */
  speed?: number;
}

export interface ImageLabelConfig {
  /** 标签文本。 */
  text?: string;
  /** 字号。 */
  fontSize?: number | string;
  /** 文本颜色。 */
  color?: string;
  /** 字体名称。 */
  fontFamily?: string;
  /** 字体粗细。 */
  fontWeight?: string | number;
  /** 水平偏移。 */
  offsetX?: number;
  /** 垂直偏移。 */
  offsetY?: number;
}

export interface ImageConfig {
  /** 图片地址。 */
  src: string;
  /** 图片缩放比例。 */
  scale?: number;
  /** 锚点比例。 */
  anchor?: [number, number];
  /** 图片不透明度。 */
  opacity?: number;
  /** 图片标签。 */
  label?: ImageLabelConfig;
}

export interface AlarmPointStyleConfig {
  /** 核心点半径（像素），默认略大于节点半径。 */
  radius?: number;
  /** 脉冲环使用的告警主色。 */
  color?: string;
  /** 核心点填充色，默认使用 `color`。 */
  fill?: string;
  /** 核心点描边色，默认使用 `color`。 */
  stroke?: string;
  /** 核心点描边宽度（像素）。 */
  strokeWidth?: number;
  /** 扩散环最大半径（像素）。 */
  pulseRadius?: number;
  /** 扩散环描边宽度（像素）。 */
  pulseStrokeWidth?: number;
  /** 一次闪烁/扩散周期时长（毫秒）。 */
  duration?: number;
  /** 错峰扩散环数量。 */
  rings?: number;
  /** 扩散环最大不透明度。 */
  haloOpacity?: number;
  /** 闪烁核心点最小不透明度。 */
  minOpacity?: number;
  /** 闪烁核心点最大不透明度。 */
  maxOpacity?: number;
  /** 动画重绘帧率，限制为 1-60，默认 30。 */
  frameRate?: number;
}

export interface PlotConfig {
  /** 是否允许选择和编辑要素。 */
  editable?: boolean;
  /** 绘制结束后是否自动进入编辑。 */
  autoEditAfterDraw?: boolean;
  /** 是否连续绘制同类要素。 */
  continuousDraw?: boolean;
  /** 线条颜色。 */
  strokeColor?: string;
  /** 线条宽度。 */
  strokeWidth?: number;
  /** 填充颜色。 */
  fillColor?: string;
  /** 虚线段配置。 */
  lineDash?: number[];
  /** 控制节点样式。 */
  nodeStyle?: NodeStyle;
}

export interface MeasurePlotConfig extends PlotConfig {
  measure?: MeasureConfig;
}

export interface AreaMeasurePlotConfig extends PlotConfig {
  areaMeasure?: AreaMeasureConfig;
}

export interface CursorHintConfig {
  /** 悬停提示文本。 */
  text?: string;
  /** 是否显示提示。 */
  enabled?: boolean;
  /** 提示元素样式。 */
  style?: Partial<CSSStyleDeclaration>;
}

export interface RangeRingsPlotConfig extends PlotConfig {
  rangeRings?: RangeRingsConfig;
}

export interface FlowLinePlotConfig extends PlotConfig {
  flowLine?: FlowLineConfig;
}

export interface ImagePointConfig extends PlotConfig {
  image?: ImageConfig;
}

export interface AlarmPointConfig extends PlotConfig {
  alarm?: AlarmPointStyleConfig;
}

export interface InternalPlotConfig extends PlotConfig {
  measure?: MeasureConfig;
  areaMeasure?: AreaMeasureConfig;
  flowLine?: FlowLineConfig;
  image?: ImageConfig;
  alarm?: AlarmPointStyleConfig;
  rangeRings?: RangeRingsConfig;
  hint?: CursorHintConfig;
}

/** 已补全的运行时配置，包含所有顶层配置段。 */
export type ResolvedPlotConfig = Required<InternalPlotConfig>;
