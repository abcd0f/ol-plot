import Map from 'ol/Map';
import Draw, { createBox, type GeometryFunction } from 'ol/interaction/Draw';
import type VectorLayer from 'ol/layer/Vector';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type { StyleFunction } from 'ol/style/Style';
import type { EventBus } from './EventBus';
import { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';
import { createEllipseGeometryFunction } from '../utils/ellipse';
import { createSectorGeometryFunction } from '../utils/sector';
import { createStraightArrowGeometryFunction } from '../utils/straightArrow';
import { createTaperedArrowGeometryFunction } from '../utils/taperedArrow';
import { createLineArrowGeometryFunction } from '../utils/lineArrow';
import { createArcGeometryFunction } from '../utils/arc';

type OLType = 'Point' | 'LineString' | 'Polygon' | 'Circle';

/**
 * 绘制管理器类，用于管理地图上的绘制交互功能。
 *
 * 设计要点（协调式交互）：
 *  - 构造时一次性创建并添加 Draw interaction，并保持常驻（不再惰性创建 / 反复增删）。
 *    在 BaseTool 中 Draw 最后被添加，因此拥有最高的事件处理优先级。
 *  - 通过自定义 `style` 隐藏跟随鼠标的草图顶点。
 *  - 通过 `condition` 与 Select / Modify 协调：保证同一次点击只被一个 interaction
 *    真正处理，避免冲突。
 */
export class DrawManager {
  private map: Map;
  private layer: VectorLayer;
  private eventBus: EventBus;
  private draw: Draw;

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
  ) {
    this.map = map;
    this.layer = layer;
    this.eventBus = eventBus;
    this.canStartDraw = canStartDraw;

    let type: OLType;
    let geometryFunction: GeometryFunction | undefined;
    let freehand = false;
    let maxPoints: number | undefined;

    // 根据绘制类型设置相应的 OpenLayers 绘制配置
    if (drawType === DrawType.Rectangle) {
      type = 'Circle';
      geometryFunction = createBox();
    } else if (drawType === DrawType.Ellipse) {
      type = 'Circle';
      geometryFunction = createEllipseGeometryFunction() as unknown as GeometryFunction;
    } else if (drawType === DrawType.Sector) {
      type = 'LineString';
      geometryFunction = createSectorGeometryFunction() as unknown as GeometryFunction;
      maxPoints = 3;
    } else if (drawType === DrawType.StraightArrow) {
      type = 'LineString';
      geometryFunction = createStraightArrowGeometryFunction() as unknown as GeometryFunction;
      maxPoints = 2;
    } else if (drawType === DrawType.TaperedArrow) {
      type = 'LineString';
      geometryFunction = createTaperedArrowGeometryFunction() as unknown as GeometryFunction;
      maxPoints = 2;
    } else if (drawType === DrawType.LineArrow) {
      type = 'LineString';
      geometryFunction = createLineArrowGeometryFunction() as unknown as GeometryFunction;
      maxPoints = 2;
    } else if (drawType === DrawType.Arc) {
      type = 'LineString';
      geometryFunction = createArcGeometryFunction() as unknown as GeometryFunction;
      maxPoints = 3;
    } else if (drawType === DrawType.FreehandLine) {
      type = 'LineString';
      freehand = true;
    } else {
      type = drawType as OLType;
    }

    this.draw = new Draw({
      source: layer.getSource()!,
      type,
      geometryFunction,
      freehand,
      maxPoints,
      style,
      condition: (e) => this.condition(e),
    });

    this.draw.on('drawstart', (e) => {
      this.sketching = true;
      this.eventBus.emit(DrawEvent.DRAW_START, { feature: e.feature });
    });
    this.draw.on('drawend', (e) => {
      this.sketching = false;
      this.eventBus.emit(DrawEvent.DRAW_END, { feature: e.feature });
    });
    this.draw.on('drawabort', () => {
      this.sketching = false;
      this.eventBus.emit(DrawEvent.DRAW_ABORT);
    });

    this.map.addInteraction(this.draw);
  }

  /**
   * Draw interaction 的起笔条件，用于与 Select / Modify 协调：
   *  - 绘制进行中：允许在任意位置继续落点。
   *  - 已有选中要素：本次点击让给 Select 去取消选中，不起笔。
   *  - 点击落在已有要素上：让给 Select 去选中，不起笔。
   *  - 其余（空白处且无选中）：起笔绘制。
   */
  private condition(e: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>): boolean {
    if (this.sketching) return true;
    if (!this.canStartDraw()) return false;
    const overFeature =
      this.map.forEachFeatureAtPixel(e.pixel, () => true, {
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

  /**
   * 销毁绘制管理器，清理所有资源
   */
  destroy(): void {
    this.map.removeInteraction(this.draw);
  }
}
