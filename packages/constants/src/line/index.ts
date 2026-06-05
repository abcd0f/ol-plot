export const DEFAULT_LINE_COLOR = '#000000';
export const DEFAULT_LINE_WIDTH = 2;
export const DEFAULT_DASH_PATTERN: number[] = [];

export const LINE_STYLES = {
  SOLID: [],
  DASHED: [5, 5],
  DOTTED: [2, 2],
} as const;

export const PREDEFINED_COLORS = {
  BLACK: '#000000',
  RED: '#FF0000',
  GREEN: '#00FF00',
  BLUE: '#0000FF',
} as const;

export type LineStylesType = typeof LINE_STYLES;
export type PredefinedColorsType = typeof PREDEFINED_COLORS;
