import Polygon, { fromExtent } from 'ol/geom/Polygon';
import { boundingExtent } from 'ol/extent';
import type { Coordinate } from 'ol/coordinate';

export function buildRectangle(controlPoints: number[][]): number[][][] {
  if (controlPoints.length < 2) return [[]];

  const [start, end] = controlPoints;
  const extent = boundingExtent([start, end]);
  return fromExtent(extent).getCoordinates();
}

export function getRectangleControlPoints(polygon: Polygon): number[][] {
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

export function getRectangleCenter(controlPoints: number[][]): Coordinate {
  const [start, end] = controlPoints;
  return [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
}

export function getRectangleWidth(controlPoints: number[][]): number {
  if (controlPoints.length < 2) return 0;
  const [start, end] = controlPoints;
  return Math.abs(end[0] - start[0]);
}

export function getRectangleHeight(controlPoints: number[][]): number {
  if (controlPoints.length < 2) return 0;
  const [start, end] = controlPoints;
  return Math.abs(end[1] - start[1]);
}

export function createRectangleGeometryFunction() {
  return (coordinates: number[][], geometry?: Polygon): Polygon => {
    const geom = geometry || new Polygon([]);
    if (coordinates.length < 2) return geom;

    const controlPoints = coordinates.slice(0, 2);
    geom.setCoordinates(buildRectangle(controlPoints));
    geom.set('_controlPoints', controlPoints);
    return geom;
  };
}
