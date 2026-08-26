import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import Circle from 'ol/geom/Circle';
import GeometryCollection from 'ol/geom/GeometryCollection';
import type Geometry from 'ol/geom/Geometry';
import type { DrawType } from '../constants/drawType';
import { DrawType as DT } from '../constants/drawType';
import { dist } from '../utils';
import { buildEllipse, getEllipseControlPoints, createEllipseGeometryFunction } from '../geometry/ellipse';
import { buildRectangle, getRectangleControlPoints, createRectangleGeometryFunction } from '../geometry/rectangle';
import { buildArc, getArcControlPoints, createArcGeometryFunction } from '../geometry/arc';
import { buildSector, createSectorGeometryFunction, getSectorControlPoints } from '../geometry/sector';
import { buildStraightArrow, createStraightArrowGeometryFunction } from '../geometry/arrow/straight';
import { buildTaperedArrow, createTaperedArrowGeometryFunction } from '../geometry/arrow/tapered';
import { buildLineArrowGeometries, createLineArrowGeometryFunction } from '../geometry/arrow/line';
import {
  buildDoubleArrow,
  normalizeDoubleArrowControlPoints,
  createDoubleArrowGeometryFunction,
} from '../geometry/arrow/double';
import {
  buildFlagGeometries,
  getFlagControlPoints,
  normalizeFlagControlPoints,
  createFlagGeometryFunction,
} from '../geometry/flag';
import { buildAzimuthGeometries, createAzimuthGeometryFunction } from '../geometry/azimuth';
import { buildRangeRingsGeometries, createRangeRingsGeometryFunction } from '../geometry/rangeRings';
import type { PlotContext, PlotDefinition } from './types';

export type { PlotContext, PlotDefinition } from './types';

function closeRing(points: number[][]): number[][] {
  if (points.length === 0) return [];
  const ring = points.map((point) => point.slice());
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (ring.length === 1) return [first.slice(), first.slice(), first.slice()];
  if (!last || first.some((value, index) => value !== last[index])) ring.push(first.slice());
  return ring;
}

function pointDef(drawType: DrawType, plotType: string): PlotDefinition {
  return {
    drawType,
    plotType,
    editMode: 'feature',
    olType: 'Point',
    build: (points) => new Point(points[0] ?? []),
    update: (geometry, points) => (geometry as Point).setCoordinates(points[0] ?? []),
    extract: (geometry) => [(geometry as Point).getCoordinates()],
  };
}

function lineDef(drawType: DrawType, plotType: string, olType: 'LineString' = 'LineString'): PlotDefinition {
  return {
    drawType,
    plotType,
    editMode: 'feature',
    olType,
    build: (points) => new LineString(points),
    update: (geometry, points) => (geometry as LineString).setCoordinates(points),
    extract: (geometry) => (geometry as LineString).getCoordinates(),
  };
}

function polygonDef(drawType: DrawType, plotType: string): PlotDefinition {
  return {
    drawType,
    plotType,
    editMode: 'feature',
    olType: 'Polygon',
    build: (points) => new Polygon([closeRing(points)]),
    update: (geometry, points) => (geometry as Polygon).setCoordinates([closeRing(points)]),
    extract: (geometry) => (geometry as Polygon).getCoordinates()[0] ?? [],
  };
}

function custom(
  drawType: DrawType,
  plotType: string,
  olType: PlotDefinition['olType'],
  build: PlotDefinition['build'],
  update: PlotDefinition['update'],
  extract: PlotDefinition['extract'],
  normalize: PlotDefinition['normalize'],
  geometryFunction?: PlotDefinition['geometryFunction'],
  maxPoints?: number,
  minPoints?: number,
): PlotDefinition {
  return {
    drawType,
    plotType,
    editMode: 'handles',
    olType,
    build,
    update,
    extract,
    normalize,
    geometryFunction,
    maxPoints,
    minPoints,
  };
}

