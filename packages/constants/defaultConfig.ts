import type { PlotConfig } from '../types/config';

export const DEFAULT_CONFIG: Required<PlotConfig> = {
  strokeColor: '#2196f3',
  strokeWidth: 2,
  fillColor: 'rgba(33, 150, 243, 0.15)',
  lineDash: [],
  nodeStyle: {
    radius: 6,
    fill: '#ffffff',
    stroke: '#2196f3',
    strokeWidth: 2,
  },
};
