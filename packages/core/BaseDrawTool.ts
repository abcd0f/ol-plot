/**
 * @file core/BaseDrawTool.ts
 * @description 所有标绘工具的抽象基类（TypeScript 完整实现）
 *
 * 泛型参数 C extends DrawToolConfig：
 *   允许子类扩展配置类型（如 ArrowTool 可添加 arrowHead 配置）
 *   默认为标准 DrawToolConfig
 */

import OlMap from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Draw, { type Options as DrawOptions } from 'ol/interaction/Draw';
import OlStyle from 'ol/style/Style';
import OlStroke from 'ol/style/Stroke';
import OlFill from 'ol/style/Fill';
import OlCircleStyle from 'ol/style/Circle';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import type { StyleLike } from 'ol/style/Style';

import { DEFAULT_CONFIG } from '../config/defaultConfig';
import { DrawEvent, DrawType, ToolStatus } from '../constants/index';
import {
  deepMerge,
  generateLayerId,
  buildStroke,
  buildFill,
  buildVertexStyle,
  assertMap,
  safeRemoveInteraction,
} from '../utils/index';

import type {
  DrawToolConfig,
  DrawToolUserConfig,
  DrawToolEventMap,
  DrawToolEventHandler,
  IDrawTool,
  StrokeConfig,
  FillConfig,
  VertexConfig,
} from '../types/index';

// ─── 内部事件监听器存储类型 ───────────────────────────────────────────────────

type ListenerMap = {
  [E in DrawEvent]?: Array<DrawToolEventHandler<E>>;
};

// ─── 抽象基类 ─────────────────────────────────────────────────────────────────

export abstract class BaseDrawTool<C extends DrawToolConfig = DrawToolConfig> implements IDrawTool {
  protected readonly _map: OlMap;
  protected _config: C;
  protected _status: ToolStatus = ToolStatus.IDLE;
  protected _source!: VectorSource<Feature<Geometry>>;
  protected _layer!: VectorLayer<VectorSource<Feature<Geometry>>>;
  protected _drawInteraction: Draw | null = null;

  // 类型安全的事件监听器存储
  private readonly _listeners: ListenerMap = {};

  constructor(map: OlMap, userConfig: DrawToolUserConfig = {}) {
    assertMap(map);
    this._map = map;

    // 三层配置合并：全局默认 → 工具专属默认 → 用户传入
    this._config = deepMerge<any>(DEFAULT_CONFIG as C, this._getToolConfig() as Partial<C>, userConfig as Partial<C>);

    this._initLayer();
  }

  // ═══════════════════════════════════════════════════════════════
  // 子类必须实现的抽象方法
  // ═══════════════════════════════════════════════════════════════

  /** 返回该工具对应的 DrawType 枚举值 */
  protected abstract _getDrawType(): DrawType;

  /** 返回工具专属默认配置（来自 toolConfigs.ts），不需要时返回 {} */
  protected abstract _getToolConfig(): DrawToolUserConfig;

  /** 构建绘制中的草稿样式（支持 StyleLike：Style / Style[] / StyleFunction） */
  protected abstract _buildDrawStyle(): StyleLike;

  /** 构建绘制完成后要素的最终样式 */
  protected abstract _buildFinishStyle(): StyleLike;

  // ═══════════════════════════════════════════════════════════════
  // 公共 API
  // ═══════════════════════════════════════════════════════════════

  /** 激活绘制工具 */
  activate(): this {
    if (this._status === ToolStatus.DRAWING) return this;
    this._createInteraction();
    this._map.addInteraction(this._drawInteraction!);
    this._status = ToolStatus.DRAWING;
    return this;
  }

  /** 停用绘制工具（保留已绘要素） */
  deactivate(): this {
    safeRemoveInteraction(this._map, this._drawInteraction);
    this._drawInteraction = null;
    this._status = ToolStatus.IDLE;
    return this;
  }

  /** 清空图层所有要素 */
  clear(): this {
    this._source?.clear();
    return this;
  }

  /** 销毁工具，释放所有资源 */
  destroy(): void {
    this.deactivate();
    this._map.removeLayer(this._layer);
    // 清理引用，防止内存泄漏
    (this._source as unknown) = null;
    (this._layer as unknown) = null;
    // 清空所有事件监听
    (this._listeners as unknown as Record<string, unknown[]>) &&
      Object.keys(this._listeners).forEach((k) => delete (this._listeners as Record<string, unknown>)[k]);
  }

