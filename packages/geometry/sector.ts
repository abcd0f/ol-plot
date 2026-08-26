import Polygon from 'ol/geom/Polygon';
import { dist } from '../utils';

const SEGMENTS = 100;
const TAU = Math.PI * 2;

/** 根据圆心、起始半径点和终止方向点生成扇形坐标。 */
export function buildSector(controlPoints: number[][], segments: number = SEGMENTS): number[][][] {
  if (controlPoints.length === 0) return [[]];
  const center = controlPoints[0];
  if (controlPoints.length < 2) return [[[...center], [...center], [...center]]];

  const radius = dist(center, controlPoints[1]);
  if (radius === 0) return [[[...center], [...center], [...center]]];

  const startAngle = getAngle(center, controlPoints[1]);
  const endAngle = getAngle(center, controlPoints[2] ?? controlPoints[1]);
  let angleSpan = endAngle - startAngle;
  if (angleSpan < 0) angleSpan += TAU;

  const ring: number[][] = [];
  const count = Math.max(1, segments);
  for (let i = 0; i <= count; i += 1) {
    const angle = startAngle + (angleSpan * i) / count;
    ring.push([center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)]);
  }
  ring.push([...center], [...ring[0]]);
  return [ring];
}

export function getSectorControlPoints(polygon: Polygon): number[][] {
  const controlPoints = polygon.get('_controlPoints') as number[][] | undefined;
  return Array.isArray(controlPoints) ? controlPoints.slice(0, 3) : [];
}

export function getSectorAngles(controlPoints: number[][]): { start: number; end: number } | null {
  if (controlPoints.length < 3) return null;
  return { start: getAngle(controlPoints[0], controlPoints[1]), end: getAngle(controlPoints[0], controlPoints[2]) };
}

/** 创建 OL Draw 实时预览使用的扇形 geometryFunction。 */
export function createSectorGeometryFunction() {
  return (coordinates: number[][], geometry?: Polygon): Polygon => {
    const geom = geometry || new Polygon([]);
    const controlPoints = coordinates.slice(0, 3);
    if (controlPoints.length > 0) {
      geom.setCoordinates(buildSector(controlPoints));
      geom.set('_controlPoints', controlPoints);
    }
    return geom;
  };
}

function getAngle(center: number[], point: number[]): number {
  const angle = Math.atan2(point[1] - center[1], point[0] - center[0]);
  return angle < 0 ? angle + TAU : angle;
}
