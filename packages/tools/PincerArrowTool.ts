import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Modify from 'ol/interaction/Modify';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';
import { BaseTool } from '../core/BaseTool';
import { buildPincerArrow } from '../geometry/arrow/pincer';

/**
 * 钳击箭头绘制工具类
 *
 * 钳击箭头由3-5个控制点确定,两个箭头向内收拢形成钳击形状
 *
 * 使用 handle 编辑模式:
 * 禁用默认 ModifyManager,创建独立的 handle 图层,
 * 只暴露控制点供拖拽编辑,拖拽时重新生成箭头 Polygon
 */
export class PincerArrowTool extends BaseTool {
  private handleSource: VectorSource;
  private handleLayer: VectorLayer;
  private handleModify: Modify;
  private syncing = false;

  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.PincerArrow, config);

    // 禁用默认 ModifyManager
    this.modifyManager.setActive(false);

    const ns = this.config.nodeStyle;

    // 创建独立的 handle 图层
    this.handleSource = new VectorSource();
    this.handleLayer = new VectorLayer({
      source: this.handleSource,
      style: new Style({
        image: new CircleStyle({
          radius: ns.radius ?? 6,
          fill: new Fill({ color: ns.fill ?? '#ffffff' }),
          stroke: new Stroke({
            color: ns.stroke ?? this.config.strokeColor,
            width: ns.strokeWidth ?? 2,
          }),
        }),
      }),
    });
    map.addLayer(this.handleLayer);

    // 创建独立的 Modify interaction
    this.handleModify = new Modify({
      source: this.handleSource,
      style: () => [], // 不显示修改时的额外样式，只使用 handleLayer 的样式
    });
    this.handleModify.on('modifystart', () => {
      this.eventBus.emit(DrawEvent.MODIFY_START);
    });
    this.handleModify.on('modifyend', () => {
      this.eventBus.emit(DrawEvent.MODIFY_END, { features: this.activeFeature ? [this.activeFeature] : [] });
    });
    map.addInteraction(this.handleModify);

    this.bindArrowEvents();
  }

  private bindArrowEvents(): void {
    // 绘制完成后,从 Polygon 属性中读取控制点
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      const geom = feature.getGeometry() as Polygon;
      const controlPoints = geom.get('_controlPoints') as number[][] | undefined;
      feature.set('plotType', 'pincerArrow');
      feature.set('controlPoints', controlPoints || []);
    });

    this.eventBus.on(DrawEvent.SELECT, ({ feature }: { feature: Feature }) => {
      this.showHandles(feature);
    });

    this.eventBus.on(DrawEvent.DESELECT, () => {
      this.hideHandles();
    });
  }

  private showHandles(feature: Feature): void {
    this.hideHandles();
    const controlPoints = feature.get('controlPoints') as number[][] | undefined;
    if (!controlPoints || controlPoints.length < 3) return;

    // 只显示前4个控制点
    const visiblePoints = controlPoints.slice(0, 4);
    visiblePoints.forEach((pt, i) => {
      const handle = new Feature(new Point(pt));
      handle.set('_handleIndex', i);
      handle.getGeometry()!.on('change', () => this.syncFromHandles());
      this.handleSource.addFeature(handle);
    });
  }

  private hideHandles(): void {
    this.handleSource.clear();
  }

  private syncFromHandles(): void {
    if (this.syncing || !this.activeFeature) return;
    this.syncing = true;

    const handles = this.handleSource.getFeatures();
    const controlPoints = handles
      .sort((a, b) => a.get('_handleIndex') - b.get('_handleIndex'))
      .map((h) => (h.getGeometry() as Point).getCoordinates());

    this.activeFeature.set('controlPoints', controlPoints);
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildPincerArrow(controlPoints));

    this.syncing = false;
  }

  // ─── Abstract implementations ─────────────────────────────────────────────

  protected createGeometry(coordinates: number[][]): Geometry {
    return new Polygon(buildPincerArrow(coordinates));
  }

  addFeature(coordinates: number[][]): Feature {
    const feature = super.addFeature(coordinates);
    feature.set('plotType', 'pincerArrow');
    feature.set('controlPoints', coordinates);
    return feature;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 3) return;
    this.activeFeature.set('controlPoints', coordinates);
    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildPincerArrow(coordinates));
    this.refreshHandles();
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.get('controlPoints') as number[][]) || [];
  }

  getPointCount(): number {
    const coords = this.getCoordinates();
    return coords.length;
  }

  updatePoint(index: number, coordinate: number[]): void {
    const coords = this.getCoordinates();
    if (index < 0 || index >= coords.length) return;
    coords[index] = coordinate;
    this.setCoordinates(coords);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private refreshHandles(): void {
    if (!this.activeFeature) return;
    const controlPoints = this.activeFeature.get('controlPoints') as number[][] | undefined;
    if (!controlPoints) return;

    const handles = this.handleSource.getFeatures().sort((a, b) => a.get('_handleIndex') - b.get('_handleIndex'));
    if (handles.length !== controlPoints.length) {
      this.showHandles(this.activeFeature);
      return;
    }

    this.syncing = true;
    handles.forEach((h, i) => {
      (h.getGeometry() as Point).setCoordinates(controlPoints[i]);
    });
    this.syncing = false;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  destroy(): void {
    this.hideHandles();
    this.map.removeInteraction(this.handleModify);
    this.map.removeLayer(this.handleLayer);
    super.destroy();
  }
}
