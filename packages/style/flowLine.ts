import LineString from 'ol/geom/LineString';
import Style, { type StyleFunction } from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import type { PlotConfig } from '../types/config';

const MAX_ARROW_COUNT = 200;

function distance(a: number[], b: number[]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.hypot(dx, dy);
}

function normalizePhase(phase: number, spacing: number): number {
  if (spacing <= 0) return 0;
  return ((phase % spacing) + spacing) % spacing;
}

function createArrowGeometry(
  point: number[],
  angle: number,
  resolution: number,
  strokeWidthPx: number,
  arrowStrokeWidthPx: number,
): LineString {
  const arrowLengthPx = Math.max(strokeWidthPx * 1, 6);
  const length = arrowLengthPx * resolution;
  const availableWidth = Math.max(strokeWidthPx - arrowStrokeWidthPx, 1);
  const width = Math.max(Math.min(availableWidth * 0.9, arrowLengthPx * 0.58), 1) * resolution;
  const backX = Math.cos(angle) * length;
  const backY = Math.sin(angle) * length;
  const sideX = Math.cos(angle + Math.PI / 2) * width * 0.5;
  const sideY = Math.sin(angle + Math.PI / 2) * width * 0.5;

  const left = [point[0] - backX + sideX, point[1] - backY + sideY];
  const right = [point[0] - backX - sideX, point[1] - backY - sideY];

  return new LineString([left, point, right]);
}

function sampleArrowStyles(
  coordinates: number[][],
  resolution: number,
  config: Required<PlotConfig>,
  phasePx: number,
): Style[] {
  if (coordinates.length < 2 || resolution <= 0) return [];

  const spacingPx = Math.max(config.flowLine.arrowSpacing ?? 48, 1);
  const spacing = spacingPx * resolution;
  const phase = normalizePhase(phasePx, spacingPx) * resolution;
  const arrowStrokeWidth = Math.max(Math.min(config.strokeWidth * 0.32, 2), 1);
  const arrowStroke = new Stroke({
    color: config.flowLine.arrowColor || config.strokeColor,
    width: arrowStrokeWidth,
  });
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
          geometry: createArrowGeometry(point, angle, resolution, config.strokeWidth, arrowStrokeWidth),
          stroke: arrowStroke,
          zIndex: 1,
        }),
      );
      nextDistance += spacing;
    }

    walked += segmentLength;
  }

  return arrows;
}

export function buildFlowLineStyle(config: Required<PlotConfig>, getPhase: () => number = () => 0): StyleFunction {
  const lineStyle = new Style({
    stroke: new Stroke({
      color: config.strokeColor,
      width: config.strokeWidth,
      lineDash: config.lineDash,
    }),
    zIndex: 0,
  });

  return (feature, resolution) => {
    const geom = feature.getGeometry();
    if (!geom || geom.getType() !== 'LineString') return lineStyle;

    const coordinates = (geom as LineString).getCoordinates();
    return [lineStyle, ...sampleArrowStyles(coordinates, resolution, config, getPhase())];
  };
}
