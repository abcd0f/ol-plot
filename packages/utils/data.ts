import type Feature from 'ol/Feature';
import Circle from 'ol/geom/Circle';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import { fromLonLat, toLonLat, type ProjectionLike } from 'ol/proj';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import { DrawType } from '../constants/drawType';
import { mergeRuntimeConfig } from '../constants';
import type { InternalPlotConfig, ResolvedPlotConfig } from '../types/config';
import type { PlotCoordinates, PlotFeatureData, PlotGeometryData, PlotStyleData } from '../types/data';
import { buildImagePointStyle } from '../style/imagePoint';
import { buildAlarmPointStyle } from '../style/alarmPoint';

const PLOT_STYLE_PROPERTY = '_plotStyleData';
const DRAW_TYPE_PROPERTY = '_drawType';
const RESERVED_PROPERTY_KEYS = new Set([
  'geometry',
  'controlPoints',
  'plotType',
  DRAW_TYPE_PROPERTY,
  PLOT_STYLE_PROPERTY,
]);

export function serializeFeature(
  feature: Feature,
  drawType: DrawType,
  config: ResolvedPlotConfig,
  projection?: ProjectionLike,
): PlotFeatureData {
  const geometry = feature.getGeometry();
  const controlPoints = cloneCoordinates(feature.get('controlPoints') as PlotCoordinates | undefined);
  const coordinates = controlPoints ?? extractPlotCoordinates(geometry);
  const includeFlowLine = drawType === DrawType.FlowLine;
  const includeAlarmPoint = drawType === DrawType.AlarmPoint;
  const storedStyle = feature.get(PLOT_STYLE_PROPERTY) as PlotStyleData | undefined;
  const style = storedStyle
    ? normalizeStyleData(storedStyle, includeFlowLine, includeAlarmPoint)
    : serializeStyle(config, includeFlowLine, includeAlarmPoint);

  const data = {
    id: normalizeId(feature.getId()),
    type: drawType,
    plotType: feature.get('plotType') as string | undefined,
    coordinates,
    ...(controlPoints ? { controlPoints } : {}),
    style,
    properties: serializeCustomProperties(feature),
  };

  const transformedData = projection
    ? transformFeatureDataCoordinates(data, (coordinate) => toLonLat(coordinate, projection))
    : data;

  return transformedData;
}

export function projectPlotDataCoordinates(data: PlotFeatureData, projection: ProjectionLike): PlotFeatureData {
  return transformFeatureDataCoordinates(data, (coordinate) =>
    isLonLatCoordinate(coordinate) ? fromLonLat(coordinate, projection) : [...coordinate],
  );
}

export function serializeStyle(
  config: ResolvedPlotConfig,
  includeFlowLine = false,
  includeAlarmPoint = false,
): PlotStyleData {
  const nodeStyle = config.nodeStyle;

  const style: PlotStyleData = {
    strokeColor: config.strokeColor,
    strokeWidth: config.strokeWidth,
    fillColor: config.fillColor,
    lineDash: [...config.lineDash],
    nodeStyle: {
      radius: nodeStyle.radius ?? 6,
      fill: nodeStyle.fill ?? '#ffffff',
      stroke: nodeStyle.stroke ?? config.strokeColor,
      strokeWidth: nodeStyle.strokeWidth ?? 2,
    },
  };

  if (includeFlowLine) style.flowLine = { ...config.flowLine };
  if (includeAlarmPoint) style.alarm = { ...config.alarm };

  return style;
}

export function buildStyleFromData(style: PlotStyleData): Style {
  const nodeStyle = style.nodeStyle;

  if (style.image) {
    return buildImagePointStyle(style.image, nodeStyle, style.strokeColor);
  }

  if (style.alarm) {
    return buildAlarmPointStyle(style.alarm, nodeStyle, style.strokeColor);
  }

  return new Style({
    stroke: new Stroke({
      color: style.strokeColor,
      width: style.strokeWidth,
      lineDash: style.lineDash,
    }),
    fill: new Fill({
      color: style.fillColor,
    }),
    image: new CircleStyle({
      radius: nodeStyle.radius ?? 6,
      fill: new Fill({ color: nodeStyle.fill ?? '#ffffff' }),
      stroke: new Stroke({
        color: nodeStyle.stroke ?? style.strokeColor,
        width: nodeStyle.strokeWidth ?? 2,
      }),
    }),
  });
}

export function resolveStyleData(
  baseConfig: ResolvedPlotConfig,
  override?: InternalPlotConfig,
  includeFlowLine = false,
  includeAlarmPoint = false,
): PlotStyleData {
  return serializeStyle(mergeRuntimeConfig(baseConfig, override), includeFlowLine, includeAlarmPoint);
}

