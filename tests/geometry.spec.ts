import { describe, it, expect } from 'vitest';
import Polygon from 'ol/geom/Polygon';
import { getDistance } from 'ol/sphere';
import { toLonLat } from 'ol/proj';
import {
  buildSector,
  normalizeSectorControlPoints,
  getSectorControlPoints,
} from '../packages/geometry/sector';
import { buildStraightArrow, getStraightArrowCenter } from '../packages/geometry/arrow/straight';
import {
  buildRangeRingsGeometries,
  parseRangeSpacing,
  formatValue,
} from '../packages/geometry/rangeRings';

/**
 * Characterization tests: lock the *current* output of the pure geometry
 * functions so the CS1 registry refactor can be proven behavior-preserving
 * ("与改造前逐点对比"). These functions are the single source of shape
 * knowledge that CS1 moves into PlotDefinition objects.
 */

describe('buildStraightArrow', () => {
  it('produces a single closed 8-point ring with the documented ratios', () => {
    const rings = buildStraightArrow([
      [0, 0],
      [100, 0],
    ]);
    expect(rings).toHaveLength(1);
    const ring = rings[0];
    expect(ring).toHaveLength(8);

    // bodyHalfWidth = 100 * 0.1 / 2 = 5 ; body/head junction at bodyLength = 85
    // headHalfWidth = 100 * 0.3 / 2 = 15 ; wingBack = 100 * 0.04 = 4 ; WING_SCALE = 0.9
    const s = Math.sign(ring[0][1]); // normal orientation (impl-defined)

    expect(ring[0]).toEqual([0, s * 5]); // body tail corner (near side)
    expect(ring[1]).toEqual([85, s * 5]); // body/head junction (near side)
    expect(ring[2][0]).toBeCloseTo(81, 10); // left wing x = bx - wingBack = 81
    expect(Math.abs(ring[2][1])).toBeCloseTo(13.5, 10); // 15 * 0.9
    expect(ring[3]).toEqual([100, 0]); // arrow tip == p1
    expect(ring[4][0]).toBeCloseTo(81, 10); // right wing mirrors left wing
    expect(ring[4][1]).toBeCloseTo(-ring[2][1], 10);
    expect(ring[5]).toEqual([85, -s * 5]);
    expect(ring[6]).toEqual([0, -s * 5]);
    expect(ring[7]).toEqual(ring[0]); // closed
  });

  it('degenerates when the two control points coincide', () => {
    const rings = buildStraightArrow([
      [10, 10],
      [10, 10],
    ]);
    expect(rings).toHaveLength(1);
    // createDegeneratePolygon collapses to the single point
    rings[0].forEach((pt) => expect(pt).toEqual([10, 10]));
  });

  it('center is the midpoint of the two control points', () => {
    expect(
      getStraightArrowCenter([
        [0, 0],
        [100, 40],
      ]),
    ).toEqual([50, 20]);
  });
});

describe('buildSector', () => {
  it('builds an arc ring + center for a 90° sector', () => {
    const rings = buildSector([
      [0, 0],
      [100, 0],
      [0, 100],
    ]);
    expect(rings).toHaveLength(1);
    const ring = rings[0];

    // angleSpan = π/2 → ceil(π/2 * 24) = 38 segments → ring length = 38 + 3 = 41
    expect(ring).toHaveLength(41);

    expect(ring[0][0]).toBeCloseTo(100, 6); // arc start at angle 0
    expect(ring[0][1]).toBeCloseTo(0, 6);
    expect(ring[38][0]).toBeCloseTo(0, 6); // arc end at angle π/2
    expect(ring[38][1]).toBeCloseTo(100, 6);
    expect(ring[39]).toEqual([0, 0]); // center vertex
    expect(ring[40]).toEqual(ring[0]); // closed

    // every arc vertex sits on the radius
    for (let i = 0; i <= 38; i += 1) {
      const r = Math.hypot(ring[i][0], ring[i][1]);
      expect(r).toBeCloseTo(100, 6);
    }
  });

  it('returns a degenerate triangle when only two control points are given', () => {
    const rings = buildSector([
      [0, 0],
      [50, 0],
    ]);
    expect(rings).toEqual([[[0, 0], [50, 0], [0, 0]]]);
  });
});

