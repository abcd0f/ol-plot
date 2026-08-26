import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type { GeometryFunction } from 'ol/interaction/Draw';
import type { ProjectionLike } from 'ol/proj';
import type { ResolvedPlotConfig } from '../types/config';
import type { DrawType } from '../constants/drawType';

export interface PlotContext {
  /** 已解析的绘制配置。 */
  config: ResolvedPlotConfig;
  /** 当前地图投影。 */
  projection: ProjectionLike;
  /** 关联要素。 */
  feature?: Feature;
}

export interface PlotDefinition {
  /** 绘制类型。 */
  drawType: DrawType;
  /** 内部标绘类型名。 */
  plotType: string;
  /** 编辑模式。 */
  editMode: 'feature' | 'handles';
  /** OpenLayers 几何类型。 */
  olType: 'Point' | 'LineString' | 'Polygon' | 'Circle';
  /** 实时绘制几何函数。 */
  geometryFunction?: (context: PlotContext) => GeometryFunction;
  /** 最少控制点数。 */
  minPoints?: number;
  /** 最多控制点数。 */
  maxPoints?: number;
  /** 根据控制点创建几何。 */
  build(controlPoints: number[][], context: PlotContext): Geometry;
  /** 根据控制点更新几何。 */
  update(geometry: Geometry, controlPoints: number[][], context: PlotContext): void;
  /** 从几何提取控制点。 */
  extract(geometry: Geometry): number[][];
  /** 规范化控制点。 */
  normalize?(controlPoints: number[][], hint?: number): number[][];
}
