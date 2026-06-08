/**
 * @file core/LineBaseTool.ts
 * @description 所有标绘工具的抽象基类
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │                     有限状态机                               │
 * │                                                             │
 * │   构造完成                                                   │
 * │      │                                                      │
 * │      ▼                                                      │
 * │  [DRAWING_IDLE] ◄──────────────────────────────────┐       │
 * │   Draw 挂载                                         │       │
 * │   Modify 未挂载                                     │       │
 * │      │ 点击空白区域（Draw 响应）                     │       │
 * │      ▼                                             │       │
 * │  [DRAWING_ACTIVE]                                  │       │
 * │   Draw 挂载 + 正在绘制中                            │       │
 * │      │ 双击完成 / drawend                          │       │
 * │      ▼                                             │       │
 * │  [EDITING] ────────── 点击空白区域 ────────────────┘       │
 * │   Draw 卸载                                                 │
 * │   Modify 挂载                                               │
 * │   顶点节点显示                                               │
 * │      │ 点击其他线                                           │
 * │      └──────► 清理旧 Modify + 顶点 → 建立新 Modify + 顶点  │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 *
 * 状态转换规则：
 *  DRAWING_IDLE  → DRAWING_ACTIVE : Draw interaction 触发 drawstart
 *  DRAWING_ACTIVE → EDITING       : drawend，卸载 Draw，挂载 Modify + 顶点
 *  EDITING       → DRAWING_IDLE   : 点击地图空白区域，卸载 Modify，挂载 Draw
 *  EDITING       → EDITING        : 点击另一条线，切换选中要素
 */

import OlMap from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OlStroke from 'ol/style/Stroke';
import OlFill from 'ol/style/Fill';
import OlCircle from 'ol/style/Circle';
import OlStyle from 'ol/style/Style';
import OlFeature from 'ol/Feature';
import { Point } from 'ol/geom';
import type { Geometry, LineString } from 'ol/geom';
import type { StyleLike } from 'ol/style/Style';
import type { Options as DrawOptions } from 'ol/interaction/Draw';
import type { MapBrowserEvent } from 'ol';

import { DEFAULT_CONFIG } from '../config/defaultConfig';
import { DrawEvent, DrawType, ToolStatus } from '../constants/index';
import {
  deepMerge,
  generateLayerId,
  buildStroke,
  buildFill,
  buildVertexStyle,
  assertMap,
} from '../utils/index';

import { EventDispatcher, DrawingSystem, EditingSystem, StateManager, ToolState } from './systems/index';

import type {
  DrawToolConfig,
  DrawToolUserConfig,
  DrawToolEventHandler,
  IDrawTool,
  StrokeConfig,
  FillConfig,
  VertexConfig,
} from '../types/index';


// ─── 抽象基类 ─────────────────────────────────────────────────────────────────

export abstract class LineBaseTool<C extends DrawToolConfig = DrawToolConfig> implements IDrawTool {
  protected readonly _map: OlMap;
  protected _config: C;

  protected _source!: VectorSource<OlFeature<Geometry>>;
  protected _layer!: VectorLayer<VectorSource<OlFeature<Geometry>>>;

  private _eventDispatcher: EventDispatcher;
  private _drawingSystem: DrawingSystem;
  private _editingSystem: EditingSystem;
  private _stateManager: StateManager;

  // ═══════════════════════════════════════════════════════════════
  // 构造
  // ═══════════════════════════════════════════════════════════════

  constructor(map: OlMap, userConfig: DrawToolUserConfig = {}) {
    assertMap(map);
    this._map = map;
    this._config = deepMerge<any>(DEFAULT_CONFIG as C, this._getToolConfig() as Partial<C>, userConfig as Partial<C>);

    this._initLayer();

    this._eventDispatcher = new EventDispatcher();
    this._drawingSystem = new DrawingSystem(
      this._map,
      this._source,
      this._eventDispatcher,
      () => this._buildDrawStyle(),
      () => this._buildInteractionOptions(),
      (feature) => this._stateManager.enterEditing(feature),
    );
    this._editingSystem = new EditingSystem(
      this._map,
      this._layer,
      this._eventDispatcher,
      () => this._buildVertexHandleStyle(),
    );
    this._stateManager = new StateManager(
      this._map,
      this._layer,
      this._source,
      this._eventDispatcher,
      this._drawingSystem,
      this._editingSystem,
      (e) => this._hitTestLineFeature(e),
    );

    this._stateManager.enterDrawingIdle();
  }

