import Polygon from 'ol/geom/Polygon';
import type { Coordinate } from 'ol/coordinate';

const SEGMENTS = 64;
const MIN_RADIUS = 1e-6;

/** 根据对角控制点生成椭圆坐标。 */
export function buildEllipse(controlPoints: number[][]): number[][][] {
  if (controlPoints.length < 2) return [[]];

  const [p1, p2] = controlPoints;
  const [cx, cy] = getEllipseCenter(controlPoints);
  const rx = Math.max(Math.abs(p2[0] - p1[0]) / 2, MIN_RADIUS);
  const ry = Math.max(Math.abs(p2[1] - p1[1]) / 2, MIN_RADIUS);
  const ring: number[][] = [];

  for (let i = 0; i <= SEGMENTS; i++) {
    const angle = (Math.PI * 2 * i) / SEGMENTS;
    ring.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
  }

  return [ring];
}

/** 从椭圆几何提取控制点。 */
export function getEllipseControlPoints(polygon: Polygon): number[][] {
  const controlPoints = polygon.get('_controlPoints') as number[][] | undefined;
  if (Array.isArray(controlPoints) && controlPoints.length >= 2) {
    return controlPoints.slice(0, 2);
  }

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

/** 计算椭圆中心。 */
export function getEllipseCenter(controlPoints: number[][]): Coordinate {
  const [p1, p2] = controlPoints;
  return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
}

export type EllipseRadii = [number, number] & { rx: number; ry: number };

/** 计算椭圆横纵半径。 */
export function getEllipseRadii(controlPoints: number[][]): EllipseRadii {
  if (controlPoints.length < 2) return toEllipseRadii(0, 0);
  const [p1, p2] = controlPoints;
  return toEllipseRadii(Math.abs(p2[0] - p1[0]) / 2, Math.abs(p2[1] - p1[1]) / 2);
}

/** 创建椭圆实时绘制函数。 */
export function createEllipseGeometryFunction() {
  return (coordinates: number[][], geometry?: Polygon): Polygon => {
    const geom = geometry || new Polygon([]);
    if (coordinates.length < 2) return geom;

    const controlPoints = coordinates.slice(0, 2);
    geom.setCoordinates(buildEllipse(controlPoints));
    geom.set('_controlPoints', controlPoints);
    return geom;
  };
}

function toEllipseRadii(rx: number, ry: number): EllipseRadii {
  return Object.assign([rx, ry] as [number, number], { rx, ry });
}
