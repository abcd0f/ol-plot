import Map from 'ol/Map';
import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type { StyleFunction, StyleLike } from 'ol/style/Style';
import type { InternalPlotConfig, ResolvedPlotConfig } from '../types/config';
import type { PlotFeatureData, PlotRestoreOptions } from '../types/data';
import { DrawType } from '../constants/drawType';
import { ToolState } from '../constants/toolState';
import { EventBus } from './EventBus';
import { LayerManager } from './LayerManager';
import { DrawManager } from './DrawManager';
import { SelectManager } from './SelectManager';
import { ModifyManager } from './ModifyManager';
import { CursorManager } from './CursorManager';
import { PlotRuntime } from './PlotRuntime';
import { mergeConfig, mergeRuntimeConfig } from '../constants';
import { buildFeatureStyle } from '../style/feature';
import { buildDrawStyle } from '../style/draw';
import { buildSelectStyle } from '../style/select';
import { buildModifyStyle } from '../style/modify';
import {
  buildStyleFromData,
  getFeatureStyleData,
  projectPlotDataCoordinates,
  resolveStyleData,
  serializeFeature,
  setFeatureStyleData,
} from '../utils/data';

/**
 * BaseTool 是一个抽象基类，用于创建地图绘制工具。
 *
 * 它内部以「协调式交互」的方式统一管理 Draw / Select / Modify 三个 interaction，
 * 并自动维护完整生命周期（Idle → Drawing → Editing → Drawing），业务层只需：
 *
 * ```ts
 * const tool = new LineTool(map);
 * ```
 *
 * 无需任何按钮或 start/stop 接口即可获得：绘制（无跟随鼠标的节点）→ 绘制完成自动
 * 选中并进入编辑 → 点击其它要素切换选中 → 点空白取消选中并保留内容 → 无选中时点
 * 空白直接重新绘制。
 *
 * Draw / Select / Modify 的启停和编辑模式由共享运行时统一协调。
 */
export abstract class BaseTool {
  /**  */
  protected map: Map;
  protected config: ResolvedPlotConfig;
  protected drawType: DrawType;

  protected eventBus: EventBus;
  protected layerManager: LayerManager;
  protected drawManager: DrawManager;
  protected selectManager: SelectManager;
  protected modifyManager: ModifyManager;
  protected cursorManager: CursorManager;

  protected activeFeature: Feature | null = null;
  /** 当前内部状态，由生命周期自动维护 */
  protected state: ToolState = ToolState.Idle;

  protected runtime: PlotRuntime;
  private drawStyle: StyleFunction;
  private eventWrappers = new globalThis.Map<
    string,
    globalThis.Map<(...args: any[]) => void, (...args: any[]) => void>
  >();

