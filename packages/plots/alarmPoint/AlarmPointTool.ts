import Map from 'ol/Map';
import Point from 'ol/geom/Point';
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type { StyleLike } from 'ol/style/Style';
import type { AlarmPointConfig } from '../../kernel/types/config';
import type { PlotFeatureData, PlotRestoreOptions } from '../../kernel/types/data';
import { DrawType } from '../../kernel/constants/drawType';
import { DrawEvent } from '../../kernel/constants/events';
import { BaseTool } from '../../engine/tool/BaseTool';
import { mergeRuntimeConfig } from '../../kernel/constants';
import { buildAlarmPointStyle, resolveAlarmPointConfig } from './style';
import { PlotAnimator } from '../../shared-runtime-helpers/animator';

export class AlarmPointTool extends BaseTool {
  private readonly animator = new PlotAnimator();
  private frameElapsed = 0;

  constructor(map: Map, config?: AlarmPointConfig) {
    super(map, DrawType.AlarmPoint, config);
    this.refreshStyles();
    this.bindAnimationEvents();
  }

  protected createFeatureStyle(): StyleLike {
    return buildAlarmPointStyle(this.config.alarm, this.config.nodeStyle, this.config.strokeColor);
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
    return this.getCoordinates()[0] ?? null;
  }

  updateAlarmConfig(alarmConfig: AlarmPointConfig['alarm']): void {
    if (!alarmConfig) return;

    this.config = mergeRuntimeConfig(this.config, { alarm: alarmConfig });
    this.refreshStyles();
    this.updateAnimationState();
  }

  setStyleConfig(config?: AlarmPointConfig): this {
    const result = super.setStyleConfig(config);
    if (config?.alarm) this.updateAnimationState();
    return result;
  }

  restorePlotData(data: PlotFeatureData | PlotFeatureData[], options: PlotRestoreOptions = {}): Feature[] {
    const features = super.restorePlotData(data, options);
    this.updateAnimationState();
    return features;
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

  private bindAnimationEvents(): void {
    this.eventBus.on(DrawEvent.DRAW_END, () => this.ensureAnimation());
    this.eventBus.on(DrawEvent.DELETE, () => this.updateAnimationState());
  }

  private updateAnimationState(): void {
    if (this.getFeatures().length > 0) this.ensureAnimation();
    else this.stopAnimation();
  }

  private ensureAnimation(): void {
    this.animator.start(() => this.getFeatures().length > 0, (delta) => {
      const frameInterval =
        1000 / resolveAlarmPointConfig(this.config.alarm, this.config.nodeStyle, this.config.strokeColor).frameRate;
      this.frameElapsed += delta;
      if (delta === 0 || this.frameElapsed >= frameInterval) {
        this.frameElapsed = 0;
        this.layerManager.getLayer().changed();
        this.map.render();
      }
    });
  }

  private stopAnimation(): void {
    this.animator.stop();
    this.frameElapsed = 0;
  }
}
