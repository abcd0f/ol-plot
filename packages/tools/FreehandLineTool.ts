import Map from 'ol/Map';
import LineString from 'ol/geom/LineString';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { BaseTool } from '../core/BaseTool';

/**
 * 自由手绘线工具类，继承自基础工具类
 * 用于创建和操作自由手绘线条几何图形
 */
export class FreehandLineTool extends BaseTool {
  /**
   * 构造函数
   * @param map 地图实例
   * @param config 绘制配置选项（可选）
   */
  constructor(map: Map, config?: PlotConfig) {
    super(map, config);
    this.drawType = DrawType.FreehandLine;
  }

  /**
   * 创建线字符串几何图形
   * @param coordinates 坐标点数组，每个元素为[x, y]格式的坐标
   * @returns 返回LineString类型的几何图形对象
   */
  protected createGeometry(coordinates: number[][]): Geometry {
    return new LineString(coordinates);
  }

  /**
   * 设置当前活动要素的坐标点
   * @param coordinates 坐标点数组，每个元素为[x, y]格式的坐标
   */
  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature) return;
    (this.activeFeature.getGeometry() as LineString).setCoordinates(coordinates);
  }

  /**
   * 获取当前活动要素的坐标点
   * @returns 返回坐标点数组，每个元素为[x, y]格式的坐标
   */
  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.getGeometry() as LineString).getCoordinates();
  }

  /**
   * 获取当前线条上的点的数量
   * @returns 返回坐标点的个数
   */
  getPointCount(): number {
    return this.getCoordinates().length;
  }

  /**
   * 更新指定索引位置的坐标点
   * @param index 要更新的坐标点的索引位置
   * @param coordinate 新的坐标点，格式为[x, y]
   */
  updatePoint(index: number, coordinate: number[]): void {
    const coords = this.getCoordinates();
    if (index < 0 || index >= coords.length) return;
    coords[index] = coordinate;
    this.setCoordinates(coords);
  }
}
