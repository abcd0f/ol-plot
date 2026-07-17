import Map from 'ol/Map';
import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';
import { BaseTool } from './BaseTool';
import { HandleManager } from '../helper/handle';

/**
 * HandleBasedTool 是一个抽象基类，用于需要自定义控制点编辑的绘制工具。
 *
 * 它继承自 BaseTool，并自动管理：
 * - 禁用默认的 ModifyManager（因为自定义图形的顶点不适合直接编辑）
 * - 创建和管理 HandleManager 实例
 * - 绑定标准的 DRAW_END / SELECT / DESELECT 事件
 * - 覆盖 modifyend 事件以携带正确的 activeFeature
 *
 * 子类只需实现：
 * - `getPlotType()`: 返回图形类型名称（如 'doubleArrow', 'flag'）
 * - `onHandleSync(controlPoints)`: 当控制点被拖拽后，如何重建几何
 *
 * 可选覆盖：
 * - `extractControlPoints(geom)`: 从几何对象中提取控制点（默认从 '_controlPoints' 属性读取）
 * - `normalizeControlPoints(points)`: 归一化控制点（默认不处理）
 */
export abstract class HandleBasedTool extends BaseTool {
  protected handleManager: HandleManager;

  constructor(map: Map, drawType: DrawType, config?: PlotConfig) {
    super(map, drawType, config);

    // 禁用默认 ModifyManager
    this.modifyManager.setActive(false);

    // 创建 HandleManager，使用子类提供的同步逻辑
    this.handleManager = new HandleManager(
      map,
      this.eventBus,
      this.config,
      (controlPoints: number[][]) => this.onHandleSync(controlPoints),
    );

    // 覆盖 modifyend 以携带正确的 activeFeature
    this.handleManager.handleModify.on('modifyend', () => {
      this.eventBus.emit(DrawEvent.MODIFY_END, {
        features: this.activeFeature ? [this.activeFeature] : [],
      });
    });

    // 绑定标准事件
    this.bindHandleEvents();
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  private bindHandleEvents(): void {
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      const geom = feature.getGeometry()!;
      const rawPoints = this.extractControlPoints(geom);
      const controlPoints = this.normalizeControlPoints(rawPoints);

      feature.set('plotType', this.getPlotType());
      feature.set('controlPoints', controlPoints);
    });

    this.eventBus.on(DrawEvent.SELECT, ({ feature }: { feature: Feature }) => {
      const controlPoints = feature.get('controlPoints') as number[][] | undefined;
      this.handleManager.show(controlPoints);
    });

    this.eventBus.on(DrawEvent.DESELECT, () => {
      this.handleManager.hide();
    });
  }

  // ─── Abstract & Override Points ───────────────────────────────────────────

  /**
   * 返回图形类型名称，用于设置 feature 的 'plotType' 属性。
   *
   * @example 'doubleArrow', 'flag', 'straightArrow', 'taperedArrow'
   */
  protected abstract getPlotType(): string;

  /**
   * 当控制点被拖拽后的同步回调。
   *
   * 子类应在此方法中：
   * 1. 更新 activeFeature 的 'controlPoints' 属性
   * 2. 根据新的控制点重新生成几何并更新到 activeFeature
   *
   * @param controlPoints 拖拽后的控制点坐标数组
   */
  protected abstract onHandleSync(controlPoints: number[][]): void;

  /**
   * 从几何对象中提取原始控制点。
   *
   * 默认实现从几何对象的 '_controlPoints' 属性读取（Draw geometryFunction 存入）。
   * 子类可以覆盖此方法以提供自定义提取逻辑。
   *
   * @param geom 几何对象
   * @returns 控制点坐标数组
   */
  protected extractControlPoints(geom: Geometry): number[][] {
    return (geom.get('_controlPoints') as number[][] | undefined) || [];
  }

  /**
   * 归一化控制点（例如自动计算中间点、限制点数等）。
   *
   * 默认实现不做任何处理，直接返回原始控制点。
   * 子类可以覆盖此方法以提供自定义归一化逻辑。
   *
   * @param controlPoints 原始控制点
   * @returns 归一化后的控制点
   */
  protected normalizeControlPoints(controlPoints: number[][]): number[][] {
    return controlPoints;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  destroy(): void {
    this.handleManager.destroy();
    super.destroy();
  }
}
