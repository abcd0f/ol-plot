import type { InternalPlotConfig, ResolvedPlotConfig } from '../types/config';
import { DEFAULT_CONFIG } from './defaultConfig';

export function mergeConfig(config?: InternalPlotConfig): ResolvedPlotConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    lineDash: config?.lineDash ? [...config.lineDash] : [...DEFAULT_CONFIG.lineDash],
    nodeStyle: {
      ...DEFAULT_CONFIG.nodeStyle,
      ...config?.nodeStyle,
    },
    measure: {
      ...DEFAULT_CONFIG.measure,
      ...config?.measure,
      labelStyle: {
        ...DEFAULT_CONFIG.measure.labelStyle,
        ...config?.measure?.labelStyle,
      },
    },
    areaMeasure: {
      ...DEFAULT_CONFIG.areaMeasure,
      ...config?.areaMeasure,
      labelStyle: {
        ...DEFAULT_CONFIG.areaMeasure.labelStyle,
        ...config?.areaMeasure?.labelStyle,
      },
    },
    rangeRings: {
      ...DEFAULT_CONFIG.rangeRings,
      ...config?.rangeRings,
    },
    flowLine: {
      ...DEFAULT_CONFIG.flowLine,
      ...config?.flowLine,
    },
    alarm: {
      ...DEFAULT_CONFIG.alarm,
      ...config?.alarm,
    },
    image: {
      ...DEFAULT_CONFIG.image,
      ...config?.image,
      label: config?.image?.label ? { ...DEFAULT_CONFIG.image.label, ...config.image.label } : DEFAULT_CONFIG.image.label,
    },
    hint: {
      ...DEFAULT_CONFIG.hint,
      ...config?.hint,
      style: { ...DEFAULT_CONFIG.hint.style, ...config?.hint?.style },
    },
  };
}

export function mergeRuntimeConfig(current: ResolvedPlotConfig, config?: InternalPlotConfig): ResolvedPlotConfig {
  if (!config) return current;

  return {
    ...current,
    ...config,
    lineDash: config.lineDash ? [...config.lineDash] : [...current.lineDash],
    nodeStyle: {
      ...current.nodeStyle,
      ...config.nodeStyle,
    },
    measure: {
      ...current.measure,
      ...config.measure,
      labelStyle: {
        ...current.measure.labelStyle,
        ...config.measure?.labelStyle,
      },
    },
    areaMeasure: {
      ...current.areaMeasure,
      ...config.areaMeasure,
      labelStyle: {
        ...current.areaMeasure.labelStyle,
        ...config.areaMeasure?.labelStyle,
      },
    },
    rangeRings: {
      ...current.rangeRings,
      ...config.rangeRings,
    },
    flowLine: {
      ...current.flowLine,
      ...config.flowLine,
    },
    alarm: {
      ...current.alarm,
      ...config.alarm,
    },
    image: {
      ...current.image,
      ...config.image,
      label: config.image?.label ? { ...current.image.label, ...config.image.label } : current.image.label,
    },
    hint: {
      ...current.hint,
      ...config.hint,
      style: { ...current.hint.style, ...config.hint?.style },
    },
  };
}