describe('normalizeSectorControlPoints', () => {
  it('projects the end point onto the start radius (default source index)', () => {
    const [center, start, end] = normalizeSectorControlPoints([
      [0, 0],
      [100, 0],
      [0, 50],
    ]);
    expect(center).toEqual([0, 0]);
    expect(start).toEqual([100, 0]);
    expect(end[0]).toBeCloseTo(0, 6);
    expect(end[1]).toBeCloseTo(100, 6); // projected from radius 50 up to 100
  });

  it('projects the start point when radiusSourceIndex = 2', () => {
    const [center, start, end] = normalizeSectorControlPoints(
      [
        [0, 0],
        [50, 0],
        [0, 100],
      ],
      2,
    );
    expect(center).toEqual([0, 0]);
    expect(end).toEqual([0, 100]);
    expect(start[0]).toBeCloseTo(100, 6); // projected from radius 50 out to 100
    expect(start[1]).toBeCloseTo(0, 6);
  });

  it('keeps only the first two points when radius collapses', () => {
    expect(
      normalizeSectorControlPoints([
        [0, 0],
        [0, 0],
        [10, 10],
      ]),
    ).toEqual([[0, 0], [0, 0], [10, 10]]);
  });
});

describe('getSectorControlPoints', () => {
  it('reads the stored _controlPoints when present', () => {
    const polygon = new Polygon(
      buildSector([
        [0, 0],
        [100, 0],
        [0, 100],
      ]),
    );
    polygon.set('_controlPoints', [
      [0, 0],
      [100, 0],
      [0, 100],
    ]);
    expect(getSectorControlPoints(polygon)).toEqual([
      [0, 0],
      [100, 0],
      [0, 100],
    ]);
  });

  it('derives control points from the ring when _controlPoints is absent', () => {
    const polygon = new Polygon(
      buildSector([
        [0, 0],
        [100, 0],
        [0, 100],
      ]),
    );
    const [center, start] = getSectorControlPoints(polygon);
    expect(center).toEqual([0, 0]); // ring[len-2]
    expect(start[0]).toBeCloseTo(100, 6); // ring[0]
    expect(start[1]).toBeCloseTo(0, 6);
  });
});

describe('buildRangeRingsGeometries', () => {
  it('emits one LineString per ring with radius/label metadata', () => {
    const controlPoints = [
      [0, 0],
      [0, 90000],
    ];
    const collection = buildRangeRingsGeometries(controlPoints, 20000, 'm', 'EPSG:3857');

    expect(collection.get('_controlPoints')).toEqual(controlPoints);
    expect(collection.get('rangeRingsSpacing')).toBe(20000);
    expect(collection.get('rangeRingsUnit')).toBe('m');

    const rings = collection.getGeometries();
    // outer distance ~90km / 20km spacing → 4 rings (locked baseline)
    expect(rings).toHaveLength(4);

    const centerLonLat = toLonLat([0, 0], 'EPSG:3857');
    rings.forEach((ring, index) => {
      const radius = (index + 1) * 20000;
      expect(ring.get('rangeRingRadius')).toBe(radius);
      expect(ring.get('rangeRingLabel')).toBe(`${radius}m`);

      const coordinates = (ring as import('ol/geom/LineString').default).getCoordinates();
      expect(coordinates).toHaveLength(97); // SEGMENTS (96) + 1 closing vertex

      // every vertex is ~`radius` metres from the centre (great-circle)
      coordinates.forEach((coordinate) => {
        const metres = getDistance(centerLonLat, toLonLat(coordinate, 'EPSG:3857'));
        expect(metres).toBeCloseTo(radius, -1); // within ~10 m of the nominal radius
      });
    });
  });

  it('returns an empty collection (control points only) for < 2 points', () => {
    const collection = buildRangeRingsGeometries([[0, 0]], 10, 'm', 'EPSG:3857');
    expect(collection.getGeometries()).toHaveLength(0);
    expect(collection.get('_controlPoints')).toEqual([[0, 0]]);
  });
});

describe('parseRangeSpacing', () => {
  it('converts value + unit into metres', () => {
    expect(parseRangeSpacing(20, 'km')).toEqual({ value: 20, unit: 'km', meters: 20000 });
    expect(parseRangeSpacing(3, 'nm')).toEqual({ value: 3, unit: 'nm', meters: 5556 });
  });

  it('falls back to 10 m when value/unit are undefined', () => {
    expect(parseRangeSpacing(undefined, undefined)).toEqual({ value: 10, unit: 'm', meters: 10 });
  });

  it('throws on non-positive spacing', () => {
    expect(() => parseRangeSpacing(0, 'm')).toThrow();
    expect(() => parseRangeSpacing(-5, 'm')).toThrow();
  });
});

describe('formatValue', () => {
  it('formats integers without decimals and trims trailing zeros', () => {
    expect(formatValue(5)).toBe('5');
    expect(formatValue(5.5)).toBe('5.5');
    expect(formatValue(5.25)).toBe('5.25');
    expect(formatValue(5.1)).toBe('5.1');
  });
});
