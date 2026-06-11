import Style, { type StyleFunction } from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import type { PlotConfig } from '../types/config';

/**
 * 绘制（草图）阶段使用的样式。
 *
 * 关键点：对 `Point` 几何返回 `undefined`，从而隐藏 OpenLayers 默认草图中
 * 那个跟随鼠标移动的顶点小圆点；仅渲染正在绘制的线 / 面，避免在绘制阶段
 * 出现任何编辑节点，保证后续能自然进入编辑模式。
 *
 * @param config - 合并后的完整配置
 * @returns OL StyleFunction
 */
export function buildDrawStyle(config: Required<PlotConfig>): StyleFunction {
  const sketchStyle = new Style({
    stroke: new Stroke({
      color: config.strokeColor,
      width: config.strokeWidth,
      lineDash: config.lineDash,
    }),
    fill: new Fill({
      color: config.fillColor,
    }),
  });

  return (feature) => {
    const geom = feature.getGeometry();
    if (!geom) return undefined;
    // 隐藏跟随鼠标的草图顶点
    if (geom.getType() === 'Point') return undefined;
    return sketchStyle;
  };
}
