import Polygon from 'ol/geom/Polygon';
import type { Coordinate } from 'ol/coordinate';

const SEGMENTS = 64;

/**
 * 根据两个控制点（外接矩形对角点）生成椭圆 Polygon 坐标。
 *
 * @param controlPoints - [P1, P2]，椭圆外接矩形的两个对角顶点
 * @returns Polygon 坐标格式 number[][][]（单环）
 */
export function buildEllipse(controlPoints: number[][]): number[][][] {
  const [p1, p2] = controlPoints;
  const centerX = (p1[0] + p2[0]) / 2;
  const centerY = (p1[1] + p2[1]) / 2;
  const radiusX = Math.abs(p2[0] - p1[0]) / 2;
  const radiusY = Math.abs(p2[1] - p1[1]) / 2;

  const ring: number[][] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const angle = (Math.PI * 2 * i) / SEGMENTS;
    ring.push([centerX + radiusX * Math.cos(angle), centerY + radiusY * Math.sin(angle)]);
  }

  return [ring];
}

/**
 * 从椭圆 Polygon 的 extent 反推控制点。
 */
export function getEllipseControlPoints(polygon: Polygon): number[][] {
  const extent = polygon.getExtent();
  return [
    [extent[0], extent[3]],
    [extent[2], extent[1]],
  ];
}

/**
 * 计算椭圆中心点。
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
    geom.setCoordinates(buildEllipse(coordinates));
    return geom;
  };
}
