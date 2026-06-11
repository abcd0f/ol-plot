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
import type { PlotConfig } from '../types/config';
import { DEFAULT_CONFIG } from '../constants/defaultConfig';

export function mergeConfig(config?: PlotConfig): Required<PlotConfig> {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    nodeStyle: {
      ...DEFAULT_CONFIG.nodeStyle,
      ...config?.nodeStyle,
    },
  };
}

export function buildFeatureStyle(config: Required<PlotConfig>): Style {
  return new Style({
    stroke: new Stroke({
      color: config.strokeColor,
      width: config.strokeWidth,
      lineDash: config.lineDash,
    }),
    fill: new Fill({
      color: config.fillColor,
    }),
  });
}

/**
 * 绘制（草图）阶段使用的样式。
 *
 * 关键点：对 `Point` 几何返回 `undefined`，从而隐藏 OpenLayers 默认草图中
 * 那个跟随鼠标移动的顶点小圆点；仅渲染正在绘制的线 / 面，避免在绘制阶段
 * 出现任何编辑节点，保证后续能自然进入编辑模式。
 */
export function buildDrawStyle(config: Required<PlotConfig>): StyleFunction {
  const sketchStyle = new Style({
    stroke: new Stroke({
      color: config.strokeColor,
      width: config.strokeWidth,
      lineDash: config.lineDash,
    }),
    fill: new Fill({
      color: config.fillColor,
    }),
  });

  return (feature) => {
    const geom = feature.getGeometry();
    if (!geom) return undefined;
    // 隐藏跟随鼠标的草图顶点
    if (geom.getType() === 'Point') return undefined;
    return sketchStyle;
  };
}

/** Extract all vertex coordinates from a feature's geometry. */
function extractVertices(feature: Feature): number[][] {
  const geom = feature.getGeometry();
  if (!geom) return [];

  switch (geom.getType()) {
    case 'LineString':
      return (geom as LineString).getCoordinates();
    case 'Polygon': {
      const plotType = (feature as Feature).get('plotType');
      if (plotType === 'ellipse' || plotType === 'sector' || plotType === 'straightArrow' || plotType === 'taperedArrow') {
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
      // Show center + one handle on the circumference
      return [center, [center[0] + c.getRadius(), center[1]]];
    }
    default:
      return [];
  }
}

/**
 * Style applied to the *selected* feature.
 * Renders the geometry normally AND overlays circles at every vertex
 * so that all nodes are always visible while the feature is selected.
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

/** Style used by the Modify interaction for the drag-handle indicator. */
export function buildModifyStyle(config: Required<PlotConfig>): Style[] {
  const ns = config.nodeStyle;
  return [
    new Style({
      stroke: new Stroke({
        color: config.strokeColor,
        width: config.strokeWidth,
        lineDash: config.lineDash,
      }),
      fill: new Fill({ color: config.fillColor }),
    }),
    new Style({
      image: new CircleStyle({
        radius: (ns.radius ?? 6) + 3,
        fill: new Fill({ color: 'rgba(255,255,255,0.4)' }),
        stroke: new Stroke({
          color: ns.stroke ?? config.strokeColor,
          width: 1.5,
        }),
      }),
    }),
  ];
}
