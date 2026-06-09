import Map from 'ol/Map';
import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';
import { EventBus } from './EventBus';
import { LayerManager } from './LayerManager';
import { DrawManager } from './DrawManager';
import { SelectManager } from './SelectManager';
import { ModifyManager } from './ModifyManager';
import { mergeConfig, buildFeatureStyle } from '../utils';

/**
 * BaseTool 是一个抽象基类，用于创建地图绘制工具
 * 提供了绘制、选择、修改等功能的基础实现
 */
export abstract class BaseTool {
  /**  */
  protected map: Map;
  protected config: Required<PlotConfig>;
  protected drawType!: DrawType;

  protected eventBus: EventBus;
  protected layerManager: LayerManager;
  protected drawManager: DrawManager;
  protected selectManager: SelectManager;
  protected modifyManager: ModifyManager;

  protected activeFeature: Feature | null = null;
  private isDrawing: boolean = false;

  /**
   * 初始化地图工具的基本组件和配置
   *
   * @param map - 地图实例
   * @param config - 绘制配置项（可选）
   */
  constructor(map: Map, config?: PlotConfig) {
    this.map = map;
    this.config = mergeConfig(config);

    this.eventBus = new EventBus();
    this.layerManager = new LayerManager(map, buildFeatureStyle(this.config));
    this.drawManager = new DrawManager(map, this.layerManager.getSource(), this.eventBus);
    this.selectManager = new SelectManager(map, this.layerManager.getLayer(), this.config, this.eventBus);
    this.modifyManager = new ModifyManager(map, this.selectManager.getSelectedFeatures(), this.config, this.eventBus);

    this.bindEvents();
  }

  /**
   * 绑定事件监听器
   * 处理绘制结束、选择和取消选择等事件
   */
  private bindEvents(): void {
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      this.activeFeature = feature;
      if (this.isDrawing) {
        // 连续绘制模式：保持 Draw 交互激活，不切换到选择/修改模式
        return;
      }
      this.selectManager.setActive(true);
      this.modifyManager.setActive(true);
      this.selectManager.selectFeature(feature);
    });

    this.eventBus.on(DrawEvent.SELECT, ({ feature }: { feature: Feature }) => {
      this.activeFeature = feature;
    });

    this.eventBus.on(DrawEvent.DESELECT, () => {
      this.activeFeature = null;
    });
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * 激活工具
   * 开始绘制模式，禁用选择和修改功能
   *
   * @returns 返回当前实例以支持链式调用
   */
  activate(): this {
    this.isDrawing = true;
    this.selectManager.setActive(false);
    this.modifyManager.setActive(false);
    this.selectManager.clearSelection();
    this.activeFeature = null;
    this.drawManager.activate(this.drawType);
    return this;
  }

  /**
   * 停用工具
   * 结束绘制模式，启用选择和修改功能
   *
   * @returns 返回当前实例以支持链式调用
   */
  deactivate(): this {
    this.isDrawing = false;
    this.drawManager.deactivate();
    this.selectManager.setActive(true);
    this.modifyManager.setActive(true);
    return this;
  }

  /**
   * 销毁工具实例
   * 清理所有管理器和事件监听器
   */
  destroy(): void {
    this.drawManager.destroy();
    this.selectManager.destroy();
    this.modifyManager.destroy();
    this.layerManager.destroy();
    this.eventBus.clear();
  }

  // ─── Load from data ───────────────────────────────────────────────────────

  /**
   * 添加一个要素到图层中
   * @param coordinates - 坐标数组，用于创建几何对象
   * @returns 返回创建的要素对象
   */
  addFeature(coordinates: number[][]): Feature {
    const feature = new Feature({ geometry: this.createGeometry(coordinates) });
    this.layerManager.addFeature(feature);
    return feature;
  }

  /**
   * 选择指定的要素并激活相应的管理器
   *
   * @param feature - 要选择的要素对象
   * @returns 返回当前实例，支持链式调用
   */
  selectFeature(feature: Feature): this {
    this.drawManager.deactivate();
    this.selectManager.setActive(true);
    this.modifyManager.setActive(true);
    this.activeFeature = feature;
    this.selectManager.selectFeature(feature);
    return this;
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
   * 清空所有要素
   *
   * @returns 返回当前实例以支持链式调用
   */
  clearFeatures(): this {
    this.selectManager.clearSelection();
    this.activeFeature = null;
    this.layerManager.clear();
    return this;
  }

  // ─── Draw type ────────────────────────────────────────────────────────────

  /**
   * 设置绘制类型
   *
   * @param type - 绘制类型
   * @returns 返回当前实例以支持链式调用
   */
  setDrawType(type: DrawType): this {
    this.drawType = type;
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
    this.eventBus.on(event, handler);
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
    this.eventBus.off(event, handler);
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
}
