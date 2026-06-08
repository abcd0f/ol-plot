import Map from 'ol/Map';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import type Feature from 'ol/Feature';
import { unByKey } from 'ol/Observable';
import type { EventsKey } from 'ol/events';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';
import { BaseTool } from '../core/BaseTool';

const SHARE_X = [1, 0, 3, 2];
const SHARE_Y = [3, 2, 1, 0];

/**
 * 计算给定点集的边界框矩形
 *
 * @param pts - 输入的点坐标数组，每个元素为 [x, y] 形式的坐标点
 * @returns 返回边界框矩形的四个顶点坐标，按左下、左上、右上、右下顺序排列
 */
function bboxRect(pts: number[][]): number[][] {
  // 提取所有点的 x 坐标和 y 坐标
  const xs = pts.map((c) => c[0]);
  const ys = pts.map((c) => c[1]);

  // 计算 x 和 y 坐标的最小值和最大值
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);

  // 构造边界框矩形的四个顶点：左下、左上、右上、右下
  return [
    [minX, minY],
    [minX, maxY],
    [maxX, maxY],
    [maxX, minY],
  ];
}

/**
 * 矩形绘制工具类，继承自BaseTool
 * 提供矩形绘制、约束调整等功能
 */
export class RectangleTool extends BaseTool {
  private geomChangeKey: EventsKey | null = null;
  private constraining = false;
  private prevCorners: number[][] | null = null;
  private dragStartCorners: number[][] | null = null;

  /**
   * 构造函数
   * @param map 地图实例
   * @param config 绘制配置参数
   */
  constructor(map: Map, config?: PlotConfig) {
    super(map, config);
    this.drawType = DrawType.Rectangle;
    this.bindRectEvents();
  }

  /**
   * 绑定矩形相关的事件监听器
   * 包括绘制结束、选择、取消选择、修改开始和结束等事件
   */
  private bindRectEvents(): void {
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      this.attachConstraint(feature);
    });
    this.eventBus.on(DrawEvent.SELECT, ({ feature }: { feature: Feature }) => {
      this.attachConstraint(feature);
    });
    this.eventBus.on(DrawEvent.DESELECT, () => {
      this.detachConstraint();
    });
    this.eventBus.on(DrawEvent.MODIFY_START, () => {
      if (this.prevCorners) {
        this.dragStartCorners = this.prevCorners.map((c) => [c[0], c[1]]);
      }
    });
    this.eventBus.on(DrawEvent.MODIFY_END, () => {
      this.dragStartCorners = null;
    });
  }

  /**
   * 为指定要素附加约束功能
   * 监听几何图形的变化并保持矩形形状
   * @param feature 需要附加约束的要素
   */
  private attachConstraint(feature: Feature): void {
    this.detachConstraint();
    const geom = feature.getGeometry() as Polygon;

    // createBox() produces [BL, BR, TR, TL] but SHARE tables expect bboxRect order [BL, TL, TR, BR].
    // Normalize to canonical order before attaching the listener so the first edit applies correct neighbors.
    const rawRing = geom.getCoordinates()[0] ?? [];
    const normalized = bboxRect(rawRing.slice(0, rawRing.length - 1));
    this.constraining = true;
    geom.setCoordinates([[...normalized, normalized[0]]]);
    this.constraining = false;
    this.prevCorners = normalized;

    feature.set('_rectEditIndices', [1, 3]);

    this.geomChangeKey = geom.on('change', () => {
      if (this.constraining || !this.prevCorners) return;

      const ring = geom.getCoordinates()[0] ?? [];
      this.constraining = true;

      // 如果顶点数量不是5（包含闭合点），则标准化为边界框矩形
      if (ring.length !== 5) {
        const normalized = bboxRect(ring.slice(0, ring.length - 1));
        geom.setCoordinates([[...normalized, normalized[0]]]);
        this.prevCorners = normalized;
        this.constraining = false;
        return;
      }

      const corners = ring.slice(0, 4);

      // 找出移动距离最大的顶点索引
      const ref = this.dragStartCorners ?? this.prevCorners;
      let movedIdx = -1;
      let maxDist = 1e-6;
      for (let i = 0; i < 4; i++) {
        const p = ref[i];
        const d = Math.abs(p[0] - corners[i][0]) + Math.abs(p[1] - corners[i][1]);
        if (d > maxDist) {
          maxDist = d;
          movedIdx = i;
        }
      }

      if (movedIdx === -1) {
        this.constraining = false;
        return;
      }

      // 根据移动的顶点更新其他顶点以保持矩形形状
      const next = this.prevCorners.map((c) => [c[0], c[1]]);
      const moved = corners[movedIdx];
      next[movedIdx] = [moved[0], moved[1]];
      next[SHARE_X[movedIdx]] = [moved[0], next[SHARE_X[movedIdx]][1]];
      next[SHARE_Y[movedIdx]] = [next[SHARE_Y[movedIdx]][0], moved[1]];

      geom.setCoordinates([[...next, next[0]]]);
      this.prevCorners = next;
      this.constraining = false;
    });
  }

  /**
   * 移除几何图形的约束监听器
   */
  private detachConstraint(): void {
    if (this.geomChangeKey) {
      unByKey(this.geomChangeKey);
      this.geomChangeKey = null;
    }
    this.prevCorners = null;
  }

  /**
   * 创建矩形几何图形
   * @param coordinates 坐标数组
   * @returns Polygon几何图形对象
   */
  protected createGeometry(coordinates: number[][]): Geometry {
    const corners = bboxRect(coordinates.slice(0, 4));
    return new Polygon([[...corners, corners[0]]]);
  }

  /**
   * 设置当前要素的坐标
   * @param coordinates 坐标数组
   */
  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 4) return;
    const corners = bboxRect(coordinates.slice(0, 4));
    (this.activeFeature.getGeometry() as Polygon).setCoordinates([[...corners, corners[0]]]);
  }

  /**
   * 获取当前要素的坐标
   * @returns 坐标数组，包含矩形的四个角点
   */
  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    const ring = (this.activeFeature.getGeometry() as Polygon).getCoordinates()[0] ?? [];
    return ring.slice(0, 4);
  }

  /**
   * 获取当前要素的点数
   * @returns 点的数量（对于矩形始终为4）
   */
  getPointCount(): number {
    return this.getCoordinates().length;
  }

  /**
   * 更新指定索引处的点坐标
   * @param index 要更新的点的索引
   * @param coordinate 新的坐标值
   */
  updatePoint(index: number, coordinate: number[]): void {
    const corners = this.getCoordinates();
    if (index < 0 || index >= corners.length) return;
    corners[index] = coordinate;
    this.setCoordinates(corners);
  }
}
