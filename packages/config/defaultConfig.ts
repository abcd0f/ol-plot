/**
 * @file config/defaultConfig.ts
 * @description 标绘工具库全局默认配置（类型安全版）
 */

import { LineCap, LineJoin, LINE_DASH, ZIndex } from '../constants/index';
import type {
  DrawToolConfig,
  StrokeConfig,
  FillConfig,
  VertexConfig,
  LayerConfig,
  InteractionConfig,
  TooltipConfig,
} from '../types/index';

export const DEFAULT_STROKE_CONFIG: Readonly<StrokeConfig> = {
  color:          'rgba(24, 144, 255, 1)',
  width:          2,
  lineDash:       LINE_DASH.SOLID,
  lineCap:        LineCap.ROUND,
  lineJoin:       LineJoin.ROUND,
  lineDashOffset: 0,
};

export const DEFAULT_SKETCH_STROKE_CONFIG: Readonly<StrokeConfig> = {
  color:          'rgba(24, 144, 255, 0.6)',
  width:          2,
  lineDash:       LINE_DASH.DASHED,
  lineCap:        LineCap.ROUND,
  lineJoin:       LineJoin.ROUND,
  lineDashOffset: 0,
};

export const DEFAULT_FILL_CONFIG: Readonly<FillConfig> = {
  color: 'rgba(24, 144, 255, 0.15)',
};

export const DEFAULT_VERTEX_CONFIG: Readonly<VertexConfig> = {
  radius:      5,
  fillColor:   '#ffffff',
  strokeColor: 'rgba(24, 144, 255, 1)',
  strokeWidth: 2,
};

export const DEFAULT_LAYER_CONFIG: Readonly<LayerConfig> = {
  zIndex:  ZIndex.DRAW_LAYER,
  opacity: 1,
  visible: true,
};

export const DEFAULT_INTERACTION_CONFIG: Readonly<InteractionConfig> = {
  snapEnabled:     false,
  freehand:        false,
  maxPoints:       Infinity,
  minPoints:       2,
  clickTolerance:  6,
  stopDoubleClick: true,
};

export const DEFAULT_TOOLTIP_CONFIG: Readonly<TooltipConfig> = {
  enabled:     true,
  drawingText: '单击添加点，双击完成绘制',
  startText:   '单击开始绘制',
  offset:      [0, -15],
};

export const DEFAULT_CONFIG: Readonly<DrawToolConfig> = {
  stroke:        DEFAULT_STROKE_CONFIG,
  sketchStroke:  DEFAULT_SKETCH_STROKE_CONFIG,
  fill:          DEFAULT_FILL_CONFIG,
  vertex:        DEFAULT_VERTEX_CONFIG,
  layer:         DEFAULT_LAYER_CONFIG,
  interaction:   DEFAULT_INTERACTION_CONFIG,
  tooltip:       DEFAULT_TOOLTIP_CONFIG,
};
