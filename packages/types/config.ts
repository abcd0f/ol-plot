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

export interface ImageConfig {
  src: string;
  scale?: number;
  anchor?: [number, number];
  opacity?: number;
}

export interface PlotConfig {
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

export interface InternalPlotConfig extends PlotConfig {
  measure?: MeasureConfig;
  areaMeasure?: AreaMeasureConfig;
  flowLine?: FlowLineConfig;
}

export type ResolvedPlotConfig = Required<InternalPlotConfig>;
