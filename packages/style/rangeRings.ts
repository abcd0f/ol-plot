import GeometryCollection from 'ol/geom/GeometryCollection';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Style, { type StyleFunction } from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';
import Fill from 'ol/style/Fill';
import type { ResolvedPlotConfig } from '../types/config';
import { getFeatureStyleData } from '../utils/data';

/** 创建距离环及其标签样式。 */
export function buildRangeRingsStyle(config: ResolvedPlotConfig): StyleFunction {
  return (feature) => {
    const styleData = getFeatureStyleData(feature as any);
    const color = styleData?.strokeColor ?? config.strokeColor;
    const width = styleData?.strokeWidth ?? config.strokeWidth;
    const lineDash = styleData?.lineDash ?? config.lineDash;
    const geom = feature.getGeometry();
    if (!(geom instanceof GeometryCollection)) return undefined;

    const styles: Style[] = [];
    geom.getGeometries().forEach((child) => {
      if (!(child instanceof LineString)) return;
      const coordinates = child.getCoordinates();
      const labelPoint = coordinates[Math.round((coordinates.length - 1) / 4)];
      styles.push(
        new Style({
          geometry: child,
          stroke: new Stroke({ color, width, lineDash }),
        }),
        new Style({
          geometry: new Point(labelPoint ?? [0, 0]),
          text: new Text({
            text: child.get('rangeRingLabel') as string,
            offsetX: 8,
            textAlign: 'left',
            font: '12px sans-serif',
            fill: new Fill({ color }),
            stroke: new Stroke({ color: '#ffffff', width: 3 }),
          }),
        }),
      );
    });
    return styles;
  };
}
