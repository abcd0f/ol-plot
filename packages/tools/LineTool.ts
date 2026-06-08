/**
 * @file tools/LineTool.ts
 * @description 直线 / 折线 标绘工具
 *
 * 交互行为：
 *  - 绘制中：仅显示线预览，无顶点节点
 *  - drawend 后：自动渲染所有顶点节点，进入编辑状态
 *  - 点击已有线：选中该线，显示顶点节点，进入编辑状态，不触发新绘制
 *  - 点击空白区域：开始新绘制
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
 * // 事件监听
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
   * 绘制中预览样式：仅线条，无顶点节点
   * 顶点节点由 LineBaseTool 的 vertex layer 在 drawend 后统一渲染
   */
  protected _buildDrawStyle(): StyleLike {
    const { sketchStroke } = this._config;
    // 注意：此处故意不包含顶点样式，消除绘制中跟随鼠标的编辑节点
    return this._createStyle({ stroke: this._createStroke(sketchStroke) });
  }

  /**
   * 绘制完成后最终样式（线要素本身，顶点节点由独立 layer 管理）
   */
  protected _buildFinishStyle(): StyleLike {
    const { stroke } = this._config;
    return this._createStyle({ stroke: this._createStroke(stroke) });
  }
}
