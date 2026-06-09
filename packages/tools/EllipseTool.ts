import Map from 'ol/Map';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import type Feature from 'ol/Feature';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { BaseTool } from '../core/BaseTool';

export class EllipseTool extends BaseTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Ellipse, config);
  }
}
