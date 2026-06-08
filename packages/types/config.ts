export interface NodeStyle {
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface PlotConfig {
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  /** e.g. [10, 5] for dashed, [] for solid */
  lineDash?: number[];
  nodeStyle?: NodeStyle;
}
