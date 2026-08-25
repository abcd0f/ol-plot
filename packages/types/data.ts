import type { DrawType } from '../constants/drawType';
import type { AlarmPointConfig, FlowLineConfig, ImagePointConfig, NodeStyle, DistanceUnit } from './config';

export type PlotCoordinate = number[];
export type PlotCoordinates = PlotCoordinate[];
export type PlotDrawType = DrawType | `${DrawType}`;

export interface PlotStyleData {
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  lineDash: number[];
  nodeStyle: NodeStyle;
  flowLine?: FlowLineConfig;
  image?: ImagePointConfig['image'];
  alarm?: AlarmPointConfig['alarm'];
}

export interface PlotGeometryData {
  type: string;
  coordinates?: unknown;
  center?: PlotCoordinate;
  radius?: number;
  geometries?: PlotGeometryData[];
}

export interface PlotFeatureData {
  id?: string | number;
  type: PlotDrawType;
  plotType?: string;
  rangeRingsSpacing?: number;
  rangeRingsUnit?: DistanceUnit;
  coordinates: PlotCoordinates;
  controlPoints?: PlotCoordinates;
  geometry?: PlotGeometryData;
  style: PlotStyleData;
  properties: Record<string, unknown>;
}

export interface PlotRestoreOptions {
  /** Clear existing features before restoring data. Defaults to false. */
  clear?: boolean;
  /** Apply saved style data to each restored feature. Defaults to true. */
  applyStyle?: boolean;
}
