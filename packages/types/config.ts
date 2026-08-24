export interface NodeStyle {
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export type MeasureMode = 'total' | 'segment' | 'both';

export type MeasureUnit = 'm' | 'km' | 'nm';

export type AreaMeasureUnit = 'm' | 'km' | 'nm';

export interface MeasureConfig {
  mode?: MeasureMode;
  unit?: MeasureUnit;
  labelStyle?: Partial<CSSStyleDeclaration>;
}

export interface AreaMeasureConfig {
  unit?: AreaMeasureUnit;
  labelStyle?: Partial<CSSStyleDeclaration>;
}

export interface FlowLineConfig {
  arrowColor?: string;
  arrowSpacing?: number;
  speed?: number;
}

export interface ImageLabelConfig {
  text?: string;
  fontSize?: number | string;
  color?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  offsetX?: number;
  offsetY?: number;
}

export interface ImageConfig {
  src: string;
  scale?: number;
  anchor?: [number, number];
  opacity?: number;
  label?: ImageLabelConfig;
}

export interface AlarmPointStyleConfig {
  /** Core point radius in pixels. Defaults to a slightly larger node radius. */
  radius?: number;
  /** Main alarm color used by the pulse rings. */
  color?: string;
  /** Core point fill color. Defaults to `color`. */
  fill?: string;
  /** Core point stroke color. Defaults to `color`. */
  stroke?: string;
  /** Core point stroke width in pixels. */
  strokeWidth?: number;
  /** Maximum spread radius in pixels. */
  pulseRadius?: number;
  /** Spread ring stroke width in pixels. */
  pulseStrokeWidth?: number;
  /** One blink/spread cycle duration in milliseconds. */
  duration?: number;
  /** Number of staggered spread rings. */
  rings?: number;
  /** Maximum opacity of spread rings. */
  haloOpacity?: number;
  /** Minimum opacity of the blinking core point. */
  minOpacity?: number;
  /** Maximum opacity of the blinking core point. */
  maxOpacity?: number;
  /** Animation redraw rate. Clamped to 1-60 fps, defaults to 30. */
  frameRate?: number;
}

export interface PlotConfig {
  /** Whether to enter editing mode after drawing completes. Defaults to true. */
  autoEdit?: boolean;
  /** Whether to continue using the active drawing tool after drawing completes. Defaults to false. */
  continuousDraw?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  lineDash?: number[];
  nodeStyle?: NodeStyle;
}

export interface MeasurePlotConfig extends PlotConfig {
  measure?: MeasureConfig;
}

export interface AreaMeasurePlotConfig extends PlotConfig {
  areaMeasure?: AreaMeasureConfig;
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
}

export type ResolvedPlotConfig = Required<InternalPlotConfig>;
