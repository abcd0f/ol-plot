import Map from 'ol/Map';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { BaseTool } from '../core/BaseTool';

export class SectorTool extends BaseTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Sector, config);
  }
}
