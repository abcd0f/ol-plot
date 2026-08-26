import Style, { type StyleFunction } from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import type { ResolvedPlotConfig } from '../kernel/types/config';
import { getFeatureStyleData } from '../kernel/utils/data';

/**
 * 构建要素的默认渲染样式。
 *
 * @param config - 合并后的完整配置
 * @returns OL Style 实例
 */
export function buildFeatureStyle(config: ResolvedPlotConfig): StyleFunction {
  const defaultStyle = new Style({
    stroke: new Stroke({
      color: config.strokeColor,
      width: config.strokeWidth,
      lineDash: config.lineDash,
    }),
    fill: new Fill({
      color: config.fillColor,
    }),
  });
  const cache = new WeakMap<object, { revision: number; style: Style }>();

  return (feature) => {
    const styleData = getFeatureStyleData(feature as any);
    if (!styleData) return defaultStyle;

    const revision = (feature as any).getRevision?.() ?? 0;
    const cached = cache.get(feature as object);
    if (cached && cached.revision === revision) return cached.style;

    const style = new Style({
      stroke: new Stroke({
        color: styleData.strokeColor,
        width: styleData.strokeWidth,
        lineDash: styleData.lineDash,
      }),
      fill: new Fill({
        color: styleData.fillColor,
      }),
    });
    cache.set(feature as object, { revision, style });
    return style;
  };
}