  /**
   * 初始化地图工具的基本组件和配置，并自动进入绘制态。
   *
   * @param map - 地图实例
   * @param drawType - 绘制类型（由具体子类传入）
   * @param config - 绘制配置项（可选）
   */
  constructor(map: Map, drawType: DrawType, config?: InternalPlotConfig) {
    this.map = map;
    this.drawType = drawType;
    this.config = mergeConfig(config);
    this.drawStyle = buildDrawStyle(this.config);

    this.runtime = new PlotRuntime({
      map,
      drawType,
      config: this.config,
      featureStyle: buildFeatureStyle(this.config),
      drawStyle: (feature, resolution) => this.drawStyle(feature, resolution),
      onActiveFeatureChange: (feature) => {
        this.activeFeature = feature;
      },
      onStateChange: (state) => {
        this.state = state;
      },
    });
    this.eventBus = this.runtime.eventBus;
    this.layerManager = this.runtime.layerManager;
    this.drawManager = this.runtime.drawManager!;
    this.selectManager = this.runtime.selectManager;
    this.modifyManager = this.runtime.modifyManager;
    this.cursorManager = this.runtime.cursorManager;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * 获取当前内部状态（只读）。生命周期由工具自动维护，业务层一般无需关心。
   *
   * @returns 当前状态：Idle / Drawing / Editing
   */
  getState(): ToolState {
    return this.state;
  }

  setStyleConfig(config?: InternalPlotConfig): this {
    if (!this.activeFeature || !config) return this;

    const includeFlowLine = this.drawType === DrawType.FlowLine;
    const includeAlarmPoint = this.drawType === DrawType.AlarmPoint;
    const currentStyle = getFeatureStyleData(this.activeFeature);
    const baseConfig = currentStyle ? mergeRuntimeConfig(this.config, currentStyle) : this.config;
    const styleData = resolveStyleData(baseConfig, config, includeFlowLine, includeAlarmPoint);
    if (this.drawType === DrawType.ImagePoint && (config as any).image) {
      styleData.image = { ...(config as any).image };
    }
    setFeatureStyleData(this.activeFeature, styleData);
    this.selectManager.setStyle(null);
    if (this.drawType === DrawType.FlowLine) {
      this.activeFeature.setStyle(undefined);
    } else {
      this.activeFeature.setStyle(buildStyleFromData(styleData));
    }
    this.refreshActiveFeatureStyle();
    return this;
  }

  /**
   * 销毁工具实例
   * 清理所有管理器和事件监听器
   */
  destroy(): void {
    this.runtime.destroy();
    this.eventWrappers.clear();
  }

  // ─── Load from data ───────────────────────────────────────────────────────

  /**
   * 添加一个要素到图层中
   * @param coordinates - 坐标数组，用于创建几何对象
   * @returns 返回创建的要素对象
   */
  protected createFeature(coordinates: number[][]): Feature {
    this.runtime.bumpRevision();
    const feature = new Feature({ geometry: this.createGeometry(coordinates) });
    this.layerManager.appendFeature(feature);
    return feature;
  }

  /**
   * Restore one or more features from serialized plot data.
   *
   * Data should usually be restored by the same tool type that created it.
   */
  restorePlotData(data: PlotFeatureData | PlotFeatureData[], options: PlotRestoreOptions = {}): Feature[] {
    if (options.clear) this.clearFeatures();

    const list = Array.isArray(data) ? data : [data];
    return list.map((item) => {
      const projectedItem = projectPlotDataCoordinates(item, this.map.getView().getProjection());
      const feature = this.createFeature(projectedItem.controlPoints ?? projectedItem.coordinates);
      if (item.id !== undefined) feature.setId(item.id);
      if (item.rangeRingsSpacing) feature.set('rangeRingsSpacing', item.rangeRingsSpacing);
      if (item.rangeRingsUnit) feature.set('rangeRingsUnit', item.rangeRingsUnit);
      if (item.plotType) feature.set('plotType', item.plotType);
      if (projectedItem.controlPoints)
        feature.set(
          'controlPoints',
          projectedItem.controlPoints.map((point) => [...point]),
        );
      Object.entries(item.properties ?? {}).forEach(([key, value]) => feature.set(key, value));
      if (item.style) {
        setFeatureStyleData(feature, item.style);
        if (
          options.applyStyle !== false &&
          item.type !== DrawType.FlowLine &&
          (item.type !== DrawType.ImagePoint || item.style.image?.src || item.style.image?.label?.text)
        ) {
          feature.setStyle(buildStyleFromData(item.style));
        }
      }
      return feature;
    });
  }

  /**
   * Alias for restorePlotData.
   */
  loadPlotData(data: PlotFeatureData | PlotFeatureData[], options: PlotRestoreOptions = {}): Feature[] {
    return this.restorePlotData(data, options);
  }

  // ─── Features ─────────────────────────────────────────────────────────────

  /**
   * 获取所有要素
   *
   * @returns 返回要素数组
   */
  getFeatures(): Feature[] {
    return this.layerManager.getFeatures();
  }

  /**
   * Serialize one feature into JSON-friendly structured data.
   */
  getFeatureData(feature: Feature): PlotFeatureData {
    return serializeFeature(feature, this.drawType, this.config, this.map.getView().getProjection());
  }

  /**
   * Serialize all features managed by this tool.
   */
  getPlotData(): PlotFeatureData[] {
    return this.getFeatures().map((feature) => this.getFeatureData(feature));
  }

  /**
   * Alias for getPlotData, named for server persistence workflows.
   */
  getStructuredData(): PlotFeatureData[] {
    return this.getPlotData();
  }

  /**
   * 清空所有要素，并回到绘制态
   *
   * @returns 返回当前实例以支持链式调用
   */
  clearFeatures(): this {
    this.runtime.clearFeatures();
    return this;
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  /**
   * 添加事件监听器
   *
   * @param event - 事件名称
   * @param handler - 事件处理函数
   * @returns 返回当前实例以支持链式调用
   */
  on(event: string, handler: (...args: any[]) => void): this {
    const wrapper = (...args: any[]) => handler(...args.map((arg) => this.withStructuredData(arg)));
    if (!this.eventWrappers.has(event)) this.eventWrappers.set(event, new globalThis.Map());
    this.eventWrappers.get(event)!.set(handler, wrapper);
    this.eventBus.on(event, wrapper);
    return this;
  }

  /**
   * 移除事件监听器
   *
   * @param event - 事件名称
   * @param handler - 事件处理函数
   * @returns 返回当前实例以支持链式调用
   */
  off(event: string, handler: (...args: any[]) => void): this {
    const wrapper = this.eventWrappers.get(event)?.get(handler);
    this.eventBus.off(event, wrapper ?? handler);
    this.eventWrappers.get(event)?.delete(handler);
    return this;
  }

  // ─── Abstract API ─────────────────────────────────────────────────────────

  /**
   * 从平面坐标数组构建此工具类型的几何图形
   */
  protected abstract createGeometry(coordinates: number[][]): Geometry;

  /**
   * 设置坐标
   *
   * @param coordinates - 坐标数组
   */
  abstract setCoordinates(coordinates: number[][]): void;

  /**
   * 获取坐标
   *
   * @returns 返回坐标数组
   */
  abstract getCoordinates(): number[][];

  /**
   * 获取点的数量
   *
   * @returns 返回点的数量
   */
  abstract getPointCount(): number;

  /**
   * 更新指定索引的点坐标
   *
   * @param index - 点的索引
   * @param coordinate - 新的坐标
   */
  abstract updatePoint(index: number, coordinate: number[]): void;

  protected refreshStyles(): void {
    this.drawStyle = buildDrawStyle(this.config);
    this.layerManager.getLayer().setStyle(this.createFeatureStyle());
    this.selectManager.setStyle(buildSelectStyle(this.config));
    this.modifyManager.setStyle(buildModifyStyle(this.config));
    this.layerManager.getLayer().changed();
  }

  protected refreshActiveFeatureStyle(): void {
    this.selectManager.setStyle(buildSelectStyle(this.config));
    this.modifyManager.setStyle(buildModifyStyle(this.config));
    this.activeFeature?.changed();
    this.layerManager.getLayer().changed();
  }

  protected createFeatureStyle(): StyleLike {
    return buildFeatureStyle(this.config);
  }

  private withStructuredData(arg: any): any {
    if (!arg || typeof arg !== 'object') return arg;

    if (arg.feature instanceof Feature) {
      return {
        ...arg,
        data: this.getFeatureData(arg.feature),
      };
    }

    if (Array.isArray(arg.features)) {
      return {
        ...arg,
        dataList: arg.features.map((feature: Feature) => this.getFeatureData(feature)),
      };
    }

    return arg;
  }
}
