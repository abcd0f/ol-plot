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
    azimuthMeasure: {
      ...DEFAULT_CONFIG.azimuthMeasure,
      ...config?.azimuthMeasure,
      labelStyle: {
        ...DEFAULT_CONFIG.azimuthMeasure.labelStyle,
        ...config?.azimuthMeasure?.labelStyle,
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
    flowLine: {
      ...DEFAULT_CONFIG.flowLine,
      ...config?.flowLine,
    },
    alarm: {
      ...DEFAULT_CONFIG.alarm,
      ...config?.alarm,
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
    azimuthMeasure: {
      ...current.azimuthMeasure,
      ...config.azimuthMeasure,
      labelStyle: {
        ...current.azimuthMeasure.labelStyle,
        ...config.azimuthMeasure?.labelStyle,
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
    flowLine: {
      ...current.flowLine,
      ...config.flowLine,
    },
    alarm: {
      ...current.alarm,
      ...config.alarm,
    },
  };
}
