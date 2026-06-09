import Map from 'ol/Map';
import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { ToolState } from '../constants/toolState';
import { DrawEvent } from '../constants/events';
import { EventBus } from './EventBus';
import { LayerManager } from './LayerManager';
import { DrawManager } from './DrawManager';
import { SelectManager } from './SelectManager';
import { ModifyManager } from './ModifyManager';
import { mergeConfig, buildFeatureStyle, buildDrawStyle } from '../utils';

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
 * 三个 interaction 始终处于激活状态，通过 Draw 的 `condition` 与添加顺序（Draw 最后
 * 添加 → 优先级最高）保证同一次点击只被一个 interaction 真正处理，避免相互冲突。
 */
export abstract class BaseTool {
  /**  */
  protected map: Map;
  protected config: Required<PlotConfig>;
  protected drawType: DrawType;

  protected eventBus: EventBus;
  protected layerManager: LayerManager;
  protected drawManager: DrawManager;
  protected selectManager: SelectManager;
  protected modifyManager: ModifyManager;

  protected activeFeature: Feature | null = null;
  /** 当前内部状态，由生命周期自动维护 */
  protected state: ToolState = ToolState.Idle;

  private handleKeyDown: (e: KeyboardEvent) => void;

  /**
   * 初始化地图工具的基本组件和配置，并自动进入绘制态。
   *
   * @param map - 地图实例
   * @param drawType - 绘制类型（由具体子类传入）
   * @param config - 绘制配置项（可选）
   */
  constructor(map: Map, drawType: DrawType, config?: PlotConfig) {
    this.map = map;
    this.drawType = drawType;
    this.config = mergeConfig(config);

    this.eventBus = new EventBus();
    this.layerManager = new LayerManager(map, buildFeatureStyle(this.config));

    // 创建顺序即添加顺序：Select → Modify → Draw。
    // Draw 最后添加，因此事件处理优先级最高，能在 Select 之前评估 condition，
    // 读取到本次点击「尚未被清空」的选中状态，从而正确协调起笔与取消选中。
    this.selectManager = new SelectManager(map, this.layerManager.getLayer(), this.config, this.eventBus);
    this.modifyManager = new ModifyManager(map, this.selectManager.getSelectedFeatures(), this.config, this.eventBus);
    this.drawManager = new DrawManager(
      map,
      this.layerManager.getLayer(),
      this.eventBus,
      drawType,
      buildDrawStyle(this.config),
      () => this.selectManager.isEmpty(),
    );

    this.bindEvents();

    this.handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.activeFeature) {
        this.deleteActiveFeature();
      }
    };
    document.addEventListener('keydown', this.handleKeyDown);

    // 自动激活：进入绘制态，业务层无需调用任何方法
    this.state = ToolState.Drawing;
  }

  /**
   * 绑定生命周期事件，驱动状态机自动流转。
   *
   * - 绘制完成（DRAW_END）：自动选中刚创建的要素并进入编辑态。
   * - 选中要素（SELECT）：进入编辑态（Select 已保证单选，自动取消旧选中）。
   * - 取消选中（DESELECT）：回到绘制态，保留已绘制内容。
   */
  private bindEvents(): void {
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      setTimeout(() => {
        this.activeFeature = feature;
        // 绘制完成后自动选中刚画的要素：显示其顶点节点、Modify 跟随、进入编辑态
        this.selectManager.selectFeature(feature);
      }, 0);
    });

    this.eventBus.on(DrawEvent.SELECT, ({ feature }: { feature: Feature }) => {
      this.activeFeature = feature;
      this.state = ToolState.Editing;
    });

    this.eventBus.on(DrawEvent.DESELECT, () => {
      this.activeFeature = null;
      this.state = ToolState.Drawing;
    });
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * 删除当前选中的要素
   */
  private deleteActiveFeature(): void {
    const feature = this.activeFeature!;
    this.selectManager.clearSelection();
    this.layerManager.removeFeature(feature);
    this.eventBus.emit(DrawEvent.DELETE, { feature });
  }

  /**
   * 获取当前内部状态（只读）。生命周期由工具自动维护，业务层一般无需关心。
   *
   * @returns 当前状态：Idle / Drawing / Editing
   */
  getState(): ToolState {
    return this.state;
  }

  /**
   * 销毁工具实例
   * 清理所有管理器和事件监听器
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.drawManager.destroy();
    this.selectManager.destroy();
    this.modifyManager.destroy();
    this.layerManager.destroy();
    this.eventBus.clear();
    this.activeFeature = null;
    this.state = ToolState.Idle;
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
   * 清空所有要素，并回到绘制态
   *
   * @returns 返回当前实例以支持链式调用
   */
  clearFeatures(): this {
    this.selectManager.clearSelection();
    this.activeFeature = null;
    this.layerManager.clear();
    this.state = ToolState.Drawing;
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
