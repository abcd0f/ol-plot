import Style, { type StyleFunction } from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import MultiPoint from 'ol/geom/MultiPoint';
import type Feature from 'ol/Feature';
import type LineString from 'ol/geom/LineString';
import type Polygon from 'ol/geom/Polygon';
import type CircleGeom from 'ol/geom/Circle';
import type Point from 'ol/geom/Point';
import type { ResolvedPlotConfig } from '../types/config';
import { getFeatureStyleData } from '../utils/data';

/** 从要素几何中提取所有顶点坐标。 */
function extractVertices(feature: Feature): number[][] {
  const geom = feature.getGeometry();
  if (!geom) return [];

  switch (geom.getType()) {
    case 'LineString': {
      const plotType = (feature as Feature).get('plotType');
      if (plotType === 'arc') {
        return (feature as Feature).get('controlPoints') || [];
      }
      return (geom as LineString).getCoordinates();
    }
    case 'Polygon': {
      const plotType = (feature as Feature).get('plotType');
      if (
        plotType === 'ellipse' ||
        plotType === 'rectangle' ||
        plotType === 'sector' ||
        plotType === 'straightArrow' ||
        plotType === 'taperedArrow' ||
        plotType === 'doubleArrow'
      ) {
        return (feature as Feature).get('controlPoints') || [];
      }
      const ring = (geom as Polygon).getCoordinates()[0] ?? [];
      const verts = ring.length > 1 ? ring.slice(0, -1) : ring;
      const editIndices: number[] | undefined = (feature as Feature).get('_rectEditIndices');
      if (editIndices) return editIndices.map((i) => verts[i]).filter(Boolean);
      return verts;
    }
    case 'GeometryCollection': {
      const plotType = (feature as Feature).get('plotType');
      if (plotType === 'lineArrow' || plotType === 'azimuth') {
        return (feature as Feature).get('controlPoints') || [];
      }
      return [];
    }
    case 'Point':
      return [(geom as Point).getCoordinates()];
    case 'Circle': {
      const c = geom as CircleGeom;
      const center = c.getCenter();
      // 显示圆心 + 圆周上一个控制点
      return [center, [center[0] + c.getRadius(), center[1]]];
    }
    default:
      return [];
  }
}

/**
 * 选中要素的叠加样式。
 *
 * 渲染几何本身的外观，同时在其所有顶点上叠加圆点标记，
 * 确保选中状态下每个控制节点始终可见。
 *
 * @param config - 合并后的完整配置
 * @returns OL Style 数组 `[geometryStyle, vertexStyle]`
 */
export function buildSelectStyle(config: ResolvedPlotConfig): StyleFunction {
  const ns = config.nodeStyle;

  const defaultGeometryStyle = new Style({
    stroke: new Stroke({
      color: config.strokeColor,
      width: config.strokeWidth,
      lineDash: config.lineDash,
    }),
    fill: new Fill({ color: config.fillColor }),
  });

  const defaultVertexStyle = new Style({
    geometry: (feature) => {
      const coords = extractVertices(feature as Feature);
      return coords.length > 0 ? new MultiPoint(coords) : undefined;
    },
    image: new CircleStyle({
      radius: ns.radius ?? 6,
      fill: new Fill({ color: ns.fill ?? '#ffffff' }),
      stroke: new Stroke({
        color: ns.stroke ?? config.strokeColor,
        width: ns.strokeWidth ?? 2,
      }),
    }),
  });

  return (feature) => {
    const styleData = getFeatureStyleData(feature as Feature);
    if (!styleData) return [defaultGeometryStyle, defaultVertexStyle];

    const featureNodeStyle = styleData.nodeStyle;
    return [
      new Style({
        stroke: new Stroke({
          color: styleData.strokeColor,
          width: styleData.strokeWidth,
          lineDash: styleData.lineDash,
        }),
        fill: new Fill({ color: styleData.fillColor }),
      }),
      new Style({
        geometry: (target) => {
          const coords = extractVertices(target as Feature);
          return coords.length > 0 ? new MultiPoint(coords) : undefined;
        },
        image: new CircleStyle({
          radius: featureNodeStyle.radius ?? 6,
          fill: new Fill({ color: featureNodeStyle.fill ?? '#ffffff' }),
          stroke: new Stroke({
            color: featureNodeStyle.stroke ?? styleData.strokeColor,
            width: featureNodeStyle.strokeWidth ?? 2,
          }),
        }),
      }),
    ];
  };
}
