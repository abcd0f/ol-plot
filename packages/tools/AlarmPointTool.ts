import Map from 'ol/Map';
import Point from 'ol/geom/Point';
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type { StyleLike } from 'ol/style/Style';
import type { AlarmPointConfig } from '../types/config';
import type { PlotFeatureData, PlotRestoreOptions } from '../types/data';
import { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';
import { BaseTool } from '../core/BaseTool';
import { mergeRuntimeConfig } from '../constants';
import { buildAlarmPointStyle, resolveAlarmPointConfig } from '../style/alarmPoint';

export class AlarmPointTool extends BaseTool {
  private animationFrame: number | null = null;
  private lastFrameTime = 0;

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
    if (!this.activeFeature) return null;
    return (this.activeFeature.getGeometry() as Point).getCoordinates();
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
    if (this.animationFrame !== null) return;

    const tick = (time: number) => {
      const frameInterval =
        1000 / resolveAlarmPointConfig(this.config.alarm, this.config.nodeStyle, this.config.strokeColor).frameRate;

      if (this.lastFrameTime === 0 || time - this.lastFrameTime >= frameInterval) {
        this.lastFrameTime = time;
        this.layerManager.getLayer().changed();
        this.map.render();
      }

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
}
