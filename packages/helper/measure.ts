import OLMap from 'ol/Map';
import Overlay from 'ol/Overlay';
import LineString from 'ol/geom/LineString';
import { getLength } from 'ol/sphere';
import { unByKey } from 'ol/Observable';
import type Feature from 'ol/Feature';
import type { EventsKey } from 'ol/events';
import type { EventBus } from '../core/EventBus';
import type { PlotConfig, MeasureMode, MeasureUnit } from '../types/config';
import { DrawEvent } from '../constants/events';
import { mid } from '../utils/math';

/** 单条标签的位置与文本 */
interface Label {
  position: number[];
  text: string;
}

/**
 * 测距标签管理器。
 *
 * 监听绘制生命周期事件，用 `ol/Overlay`（DOM 标签）实时渲染折线的距离信息：
 * - `total`：在折线末端显示球面测地总距离
 * - `segment`：在每一段的中点显示该段距离
 * - `both`：两者同时显示
 *
 * 距离基于 `ol/sphere` 的 `getLength`，按地图投影换算为真实距离；单位由 `unit` 控制。
 * 采用 Overlay 而非矢量文字，标签独立于矢量渲染，在绘制中、绘制完成、编辑状态下都保持可见，
 * 且无需改动其它工具共用的样式逻辑。
 */
export class MeasureManager {
  private map: OLMap;
  private mode: MeasureMode;
  private unit: MeasureUnit;

  /** 每个已完成要素对应的标签组 */
  private groups = new Map<Feature, Overlay[]>();
  /** 每个要素几何变化的监听句柄（编辑时更新标签） */
  private changeKeys = new Map<Feature, EventsKey>();
  /** 绘制过程中的临时标签组 */
  private sketchGroup: Overlay[] = [];
  /** 绘制过程中对草图几何变化的监听句柄 */
  private sketchKey: EventsKey | null = null;

  /**
   * @param map      地图实例
   * @param eventBus 事件总线
   * @param config   合并后的完整配置
   */
  constructor(map: OLMap, eventBus: EventBus, config: Required<PlotConfig>) {
    this.map = map;
    this.mode = config.measure.mode!;
    this.unit = config.measure.unit!;

    eventBus.on(DrawEvent.DRAW_START, ({ feature }: { feature: Feature }) => {
      const geom = feature.getGeometry() as LineString;
      this.sketchKey = geom.on('change', () => this.render(this.sketchGroup, geom));
      this.render(this.sketchGroup, geom);
    });

    eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      this.stopSketch();
      this.attach(feature);
    });

    eventBus.on(DrawEvent.DRAW_ABORT, () => this.stopSketch());

    eventBus.on(DrawEvent.DELETE, ({ feature }: { feature: Feature }) => {
      this.remove(feature);
    });
  }

  // ─── 生命周期 ──────────────────────────────────────────────────────────────

  /** 为已完成要素建立标签组，并监听其几何变化以在编辑时更新。 */
  private attach(feature: Feature): void {
    const geom = feature.getGeometry() as LineString;
    const group: Overlay[] = [];
    this.groups.set(feature, group);
    this.changeKeys.set(
      feature,
      geom.on('change', () => this.render(group, geom)),
    );
    this.render(group, geom);
  }

  /** 移除指定要素的标签组及其监听。 */
  private remove(feature: Feature): void {
    const group = this.groups.get(feature);
    if (group) {
      group.forEach((o) => this.map.removeOverlay(o));
      this.groups.delete(feature);
    }
    const key = this.changeKeys.get(feature);
    if (key) {
      unByKey(key);
      this.changeKeys.delete(feature);
    }
  }

  /** 结束草图跟踪并清除临时标签。 */
  private stopSketch(): void {
    if (this.sketchKey) {
      unByKey(this.sketchKey);
      this.sketchKey = null;
    }
    this.sketchGroup.forEach((o) => this.map.removeOverlay(o));
    this.sketchGroup.length = 0;
  }

  /** 移除所有标签（供工具 clearFeatures 调用）。 */
  clear(): void {
    this.stopSketch();
    for (const feature of [...this.groups.keys()]) {
      this.remove(feature);
    }
  }

  /** 销毁：移除全部标签与监听。 */
  destroy(): void {
    this.clear();
  }

  // ─── 渲染 ──────────────────────────────────────────────────────────────────

  /**
   * 根据几何计算标签，并复用/增减标签组内的 Overlay，使其数量与内容对齐。
   */
  private render(group: Overlay[], geom: LineString): void {
    const labels = this.computeLabels(geom);

    while (group.length < labels.length) {
      const overlay = this.createOverlay();
      this.map.addOverlay(overlay);
      group.push(overlay);
    }
    while (group.length > labels.length) {
      this.map.removeOverlay(group.pop()!);
    }

    labels.forEach((label, i) => {
      group[i].getElement()!.innerText = label.text;
      group[i].setPosition(label.position);
    });
  }

  /** 依据当前 mode 计算需要显示的标签列表。 */
  private computeLabels(geom: LineString): Label[] {
    const coords = geom.getCoordinates();
    if (coords.length < 2) return [];

    const projection = this.map.getView().getProjection();
    const labels: Label[] = [];

    if (this.mode === 'segment' || this.mode === 'both') {
      for (let i = 1; i < coords.length; i++) {
        const length = getLength(new LineString([coords[i - 1], coords[i]]), { projection });
        labels.push({ position: mid(coords[i - 1], coords[i]), text: this.format(length) });
      }
    }

    if (this.mode === 'total' || this.mode === 'both') {
      const total = getLength(geom, { projection });
      const prefix = this.mode === 'both' ? '总长 ' : '';
      labels.push({ position: coords[coords.length - 1], text: prefix + this.format(total) });
    }

    return labels;
  }

  /** 按 unit 配置格式化距离（输入为米）。 */
  private format(length: number): string {
    if (this.unit === 'meter') return `${length.toFixed(2)} m`;
    if (this.unit === 'kilometer') return `${(length / 1000).toFixed(2)} km`;
    return length > 1000 ? `${(length / 1000).toFixed(2)} km` : `${length.toFixed(2)} m`;
  }

  /** 创建一个带默认样式的标签 Overlay。 */
  private createOverlay(): Overlay {
    const element = document.createElement('div');
    element.style.cssText =
      'padding:2px 6px;background:rgba(0,0,0,0.65);color:#fff;font-size:12px;' +
      'line-height:1.4;border-radius:3px;white-space:nowrap;pointer-events:none;';
    return new Overlay({ element, offset: [0, -12], positioning: 'bottom-center', stopEvent: false });
  }
}
