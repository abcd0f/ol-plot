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

/**
 * DrawType → 专属配置 映射表
 * 新增工具时在此注册，BaseDrawTool 会自动查找并合并
 */
export const TOOL_CONFIG_MAP: Readonly<Partial<Record<DrawType, DrawToolUserConfig>>> = {
  [DrawType.LINE_STRING]: LINE_TOOL_CONFIG,
};
