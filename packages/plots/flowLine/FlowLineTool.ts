import Map from 'ol/Map';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import type { StyleFunction } from 'ol/style/Style';
import type Geometry from 'ol/geom/Geometry';
import type { FlowLinePlotConfig } from '../../kernel/types/config';
import { DrawType } from '../../kernel/constants/drawType';
import { DrawEvent } from '../../kernel/constants/events';
import { BaseTool } from '../../engine/tool/BaseTool';
import { buildFlowLineStyle } from './style';
import { buildSelectStyle } from '../../shared-style/select';
import { getFeatureStyleData } from '../../kernel/utils/data';
import { PlotAnimator } from '../../shared-runtime-helpers/animator';

export class FlowLineTool extends BaseTool {
  private readonly animator = new PlotAnimator();
  private phase = 0;
  private elapsedTime = 0;

  constructor(map: Map, config?: FlowLinePlotConfig) {
    super(map, DrawType.FlowLine, config);
    this.applyFlowLineStyle();

    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      this.ensureAnimation();
    });
    this.eventBus.on(DrawEvent.DELETE, () => {
      this.updateAnimationState();
    });
  }

  private applyFlowLineStyle(): void {
    const flowStyle = buildFlowLineStyle(this.config, (feature) => this.getFlowPhase(feature as Feature));
    this.layerManager.getLayer().setStyle(flowStyle);
    this.selectManager.setStyle(this.createSelectStyle(flowStyle));
  }

  protected refreshStyles(): void {
    super.refreshStyles();
    this.applyFlowLineStyle();
    this.updateAnimationState();
  }

  protected refreshActiveFeatureStyle(): void {
    super.refreshActiveFeatureStyle();
    this.applyFlowLineStyle();
    this.updateAnimationState();
  }

  private createSelectStyle(flowStyle: StyleFunction): StyleFunction {
    const selectStyle = buildSelectStyle(this.config);

    return (feature, resolution) => {
      const styles = flowStyle(feature, resolution);
      const baseStyles = Array.isArray(styles) ? styles : styles ? [styles] : [];
      const selectedStyles = selectStyle(feature, resolution);
      const selectedList = Array.isArray(selectedStyles) ? selectedStyles : selectedStyles ? [selectedStyles] : [];
      return [...baseStyles, ...selectedList];
    };
  }

  private startAnimation(): void {
    this.animator.start(() => this.hasAnimatedFlowLines(), (delta) => {
      this.elapsedTime += delta;
      this.phase += ((this.config.flowLine.speed ?? 60) * delta) / 1000;
      this.layerManager.getLayer().changed();
      this.map.render();
    });
  }

  private stopAnimation(): void {
    this.animator.stop();
    this.elapsedTime = 0;
    this.phase = 0;
  }

  private hasAnimatedFlowLines(): boolean {
    const defaultSpeed = this.config.flowLine.speed ?? 60;
    return this.layerManager
      .getSource()
      .getFeatures()
      .some((feature) => (getFeatureStyleData(feature as Feature)?.flowLine?.speed ?? defaultSpeed) > 0);
  }

  private ensureAnimation(): void {
    if (!this.hasAnimatedFlowLines()) return;
    this.startAnimation();
  }

  private updateAnimationState(): void {
    if (this.hasAnimatedFlowLines()) {
      this.ensureAnimation();
    } else {
      this.stopAnimation();
    }
  }

  private getFlowPhase(feature: Feature): number {
    const speed = getFeatureStyleData(feature)?.flowLine?.speed;
    if (speed === undefined) return this.phase;
    return (speed * this.elapsedTime) / 1000;
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
