import Map from 'ol/Map';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { BaseTool } from '../core/BaseTool';

/**
 * 多边形绘制工具类，继承自BaseTool
 */
export class PolygonTool extends BaseTool {
  /**
   * 构造函数
   * @param map 地图实例
   * @param config 绘制配置项
   */
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Polygon, config);
  }

  /**
   * 创建多边形几何对象
   * @param coordinates 坐标数组
   * @returns 几何对象实例
   */
  protected createGeometry(coordinates: number[][]): Geometry {
    return new Polygon([coordinates]);
  }

  /**
   * 设置多边形坐标
   * @param coordinates 坐标数组
   */
  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature) return;
    (this.activeFeature.getGeometry() as Polygon).setCoordinates([coordinates]);
  }

  /**
   * 获取多边形坐标
   * @returns 坐标数组
   */
  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.getGeometry() as Polygon).getCoordinates()[0] ?? [];
  }

  /**
   * 获取多边形顶点数量
   * @returns 顶点数量（排除闭合点）
   */
  getPointCount(): number {
    const coords = this.getCoordinates();
    return coords.length > 1 ? coords.length - 1 : coords.length;
  }

  /**
   * 更新指定索引的顶点坐标
   * @param index 顶点索引
   * @param coordinate 新的坐标
   */
  updatePoint(index: number, coordinate: number[]): void {
    const coords = this.getCoordinates();
    if (index < 0 || index >= coords.length - 1) return;
    coords[index] = coordinate;
    // 同步更新闭合点坐标
    if (index === 0) coords[coords.length - 1] = coordinate;
    this.setCoordinates(coords);
  }
}
