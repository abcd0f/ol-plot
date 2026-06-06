/**
 * @file constants/index.ts
 * @description 标绘工具库全局常量，使用 TypeScript enum 提供完整类型支持
 */

// ─── 绘制工具类型 ─────────────────────────────────────────────────────────────

export enum DrawType {
  LINE_STRING = 'LineString',
  CURVE = 'Curve',
  POLYGON = 'Polygon',
  CIRCLE = 'Circle',
  RECTANGLE = 'Rectangle',
  ARROW = 'Arrow',
  FREEHAND = 'Freehand',
  POINT = 'Point',
}

// ─── 线型枚举（值为 OL lineDash 数组，Object 枚举）───────────────────────────

export const LINE_DASH = {
  SOLID: [] as number[],
  DASHED: [10, 5],
  DOTTED: [2, 6],
  DASH_DOT: [10, 5, 2, 5],
  LONG_DASH: [20, 8],
} as const;

export type LineDash = (typeof LINE_DASH)[keyof typeof LINE_DASH];

// ─── 端点样式 ─────────────────────────────────────────────────────────────────

export enum LineCap {
  BUTT = 'butt',
  ROUND = 'round',
  SQUARE = 'square',
}

// ─── 连接样式 ─────────────────────────────────────────────────────────────────

export enum LineJoin {
  MITER = 'miter',
  ROUND = 'round',
  BEVEL = 'bevel',
}

// ─── 图层 zIndex 分区 ─────────────────────────────────────────────────────────

export enum ZIndex {
  DRAW_LAYER = 100,
  SKETCH_LAYER = 200,
  VERTEX_LAYER = 300,
  TOOLTIP_LAYER = 400,
}

// ─── 交互事件名 ───────────────────────────────────────────────────────────────

export enum DrawEvent {
  DRAW_START = 'drawstart',
  DRAW_END = 'drawend',
  DRAW_ABORT = 'drawabort',
  MODIFY_START = 'modifystart',
  MODIFY_END = 'modifyend',
  FEATURE_CHANGE = 'featurechange',
}

// ─── 工具状态 ─────────────────────────────────────────────────────────────────

export enum ToolStatus {
  IDLE = 'idle',
  DRAWING = 'drawing',
  EDITING = 'editing',
  DISABLED = 'disabled',
}

// ─── 图层 ID 前缀 ─────────────────────────────────────────────────────────────

export const LAYER_ID_PREFIX = 'ol-draw-tool__' as const;
