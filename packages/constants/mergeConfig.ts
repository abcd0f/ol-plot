import type { PlotConfig } from '../types/config';
import { DEFAULT_CONFIG } from './defaultConfig';

/**
 * 将用户提供的部分配置与默认配置合并。
 *
 * 深度合并 `nodeStyle` 子对象，其余字段使用展开覆盖。
 *
 * @param config - 可选的用户配置
 * @returns 完整的必填配置对象
 */
export function mergeConfig(config?: PlotConfig): Required<PlotConfig> {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    nodeStyle: {
      ...DEFAULT_CONFIG.nodeStyle,
      ...config?.nodeStyle,
    },
  };
}
