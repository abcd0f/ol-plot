import Map from 'ol/Map';
import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type { InternalPlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';
import { mergeRuntimeConfig } from '../constants';
import { getFeatureStyleData } from '../utils/data';
import { BaseTool } from './BaseTool';
import { HandleManager } from '../helper/handle';

export abstract class HandleBasedTool extends BaseTool {
  protected handleManager: HandleManager;

  constructor(map: Map, drawType: DrawType, config?: InternalPlotConfig) {
    super(map, drawType, config);

    this.modifyManager.setActive(false);
    this.handleManager = new HandleManager(map, this.eventBus, this.config, (controlPoints: number[][]) =>
      this.onHandleSync(controlPoints),
    );
    this.cursorManager.setEditableLayers(() => [this.handleManager.handleLayer]);

    this.handleManager.handleModify.on('modifyend', () => {
      this.eventBus.emit(DrawEvent.MODIFY_END, {
        features: this.activeFeature ? [this.activeFeature] : [],
      });
    });

    this.bindHandleEvents();
  }

  protected abstract getPlotType(): string;

  protected abstract onHandleSync(controlPoints: number[][]): void;

  protected extractControlPoints(geom: Geometry): number[][] {
    return (geom.get('_controlPoints') as number[][] | undefined) || [];
  }

  protected normalizeControlPoints(controlPoints: number[][]): number[][] {
    return controlPoints;
  }

  protected refreshStyles(): void {
    super.refreshStyles();
    this.handleManager?.setStyleConfig(this.config);
  }

  protected refreshActiveFeatureStyle(): void {
    super.refreshActiveFeatureStyle();
    if (!this.activeFeature) return;

    const styleData = getFeatureStyleData(this.activeFeature);
    if (styleData) this.handleManager?.setStyleConfig(mergeRuntimeConfig(this.config, styleData));
  }

  destroy(): void {
    this.handleManager.destroy();
    super.destroy();
  }

  private bindHandleEvents(): void {
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      const geom = feature.getGeometry()!;
      const rawPoints = this.extractControlPoints(geom);
      const controlPoints = this.normalizeControlPoints(rawPoints);

      feature.set('plotType', this.getPlotType());
      feature.set('controlPoints', controlPoints);
    });

    this.eventBus.on(DrawEvent.SELECT, ({ feature }: { feature: Feature }) => {
      const controlPoints = feature.get('controlPoints') as number[][] | undefined;
      this.handleManager.show(controlPoints);
    });

    this.eventBus.on(DrawEvent.DESELECT, () => {
      this.handleManager.hide();
    });
  }
}
