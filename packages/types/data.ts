import type { DrawType } from '../constants/drawType';
import type { AlarmPointConfig, FlowLineConfig, ImagePointConfig, NodeStyle, DistanceUnit } from './config';

export type PlotCoordinate = number[];
export type PlotCoordinates = PlotCoordinate[];
export type PlotDrawType = DrawType | `${DrawType}`;

export interface PlotStyleData {
  /** 线条颜色。 */
  strokeColor: string;
  /** 线条宽度。 */
  strokeWidth: number;
  /** 填充颜色。 */
  fillColor: string;
  /** 虚线配置。 */
  lineDash: number[];
  /** 节点样式。 */
  nodeStyle: NodeStyle;
  /** 流动线样式。 */
  flowLine?: FlowLineConfig;
  /** 图片样式。 */
  image?: ImagePointConfig['image'];
  /** 告警点样式。 */
  alarm?: AlarmPointConfig['alarm'];
}

export interface PlotGeometryData {
  /** 几何类型。 */
  type: string;
  /** 几何坐标。 */
  coordinates?: unknown;
  /** 圆心坐标。 */
  center?: PlotCoordinate;
  /** 半径。 */
  radius?: number;
  /** 子几何。 */
  geometries?: PlotGeometryData[];
}

export interface PlotFeatureData {
  /** 要素标识。 */
  id?: string | number;
  /** 绘制类型。 */
  type: PlotDrawType;
  /** 标绘类型名。 */
  plotType?: string;
  /** 距离环间距。 */
  rangeRingsSpacing?: number;
  /** 距离环单位。 */
  rangeRingsUnit?: DistanceUnit;
  /** 绘制坐标。 */
  coordinates: PlotCoordinates;
  /** 控制点坐标。 */
  controlPoints?: PlotCoordinates;
  /** 几何快照。 */
  geometry?: PlotGeometryData;
  /** 样式数据。 */
  style: PlotStyleData;
  /** 自定义属性。 */
  properties: Record<string, unknown>;
}

export interface PlotRestoreOptions {
  /** 恢复前是否清空已有要素，默认不清空。 */
  clear?: boolean;
  /** 是否将保存的样式应用到恢复的要素，默认应用。 */
  applyStyle?: boolean;
}
