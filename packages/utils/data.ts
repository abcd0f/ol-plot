import type Feature from 'ol/Feature';
import Circle from 'ol/geom/Circle';
import GeometryCollection from 'ol/geom/GeometryCollection';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import type { DrawType } from '../constants/drawType';
import type { PlotConfig } from '../types/config';
import type { PlotCoordinates, PlotFeatureData, PlotGeometryData, PlotStyleData } from '../types/data';

const PLOT_STYLE_PROPERTY = '_plotStyleData';
const RESERVED_PROPERTY_KEYS = new Set(['geometry', 'controlPoints', 'plotType', PLOT_STYLE_PROPERTY]);

export function serializeFeature(feature: Feature, drawType: DrawType, config: Required<PlotConfig>): PlotFeatureData {
  const geometry = feature.getGeometry();
  const controlPoints = cloneCoordinates(feature.get('controlPoints') as PlotCoordinates | undefined);
  const coordinates = controlPoints ?? extractPlotCoordinates(geometry);
  const style = (feature.get(PLOT_STYLE_PROPERTY) as PlotStyleData | undefined) ?? serializeStyle(config);

  return {
    id: normalizeId(feature.getId()),
    type: drawType,
    plotType: feature.get('plotType') as string | undefined,
    coordinates,
    ...(controlPoints ? { controlPoints } : {}),
    geometry: serializeGeometry(geometry),
    style,
    properties: serializeCustomProperties(feature),
  };
}

export function serializeStyle(config: Required<PlotConfig>): PlotStyleData {
  const nodeStyle = config.nodeStyle;

  return {
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
    flowLine: { ...config.flowLine },
  };
}

export function buildStyleFromData(style: PlotStyleData): Style {
  const nodeStyle = style.nodeStyle;

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

export function setFeatureStyleData(feature: Feature, style: PlotStyleData): void {
  feature.set(PLOT_STYLE_PROPERTY, cloneJson(style));
}

function serializeGeometry(geometry: Geometry | undefined): PlotGeometryData {
  if (!geometry) return { type: 'None' };

  if (geometry instanceof Point) {
    return { type: geometry.getType(), coordinates: cloneCoordinate(geometry.getCoordinates()) };
  }

  if (geometry instanceof LineString) {
    return { type: geometry.getType(), coordinates: cloneCoordinates(geometry.getCoordinates()) };
  }

  if (geometry instanceof Polygon) {
    return {
      type: geometry.getType(),
      coordinates: geometry.getCoordinates().map((ring) => cloneCoordinates(ring)),
    };
  }

  if (geometry instanceof Circle) {
    return {
      type: geometry.getType(),
      center: cloneCoordinate(geometry.getCenter()),
      radius: geometry.getRadius(),
    };
  }

  if (geometry instanceof GeometryCollection) {
    return {
      type: geometry.getType(),
      geometries: geometry.getGeometries().map((child) => serializeGeometry(child)),
    };
  }

  const maybeCoordinates = (geometry as Geometry & { getCoordinates?: () => unknown }).getCoordinates?.();
  return {
    type: geometry.getType(),
    ...(maybeCoordinates !== undefined ? { coordinates: cloneJson(maybeCoordinates) } : {}),
  };
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

function normalizeId(id: string | number | undefined): string | number | undefined {
  return id;
}
