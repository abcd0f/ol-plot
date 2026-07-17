import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import Point from 'ol/geom/Point';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { HandleBasedTool } from '../core/HandleBasedTool';
import { buildSector, getSectorControlPoints } from '../geometry/sector';

/**
 * 扇形绘制工具类，继承自 HandleBasedTool。
 *
 * 由三个控制点确定：
 *  - P0: 圆心
 *  - P1: 起始半径端点
 *  - P2: 结束半径端点
 *
 * 特殊编辑逻辑：
 * 拖拽 P1 或 P2 时，保持两个端点在同一半径上（自动调整另一端点）
 */
export class SectorTool extends HandleBasedTool {
  private syncing = false;

  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Sector, config);

    // 覆盖 HandleManager 的默认同步回调，使用自定义的半径保持逻辑
    this.handleManager.setOnSync((controlPoints: number[][]) => {
      this.syncWithRadiusConstraint(controlPoints);
    });
  }

  // ─── HandleBasedTool implementations ──────────────────────────────────────

  protected getPlotType(): string {
    return 'sector';
  }

  protected onHandleSync(controlPoints: number[][]): void {
    // 不使用默认的同步逻辑，改用 syncWithRadiusConstraint
  }

  protected extractControlPoints(geom: Geometry): number[][] {
    return getSectorControlPoints(geom as Polygon);
  }

  // ─── Custom sync logic ────────────────────────────────────────────────────

  private syncWithRadiusConstraint(controlPoints: number[][]): void {
    if (this.syncing || !this.activeFeature || controlPoints.length < 3) return;
    this.syncing = true;

    const prevControlPoints = this.activeFeature.get('controlPoints') as number[][];
    const [center] = controlPoints;
    const [prevCenter] = prevControlPoints;

    // 检测哪个 handle 被拖拽了
    const centerDragged = center[0] !== prevCenter[0] || center[1] !== prevCenter[1];

    if (centerDragged) {
      // 圆心被拖拽：只更新几何，不重投影端点
      this.activeFeature.set('controlPoints', controlPoints);
      const geom = this.activeFeature.getGeometry() as Polygon;
      geom.setCoordinates(buildSector(controlPoints));
      this.syncing = false;
      return;
    }

    // 圆弧端点被拖拽：被拖拽的端点决定新半径，另一个端点按新半径重投影
    const [, radiusPoint, anglePoint] = controlPoints;
    const radiusDist = Math.sqrt((radiusPoint[0] - center[0]) ** 2 + (radiusPoint[1] - center[1]) ** 2);
    const angleDist = Math.sqrt((anglePoint[0] - center[0]) ** 2 + (anglePoint[1] - center[1]) ** 2);
    const prevRadius = Math.sqrt(
      (prevControlPoints[1][0] - prevControlPoints[0][0]) ** 2 +
        (prevControlPoints[1][1] - prevControlPoints[0][1]) ** 2,
    );

    // 距离变化更大的那个是当前被 Modify 拖拽的 handle
    const radiusPointDragged = Math.abs(radiusDist - prevRadius) > Math.abs(angleDist - prevRadius);
    const radius = radiusPointDragged ? radiusDist : angleDist;

    if (radius > 0) {
      const handles = this.handleManager.handleSource.getFeatures();
      const sorted = handles.sort((a, b) => a.get('_handleIndex') - b.get('_handleIndex'));

      if (radiusPointDragged) {
        // handle[1] 被拖拽 → 重投影 handle[2]，不碰 handle[1]（避免与 Modify 冲突）
        const endAngle = Math.atan2(anglePoint[1] - center[1], anglePoint[0] - center[0]);
        controlPoints[2] = [center[0] + radius * Math.cos(endAngle), center[1] + radius * Math.sin(endAngle)];
        (sorted[2].getGeometry() as Point).setCoordinates(controlPoints[2]);
      } else {
        // handle[2] 被拖拽 → 重投影 handle[1]，不碰 handle[2]（避免与 Modify 冲突）
        const startAngle = Math.atan2(radiusPoint[1] - center[1], radiusPoint[0] - center[0]);
        controlPoints[1] = [center[0] + radius * Math.cos(startAngle), center[1] + radius * Math.sin(startAngle)];
        (sorted[1].getGeometry() as Point).setCoordinates(controlPoints[1]);
      }
    }

    this.activeFeature.set('controlPoints', controlPoints);
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildSector(controlPoints));

    this.syncing = false;
  }

  // ─── Abstract implementations ─────────────────────────────────────────────

  protected createGeometry(coordinates: number[][]): Geometry {
    return new Polygon(buildSector(coordinates));
  }

  addFeature(coordinates: number[][]): Feature {
    const feature = super.addFeature(coordinates);
    feature.set('plotType', 'sector');
    feature.set('controlPoints', coordinates.slice(0, 3));
    return feature;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 3) return;
    this.activeFeature.set('controlPoints', coordinates.slice(0, 3));
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildSector(coordinates));
    this.handleManager.refresh(coordinates.slice(0, 3));
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.get('controlPoints') as number[][]) || [];
  }

  getPointCount(): number {
    return this.activeFeature ? 3 : 0;
  }

  updatePoint(index: number, coordinate: number[]): void {
    if (index < 0 || index > 2) return;
    const coords = this.getCoordinates();
    if (coords.length < 3) return;
    coords[index] = coordinate;
    this.setCoordinates(coords);
  }

  // ─── Convenience API ──────────────────────────────────────────────────────

  addSector(center: number[], radiusPoint: number[], anglePoint: number[]): Feature {
    return this.addFeature([center, radiusPoint, anglePoint]);
  }

  getCenter(): number[] | null {
    const coords = this.getCoordinates();
    if (coords.length < 1) return null;
    return coords[0];
  }

  getRadius(): number {
    const coords = this.getCoordinates();
    if (coords.length < 2) return 0;
    const [center, radiusPoint] = coords;
    return Math.sqrt((radiusPoint[0] - center[0]) ** 2 + (radiusPoint[1] - center[1]) ** 2);
  }

  getAngles(): { start: number; end: number } | null {
    const coords = this.getCoordinates();
    if (coords.length < 3) return null;
    const [center, radiusPoint, anglePoint] = coords;
    const start = Math.atan2(radiusPoint[1] - center[1], radiusPoint[0] - center[0]);
    const end = Math.atan2(anglePoint[1] - center[1], anglePoint[0] - center[0]);
    return { start, end };
  }
}