const defs: Record<DrawType, PlotDefinition> = {
  [DT.Point]: pointDef(DT.Point, 'point'),
  [DT.AlarmPoint]: pointDef(DT.AlarmPoint, 'alarmPoint'),
  [DT.ImagePoint]: pointDef(DT.ImagePoint, 'imagePoint'),
  [DT.Line]: lineDef(DT.Line, 'line'),
  [DT.FlowLine]: lineDef(DT.FlowLine, 'flowLine'),
  [DT.FreehandLine]: lineDef(DT.FreehandLine, 'freehandLine'),
  [DT.FreehandPolygon]: polygonDef(DT.FreehandPolygon, 'freehandPolygon'),
  [DT.Polygon]: polygonDef(DT.Polygon, 'polygon'),
  [DT.Rectangle]: custom(
    DT.Rectangle,
    'rectangle',
    'LineString',
    (points) => new Polygon(buildRectangle(points.slice(0, 2))),
    (geometry, points) => (geometry as Polygon).setCoordinates(buildRectangle(points.slice(0, 2))),
    (geometry) => getRectangleControlPoints(geometry as Polygon),
    (points) => points.slice(0, 2),
    () => createRectangleGeometryFunction() as any,
    2,
  ),
  [DT.Circle]: {
    drawType: DT.Circle,
    plotType: 'circle',
    editMode: 'feature',
    olType: 'Circle',
    build: (points) => new Circle(points[0] ?? [], points[1] ? dist(points[0], points[1]) : 0),
    update: (geometry, points) => {
      if (points.length < 1) return;
      const circle = geometry as Circle;
      circle.setCenter(points[0]);
      circle.setRadius(points[1] ? dist(points[0], points[1]) : 0);
    },
    extract: (geometry) => {
      const circle = geometry as Circle;
      const center = circle.getCenter();
      return [center, [center[0] + circle.getRadius(), center[1]]];
    },
  },
  [DT.RangeRings]: {
    drawType: DT.RangeRings,
    plotType: 'rangeRings',
    editMode: 'handles',
    olType: 'LineString',
    maxPoints: 2,
    geometryFunction: ({ config, projection }) =>
      createRangeRingsGeometryFunction(config.rangeRings.spacing, config.rangeRings.unit, projection) as any,
    build: (points, context) =>
      buildRangeRingsGeometries(
        points.slice(0, 2),
        context.config.rangeRings.spacing,
        context.config.rangeRings.unit,
        context.projection,
      ),
    update: (geometry, points, context) => {
      const feature = context.feature;
      const next = buildRangeRingsGeometries(
        points.slice(0, 2),
        feature?.get('rangeRingsSpacing') ?? context.config.rangeRings.spacing,
        feature?.get('rangeRingsUnit') ?? context.config.rangeRings.unit,
        context.projection,
      );
      const collection = geometry as GeometryCollection;
      collection.setGeometries(next.getGeometries());
      collection.set('_controlPoints', points.slice(0, 2));
      collection.set('rangeRingsSpacing', next.get('rangeRingsSpacing'));
      collection.set('rangeRingsUnit', next.get('rangeRingsUnit'));
    },
    extract: (geometry) => (geometry.get('_controlPoints') as number[][] | undefined) ?? [],
    normalize: (points) => points.slice(0, 2),
  },
  [DT.Ellipse]: custom(
    DT.Ellipse,
    'ellipse',
    'LineString',
    (points) => new Polygon(buildEllipse(points.slice(0, 2))),
    (geometry, points) => (geometry as Polygon).setCoordinates(buildEllipse(points.slice(0, 2))),
    (geometry) => getEllipseControlPoints(geometry as Polygon),
    (points) => points.slice(0, 2),
    () => createEllipseGeometryFunction() as any,
    2,
  ),
  [DT.StraightArrow]: custom(
    DT.StraightArrow,
    'straightArrow',
    'LineString',
    (points) => new Polygon(buildStraightArrow(points.slice(0, 2))),
    (geometry, points) => (geometry as Polygon).setCoordinates(buildStraightArrow(points.slice(0, 2))),
    (geometry) => (geometry.get('_controlPoints') as number[][] | undefined) ?? [],
    (points) => points.slice(0, 2),
    () => createStraightArrowGeometryFunction() as any,
    2,
  ),
  [DT.TaperedArrow]: custom(
    DT.TaperedArrow,
    'taperedArrow',
    'LineString',
    (points) => new Polygon(buildTaperedArrow(points.slice(0, 2))),
    (geometry, points) => (geometry as Polygon).setCoordinates(buildTaperedArrow(points.slice(0, 2))),
    (geometry) => (geometry.get('_controlPoints') as number[][] | undefined) ?? [],
    (points) => points.slice(0, 2),
    () => createTaperedArrowGeometryFunction() as any,
    2,
  ),
  [DT.LineArrow]: custom(
    DT.LineArrow,
    'lineArrow',
    'LineString',
    (points) => new GeometryCollection(buildLineArrowGeometries(points.slice(0, 2))),
    (geometry, points) => (geometry as GeometryCollection).setGeometries(buildLineArrowGeometries(points.slice(0, 2))),
    (geometry) => (geometry.get('_controlPoints') as number[][] | undefined) ?? [],
    (points) => points.slice(0, 2),
    () => createLineArrowGeometryFunction() as any,
    2,
  ),
  [DT.DoubleArrow]: custom(
    DT.DoubleArrow,
    'doubleArrow',
    'LineString',
    (points) => new Polygon(buildDoubleArrow(normalizeDoubleArrowControlPoints(points.slice(0, 5)))),
    (geometry, points) =>
      (geometry as Polygon).setCoordinates(buildDoubleArrow(normalizeDoubleArrowControlPoints(points.slice(0, 5)))),
    (geometry) => (geometry.get('_controlPoints') as number[][] | undefined) ?? [],
    (points) => normalizeDoubleArrowControlPoints(points.slice(0, 5)),
    () => createDoubleArrowGeometryFunction() as any,
    4,
    3,
  ),
  [DT.Arc]: custom(
    DT.Arc,
    'arc',
    'LineString',
    (points) => new LineString(buildArc(points.slice(0, 3))),
    (geometry, points) => (geometry as LineString).setCoordinates(buildArc(points.slice(0, 3))),
    (geometry) => {
      const original = (geometry as any)._plotCoordinates as number[][] | undefined;
      return original && original.length >= 3
        ? original.slice(0, 3)
        : ((geometry.get('_controlPoints') as number[][] | undefined) ?? getArcControlPoints(geometry as LineString));
    },
    (points) => points.slice(0, 3),
    () => createArcGeometryFunction() as any,
    3,
  ),
  [DT.Sector]: custom(
    DT.Sector,
    'sector',
    'LineString',
    (points) => {
      const geometry = new Polygon(buildSector(points.slice(0, 3)));
      geometry.set('_controlPoints', points.slice(0, 3));
      return geometry;
    },
    (geometry, points) => {
      const controlPoints = points.slice(0, 3);
      (geometry as Polygon).setCoordinates(buildSector(controlPoints));
      geometry.set('_controlPoints', controlPoints);
    },
    (geometry) => getSectorControlPoints(geometry as Polygon),
    (points) => points.slice(0, 3),
    () => createSectorGeometryFunction() as any,
    3,
    3,
  ),
  [DT.Flag]: custom(
    DT.Flag,
    'flag',
    'LineString',
    (points) => new GeometryCollection(buildFlagGeometries(normalizeFlagControlPoints(points.slice(0, 2)))),
    (geometry, points) =>
      (geometry as GeometryCollection).setGeometries(
        buildFlagGeometries(normalizeFlagControlPoints(points.slice(0, 2))),
      ),
    (geometry) => getFlagControlPoints(geometry as GeometryCollection),
    (points) => normalizeFlagControlPoints(points.slice(0, 2)),
    () => createFlagGeometryFunction() as any,
    2,
  ),
  [DT.Measure]: lineDef(DT.Measure, 'measure'),
  [DT.Azimuth]: custom(
    DT.Azimuth,
    'azimuth',
    'LineString',
    (points) => new GeometryCollection(buildAzimuthGeometries(points.slice(0, 2))),
    (geometry, points) => (geometry as GeometryCollection).setGeometries(buildAzimuthGeometries(points.slice(0, 2))),
    (geometry) => (geometry.get('_controlPoints') as number[][] | undefined) ?? [],
    (points) => points.slice(0, 2),
    () => createAzimuthGeometryFunction() as any,
    2,
  ),
  [DT.AreaMeasure]: polygonDef(DT.AreaMeasure, 'areaMeasure'),
};

/** 按绘制类型索引的标绘定义。 */
export const PLOT_DEFS = defs;
/** 绘制类型到标绘类型名的映射。 */
export const PLOT_TYPE_BY_DRAW_TYPE: Record<DrawType, string> = Object.fromEntries(
  Object.values(defs).map((definition) => [definition.drawType, definition.plotType]),
) as Record<DrawType, string>;
/** 标绘类型名到绘制类型的映射。 */
export const DRAW_TYPE_BY_PLOT_TYPE = new Map(
  Object.values(defs).map((definition) => [definition.plotType, definition.drawType]),
);
/** 使用手柄编辑的标绘类型集合。 */
export const HANDLE_PLOT_TYPES = new Set(
  Object.values(defs)
    .filter((definition) => definition.editMode === 'handles')
    .map((definition) => definition.plotType),
);
