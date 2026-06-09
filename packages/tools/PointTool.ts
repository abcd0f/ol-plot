import Map from 'ol/Map';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { BaseTool } from '../core/BaseTool';

export class PointTool extends BaseTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Point, config);
    // Point 几何需要 image 样式才能渲染，覆盖仅有 stroke/fill 的默认样式
    const ns = this.config.nodeStyle;
    this.layerManager.getLayer().setStyle(
      new Style({
        image: new CircleStyle({
          radius: ns.radius ?? 6,
          fill: new Fill({ color: ns.fill ?? '#ffffff' }),
          stroke: new Stroke({
            color: ns.stroke ?? this.config.strokeColor,
            width: ns.strokeWidth ?? 2,
          }),
        }),
      }),
    );
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    return new Point(coordinates[0]);
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 1) return;
    (this.activeFeature.getGeometry() as Point).setCoordinates(coordinates[0]);
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return [(this.activeFeature.getGeometry() as Point).getCoordinates()];
  }

  getPointCount(): number {
    return this.activeFeature ? 1 : 0;
  }

  updatePoint(index: number, coordinate: number[]): void {
    if (index !== 0) return;
    this.setCoordinates([coordinate]);
  }

  getPosition(): number[] | null {
    if (!this.activeFeature) return null;
    return (this.activeFeature.getGeometry() as Point).getCoordinates();
  }
}
