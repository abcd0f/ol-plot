import { describe, expect, it } from 'vitest';
import { DrawType } from '../packages/constants/drawType';
import { mergeConfig } from '../packages/constants';
import { PLOT_DEFS } from '../packages/plot-defs';

describe('PLOT_DEFS', () => {
  it('defines every public draw type', () => {
    expect(Object.keys(PLOT_DEFS).sort()).toEqual(Object.values(DrawType).sort());
  });

  it('builds representative geometries through the registry', () => {
    const context = { config: mergeConfig(), projection: 'EPSG:3857' };
    expect(PLOT_DEFS[DrawType.Point].build([[0, 0]], context).getType()).toBe('Point');
    expect(PLOT_DEFS[DrawType.Sector].build([[0, 0], [10, 0], [0, 10]], context).getType()).toBe('Polygon');
    expect(PLOT_DEFS[DrawType.StraightArrow].build([[0, 0], [10, 0]], context).getType()).toBe('Polygon');
    expect(PLOT_DEFS[DrawType.RangeRings].build([[0, 0], [0, 1000]], context).getType()).toBe('GeometryCollection');
  });
});
