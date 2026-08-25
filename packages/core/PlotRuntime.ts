import Map from 'ol/Map';
import Feature from 'ol/Feature';
import type { StyleFunction, StyleLike } from 'ol/style/Style';
import type { ResolvedPlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { ToolState } from '../constants/toolState';
import { DrawEvent } from '../constants/events';
import { EventBus } from './EventBus';
import { FeatureStore } from './FeatureStore';
import { DrawManager } from './DrawManager';
import { SelectManager } from './SelectManager';
import { ModifyManager } from './ModifyManager';
import { CursorManager } from './CursorManager';
import { InteractionCoordinator } from './InteractionCoordinator';
import { EditorController } from './EditorController';
import { isEditableTarget } from '../utils/keyboard';
import type { EditorAdapter } from '../types/runtime';
import type BaseLayer from 'ol/layer/Base';
import type { InteractionToggle } from './InteractionCoordinator';

interface HandleModifyInteraction extends InteractionToggle {
  on(type: 'modifyend', listener: () => void): unknown;
}

export interface HandleEditorRuntimeOptions {
  interaction: HandleModifyInteraction;
  layer: BaseLayer;
  getControlPoints(feature: Feature): number[][];
  updateControlPoints(feature: Feature, points: number[][]): void;
  getEditMode?(feature: Feature): 'feature' | 'handles';
  prepareFeature?(feature: Feature): void;
  show(points: number[][], feature: Feature): void;
  hide(): void;
  destroy(): void;
}

export interface PlotRuntimeOptions {
  map: Map;
  drawType?: DrawType | null;
  config: ResolvedPlotConfig;
  featureStyle: StyleLike;
  drawStyle?: StyleFunction;
  prepareDrawnFeature?: (feature: Feature, drawType: DrawType) => void;
  onActiveFeatureChange?: (feature: Feature | null) => void;
  onStateChange?: (state: ToolState) => void;
}

/**
 * Shared lifecycle for a single plotting tool.
 * Geometry and style policies remain in the tool adapter.
 */
export class PlotRuntime {
  readonly map: Map;
  readonly config: ResolvedPlotConfig;
  readonly eventBus: EventBus;
  readonly layerManager: FeatureStore;
  drawManager: DrawManager | null = null;
  readonly selectManager: SelectManager;
  readonly modifyManager: ModifyManager;
  readonly cursorManager: CursorManager;
  readonly interactionCoordinator: InteractionCoordinator;
  readonly editorController: EditorController;

  private activeFeature: Feature | null = null;
  private state: ToolState = ToolState.Idle;
  private revision = 0;
  private readonly handleKeyDown: (event: KeyboardEvent) => void;
  private readonly onActiveFeatureChange?: PlotRuntimeOptions['onActiveFeatureChange'];
  private readonly onStateChange?: PlotRuntimeOptions['onStateChange'];
  private readonly prepareDrawnFeature?: PlotRuntimeOptions['prepareDrawnFeature'];
  private handleEditor: HandleEditorRuntimeOptions | null = null;
  private activeDrawType: DrawType | null = null;

  constructor(options: PlotRuntimeOptions) {
    this.map = options.map;
    this.config = options.config;
    this.onActiveFeatureChange = options.onActiveFeatureChange;
    this.onStateChange = options.onStateChange;
    this.prepareDrawnFeature = options.prepareDrawnFeature;
    this.eventBus = new EventBus();
    this.layerManager = new FeatureStore(this.map, options.featureStyle);
    this.selectManager = new SelectManager(
      this.map,
      this.layerManager.getLayer(),
      this.config,
      this.eventBus,
      this.layerManager.getSelectedFeatures(),
    );
    this.modifyManager = new ModifyManager(
      this.map,
      this.selectManager.getSelectedFeatures(),
      this.config,
      this.eventBus,
    );
    this.cursorManager = new CursorManager(
      this.map,
      () => [this.modifyManager.getOverlayLayer()],
      8,
      () => [this.layerManager.getLayer()],
      this.config.hint,
    );
    this.interactionCoordinator = new InteractionCoordinator({
      select: this.selectManager,
      modify: this.modifyManager,
      cursor: this.cursorManager,
      modifyOverlayLayer: this.modifyManager.getOverlayLayer(),
    });
    this.editorController = new EditorController(
      { getEditMode: () => 'feature' },
      { onModeChange: (mode) => this.interactionCoordinator.setEditMode(mode) },
    );
    if (options.drawType && options.drawStyle) this.setDrawTool(options.drawType, options.drawStyle);

    this.bindEvents();
    this.handleKeyDown = (event) => {
      if (isEditableTarget(event.target)) return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && this.activeFeature) {
        this.deleteActiveFeature();
      }
    };
    document.addEventListener('keydown', this.handleKeyDown);
    this.setState(this.activeDrawType ? ToolState.Drawing : ToolState.Idle);
  }

  getActiveFeature(): Feature | null {
    return this.activeFeature;
  }

  setActiveFeature(feature: Feature | null): void {
    this.activeFeature = feature;
    this.onActiveFeatureChange?.(feature);
  }

  getState(): ToolState {
    return this.state;
  }

  getActiveDrawType(): DrawType | null {
    return this.activeDrawType;
  }

  setDrawTool(drawType: DrawType | null, drawStyle?: StyleFunction): void {
    this.bumpRevision();
    this.drawManager?.abortDrawing();
    this.drawManager?.destroy();
    this.drawManager = null;
    this.interactionCoordinator.setDraw(null);
    this.interactionCoordinator.setDrawing(false);
    this.selectManager.clearSelection();
    this.activeDrawType = drawType;

    if (drawType) {
      if (!drawStyle) throw new Error('Draw style is required when activating a draw tool');
      this.drawManager = new DrawManager(
        this.map,
        this.layerManager.getLayer(),
        this.eventBus,
        drawType,
        drawStyle,
        () => this.selectManager.isEmpty(),
        this.config,
      );
      this.interactionCoordinator.setDraw(this.drawManager);
      this.interactionCoordinator.setDrawing(true);
    }

    this.setState(drawType ? ToolState.Drawing : ToolState.Idle);
  }

  configureEditor(adapter: EditorAdapter): void {
    this.editorController.setAdapter(adapter);
  }

  configureHandleEditor(options: HandleEditorRuntimeOptions): void {
    this.handleEditor = options;
    this.interactionCoordinator.configureHandleInteraction(options.interaction, options.layer);
    this.configureEditor({
      getEditMode: (feature) => options.getEditMode?.(feature) ?? 'handles',
      getControlPoints: options.getControlPoints,
      updateControlPoints: options.updateControlPoints,
    });

    options.interaction.on('modifyend', () => {
      this.eventBus.emit(DrawEvent.MODIFY_END, {
        features: this.activeFeature ? [this.activeFeature] : [],
      });
    });
    if (options.prepareFeature) {
      this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => options.prepareFeature!(feature));
    }
    this.eventBus.on(DrawEvent.SELECT, ({ feature }: { feature: Feature }) => {
      if ((options.getEditMode?.(feature) ?? 'handles') === 'handles') {
        options.show(options.getControlPoints(feature), feature);
      } else {
        options.hide();
      }
    });
    this.eventBus.on(DrawEvent.DESELECT, () => options.hide());
  }

  bumpRevision(): void {
    this.revision += 1;
  }

  setState(state: ToolState): void {
    this.state = state;
    this.onStateChange?.(state);
  }

  deleteActiveFeature(): void {
    const feature = this.activeFeature;
    if (!feature) return;

    this.bumpRevision();
    this.selectManager.clearSelection();
    this.editorController.clear();
    this.layerManager.removeFeature(feature);
    this.setActiveFeature(null);
    this.eventBus.emit(DrawEvent.DELETE, { feature });
  }

  clearFeatures(): void {
    this.bumpRevision();
    this.drawManager?.abortDrawing();
    this.selectManager.clearSelection();
    this.setActiveFeature(null);
    this.editorController.clear();
    this.layerManager.clear();
    this.setState(this.activeDrawType ? ToolState.Drawing : ToolState.Idle);
  }

  destroy(): void {
    this.bumpRevision();
    document.removeEventListener('keydown', this.handleKeyDown);
    this.editorController.clear();
    this.handleEditor?.destroy();
    this.handleEditor = null;
    this.cursorManager.destroy();
    this.drawManager?.destroy();
    this.drawManager = null;
    this.selectManager.destroy();
    this.modifyManager.destroy();
    this.layerManager.destroy();
    this.eventBus.clear();
    this.setActiveFeature(null);
    this.activeDrawType = null;
    this.setState(ToolState.Idle);
  }

  private bindEvents(): void {
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature, drawType }: { feature: Feature; drawType: DrawType }) => {
      const revision = this.revision;
      this.prepareDrawnFeature?.(feature, drawType);
      setTimeout(() => {
        if (revision !== this.revision || !this.layerManager.hasFeature(feature)) return;
        this.setActiveFeature(feature);
        this.selectManager.selectFeature(feature);
      }, 0);
    });

    this.eventBus.on(DrawEvent.SELECT, ({ feature }: { feature: Feature }) => {
      this.setActiveFeature(feature);
      this.setState(ToolState.Editing);
      this.editorController.select(feature);
    });

    this.eventBus.on(DrawEvent.DESELECT, () => {
      this.setActiveFeature(null);
      this.setState(this.activeDrawType ? ToolState.Drawing : ToolState.Idle);
      this.editorController.clear();
    });

    this.eventBus.on(DrawEvent.MODIFY_START, () => this.interactionCoordinator.setDragging(true));
    this.eventBus.on(DrawEvent.MODIFY_END, () => this.interactionCoordinator.setDragging(false));
  }
}
