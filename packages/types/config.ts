export interface NodeStyle {
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

/** 测距标签显示模式 */
export type MeasureMode = 'total' | 'segment' | 'both';

/** 测距距离单位：auto 自动在米/公里间切换 */
export type MeasureUnit = 'auto' | 'meter' | 'kilometer';

export interface MeasureConfig {
  /** 显示总距离、逐段距离，还是两者都显示，默认 'total' */
  mode?: MeasureMode;
  /** 距离单位，默认 'auto' */
  unit?: MeasureUnit;
}

export interface FlowLineConfig {
  /** Arrow stroke color. Defaults to strokeColor. */
  arrowColor?: string;
  /** Distance between arrows in pixels. Defaults to 48. */
  arrowSpacing?: number;
  /** Flow speed in pixels per second. Defaults to 60. */
  speed?: number;
}

export interface PlotConfig {
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  lineDash?: number[];
  nodeStyle?: NodeStyle;
  measure?: MeasureConfig;
  flowLine?: FlowLineConfig;
}

/** 图片点标记配置 */
export interface ImagePointConfig extends PlotConfig {
  image?: {
    /** 图片 URL */
    src: string;
    /** 缩放比例，默认 1 */
    scale?: number;
    /** 锚点位置 [x, y]，取值范围 0-1，默认 [0.5, 0.5]（图片中心） */
    anchor?: [number, number];
    /** 透明度，默认 1 */
    opacity?: number;
  };
}