  /**
   * 动态更新配置（热更新，自动重建样式）
   * @param partialConfig 只需传入需要修改的部分
   */
  updateConfig(partialConfig: DrawToolUserConfig): this {
    this._config = deepMerge<any>(this._config, partialConfig as Partial<C>);
    if (this._layer) {
      this._layer.setStyle(this._buildFinishStyle());
    }
    return this;
  }

  /** 获取当前完整配置的只读副本 */
  getConfig(): C {
    return deepMerge<any>(this._config);
  }

  /** 获取图层上所有已绘要素 */
  getFeatures(): Feature<Geometry>[] {
    return this._source?.getFeatures() ?? [];
  }

  /** 获取当前工具状态 */
  getStatus(): ToolStatus {
    return this._status;
  }

  /** 获取 VectorLayer 实例（供外部直接操作图层） */
  getLayer(): VectorLayer<VectorSource<Feature<Geometry>>> {
    return this._layer;
  }

  // ─── 类型安全的事件系统 ───────────────────────────────────────────────────

  on<E extends DrawEvent>(event: E, handler: DrawToolEventHandler<E>): this {
    if (!this._listeners[event]) {
      (this._listeners as Record<DrawEvent, unknown[]>)[event] = [];
    }
    (this._listeners[event] as Array<DrawToolEventHandler<E>>).push(handler);
    return this;
  }

  off<E extends DrawEvent>(event: E, handler?: DrawToolEventHandler<E>): this {
    if (!handler) {
      delete this._listeners[event];
    } else {
      const handlers = this._listeners[event] as Array<DrawToolEventHandler<E>> | undefined;
      if (handlers) {
        (this._listeners as Record<DrawEvent, unknown[]>)[event] = handlers.filter((fn) => fn !== handler);
      }
    }
    return this;
  }

  // ═══════════════════════════════════════════════════════════════
  // 内部方法
  // ═══════════════════════════════════════════════════════════════

  private _initLayer(): void {
    this._source = new VectorSource<Feature<Geometry>>({ wrapX: false });
    this._layer = new VectorLayer({
      source: this._source,
      style: this._buildFinishStyle(),
      zIndex: this._config.layer.zIndex,
      opacity: this._config.layer.opacity,
      visible: this._config.layer.visible,
      properties: {
        id: generateLayerId(this._getDrawType()),
        drawToolType: this._getDrawType(),
      },
    });
    this._map.addLayer(this._layer);
  }

  private _createInteraction(): void {
    const options = this._buildInteractionOptions();
    this._drawInteraction = new Draw(options);

    this._drawInteraction.on('drawstart', (e) => {
      this._status = ToolStatus.DRAWING;
      this._emit(DrawEvent.DRAW_START, {
        feature: e.feature as Feature<Geometry>,
        tool: this,
      });
    });

    this._drawInteraction.on('drawend', (e) => {
      this._status = ToolStatus.IDLE;
      this._emit(DrawEvent.DRAW_END, {
        feature: e.feature as Feature<Geometry>,
        tool: this,
      });
    });

    this._drawInteraction.on('drawabort', () => {
      this._status = ToolStatus.IDLE;
      this._emit(DrawEvent.DRAW_ABORT, { tool: this });
    });
  }

  /**
   * 构建 Draw Interaction 选项，子类可 override 扩展
   * 例如 RectangleTool 可以 override 此方法添加 geometryFunction
   */
  protected _buildInteractionOptions(): DrawOptions {
    const { interaction } = this._config;
    return {
      source: this._source,
      type: this._getDrawType() as DrawOptions['type'],
      style: this._buildDrawStyle(),
      freehand: interaction.freehand,
      maxPoints: isFinite(interaction.maxPoints) ? interaction.maxPoints : undefined,
      clickTolerance: interaction.clickTolerance,
      stopClick: true,
    };
  }

  private _emit<E extends DrawEvent>(event: E, payload: DrawToolEventMap[E]): void {
    const handlers = this._listeners[event] as Array<DrawToolEventHandler<E>> | undefined;
    handlers?.forEach((fn) => fn(payload));
  }

  // ─── 样式构建辅助方法（供子类直接调用）──────────────────────────────────────

  protected _createStroke(config: StrokeConfig): OlStroke {
    return buildStroke(config);
  }

  protected _createFill(config: FillConfig): OlFill {
    return buildFill(config);
  }

  protected _createVertexStyle(config: VertexConfig): OlStyle {
    return buildVertexStyle(config);
  }

  protected _createStyle(options: ConstructorParameters<typeof OlStyle>[0]): OlStyle {
    return new OlStyle(options);
  }
}
