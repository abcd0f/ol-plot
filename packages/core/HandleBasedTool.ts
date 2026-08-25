import Map from 'ol/Map';
import type Geometry from 'ol/geom/Geometry';
import type { InternalPlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { mergeRuntimeConfig } from '../constants';
import { getFeatureStyleData } from '../utils/data';
import { BaseTool } from './BaseTool';
import { HandleManager } from '../helper/handle';

export abstract class HandleBasedTool extends BaseTool {
  protected handleManager: HandleManager;

  constructor(map: Map, drawType: DrawType, config?: InternalPlotConfig) {
    super(map, drawType, config);

    this.handleManager = new HandleManager(map, this.eventBus, this.config, (controlPoints: number[][]) =>
      this.runtime.editorController.updateControlPoints(controlPoints),
    );
    this.runtime.configureHandleEditor({
      interaction: this.handleManager.handleModify,
      layer: this.handleManager.handleLayer,
      getControlPoints: (feature) => (feature.get('controlPoints') as number[][] | undefined) ?? [],
      updateControlPoints: (_feature, controlPoints) => this.onHandleSync(controlPoints),
      prepareFeature: (feature) => {
        const geom = feature.getGeometry()!;
        const controlPoints = this.normalizeControlPoints(this.extractControlPoints(geom));
        feature.set('plotType', this.getPlotType());
        feature.set('controlPoints', controlPoints);
      },
      show: (controlPoints) => this.handleManager.show(controlPoints),
      hide: () => this.handleManager.hide(),
      destroy: () => this.handleManager.destroy(),
    });
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

}
