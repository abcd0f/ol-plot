import GeometryCollection from 'ol/geom/GeometryCollection';
import LineString from 'ol/geom/LineString';
import type { ProjectionLike } from 'ol/proj';
import { buildGeodesicCircleLonLat, distanceMeters } from '../../kernel/utils';
import Polygon from 'ol/geom/Polygon';
import { fromLonLat, toLonLat } from 'ol/proj';

/** 根据两个控制点生成方位角工具的线段与圆。 */
export function buildAzimuthGeometries(controlPoints: number[][], projection?: ProjectionLike): [LineString, Polygon] {
  if (controlPoints.length < 2) return [new LineString([]), new Polygon([])];

  const [start, end] = controlPoints;
  if (!projection) return [new LineString([start.slice(), end.slice()]), new Polygon([])];
  const startLonLat = toLonLat(start, projection);
  const radius = distanceMeters(startLonLat, toLonLat(end, projection));
  const ring = buildGeodesicCircleLonLat(startLonLat, radius).map((coordinate) => fromLonLat(coordinate, projection));
  return [new LineString([start.slice(), end.slice()]), new Polygon([ring])];
}

/** OpenLayers Draw 的两点几何函数，最多接受两个控制点。 */
export function createAzimuthGeometryFunction(projection?: ProjectionLike) {
  return (coordinates: number[][], geometry?: GeometryCollection): GeometryCollection => {
    const geom = geometry || new GeometryCollection([]);
    if (coordinates.length < 2) return geom;

    const controlPoints = coordinates.slice(0, 2);
    const [line, circle] = buildAzimuthGeometries(controlPoints, projection);
    geom.setGeometries([line, circle]);
    geom.set('_controlPoints', controlPoints);
    return geom;
  };
}
