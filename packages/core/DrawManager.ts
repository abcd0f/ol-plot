import Map from 'ol/Map';
import Draw, { createBox, type GeometryFunction } from 'ol/interaction/Draw';
import type VectorSource from 'ol/source/Vector';
import type { EventBus } from './EventBus';
import { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';

type OLType = 'Point' | 'LineString' | 'Polygon' | 'Circle';

/**
 * 绘制管理器类，用于管理地图上的绘制交互功能
 */
export class DrawManager {
  private map: Map;
  private source: VectorSource;
  private eventBus: EventBus;
  private draw: Draw | null = null;

  /**
   * 构造函数
   * @param map - 地图实例
   * @param source - 矢量源，用于存储绘制的要素
   * @param eventBus - 事件总线，用于发布绘制相关的事件
   */
  constructor(map: Map, source: VectorSource, eventBus: EventBus) {
    this.map = map;
    this.source = source;
    this.eventBus = eventBus;
  }

  /**
   * 激活绘制功能
   * @param drawType - 绘制类型，指定要绘制的几何图形类型
   */
  activate(drawType: DrawType): void {
    this.deactivate();

    let type: OLType;
    let geometryFunction: GeometryFunction | undefined;
    let freehand = false;

    // 根据绘制类型设置相应的OpenLayers绘制配置
    if (drawType === DrawType.Rectangle) {
      type = 'Circle';
      geometryFunction = createBox();
    } else if (drawType === DrawType.FreehandLine) {
      type = 'LineString';
      freehand = true;
    } else {
      type = drawType as OLType;
    }

    this.draw = new Draw({ source: this.source, type, geometryFunction, freehand });

    this.draw.on('drawstart', (e) => this.eventBus.emit(DrawEvent.DRAW_START, { feature: e.feature }));
    this.draw.on('drawend', (e) => this.eventBus.emit(DrawEvent.DRAW_END, { feature: e.feature }));

    this.map.addInteraction(this.draw);
  }

  /**
   * 停用当前的绘制功能
   */
  deactivate(): void {
    if (this.draw) {
      this.map.removeInteraction(this.draw);
      this.draw = null;
    }
  }

  /**
   * 销毁绘制管理器，清理所有资源
   */
  destroy(): void {
    this.deactivate();
  }
}