  // ═══════════════════════════════════════════════════════════════
  // 子类抽象方法
  // ═══════════════════════════════════════════════════════════════

  protected abstract _getDrawType(): DrawType;
  protected abstract _getToolConfig(): DrawToolUserConfig;

  /**
   * 绘制中草稿样式
   * ⚠️  不要在此包含顶点样式，顶点由 vertex layer 独立渲染
   */
  protected abstract _buildDrawStyle(): StyleLike;

  /** 绘制完成后线要素的固定样式 */
  protected abstract _buildFinishStyle(): StyleLike;

  // ═══════════════════════════════════════════════════════════════
  // 公共 API
  // ═══════════════════════════════════════════════════════════════

  activate(): this {
    if (this._stateManager.getState() === ToolState.DRAWING_IDLE ||
        this._stateManager.getState() === ToolState.DRAWING_ACTIVE) {
      return this;
    }
    this._stateManager.enterDrawingIdle();
    return this;
  }

  deactivate(): this {
    this._stateManager.enterDisabled();
    return this;
  }

  clear(): this {
    this._stateManager.enterDisabled();
    this._source?.clear();
    this._stateManager.enterDrawingIdle();
    return this;
  }

  /** 销毁工具，释放全部资源 */
  destroy(): void {
    this._stateManager.enterDisabled();
    this._editingSystem.destroy();
    this._eventDispatcher.clear();
    this._map.removeLayer(this._layer);
    (this._source as unknown) = null;
    (this._layer as unknown) = null;
  }

  updateConfig(partialConfig: DrawToolUserConfig): this {
    this._config = deepMerge<any>(this._config, partialConfig as Partial<C>);
    this._layer?.setStyle(this._buildFinishStyle());
    return this;
  }

  getConfig(): C {
    return deepMerge<any>(this._config);
  }

  getFeatures(): OlFeature<Geometry>[] {
    return this._source?.getFeatures() ?? [];
  }

  getStatus(): ToolStatus {
    const state = this._stateManager.getState();
    switch (state) {
      case ToolState.DRAWING_IDLE:
      case ToolState.DRAWING_ACTIVE:
        return ToolStatus.DRAWING;
      case ToolState.EDITING:
        return ToolStatus.EDITING;
      case ToolState.DISABLED:
      default:
        return ToolStatus.DISABLED;
    }
  }

  getLayer(): VectorLayer<VectorSource<OlFeature<Geometry>>> {
    return this._layer;
  }

  // ─── 事件系统 ────────────────────────────────────────────────────────────

  on<E extends DrawEvent>(event: E, handler: DrawToolEventHandler<E>): this {
    this._eventDispatcher.on(event, handler);
    return this;
  }

  off<E extends DrawEvent>(event: E, handler?: DrawToolEventHandler<E>): this {
    this._eventDispatcher.off(event, handler);
    return this;
  }




  // ═══════════════════════════════════════════════════════════════
  // 图层初始化
  // ═══════════════════════════════════════════════════════════════

  private _initLayer(): void {
    this._source = new VectorSource<OlFeature<Geometry>>({ wrapX: false });
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



  private _buildVertexHandleStyle(): OlStyle {
    const { vertex } = this._config;
    return new OlStyle({
      image: new OlCircle({
        radius: vertex.radius,
        fill: new OlFill({ color: vertex.fillColor }),
        stroke: new OlStroke({
          color: vertex.strokeColor,
          width: vertex.strokeWidth,
        }),
      }),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 命中检测
  // ═══════════════════════════════════════════════════════════════


  private _hitTestLineFeature(e: MapBrowserEvent<any>): OlFeature<LineString> | null {
    let found: OlFeature<LineString> | null = null;
    this._map.forEachFeatureAtPixel(
      e.pixel,
      (feature) => {
        const f = feature as OlFeature<Geometry>;
        if (this._source.hasFeature(f)) {
          found = f as unknown as OlFeature<LineString>;
          return true;
        }
        return false;
      },
      { hitTolerance: 6 },
    );
    return found;
  }

  // ═══════════════════════════════════════════════════════════════
  // 构建 Draw Interaction 选项（子类可 override 扩展）
  // ═══════════════════════════════════════════════════════════════

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


  // ═══════════════════════════════════════════════════════════════
  // 样式构建辅助（供子类使用）
  // ═══════════════════════════════════════════════════════════════

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
