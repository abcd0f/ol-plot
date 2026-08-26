import { describe, expect, it } from 'vitest';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import { DrawType } from '../packages/kernel/constants/drawType';
import { mergeConfig } from '../packages/kernel/constants';
import { buildDrawStyle } from '../packages/shared-style/draw';

describe('buildDrawStyle', () => {
  it('hides the auxiliary LineString sketch for DoubleArrow', () => {
    const style = buildDrawStyle(mergeConfig(), DrawType.DoubleArrow);

    expect(style(new Feature(new LineString([[0, 0], [1, 1]])), 1)).toBeUndefined();
    expect(
      style(
        new Feature(
          new Polygon([
            [
              [0, 0],
              [1, 0],
              [0, 1],
              [0, 0],
            ],
          ]),
        ),
        1,
      ),
    ).toBeDefined();
  });

  it('keeps the LineString sketch for ordinary line tools', () => {
    const style = buildDrawStyle(mergeConfig(), DrawType.Line);

    expect(style(new Feature(new LineString([[0, 0], [1, 1]])), 1)).toBeDefined();
  });
});
