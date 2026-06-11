import Polygon from 'ol/geom/Polygon';
import type { Coordinate } from 'ol/coordinate';

const SEGMENTS = 64;

/**
 * 根据两个控制点（外接矩形对角顶点）生成椭圆 Polygon 坐标。
 *
 * @param controlPoints - [p1, p2] 外接矩形的两个对角顶点
 * @returns Polygon 坐标格式 number[][][]（单环）
 */
export function buildEllipse(controlPoints: number[][]): number[][][] {
  if (controlPoints.length < 2) return [[]];

  const [p1, p2] = controlPoints;
  const cx = (p1[0] + p2[0]) / 2;
  const cy = (p1[1] + p2[1]) / 2;
  const rx = Math.abs(p2[0] - p1[0]) / 2;
  const ry = Math.abs(p2[1] - p1[1]) / 2;

  // 处理退化椭圆
  if (rx === 0 || ry === 0) {
    const minR = 1e-6;
    const rxF = rx === 0 ? minR : rx;
    const ryF = ry === 0 ? minR : ry;
    const ring: number[][] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const angle = (Math.PI * 2 * i) / SEGMENTS;
      ring.push([cx + rxF * Math.cos(angle), cy + ryF * Math.sin(angle)]);
    }
    return [ring];
  }

  const ring: number[][] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const angle = (Math.PI * 2 * i) / SEGMENTS;
    ring.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
  }

  return [ring];
}

/**
 * 从椭圆 Polygon 反推两个控制点（外接矩形对角顶点）。
 *
 * @param polygon - 椭圆 Polygon
 * @returns 控制点数组 [p1, p2]
 */
export function getEllipseControlPoints(polygon: Polygon): number[][] {
  const ring = polygon.getCoordinates()[0];
  if (!ring || ring.length < 4) return [];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const coord of ring) {
    minX = Math.min(minX, coord[0]);
    minY = Math.min(minY, coord[1]);
    maxX = Math.max(maxX, coord[0]);
    maxY = Math.max(maxY, coord[1]);
  }

  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

/**
 * 计算椭圆的中心点（外接矩形对角线交点）。
 *
 * @param controlPoints - [p1, p2] 外接矩形对角顶点
 * @returns 中心点坐标
 */
export function getEllipseCenter(controlPoints: number[][]): Coordinate {
  const [p1, p2] = controlPoints;
  return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
}

/**
 * OL Draw 交互的 geometryFunction，用于实时预览椭圆。
 */
export function createEllipseGeometryFunction() {
  return (coordinates: number[][], geometry?: Polygon): Polygon => {
    const geom = geometry || new Polygon([]);
    if (coordinates.length < 2) return geom;
    geom.setCoordinates(buildEllipse(coordinates.slice(0, 2)));
    return geom;
  };
}
