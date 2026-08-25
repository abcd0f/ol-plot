import GeometryCollection from 'ol/geom/GeometryCollection';
import LineString from 'ol/geom/LineString';
import { fromLonLat, toLonLat, type ProjectionLike } from 'ol/proj';
import { getDistance, offset } from 'ol/sphere';
import type { RangeRingsUnit } from '../types/config';

const SEGMENTS = 96;
const UNIT_METERS: Record<RangeRingsUnit, number> = { m: 1, km: 1000, nm: 1852 };

export interface ParsedRangeSpacing {
  value: number;
  unit: RangeRingsUnit;
  meters: number;
}

export function parseRangeSpacing(value: number | undefined, unit: RangeRingsUnit | undefined): ParsedRangeSpacing {
  const numeric = value ?? 10;
  const normalizedUnit = unit ?? 'm';
  if (!Number.isFinite(numeric) || numeric <= 0) throw new Error(`Invalid range rings spacing: ${numeric}`);
  return { value: numeric, unit: normalizedUnit, meters: numeric * UNIT_METERS[normalizedUnit] };
}

export function buildRangeRingsGeometries(
  controlPoints: number[][],
  spacing: number | undefined,
  unit: RangeRingsUnit | undefined,
  projection: ProjectionLike,
): GeometryCollection {
  const geom = new GeometryCollection([]);
  const points = controlPoints.slice(0, 2);
  geom.set('_controlPoints', points);
  if (points.length < 2) return geom;

  const parsed = parseRangeSpacing(spacing, unit);
  const center = toLonLat(points[0], projection);
  const outerDistance = getDistance(center, toLonLat(points[1], projection));
  const count = Math.floor(outerDistance / parsed.meters + 1e-9);
  const rings: LineString[] = [];
  for (let index = 1; index <= count; index += 1) {
    const ringRadius = index * parsed.meters;
    const coordinates: number[][] = [];
    for (let i = 0; i <= SEGMENTS; i += 1) {
      const point = offset(center, ringRadius, (i / SEGMENTS) * Math.PI * 2);
      coordinates.push(fromLonLat(point, projection));
    }
    const ring = new LineString(coordinates);
    ring.set('rangeRingRadius', ringRadius);
    ring.set('rangeRingLabel', `${formatValue(index * parsed.value)}${parsed.unit}`);
    rings.push(ring);
  }
  geom.setGeometries(rings);
  geom.set('rangeRingsSpacing', parsed.value);
  geom.set('rangeRingsUnit', parsed.unit);
  return geom;
}

export function createRangeRingsGeometryFunction(
  spacing: number | undefined,
  unit: RangeRingsUnit | undefined,
  projection: ProjectionLike,
) {
  parseRangeSpacing(spacing, unit);
  return (coordinates: number[][], geometry?: GeometryCollection): GeometryCollection => {
    const geom = geometry || new GeometryCollection([]);
    const built = buildRangeRingsGeometries(coordinates.slice(0, 2), spacing, unit, projection);
    geom.setGeometries(built.getGeometries());
    geom.set('_controlPoints', built.get('_controlPoints'));
    geom.set('rangeRingsSpacing', built.get('rangeRingsSpacing'));
    geom.set('rangeRingsUnit', built.get('rangeRingsUnit'));
    return geom;
  };
}

export function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
