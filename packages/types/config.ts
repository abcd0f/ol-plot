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
  lineDash?: number[];
  nodeStyle?: NodeStyle;
}