export function setFeatureStyleData(feature: Feature, style: PlotStyleData): void {
  feature.set(PLOT_STYLE_PROPERTY, cloneJson(style));
}

export function getFeatureStyleData(feature: Feature): PlotStyleData | undefined {
  const style = feature.get(PLOT_STYLE_PROPERTY) as PlotStyleData | undefined;
  return style ? cloneJson(style) : undefined;
}

function extractPlotCoordinates(geometry: Geometry | undefined): PlotCoordinates {
  if (!geometry) return [];

  if (geometry instanceof Point) return [cloneCoordinate(geometry.getCoordinates())];
  if (geometry instanceof LineString) return cloneCoordinates(geometry.getCoordinates()) ?? [];
  if (geometry instanceof Polygon) {
    const ring = geometry.getCoordinates()[0] ?? [];
    return stripClosingCoordinate(cloneCoordinates(ring) ?? []);
  }
  if (geometry instanceof Circle) {
    const center = cloneCoordinate(geometry.getCenter());
    return [center, [center[0] + geometry.getRadius(), center[1]]];
  }

  return [];
}

function serializeCustomProperties(feature: Feature): Record<string, unknown> {
  const properties = feature.getProperties();
  const result: Record<string, unknown> = {};

  Object.keys(properties).forEach((key) => {
    if (RESERVED_PROPERTY_KEYS.has(key)) return;
    result[key] = cloneJson(properties[key]);
  });

  return result;
}

function stripClosingCoordinate(coordinates: PlotCoordinates): PlotCoordinates {
  if (coordinates.length < 2) return coordinates;
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  return coordinatesEqual(first, last) ? coordinates.slice(0, -1) : coordinates;
}

function coordinatesEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function cloneCoordinates(coordinates: PlotCoordinates | undefined): PlotCoordinates | undefined {
  return coordinates?.map(cloneCoordinate);
}

function cloneCoordinate(coordinate: number[]): number[] {
  return [...coordinate];
}

function cloneJson<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'object') return value;

  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function normalizeStyleData(style: PlotStyleData, includeFlowLine: boolean, includeAlarmPoint: boolean): PlotStyleData {
  const cloned = cloneJson(style);
  if (includeFlowLine && includeAlarmPoint) return cloned;

  const { flowLine: _flowLine, alarm: _alarm, ...styleWithoutAnimatedData } = cloned;
  return {
    ...styleWithoutAnimatedData,
    ...(includeFlowLine ? { flowLine: cloned.flowLine } : {}),
    ...(includeAlarmPoint ? { alarm: cloned.alarm } : {}),
  };
}

function normalizeId(id: string | number | undefined): string | number | undefined {
  return id;
}

function transformFeatureDataCoordinates(
  data: PlotFeatureData,
  transformCoordinate: (coordinate: number[]) => number[],
): PlotFeatureData {
  return {
    ...data,
    coordinates: transformCoordinates(data.coordinates, transformCoordinate),
    ...(data.controlPoints ? { controlPoints: transformCoordinates(data.controlPoints, transformCoordinate) } : {}),
    ...(data.geometry ? { geometry: transformGeometryDataCoordinates(data.geometry, transformCoordinate) } : {}),
  };
}

function transformGeometryDataCoordinates(
  geometry: PlotGeometryData,
  transformCoordinate: (coordinate: number[]) => number[],
): PlotGeometryData {
  return {
    ...geometry,
    ...(geometry.coordinates !== undefined
      ? { coordinates: transformCoordinateTree(geometry.coordinates, transformCoordinate) }
      : {}),
    ...(geometry.center ? { center: transformCoordinate(geometry.center) } : {}),
    ...(geometry.geometries
      ? { geometries: geometry.geometries.map((child) => transformGeometryDataCoordinates(child, transformCoordinate)) }
      : {}),
  };
}

function transformCoordinateTree(value: unknown, transformCoordinate: (coordinate: number[]) => number[]): unknown {
  if (!Array.isArray(value)) return cloneJson(value);
  if (isCoordinate(value)) return transformCoordinate(value);
  return value.map((item) => transformCoordinateTree(item, transformCoordinate));
}

function transformCoordinates(
  coordinates: PlotCoordinates,
  transformCoordinate: (coordinate: number[]) => number[],
): PlotCoordinates {
  return coordinates.map(transformCoordinate);
}

function isCoordinate(value: unknown[]): value is number[] {
  return value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number';
}

function isLonLatCoordinate(coordinate: number[]): boolean {
  return Math.abs(coordinate[0]) <= 180 && Math.abs(coordinate[1]) <= 90;
}
