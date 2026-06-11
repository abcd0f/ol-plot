import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import type { PlotConfig } from '../types/config';

/**
 * Modity 交互使用的拖拽手柄样式。
 *
 * @param config - 合并后的完整配置
 * @returns OL Style 数组
 */
export function buildModifyStyle(config: Required<PlotConfig>): Style[] {
  const ns = config.nodeStyle;
  return [
    new Style({
      stroke: new Stroke({
        color: config.strokeColor,
        width: config.strokeWidth,
        lineDash: config.lineDash,
      }),
      fill: new Fill({ color: config.fillColor }),
    }),
    new Style({
      image: new CircleStyle({
        radius: (ns.radius ?? 6) + 3,
        fill: new Fill({ color: 'rgba(255,255,255,0.4)' }),
        stroke: new Stroke({
          color: ns.stroke ?? config.strokeColor,
          width: 1.5,
        }),
      }),
    }),
  ];
}
