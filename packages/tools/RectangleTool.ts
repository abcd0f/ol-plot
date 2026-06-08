import Map from 'ol/Map';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import type Feature from 'ol/Feature';
import { unByKey } from 'ol/Observable';
import type { EventsKey } from 'ol/events';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';
import { BaseTool } from '../core/BaseTool';

// Ring order produced by OL's createBox: [BL, TL, TR, BR, BL]
// BL[0]↔TL[1] share X (left edge),  TR[2]↔BR[3] share X (right edge)
// BL[0]↔BR[3] share Y (bottom edge), TL[1]↔TR[2] share Y (top edge)
const SHARE_X = [1, 0, 3, 2];
const SHARE_Y = [3, 2, 1, 0];

function bboxRect(pts: number[][]): number[][] {
  const xs = pts.map(c => c[0]);
  const ys = pts.map(c => c[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return [[minX, minY], [minX, maxY], [maxX, maxY], [maxX, minY]];
}

export class RectangleTool extends BaseTool {
  private geomChangeKey: EventsKey | null = null;
  private constraining = false;
  private prevCorners: number[][] | null = null;
  // OL's Modify interaction only updates the dragged vertex on each event;
  // all other vertices are reset to their pre-drag values from OL's internal cache.
  // dragStartCorners captures the rectangle at modifystart so we always compare
  // against the same baseline and correctly identify the dragged corner.
  private dragStartCorners: number[][] | null = null;

  constructor(map: Map, config?: PlotConfig) {
    super(map, config);
    this.drawType = DrawType.Rectangle;
    this.bindRectEvents();
  }

  private bindRectEvents(): void {
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      this.attachConstraint(feature);
    });
    this.eventBus.on(DrawEvent.SELECT, ({ feature }: { feature: Feature }) => {
      this.attachConstraint(feature);
    });
    this.eventBus.on(DrawEvent.DESELECT, () => {
      this.detachConstraint();
    });
    this.eventBus.on(DrawEvent.MODIFY_START, () => {
      if (this.prevCorners) {
        this.dragStartCorners = this.prevCorners.map(c => [c[0], c[1]]);
      }
    });
    this.eventBus.on(DrawEvent.MODIFY_END, () => {
      this.dragStartCorners = null;
    });
  }

  private attachConstraint(feature: Feature): void {
    this.detachConstraint();
    const geom = feature.getGeometry() as Polygon;
    this.prevCorners = (geom.getCoordinates()[0] ?? []).slice(0, 4);

    this.geomChangeKey = geom.on('change', () => {
      if (this.constraining || !this.prevCorners) return;

      const ring = geom.getCoordinates()[0] ?? [];
      this.constraining = true;

      // A midpoint handle was dragged → extra vertex inserted; snap to bbox
      if (ring.length !== 5) {
        const normalized = bboxRect(ring.slice(0, ring.length - 1));
        geom.setCoordinates([[...normalized, normalized[0]]]);
        this.prevCorners = normalized;
        this.constraining = false;
        return;
      }

      const corners = ring.slice(0, 4);

      // Find which corner moved. Use dragStartCorners as baseline: OL resets
      // non-dragged vertices to their pre-drag values on every event, so comparing
      // against dragStartCorners (not prevCorners) correctly identifies the dragged
      // corner even when its movement is smaller than the apparent "jump" on others.
      const ref = this.dragStartCorners ?? this.prevCorners;
      let movedIdx = -1;
      let maxDist = 1e-6;
      for (let i = 0; i < 4; i++) {
        const p = ref[i];
        const d = Math.abs(p[0] - corners[i][0]) + Math.abs(p[1] - corners[i][1]);
        if (d > maxDist) { maxDist = d; movedIdx = i; }
      }

      if (movedIdx === -1) {
        this.constraining = false;
        return;
      }

      // Propagate the moved corner to its two rectangle-adjacent neighbours
      const next = this.prevCorners.map(c => [c[0], c[1]]);
      const moved = corners[movedIdx];
      next[movedIdx] = [moved[0], moved[1]];
      next[SHARE_X[movedIdx]] = [moved[0], next[SHARE_X[movedIdx]][1]];
      next[SHARE_Y[movedIdx]] = [next[SHARE_Y[movedIdx]][0], moved[1]];

      geom.setCoordinates([[...next, next[0]]]);
      this.prevCorners = next;
      this.constraining = false;
    });
  }

  private detachConstraint(): void {
    if (this.geomChangeKey) {
      unByKey(this.geomChangeKey);
      this.geomChangeKey = null;
    }
    this.prevCorners = null;
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    const corners = bboxRect(coordinates.slice(0, 4));
    return new Polygon([[...corners, corners[0]]]);
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 4) return;
    const corners = bboxRect(coordinates.slice(0, 4));
    (this.activeFeature.getGeometry() as Polygon).setCoordinates([[...corners, corners[0]]]);
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    const ring = (this.activeFeature.getGeometry() as Polygon).getCoordinates()[0] ?? [];
    return ring.slice(0, 4);
  }

  getPointCount(): number {
    return this.getCoordinates().length;
  }

  updatePoint(index: number, coordinate: number[]): void {
    const corners = this.getCoordinates();
    if (index < 0 || index >= corners.length) return;
    corners[index] = coordinate;
    this.setCoordinates(corners);
  }
}
