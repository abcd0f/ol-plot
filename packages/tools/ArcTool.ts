import Map from 'ol/Map';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';
import { HandleBasedTool } from '../core/HandleBasedTool';
import { buildArc, getArcControlPoints } from '../geometry/arc';

export class ArcTool extends HandleBasedTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Arc, config);

    // 覆盖 DRAW_END 事件以处理特殊的 _plotCoordinates 逻辑
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      const geom = feature.getGeometry() as LineString;
      // 从几何中获取用户原始点击的坐标（保存在 _plotCoordinates 中）
      const originalCoords = (geom as any)._plotCoordinates as number[][] | undefined;
      if (originalCoords && originalCoords.length >= 3) {
        feature.set('controlPoints', originalCoords.slice(0, 3));
      } else {
        // 降级方案：从几何反推
        const controlPoints = getArcControlPoints(geom);
        feature.set('controlPoints', controlPoints);
      }
      feature.set('plotType', 'arc');
    });
  }

  // ─── HandleBasedTool implementations ──────────────────────────────────────

  protected getPlotType(): string {
    return 'arc';
  }

  protected onHandleSync(controlPoints: number[][]): void {
    if (!this.activeFeature) return;
    this.activeFeature.set('controlPoints', controlPoints);
    const geom = this.activeFeature.getGeometry() as LineString;
    geom.setCoordinates(buildArc(controlPoints));
  }

  // ─── Abstract implementations ─────────────────────────────────────────────

  /**
   * 从坐标数组创建圆弧几何
   */
  protected createGeometry(coordinates: number[][]): Geometry {
    return new LineString(buildArc(coordinates));
  }

  /**
   * 添加圆弧要素
   */
  addFeature(coordinates: number[][]): Feature {
    const feature = super.addFeature(coordinates);
    feature.set('plotType', 'arc');
    feature.set('controlPoints', coordinates.slice(0, 3));
    return feature;
  }

  /**
   * 设置坐标
   */
  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 3) return;

    // 保存控制点
    this.activeFeature.set('controlPoints', coordinates.slice(0, 3));

    // 更新几何
    const geom = this.activeFeature.getGeometry() as LineString;
    geom.setCoordinates(buildArc(coordinates));

    // 刷新 handle 显示
    this.handleManager.refresh(coordinates.slice(0, 3));
  }

  /**
   * 获取坐标
   */
  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.get('controlPoints') as number[][]) || [];
  }

  /**
   * 获取控制点数量
   */
  getPointCount(): number {
    return this.activeFeature ? 3 : 0;
  }

  /**
   * 更新指定索引的控制点
   */
  updatePoint(index: number, coordinate: number[]): void {
    if (index < 0 || index > 2) return;
    const coords = this.getCoordinates();
    if (coords.length < 3) return;
    coords[index] = coordinate;
    this.setCoordinates(coords);
  }

  // ─── Convenience API ─────────────────────────────────────────────────────

  /**
   * 程序化添加圆弧
   * @param start 圆弧起点
   * @param end 圆弧终点
   * @param pointOnArc 圆弧经过点
   */
  addArc(start: number[], end: number[], pointOnArc: number[]): Feature {
    return this.addFeature([start, end, pointOnArc]);
  }

  /**
   * 获取圆弧起点
   */
  getStart(): number[] | null {
    const coords = this.getCoordinates();
    return coords.length >= 1 ? coords[0] : null;
  }

  /**
   * 获取圆弧终点
   */
  getEnd(): number[] | null {
    const coords = this.getCoordinates();
    return coords.length >= 2 ? coords[1] : null;
  }

  /**
   * 获取圆弧经过点
   */
  getPointOnArc(): number[] | null {
    const coords = this.getCoordinates();
    return coords.length >= 3 ? coords[2] : null;
  }
}
