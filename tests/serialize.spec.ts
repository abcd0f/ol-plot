import { describe, it, expect } from 'vitest';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import Circle from 'ol/geom/Circle';
import { serializeFeature, projectPlotDataCoordinates } from '../packages/utils/data';
import { mergeConfig } from '../packages/constants';
import { DrawType } from '../packages/constants/drawType';
import { buildStraightArrow } from '../packages/geometry/arrow/straight';
import { buildSector } from '../packages/geometry/sector';
import { buildRangeRingsGeometries } from '../packages/geometry/rangeRings';

/**
 * Serialize → project round-trip regression net.
 *
 * `serializeFeature` (map-view projection → lon/lat) and
 * `projectPlotDataCoordinates` (lon/lat → map projection) are the two halves
 * of the getPlotData()/restorePlotData() persistence path that does NOT need a
 * live ol/Map. Locking them here protects the coordinate + control-point
 * contract that CS1's registry must keep intact.
 */

const config = mergeConfig();
const PROJECTION = 'EPSG:3857';

function expectClose(actual: number[], expected: number[], tol = 1e-2): void {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => expect(Math.abs(value - expected[index])).toBeLessThan(tol));
}

/** Everything serialized with a projection must come out as lon/lat. */
function expectLonLat(coordinate: number[]): void {
  expect(Math.abs(coordinate[0])).toBeLessThanOrEqual(180);
  expect(Math.abs(coordinate[1])).toBeLessThanOrEqual(90);
}

describe('serializeFeature + projectPlotDataCoordinates round-trip', () => {
  it('carries the default style payload', () => {
    const feature = new Feature({ geometry: new Point([0, 0]) });
    const data = serializeFeature(feature, DrawType.Point, config, PROJECTION);
    expect(data.style.strokeColor).toBe(config.strokeColor);
    expect(data.style.strokeWidth).toBe(config.strokeWidth);
    expect(data.style.fillColor).toBe(config.fillColor);
    expect(data.properties).toEqual({});
  });

  it('point (native extraction path)', () => {
    const original = [11119508.02, 4865942.28];
    const feature = new Feature({ geometry: new Point([...original]) });

    const data = serializeFeature(feature, DrawType.Point, config, PROJECTION);
    expect(data.type).toBe('Point');
    expect(data.controlPoints).toBeUndefined();
    expect(data.coordinates).toHaveLength(1);
    expectLonLat(data.coordinates[0]);

    const restored = projectPlotDataCoordinates(data, PROJECTION);
    expectClose(restored.coordinates[0], original);
  });

  it('straight arrow (controlPoints path)', () => {
    const controlPoints = [
      [0, 0],
      [100000, 0],
    ];
    const feature = new Feature({ geometry: new Polygon(buildStraightArrow(controlPoints)) });
    feature.set('controlPoints', controlPoints.map((point) => [...point]));
    feature.set('plotType', 'straightArrow');

    const data = serializeFeature(feature, DrawType.StraightArrow, config, PROJECTION);
    expect(data.type).toBe('StraightArrow');
    expect(data.plotType).toBe('straightArrow');
    expect(data.controlPoints).toBeDefined();
    // serialization prefers controlPoints → coordinates mirror them
    expect(data.coordinates).toEqual(data.controlPoints);
    data.controlPoints!.forEach(expectLonLat);

    const restored = projectPlotDataCoordinates(data, PROJECTION);
    restored.controlPoints!.forEach((point, index) => expectClose(point, controlPoints[index]));
  });

  it('sector (controlPoints path)', () => {
    const controlPoints = [
      [0, 0],
      [100000, 0],
      [0, 100000],
    ];
    const feature = new Feature({ geometry: new Polygon(buildSector(controlPoints)) });
    feature.set('controlPoints', controlPoints.map((point) => [...point]));
    feature.set('plotType', 'sector');

    const data = serializeFeature(feature, DrawType.Sector, config, PROJECTION);
    expect(data.plotType).toBe('sector');

    const restored = projectPlotDataCoordinates(data, PROJECTION);
    restored.controlPoints!.forEach((point, index) => expectClose(point, controlPoints[index]));
  });

  it('range rings (spacing/unit carried on the feature)', () => {
    const controlPoints = [
      [0, 0],
      [0, 90000],
    ];
    const geometry = buildRangeRingsGeometries(controlPoints, 20000, 'm', PROJECTION);
    const feature = new Feature({ geometry });
    feature.set('controlPoints', controlPoints.map((point) => [...point]));
    feature.set('rangeRingsSpacing', 20000);
    feature.set('rangeRingsUnit', 'm');
    feature.set('plotType', 'rangeRings');

    const data = serializeFeature(feature, DrawType.RangeRings, config, PROJECTION);
    expect(data.rangeRingsSpacing).toBe(20000);
    expect(data.rangeRingsUnit).toBe('m');

    const restored = projectPlotDataCoordinates(data, PROJECTION);
    restored.controlPoints!.forEach((point, index) => expectClose(point, controlPoints[index]));
  });

  it('line (native extraction path, no controlPoints)', () => {
    const coordinates = [
      [0, 0],
      [100000, 0],
      [100000, 100000],
    ];
    const feature = new Feature({
      geometry: new LineString(coordinates.map((point) => [...point])),
    });

    const data = serializeFeature(feature, DrawType.Line, config, PROJECTION);
    expect(data.type).toBe('LineString');
    expect(data.controlPoints).toBeUndefined();
    expect(data.coordinates).toHaveLength(3);

    const restored = projectPlotDataCoordinates(data, PROJECTION);
    restored.coordinates.forEach((point, index) => expectClose(point, coordinates[index]));
  });

  it('polygon strips the duplicated closing vertex', () => {
    const ring = [
      [0, 0],
      [100000, 0],
      [100000, 100000],
      [0, 0], // closing vertex
    ];
    const feature = new Feature({ geometry: new Polygon([ring.map((point) => [...point])]) });

    const data = serializeFeature(feature, DrawType.Polygon, config, PROJECTION);
    expect(data.coordinates).toHaveLength(3); // closing vertex dropped

    const restored = projectPlotDataCoordinates(data, PROJECTION);
    expectClose(restored.coordinates[0], [0, 0]);
    expectClose(restored.coordinates[2], [100000, 100000]);
  });

  it('circle (center + radius endpoint)', () => {
    const feature = new Feature({ geometry: new Circle([0, 0], 50000) });

    const data = serializeFeature(feature, DrawType.Circle, config, PROJECTION);
    expect(data.type).toBe('Circle');
    expect(data.coordinates).toHaveLength(2);

    const restored = projectPlotDataCoordinates(data, PROJECTION);
    expectClose(restored.coordinates[0], [0, 0]);
    expectClose(restored.coordinates[1], [50000, 0]);
  });
});
