/**
 * @file tools/LineTool.ts
 * @description 直线 / 折线 标绘工具
 *
 * @example
 * // 最简用法
 * const tool = new LineTool(map);
 * tool.activate();
 *
 * @example
 * // 自定义配置（类型安全）
 * const tool = new LineTool(map, {
 *   stroke: {
 *     color: '#ff4d4f',
 *     width: 3,
 *     lineDash: LINE_DASH.DASHED,
 *   },
 *   interaction: { maxPoints: 2 },   // 限制为两点直线
 * });
 *
 * @example
 * // 事件监听（类型推断 payload 类型）
 * tool.on(DrawEvent.DRAW_END, ({ feature }) => {
 *   const coords = (feature.getGeometry() as LineString).getCoordinates();
 * });
 *
 * @example
 * // 热更新样式
 * tool.updateConfig({ stroke: { color: '#52c41a', width: 4 } });
 */

import type { StyleLike } from 'ol/style/Style';

import { LineBaseTool } from '../core/LineBaseTool';
import { DrawType } from '../constants/index';
import { LINE_TOOL_CONFIG } from '../config/toolConfigs';
import type { DrawToolUserConfig } from '../types/index';

export class LineTool extends LineBaseTool {
  constructor(map: import('ol/Map').default, userConfig: DrawToolUserConfig = {}) {
    super(map, userConfig);
  }

  protected _getDrawType(): DrawType {
    return DrawType.LINE_STRING;
  }

  protected _getToolConfig(): DrawToolUserConfig {
    return LINE_TOOL_CONFIG;
  }

  /**
   * 绘制中预览样式：草稿线 + 顶点控制点
   */
  protected _buildDrawStyle(): StyleLike {
    const { sketchStroke, vertex } = this._config;
    return [this._createStyle({ stroke: this._createStroke(sketchStroke) }), this._createVertexStyle(vertex)];
  }

  /**
   * 绘制完成后最终样式
   */
  protected _buildFinishStyle(): StyleLike {
    const { stroke } = this._config;
    return this._createStyle({ stroke: this._createStroke(stroke) });
  }
}
