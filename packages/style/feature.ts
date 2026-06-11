import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import type { PlotConfig } from '../types/config';

/**
 * 构建要素的默认渲染样式。
 *
 * @param config - 合并后的完整配置
 * @returns OL Style 实例
 */
export function buildFeatureStyle(config: Required<PlotConfig>): Style {
  return new Style({
    stroke: new Stroke({
      color: config.strokeColor,
      width: config.strokeWidth,
      lineDash: config.lineDash,
    }),
    fill: new Fill({
      color: config.fillColor,
    }),
  });
}
