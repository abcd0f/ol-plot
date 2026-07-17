import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import MultiPoint from 'ol/geom/MultiPoint';
import type Feature from 'ol/Feature';
import type LineString from 'ol/geom/LineString';
import type Polygon from 'ol/geom/Polygon';
import type CircleGeom from 'ol/geom/Circle';
import type Point from 'ol/geom/Point';
import type { PlotConfig } from '../types/config';

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
        plotType === 'sector' ||
        plotType === 'straightArrow' ||
        plotType === 'taperedArrow' ||
        plotType === 'doubleArrow' ||
        plotType === 'rectangle'
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
      if (plotType === 'lineArrow') {
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
export function buildSelectStyle(config: Required<PlotConfig>): Style[] {
  const ns = config.nodeStyle;

  const geometryStyle = new Style({
    stroke: new Stroke({
      color: config.strokeColor,
      width: config.strokeWidth,
      lineDash: config.lineDash,
    }),
    fill: new Fill({ color: config.fillColor }),
  });

  const vertexStyle = new Style({
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

  return [geometryStyle, vertexStyle];
}
