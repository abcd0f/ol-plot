import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Modify from 'ol/interaction/Modify';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import type { EventBus } from '../core/EventBus';
import type { PlotConfig } from '../types/config';
import { DrawEvent } from '../constants/events';
import { buildModifyStyle } from '../style/modify';

/**
 * 自定义编辑手柄同步回调。
 *
 * 当用户拖拽控制点后，HandleManager 会调用此回调，
 * 传入拖拽后的控制点坐标数组，由调用方负责重建几何。
 */
export type SyncCallback = (controlPoints: number[][]) => void;

/**
 * 自定义编辑手柄管理器。
 *
 * 为需要自定义控制点的 Tool 提供统一的 handle 图层管理：
 * - 创建独立的 VectorLayer 用于渲染手柄
 * - 创建独立的 Modify interaction 用于拖拽编辑
 * - 提供 show/hide/refresh 等通用操作
 * - 通过回调模式将几何重建逻辑交给调用方
 *
 * ## 使用示例
 *
 * ```ts
 * this.handleManager = new HandleManager(map, eventBus, config, (cps) => {
 *   this.activeFeature.set('controlPoints', cps);
 *   (this.activeFeature.getGeometry() as Polygon).setCoordinates(buildShape(cps));
 * });
 * ```
 */
export class HandleManager {
  /** 手柄要素所在的矢量数据源 */
  handleSource: VectorSource;
  /** 手柄要素所在的矢量图层 */
  handleLayer: VectorLayer;
  /** 绑定到手柄图层的 Modify interaction */
  handleModify: Modify;

  private map: Map;
  private eventBus: EventBus;
  private onSync: SyncCallback;
  private syncing = false;

  /**
   * @param map        地图实例
   * @param eventBus   事件总线
   * @param config     合并后的完整配置
   * @param onSync     拖拽同步回调 — 接收排序后的控制点坐标，由调用方重建几何
   */
  constructor(map: Map, eventBus: EventBus, config: Required<PlotConfig>, onSync: SyncCallback) {
    this.map = map;
    this.eventBus = eventBus;
    this.onSync = onSync;

    const ns = config.nodeStyle;

    // 创建独立的 handle 图层
    this.handleSource = new VectorSource();
    this.handleLayer = new VectorLayer({
      source: this.handleSource,
      style: new Style({
        image: new CircleStyle({
          radius: ns.radius ?? 6,
          fill: new Fill({ color: ns.fill ?? '#ffffff' }),
          stroke: new Stroke({
            color: ns.stroke ?? config.strokeColor,
            width: ns.strokeWidth ?? 2,
          }),
        }),
      }),
    });
    map.addLayer(this.handleLayer);

    // 创建独立的 Modify interaction，绑定到 handle 图层
    this.handleModify = new Modify({
      source: this.handleSource,
      style: buildModifyStyle(config),
    });
    this.handleModify.on('modifystart', () => {
      this.eventBus.emit(DrawEvent.MODIFY_START);
    });
    this.handleModify.on('modifyend', () => {
      // 由各 Tool 自行覆盖 modifyend 以携带正确的 activeFeature
    });
    map.addInteraction(this.handleModify);
  }

  // ─── Handle CRUD ──────────────────────────────────────────────────────────

  /**
   * 显示编辑手柄。
   *
   * @param controlPoints 控制点坐标数组，为 undefined 或空数组时隐藏手柄
   */
  show(controlPoints: number[][] | undefined): void {
    this.hide();
    if (!controlPoints || controlPoints.length === 0) return;

    controlPoints.forEach((pt, i) => {
      const handle = new Feature(new Point(pt));
      handle.set('_handleIndex', i);
      handle.getGeometry()!.on('change', () => this.sync());
      this.handleSource.addFeature(handle);
    });
  }

  /** 隐藏所有手柄 */
  hide(): void {
    this.handleSource.clear();
  }

  /**
   * 获取按 `_handleIndex` 排序后的控制点坐标。
   *
   * @returns 当前手柄位置的坐标数组
   */
  getControlPoints(): number[][] {
    return this.handleSource
      .getFeatures()
      .sort((a, b) => a.get('_handleIndex') - b.get('_handleIndex'))
      .map((h) => (h.getGeometry() as Point).getCoordinates());
  }

  /**
   * 刷新已有手柄的位置（不重新创建）。
   *
   * 如果手柄数量与控制点数量不一致（例如控制点数量变化），
   * 则回退到 `show()` 重新创建。
   *
   * @param controlPoints 新的控制点坐标
   */
  refresh(controlPoints: number[][] | undefined): void {
    if (!controlPoints) return;

    const handles = this.handleSource
      .getFeatures()
      .sort((a, b) => a.get('_handleIndex') - b.get('_handleIndex'));

    if (handles.length !== controlPoints.length) {
      this.show(controlPoints);
      return;
    }

    this.syncing = true;
    handles.forEach((h, i) => {
      (h.getGeometry() as Point).setCoordinates(controlPoints[i]);
    });
    this.syncing = false;
  }

  // ─── Sync ─────────────────────────────────────────────────────────────────

  /** 更新同步回调（如 activeFeature 切换时需要） */
  setOnSync(onSync: SyncCallback): void {
    this.onSync = onSync;
  }

  private sync(): void {
    if (this.syncing) return;
    this.syncing = true;

    const controlPoints = this.getControlPoints();
    this.onSync(controlPoints);

    this.syncing = false;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  /** 销毁手柄图层和 Modify interaction */
  destroy(): void {
    this.hide();
    this.map.removeInteraction(this.handleModify);
    this.map.removeLayer(this.handleLayer);
  }
}
