import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import Style, { type StyleFunction } from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import type Feature from 'ol/Feature';
import type { FlowLineConfig, ResolvedPlotConfig } from '../types/config';
import { getFeatureStyleData } from '../utils/data';

const MAX_ARROW_COUNT = 200;
const PHASE_CACHE_STEP_PX = 2;

interface ArrowStyleCache {
  featureRevision: number;
  geometryRevision: number;
  resolution: number;
  phaseBucket: number;
  styleKey: string;
  styles: Style[];
}

function distance(a: number[], b: number[]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.hypot(dx, dy);
}

function normalizePhase(phase: number, spacing: number): number {
  if (spacing <= 0) return 0;
  return ((phase % spacing) + spacing) % spacing;
}

function createArrowGeometry(point: number[], angle: number, resolution: number, strokeWidthPx: number): Polygon {
  const widthPx = Math.max(strokeWidthPx, 0.1);
  const lengthPx = widthPx * 1.2;
  const length = lengthPx * resolution;
  const halfWidth = (widthPx * resolution) / 2;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotate = (x: number, y: number): number[] => [point[0] + x * cos - y * sin, point[1] + x * sin + y * cos];

  const tip = rotate(length * 0.3, 0);
  const leftOuter = rotate(-length * 0.3, -halfWidth);
  const notch = rotate(-length * 0.01, 0);
  const rightOuter = rotate(-length * 0.3, halfWidth);

  return new Polygon([[tip, leftOuter, notch, rightOuter, tip]]);
}

function sampleArrowStyles(
  coordinates: number[][],
  resolution: number,
  strokeWidth: number,
  arrowSpacing: number,
  phasePx: number,
  arrowFill: Fill,
): Style[] {
  if (coordinates.length < 2 || resolution <= 0) return [];

  const spacingPx = Math.max(arrowSpacing, 1);
  const spacing = spacingPx * resolution;
  const phase = normalizePhase(phasePx, spacingPx) * resolution;
  const arrows: Style[] = [];
  let nextDistance = phase;
  let walked = 0;

  for (let i = 1; i < coordinates.length && arrows.length < MAX_ARROW_COUNT; i += 1) {
    const start = coordinates[i - 1];
    const end = coordinates[i];
    const segmentLength = distance(start, end);
    if (segmentLength === 0) continue;

    const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
    while (nextDistance <= walked + segmentLength && arrows.length < MAX_ARROW_COUNT) {
      const localDistance = nextDistance - walked;
      const ratio = localDistance / segmentLength;
      const point = [start[0] + (end[0] - start[0]) * ratio, start[1] + (end[1] - start[1]) * ratio];

      arrows.push(
        new Style({
          geometry: createArrowGeometry(point, angle, resolution, strokeWidth),
          fill: arrowFill,
          zIndex: 1,
        }),
      );
      nextDistance += spacing;
    }

    walked += segmentLength;
  }

  return arrows;
}

type FlowPhaseGetter = (feature: Feature, flowLine: FlowLineConfig) => number;

export function buildFlowLineStyle(config: ResolvedPlotConfig, getPhase: FlowPhaseGetter = () => 0): StyleFunction {
  const defaultLineStyle = new Style({
    stroke: new Stroke({
      color: config.strokeColor,
      width: config.strokeWidth,
      lineDash: config.lineDash,
    }),
    zIndex: 0,
  });
  const arrowFill = new Fill({
    color: config.flowLine.arrowColor || config.strokeColor,
  });
  const styleCache = new WeakMap<object, ArrowStyleCache>();

  return (feature, resolution) => {
    const styleData = getFeatureStyleData(feature as any);
    const strokeColor = styleData?.strokeColor ?? config.strokeColor;
    const strokeWidth = styleData?.strokeWidth ?? config.strokeWidth;
    const lineDash = styleData?.lineDash ?? config.lineDash;
    const flowLine = styleData?.flowLine ?? config.flowLine;
    const spacingPx = Math.max(flowLine.arrowSpacing ?? 48, 1);
    const arrowColor = flowLine.arrowColor || strokeColor;
    const styleKey = styleData
      ? `${strokeColor}|${strokeWidth}|${lineDash.join(',')}|${arrowColor}|${spacingPx}`
      : '';

    const geom = feature.getGeometry();
    if (!geom || geom.getType() !== 'LineString') {
      if (!styleData) return defaultLineStyle;
      return new Style({
        stroke: new Stroke({
          color: strokeColor,
          width: strokeWidth,
          lineDash,
        }),
        zIndex: 0,
      });
    }

    const featureRevision = (feature as any).getRevision?.() ?? 0;
    const geometryRevision = (geom as any).getRevision?.() ?? 0;
    const phaseBucketCount = Math.max(1, Math.ceil(spacingPx / PHASE_CACHE_STEP_PX));
    const phaseBucket =
      Math.floor(normalizePhase(getPhase(feature as Feature, flowLine), spacingPx) / PHASE_CACHE_STEP_PX) %
      phaseBucketCount;
    const cached = styleCache.get(feature as object);

    if (
      cached &&
      cached.featureRevision === featureRevision &&
      cached.geometryRevision === geometryRevision &&
      cached.resolution === resolution &&
      cached.phaseBucket === phaseBucket &&
      cached.styleKey === styleKey
    ) {
      return cached.styles;
    }

    const lineStyle = styleData
      ? new Style({
          stroke: new Stroke({
            color: strokeColor,
            width: strokeWidth,
            lineDash,
          }),
          zIndex: 0,
        })
      : defaultLineStyle;
    const featureArrowFill = styleData ? new Fill({ color: arrowColor }) : arrowFill;
    const coordinates = (geom as LineString).getCoordinates();
    const styles = [
      lineStyle,
      ...sampleArrowStyles(
        coordinates,
        resolution,
        strokeWidth,
        spacingPx,
        phaseBucket * PHASE_CACHE_STEP_PX,
        featureArrowFill,
      ),
    ];
    styleCache.set(feature as object, {
      featureRevision,
      geometryRevision,
      resolution,
      phaseBucket,
      styleKey,
      styles,
    });
    return styles;
  };
}
