import {
  area,
  bearing,
  centerOfMass,
  circle,
  convertArea,
  convertLength,
  destination,
  distance,
  midpoint,
  point,
  sector,
  type AreaUnits,
  type Units,
} from '@turf/turf';
import { fromLonLat, toLonLat, type ProjectionLike } from 'ol/proj';
import { dist } from './math';

export function distanceMeters(start: number[], end: number[]): number {
  return distance(point(start), point(end), { units: 'kilometers' }) * 1000;
}

export function projectedDistanceMeters(start: number[], end: number[], projection: ProjectionLike): number {
  return distanceMeters(toLonLat(start, projection), toLonLat(end, projection));
}

export function bearingDegrees(start: number[], end: number[]): number {
  return (bearing(point(start), point(end)) + 360) % 360;
}

export function destinationLonLat(center: number[], meters: number, bearingValue: number): number[] {
  return destination(point(center), meters / 1000, bearingValue, {
    units: 'kilometers',
  }).geometry.coordinates.slice() as number[];
}

export function projectedGeodesicRadius(center: number[], edge: number[], projection: ProjectionLike): number {
  const centerLonLat = toLonLat(center, projection);
  const meters = distanceMeters(centerLonLat, toLonLat(edge, projection));
  const eastPoint = fromLonLat(destinationLonLat(centerLonLat, meters, 90), projection);
  return dist(center, eastPoint);
}

export function midpointLonLat(start: number[], end: number[]): number[] {
  return midpoint(point(start), point(end)).geometry.coordinates.slice() as number[];
}

export function areaSquareMeters(ringLonLat: number[][]): number {
  return area({ type: 'Polygon', coordinates: [ringLonLat] });
}

export function formatDistanceMeters(value: number, unit: Units): string {
  return `${convertLength(value, 'meters', unit).toFixed(2)} ${unit}`;
}

export function formatAreaSquareMeters(value: number, unit: AreaUnits): string {
  const suffix = unit === 'acres' || unit === 'ac' || unit === 'hectares' || unit === 'ha' ? unit : `${unit}²`;
  return `${convertArea(value, 'meters', unit).toFixed(2)} ${suffix}`;
}

export function centerOfMassLonLat(ringLonLat: number[][]): number[] {
  return centerOfMass({ type: 'Polygon', coordinates: [ringLonLat] }).geometry.coordinates.slice() as number[];
}

export function buildGeodesicCircleLonLat(center: number[], meters: number, steps = 96): number[][] {
  return (circle(center, meters / 1000, { units: 'kilometers', steps }).geometry.coordinates[0] ?? []).map(
    (coordinate) => coordinate.slice(),
  );
}

export function buildGeodesicSectorLonLat(
  center: number[],
  meters: number,
  startBearing: number,
  endBearing: number,
  steps = 100,
): number[][] {
  return (
    sector(center, meters / 1000, startBearing, endBearing, { units: 'kilometers', steps }).geometry.coordinates[0] ??
    []
  ).map((coordinate) => coordinate.slice());
}
