import Polygon from 'ol/geom/Polygon';
import type { Coordinate } from 'ol/coordinate';
import { dist } from '../utils';

const MIN_RADIUS = 1e-6;
const MIN_SEGMENTS = 16;
const MAX_SEGMENTS = 96;
const SEGMENTS_PER_RADIAN = 24;
const TWO_PI = Math.PI * 2;

export interface SectorAngles {
  start: number;
  end: number;
}

export function buildSector(controlPoints: number[][]): number[][][] {
  if (controlPoints.length < 2) return [[]];

  const points = normalizeSectorControlPoints(controlPoints);
  const [center, startPoint, endPoint] = points;

  if (!endPoint) {
    return [[center, startPoint, center]];
  }

  const radius = Math.max(dist(center, startPoint), MIN_RADIUS);
  const startAngle = getAngle(center, startPoint);
  const endAngle = getAngle(center, endPoint);
  const angleSpan = getPositiveAngleSpan(startAngle, endAngle);
  const segments = getSegmentCount(angleSpan);
  const ring: number[][] = new Array(segments + 3);

  for (let i = 0; i <= segments; i += 1) {
    const angle = startAngle + (angleSpan * i) / segments;
    ring[i] = [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)];
  }

  ring[segments + 1] = center;
  ring[segments + 2] = ring[0];
  return [ring];
}

export function normalizeSectorControlPoints(controlPoints: number[][], radiusSourceIndex: 1 | 2 = 1): number[][] {
  if (controlPoints.length < 3) return controlPoints.slice(0, 2);

  const center = controlPoints[0];
  const startPoint = controlPoints[1];
  const endPoint = controlPoints[2];
  const radiusSource = radiusSourceIndex === 2 ? endPoint : startPoint;
  const radiusTarget = radiusSourceIndex === 2 ? startPoint : endPoint;
  const radius = dist(center, radiusSource);

  if (radius < MIN_RADIUS) {
    return [center, startPoint, endPoint];
  }

  const projectedTarget = projectToRadius(center, radiusTarget, radius);
  return radiusSourceIndex === 2 ? [center, projectedTarget, endPoint] : [center, startPoint, projectedTarget];
}

export function getSectorControlPoints(polygon: Polygon): number[][] {
  const controlPoints = polygon.get('_controlPoints') as number[][] | undefined;
  if (Array.isArray(controlPoints) && controlPoints.length >= 3) {
    return controlPoints.slice(0, 3);
  }

  const ring = polygon.getCoordinates()[0];
  if (!ring || ring.length < 4) return [];

  const center = ring[ring.length - 2];
  const startPoint = ring[0];
  const endPoint = ring[ring.length - 3];
  return [center, startPoint, endPoint];
}

export function getSectorCenter(controlPoints: number[][]): Coordinate | null {
  return controlPoints.length >= 1 ? controlPoints[0] : null;
}

export function getSectorRadius(controlPoints: number[][]): number {
  if (controlPoints.length < 2) return 0;
  return dist(controlPoints[0], controlPoints[1]);
}

export function getSectorAngles(controlPoints: number[][]): SectorAngles | null {
  if (controlPoints.length < 3) return null;
  const [center, startPoint, endPoint] = controlPoints;
  return {
    start: getAngle(center, startPoint),
    end: getAngle(center, endPoint),
  };
}

export function createSectorGeometryFunction() {
  return (coordinates: number[][], geometry?: Polygon): Polygon => {
    const geom = geometry || new Polygon([]);
    if (coordinates.length < 2) return geom;

    const controlPoints = normalizeSectorControlPoints(coordinates.slice(0, 3));
    geom.setCoordinates(buildSector(controlPoints));
    geom.set('_controlPoints', controlPoints);
    return geom;
  };
}

function getAngle(center: number[], point: number[]): number {
  const angle = Math.atan2(point[1] - center[1], point[0] - center[0]);
  return angle < 0 ? angle + TWO_PI : angle;
}

function getPositiveAngleSpan(startAngle: number, endAngle: number): number {
  const angleSpan = endAngle - startAngle;
  return angleSpan < 0 ? angleSpan + TWO_PI : angleSpan;
}

function getSegmentCount(angleSpan: number): number {
  return Math.min(MAX_SEGMENTS, Math.max(MIN_SEGMENTS, Math.ceil(angleSpan * SEGMENTS_PER_RADIAN)));
}

function projectToRadius(center: number[], point: number[], radius: number): number[] {
  const pointDistance = dist(center, point);
  if (pointDistance < MIN_RADIUS) {
    return [center[0] + radius, center[1]];
  }

  const scale = radius / pointDistance;
  return [center[0] + (point[0] - center[0]) * scale, center[1] + (point[1] - center[1]) * scale];
}
