import Map from 'ol/Map';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import MultiPoint from 'ol/geom/MultiPoint';
import Style, { type StyleFunction } from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import type Geometry from 'ol/geom/Geometry';
import type { FlowLinePlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';
import { BaseTool } from '../core/BaseTool';
import { buildFlowLineStyle } from '../style/flowLine';

export class FlowLineTool extends BaseTool {
  private animationFrame: number | null = null;
  private phase = 0;
  private lastFrameTime = 0;

  constructor(map: Map, config?: FlowLinePlotConfig) {
    super(map, DrawType.FlowLine, config);
    this.applyFlowLineStyle();

    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      feature.set('plotType', 'flowLine');
      this.ensureAnimation();
    });
    this.eventBus.on(DrawEvent.DELETE, () => {
      this.updateAnimationState();
    });
  }

  private applyFlowLineStyle(): void {
    const flowStyle = buildFlowLineStyle(this.config, () => this.phase);
    this.layerManager.getLayer().setStyle(flowStyle);
    this.selectManager.setStyle(this.createSelectStyle(flowStyle));
  }

  private createSelectStyle(flowStyle: StyleFunction): StyleFunction {
    const ns = this.config.nodeStyle;
    const vertexStyle = new Style({
      geometry: (feature) => {
        const geom = (feature as Feature).getGeometry();
        if (!geom || geom.getType() !== 'LineString') return undefined;
        const coords = (geom as LineString).getCoordinates();
        return coords.length > 0 ? new MultiPoint(coords) : undefined;
      },
      image: new CircleStyle({
        radius: ns.radius ?? 6,
        fill: new Fill({ color: ns.fill ?? '#ffffff' }),
        stroke: new Stroke({
          color: ns.stroke ?? this.config.strokeColor,
          width: ns.strokeWidth ?? 2,
        }),
      }),
    });

    return (feature, resolution) => {
      const styles = flowStyle(feature, resolution);
      const baseStyles = Array.isArray(styles) ? styles : styles ? [styles] : [];
      return [...baseStyles, vertexStyle];
    };
  }

  private startAnimation(): void {
    if (this.animationFrame !== null) return;

    const tick = (time: number) => {
      if (this.lastFrameTime === 0) this.lastFrameTime = time;
      const delta = Math.min(time - this.lastFrameTime, 100);
      this.lastFrameTime = time;
      this.phase += ((this.config.flowLine.speed ?? 60) * delta) / 1000;
      this.layerManager.getLayer().changed();
      this.map.render();
      this.animationFrame = requestAnimationFrame(tick);
    };

    this.lastFrameTime = 0;
    this.animationFrame = requestAnimationFrame(tick);
  }

  private stopAnimation(): void {
    if (this.animationFrame === null) return;
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.lastFrameTime = 0;
  }

  private hasRenderableFlowLines(): boolean {
    return this.layerManager.getSource().getFeatures().length > 0;
  }

  private ensureAnimation(): void {
    if ((this.config.flowLine.speed ?? 60) <= 0 || !this.hasRenderableFlowLines()) return;
    this.startAnimation();
  }

  private updateAnimationState(): void {
    if (this.hasRenderableFlowLines()) {
      this.ensureAnimation();
    } else {
      this.stopAnimation();
    }
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    return new LineString(coordinates);
  }

  protected createFeature(coordinates: number[][]): Feature {
    const feature = super.createFeature(coordinates);
    feature.set('plotType', 'flowLine');
    this.ensureAnimation();
    return feature;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature) return;
    (this.activeFeature.getGeometry() as LineString).setCoordinates(coordinates);
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.getGeometry() as LineString).getCoordinates();
  }

  getPointCount(): number {
    return this.getCoordinates().length;
  }

  updatePoint(index: number, coordinate: number[]): void {
    const coords = this.getCoordinates();
    if (index < 0 || index >= coords.length) return;
    coords[index] = coordinate;
    this.setCoordinates(coords);
  }

  clearFeatures(): this {
    super.clearFeatures();
    this.stopAnimation();
    return this;
  }

  destroy(): void {
    this.stopAnimation();
    super.destroy();
  }
}
