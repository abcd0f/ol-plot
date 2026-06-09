import Map from 'ol/Map';
import Circle from 'ol/geom/Circle';
import type Geometry from 'ol/geom/Geometry';
import type Feature from 'ol/Feature';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { BaseTool } from '../core/BaseTool';

/**
 * 计算两个二维点之间的欧几里得距离
 * @param a - 第一个点的坐标数组 [x, y]
 * @param b - 第二个点的坐标数组 [x, y]
 * @returns 两点之间的直线距离
 */
function dist(a: number[], b: number[]): number {
  return Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
}

/**
 * 圆形绘制工具类，继承自BaseTool
 */
export class CircleTool extends BaseTool {
  /**
   * 构造函数
   * @param map 地图实例
   * @param config 绘制配置参数
   */
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Circle, config);
  }

  /**
   * 根据坐标创建圆形几何对象
   * @param coordinates 坐标数组，第一个点为中心点，第二个点用于计算半径
   * @returns 创建的圆形几何对象
   */
  protected createGeometry(coordinates: number[][]): Geometry {
    const center = coordinates[0];
    const radius = dist(center, coordinates[1]);
    return new Circle(center, radius);
  }

  /**
   * 添加圆形要素
   * @param center 圆心坐标
   * @param radius 圆的半径
   * @returns 创建的要素对象
   */
  addCircle(center: number[], radius: number): Feature {
    return this.addFeature([center, [center[0] + radius, center[1]]]);
  }

  /**
   * 设置当前活动要素的坐标
   * @param coordinates 坐标数组，第一个点为中心点，第二个点用于计算半径
   */
  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 2) return;
    const geom = this.activeFeature.getGeometry() as Circle;
    geom.setCenter(coordinates[0]);
    geom.setRadius(dist(coordinates[0], coordinates[1]));
  }

  /**
   * 获取当前活动要素的坐标
   * @returns 坐标数组，第一个点为中心点，第二个点为半径方向点
   */
  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    const geom = this.activeFeature.getGeometry() as Circle;
    const center = geom.getCenter();
    return [center, [center[0] + geom.getRadius(), center[1]]];
  }

  /**
   * 获取当前要素需要的控制点数量
   * @returns 控制点数量，有活动要素时返回2，否则返回0
   */
  getPointCount(): number {
    return this.activeFeature ? 2 : 0;
  }

  /**
   * 更新指定索引的控制点坐标
   * @param index 控制点索引（0为中心点，1为半径点）
   * @param coordinate 新的坐标
   */
  updatePoint(index: number, coordinate: number[]): void {
    if (index !== 0 && index !== 1) return;
    const coords = this.getCoordinates();
    coords[index] = coordinate;
    this.setCoordinates(coords);
  }

  /**
   * 获取圆心坐标
   * @returns 圆心坐标数组，如果无活动要素则返回null
   */
  getCenter(): number[] | null {
    if (!this.activeFeature) return null;
    return (this.activeFeature.getGeometry() as Circle).getCenter();
  }

  /**
   * 获取圆的半径
   * @returns 圆的半径值，如果无活动要素则返回0
   */
  getRadius(): number {
    if (!this.activeFeature) return 0;
    return (this.activeFeature.getGeometry() as Circle).getRadius();
  }

  /**
   * 设置圆的半径
   * @param radius 要设置的半径值
   */
  setRadius(radius: number): void {
    if (!this.activeFeature) return;
    (this.activeFeature.getGeometry() as Circle).setRadius(radius);
  }

  /**
   * 设置圆心坐标
   * @param center 要设置的圆心坐标
   */
  setCenter(center: number[]): void {
    if (!this.activeFeature) return;
    (this.activeFeature.getGeometry() as Circle).setCenter(center);
  }
}
