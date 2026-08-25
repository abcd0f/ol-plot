import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type { GeometryFunction } from 'ol/interaction/Draw';
import type { ProjectionLike } from 'ol/proj';
import type { ResolvedPlotConfig } from '../types/config';
import type { DrawType } from '../constants/drawType';

export interface PlotContext {
  config: ResolvedPlotConfig;
  projection: ProjectionLike;
  feature?: Feature;
}

export interface PlotDefinition {
  drawType: DrawType;
  plotType: string;
  editMode: 'feature' | 'handles';
  olType: 'Point' | 'LineString' | 'Polygon' | 'Circle';
  geometryFunction?: (context: PlotContext) => GeometryFunction;
  minPoints?: number;
  maxPoints?: number;
  build(controlPoints: number[][], context: PlotContext): Geometry;
  update(geometry: Geometry, controlPoints: number[][], context: PlotContext): void;
  extract(geometry: Geometry): number[][];
  normalize?(controlPoints: number[][], hint?: number): number[][];
}
