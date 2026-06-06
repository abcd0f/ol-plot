/**
 * @file index.ts
 * @description ol-draw-tools 标绘工具库统一入口
 */

// ─── 工具类 ───────────────────────────────────────────────────────────────────
export { LineTool } from '../packages/tools/LineTool';
// export { CurveTool }      from '../packages/tools/CurveTool';       // 待扩展
// export { PolygonTool }    from '../packages/tools/PolygonTool';     // 待扩展
// export { CircleTool }     from '../packages/tools/CircleTool';      // 待扩展
// export { RectangleTool }  from '../packages/tools/RectangleTool';   // 待扩展
// export { ArrowTool }      from '../packages/tools/ArrowTool';       // 待扩展

// ─── 基类（供高级用户自定义扩展工具）────────────────────────────────────────────
export { BaseDrawTool } from '../packages/core/BaseDrawTool';

// ─── 常量 & 枚举 ──────────────────────────────────────────────────────────────
export { DrawType, LINE_DASH, LineCap, LineJoin, DrawEvent, ToolStatus, ZIndex } from '../packages/constants/index';

// ─── 默认配置 ─────────────────────────────────────────────────────────────────
export { DEFAULT_CONFIG } from '../packages/config/defaultConfig';
export { TOOL_CONFIG_MAP } from '../packages/config/toolConfigs';

// ─── 类型导出（纯类型，不产生运行时代码）────────────────────────────────────────
export type {
  DrawToolConfig,
  DrawToolUserConfig,
  DeepPartial,
  StrokeConfig,
  FillConfig,
  VertexConfig,
  LayerConfig,
  InteractionConfig,
  TooltipConfig,
  IDrawTool,
  DrawToolEventMap,
  DrawToolEventHandler,
  DrawStartPayload,
  DrawEndPayload,
  DrawAbortPayload,
} from '../packages/types/index';
