/**
 * @file types/index.ts
 * @description 标绘工具库全局类型定义
 * 所有公共接口、类型别名、泛型约束在此统一维护
 */

import type { Map as OlMap } from 'ol';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import type { StyleLike } from 'ol/style/Style';

import type { DrawType, LineDash, LineCap, LineJoin, DrawEvent, ToolStatus } from '../constants/index';

// ─── 样式配置 ────────────────────────────────────────────────────────────────

export interface StrokeConfig {
  /** 线颜色，支持 CSS 颜色字符串 / rgba */
  color: string;
  /** 线宽（px） */
  width: number;
  /** 线型，使用 LINE_DASH 枚举或自定义 number[] */
  lineDash: LineDash | number[];
  /** 端点样式 */
  lineCap: LineCap;
  /** 连接样式 */
  lineJoin: LineJoin;
  /** 虚线偏移量 */
  lineDashOffset: number;
}

export interface FillConfig {
  /** 填充颜色 */
  color: string;
}

export interface VertexConfig {
  /** 控制点半径 */
  radius: number;
  /** 控制点填充色 */
  fillColor: string;
  /** 控制点描边色 */
  strokeColor: string;
  /** 控制点描边宽度 */
  strokeWidth: number;
}

// ─── 图层配置 ────────────────────────────────────────────────────────────────

export interface LayerConfig {
  /** 图层 z 轴层级 */
  zIndex: number;
  /** 图层透明度 0~1 */
  opacity: number;
  /** 是否可见 */
  visible: boolean;
}

// ─── 交互行为配置 ────────────────────────────────────────────────────────────

export interface InteractionConfig {
  /** 是否启用吸附 */
  snapEnabled: boolean;
  /** 是否自由绘制（鼠标拖拽模式） */
  freehand: boolean;
  /** 最大顶点数，Infinity = 不限 */
  maxPoints: number;
  /** 最少顶点数，达到后才可完成绘制 */
  minPoints: number;
  /** 点击容差（px），小于此距离视为同一点 */
  clickTolerance: number;
  /** 是否双击停止绘制 */
  stopDoubleClick: boolean;
}

// ─── Tooltip 配置 ────────────────────────────────────────────────────────────

export interface TooltipConfig {
  /** 是否启用提示 */
  enabled: boolean;
  /** 绘制中提示文字 */
  drawingText: string;
  /** 开始绘制前提示文字 */
  startText: string;
  /** 提示偏移量 [x, y] */
  offset: [number, number];
}

// ─── 工具完整配置（嵌套结构，支持 DeepPartial 传入）─────────────────────────

export interface DrawToolConfig {
  stroke: StrokeConfig;
  /** 绘制中预览线样式 */
  sketchStroke: StrokeConfig;
  fill: FillConfig;
  vertex: VertexConfig;
  layer: LayerConfig;
  interaction: InteractionConfig;
  tooltip: TooltipConfig;
}

/**
 * 深度 Partial 工具类型
 * 允许用户只传入需要覆盖的配置项，其余保持默认
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DrawToolUserConfig = DeepPartial<DrawToolConfig>;

// ─── 事件 Payload 类型 ───────────────────────────────────────────────────────

export interface DrawStartPayload {
  feature: Feature<Geometry>;
  tool: IDrawTool;
}

export interface DrawEndPayload {
  feature: Feature<Geometry>;
  tool: IDrawTool;
}

export interface DrawAbortPayload {
  tool: IDrawTool;
}

export interface ModifyStartPayload {
  features: Feature<Geometry>[];
  tool: IDrawTool;
}

export interface ModifyEndPayload {
  features: Feature<Geometry>[];
  tool: IDrawTool;
}

/** 事件名 → Payload 类型映射（实现类型安全的 on/off） */
export interface DrawToolEventMap {
  [DrawEvent.DRAW_START]: DrawStartPayload;
  [DrawEvent.DRAW_END]: DrawEndPayload;
  [DrawEvent.DRAW_ABORT]: DrawAbortPayload;
  [DrawEvent.MODIFY_START]: ModifyStartPayload;
  [DrawEvent.MODIFY_END]: ModifyEndPayload;
  [DrawEvent.FEATURE_CHANGE]: { feature: Feature<Geometry>; tool: IDrawTool };
}

export type DrawToolEventHandler<E extends DrawEvent> = (payload: DrawToolEventMap[E]) => void;

// ─── 工具公共接口（外部消费类型） ───────────────────────────────────────────

export interface IDrawTool {
  activate(): this;
  deactivate(): this;
  clear(): this;
  destroy(): void;
  updateConfig(config: DrawToolUserConfig): this;
  getConfig(): DrawToolConfig;
  getFeatures(): Feature<Geometry>[];
  getStatus(): ToolStatus;
  on<E extends DrawEvent>(event: E, handler: DrawToolEventHandler<E>): this;
  off<E extends DrawEvent>(event: E, handler?: DrawToolEventHandler<E>): this;
}
