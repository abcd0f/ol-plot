/**
 * @file config/toolConfigs.ts
 * @description 各绘制工具的专属默认配置（覆盖全局默认）
 * 新增工具：① 添加配置常量  ② 在 TOOL_CONFIG_MAP 注册  ③ 创建 Tool 类
 */

import { DrawType, LINE_DASH } from '../constants/index';
import type { DrawToolUserConfig } from '../types/index';

export const LINE_TOOL_CONFIG: DrawToolUserConfig = {
  stroke: {
    color: 'rgba(24, 144, 255, 1)',
    width: 2,
    lineDash: LINE_DASH.SOLID,
  },
  interaction: {
    minPoints: 2,
    maxPoints: Infinity,
    freehand: false,
  },
  tooltip: {
    drawingText: '单击添加折点，双击完成直线',
    startText: '单击开始绘制直线',
  },
};

export const CURVE_TOOL_CONFIG: DrawToolUserConfig = {
  stroke: {
    color: 'rgba(82, 196, 26, 1)',
    width: 2,
    lineDash: LINE_DASH.SOLID,
  },
  interaction: {
    minPoints: 2,
    freehand: true,
  },
  tooltip: {
    drawingText: '按住鼠标拖动绘制曲线',
    startText: '单击开始绘制曲线',
  },
};

export const POLYGON_TOOL_CONFIG: DrawToolUserConfig = {
  stroke: {
    color: 'rgba(250, 173, 20, 1)',
    width: 2,
    lineDash: LINE_DASH.SOLID,
  },
  fill: {
    color: 'rgba(250, 173, 20, 0.15)',
  },
  interaction: {
    minPoints: 3,
  },
  tooltip: {
    drawingText: '单击添加顶点，双击闭合多边形',
    startText: '单击开始绘制多边形',
  },
};

export const CIRCLE_TOOL_CONFIG: DrawToolUserConfig = {
  stroke: {
    color: 'rgba(245, 34, 45, 1)',
    width: 2,
  },
  fill: {
    color: 'rgba(245, 34, 45, 0.15)',
  },
  tooltip: {
    drawingText: '拖动确定半径，松开完成圆形',
    startText: '单击圆心开始绘制',
  },
};

export const RECTANGLE_TOOL_CONFIG: DrawToolUserConfig = {
  stroke: {
    color: 'rgba(114, 46, 209, 1)',
    width: 2,
  },
  fill: {
    color: 'rgba(114, 46, 209, 0.15)',
  },
  tooltip: {
    drawingText: '拖动绘制矩形范围',
    startText: '单击起始角开始绘制',
  },
};

/**
 * DrawType → 专属配置 映射表
 * 新增工具时在此注册，BaseDrawTool 会自动查找并合并
 */
export const TOOL_CONFIG_MAP: Readonly<Partial<Record<DrawType, DrawToolUserConfig>>> = {
  [DrawType.LINE_STRING]: LINE_TOOL_CONFIG,
  [DrawType.CURVE]: CURVE_TOOL_CONFIG,
  [DrawType.POLYGON]: POLYGON_TOOL_CONFIG,
  [DrawType.CIRCLE]: CIRCLE_TOOL_CONFIG,
  [DrawType.RECTANGLE]: RECTANGLE_TOOL_CONFIG,
};
