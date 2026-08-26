import Map from 'ol/Map';
import Draw from 'ol/interaction/Draw';
import type VectorLayer from 'ol/layer/Vector';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type { StyleFunction } from 'ol/style/Style';
import type { EventBus } from '../runtime/EventBus';
import { DrawType } from '../../kernel/constants/drawType';
import { DrawEvent } from '../../kernel/constants/events';
import type { ResolvedPlotConfig } from '../../kernel/types/config';
import { mergeConfig } from '../../kernel/constants';
import { PLOT_DEFS } from '../../plots/registry';
import { ClickFreehandDraw } from './ClickFreehandDraw';
import { FEATURE_HIT_TOLERANCE } from './SelectManager';

/**
 * 绘制管理器类，用于管理地图上的绘制交互功能。
 *
 * 设计要点（协调式交互）：
 *  - 构造时一次性创建并添加 Draw 交互，并保持常驻（不再惰性创建 / 反复增删）。
 *    在 BaseTool 中 Draw 最后被添加，因此拥有最高的事件处理优先级。
 *  - 通过自定义 `style` 隐藏跟随鼠标的草图顶点。
 *  - 通过 `condition` 与 Select / Modify 协调：保证同一次点击只被一个交互处理
 *    真正处理，避免冲突。
 */
export class DrawManager {
  private map: Map;
  private layer: VectorLayer;
  private eventBus: EventBus;
  private draw: Draw;
  private clickFreehandDraw: ClickFreehandDraw | null = null;
  /** 是否拦截已有要素上的起笔。 */
  private editable: boolean;

  /** 是否正在绘制（drawstart 与 drawend/drawabort 之间） */
  private sketching = false;
  /** 当前是否允许起笔（由 BaseTool 注入：无选中要素时才允许） */
  private canStartDraw: () => boolean;

  /**
   * 构造函数
   * @param map - 地图实例
   * @param layer - 绘制要素所在的矢量图层（同时用于命中检测）
   * @param eventBus - 事件总线，用于发布绘制相关的事件
   * @param drawType - 绘制类型，指定要绘制的几何图形类型
   * @param style - 绘制（草图）阶段的样式函数
   * @param canStartDraw - 返回当前是否允许起笔（无选中要素时为 true）
   */
  constructor(
    map: Map,
    layer: VectorLayer,
    eventBus: EventBus,
    drawType: DrawType,
    style: StyleFunction,
    canStartDraw: () => boolean,
    config?: ResolvedPlotConfig,
  ) {
    this.map = map;
    this.layer = layer;
    this.eventBus = eventBus;
    this.canStartDraw = canStartDraw;
    this.editable = config?.editable ?? true;

    const definition = PLOT_DEFS[drawType];
    const context = {
      config: config ?? mergeConfig(),
      projection: map.getView().getProjection(),
    };
    const type = definition.olType;
    const geometryFunction = definition.geometryFunction?.(context);
    let clickFreehandType: 'LineString' | 'Polygon' | null = null;
    if (drawType === DrawType.FreehandLine) {
      clickFreehandType = 'LineString';
    } else if (drawType === DrawType.FreehandPolygon) {
      clickFreehandType = 'Polygon';
    }

    if (clickFreehandType) {
      this.clickFreehandDraw = new ClickFreehandDraw(
        map,
        layer.getSource()!,
        style,
        (e) => this.condition(e),
        clickFreehandType,
      );
      this.draw = this.clickFreehandDraw as unknown as Draw;
    } else {
      this.draw = new Draw({
        source: layer.getSource()!,
        type,
        geometryFunction,
        minPoints: definition.minPoints,
        maxPoints: definition.maxPoints,
        style,
        condition: (e) => this.condition(e),
      });
    }

    this.draw.on('drawstart', (e) => {
      this.sketching = true;
      this.eventBus.emit(DrawEvent.DRAW_START, { feature: e.feature, drawType });
    });
    this.draw.on('drawend', (e) => {
      this.sketching = false;
      this.eventBus.emit(DrawEvent.DRAW_END, { feature: e.feature, drawType });
    });
    this.draw.on('drawabort', () => {
      this.sketching = false;
      this.eventBus.emit(DrawEvent.DRAW_ABORT, { drawType });
    });

    this.map.addInteraction(this.draw);
  }

  /**
   * Draw 交互的起笔条件，用于与 Select / Modify 协调：
   *  - 绘制进行中：允许在任意位置继续落点。
   *  - 已有选中要素：本次点击让给 Select 去取消选中，不起笔。
   *  - 点击落在已有要素上：让给 Select 去选中，不起笔。
   *  - 其余（空白处且无选中）：起笔绘制。
   */
  private condition(e: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>): boolean {
    if (this.sketching) return true;
    if (!this.canStartDraw()) return false;
    if (!this.editable) return true;
    const overFeature =
      this.map.forEachFeatureAtPixel(e.pixel, () => true, {
        hitTolerance: FEATURE_HIT_TOLERANCE,
        layerFilter: (l) => l === this.layer,
      }) === true;
    return !overFeature;
  }

  /**
   * 是否正在绘制
   */
  isSketching(): boolean {
    return this.sketching;
  }

  /**
   * 设置绘制交互的激活状态
   * @param active 是否激活
   */
  setActive(active: boolean): void {
    this.draw.setActive(active);
  }

  abortDrawing(): void {
    if (!this.sketching) return;
    this.draw.abortDrawing();
  }

  /**
   * 销毁绘制管理器，清理所有资源
   */
  destroy(): void {
    this.map.removeInteraction(this.draw);
    this.clickFreehandDraw?.destroy();
    this.clickFreehandDraw = null;
  }
}
