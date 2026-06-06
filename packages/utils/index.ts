/**
 * @file utils/index.ts
 * @description 工具库内部工具函数（类型安全版）
 */

import OlStroke from 'ol/style/Stroke';
import OlFill from 'ol/style/Fill';
import OlStyle from 'ol/style/Style';
import OlCircleStyle from 'ol/style/Circle';
import type { Map as OlMap } from 'ol';
import type { Interaction } from 'ol/interaction';

import { LAYER_ID_PREFIX } from '../constants/index';
import type { StrokeConfig, FillConfig, VertexConfig } from '../types/index';

// ─── 深度合并 ─────────────────────────────────────────────────────────────────

type PlainObject = Record<string, unknown>;

function isPlainObject(val: unknown): val is PlainObject {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * 深度合并多个对象，后者优先，数组直接替换（不 concat）
 * 返回新对象，不修改原始对象
 */
export function deepMerge<T extends PlainObject>(...sources: Array<Partial<T> | undefined>): T {
  const result: PlainObject = {};

  for (const source of sources) {
    if (!source) continue;
    for (const key of Object.keys(source)) {
      const srcVal = source[key];
      const resVal = result[key];
      if (isPlainObject(srcVal) && isPlainObject(resVal)) {
        result[key] = deepMerge(resVal, srcVal);
      } else if (srcVal !== undefined) {
        result[key] = srcVal;
      }
    }
  }

  return result as T;
}

// ─── 图层 ID 生成 ─────────────────────────────────────────────────────────────

let _idCounter = 0;

export function generateLayerId(drawType: string): string {
  return `${LAYER_ID_PREFIX}${drawType.toLowerCase()}-${++_idCounter}`;
}

// ─── OL 样式构建辅助 ──────────────────────────────────────────────────────────

export function buildStroke(config: StrokeConfig): OlStroke {
  return new OlStroke({
    color: config.color,
    width: config.width,
    lineDash: config.lineDash as number[],
    lineCap: config.lineCap as CanvasLineCap,
    lineJoin: config.lineJoin as CanvasLineJoin,
    lineDashOffset: config.lineDashOffset,
  });
}

export function buildFill(config: FillConfig): OlFill {
  return new OlFill({ color: config.color });
}

export function buildVertexStyle(config: VertexConfig): OlStyle {
  return new OlStyle({
    image: new OlCircleStyle({
      radius: config.radius,
      fill: new OlFill({ color: config.fillColor }),
      stroke: new OlStroke({
        color: config.strokeColor,
        width: config.strokeWidth,
      }),
    }),
  });
}

// ─── 参数校验 ─────────────────────────────────────────────────────────────────

export function assertMap(map: unknown): asserts map is OlMap {
  if (!map || typeof map !== 'object' || typeof (map as OlMap).addLayer !== 'function') {
    throw new TypeError('[OlDrawTools] 传入的 map 不是有效的 OpenLayers Map 实例');
  }
}

// ─── 安全移除交互 ─────────────────────────────────────────────────────────────

export function safeRemoveInteraction(map: OlMap, interaction: Interaction | null): void {
  if (interaction) {
    try {
      map.removeInteraction(interaction);
    } catch {
      // 已被移除或 map 已销毁，忽略
    }
  }
}
