import Circle from 'ol/geom/Circle';
import GeometryCollection from 'ol/geom/GeometryCollection';
import LineString from 'ol/geom/LineString';
import { dist } from '@/packages/kernel/utils';

/** 根据两个控制点生成方位角工具的线段与圆。 */
export function buildAzimuthGeometries(controlPoints: number[][]): [LineString, Circle] {
  if (controlPoints.length < 2) return [new LineString([]), new Circle(controlPoints[0] ?? [0, 0], 0)];

  const [start, end] = controlPoints;
  return [new LineString([start.slice(), end.slice()]), new Circle(start.slice(), dist(start, end))];
}

/** OpenLayers Draw 的两点几何函数，最多接受两个控制点。 */
export function createAzimuthGeometryFunction() {
  return (coordinates: number[][], geometry?: GeometryCollection): GeometryCollection => {
    const geom = geometry || new GeometryCollection([]);
    if (coordinates.length < 2) return geom;

    const controlPoints = coordinates.slice(0, 2);
    const [line, circle] = buildAzimuthGeometries(controlPoints);
    geom.setGeometries([line, circle]);
    geom.set('_controlPoints', controlPoints);
    return geom;
  };
}
