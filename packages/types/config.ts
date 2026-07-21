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

export interface PlotConfig {
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  lineDash?: number[];
  nodeStyle?: NodeStyle;
  measure?: MeasureConfig;
}
