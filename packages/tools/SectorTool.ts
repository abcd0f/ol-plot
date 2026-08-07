import Map from 'ol/Map';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import type Geometry from 'ol/geom/Geometry';
import type { PlotConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { HandleBasedTool } from '../core/HandleBasedTool';
import {
  buildSector,
  type SectorAngles,
  getSectorAngles,
  getSectorCenter,
  getSectorControlPoints,
  getSectorRadius,
  normalizeSectorControlPoints,
} from '../geometry/sector';

const MOVE_TOLERANCE = 1e-9;
type RadiusSourceIndex = 1 | 2;

export class SectorTool extends HandleBasedTool {
  private draggingHandleIndex: number | null = null;

  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Sector, config);

    this.handleManager.handleModify.on('modifystart', (event) => {
      const feature = event.features.item(0);
      this.draggingHandleIndex = feature?.get('_handleIndex') ?? null;
    });

    this.handleManager.handleModify.on('modifyend', () => {
      if (!this.activeFeature) return;
      this.handleManager.refresh(this.getCoordinates());
      this.draggingHandleIndex = null;
    });
  }

  protected getPlotType(): string {
    return 'sector';
  }

  protected onHandleSync(controlPoints: number[][]): void {
    if (!this.activeFeature) return;

    const points = this.resolveDraggedControlPoints(controlPoints);
    this.activeFeature.set('controlPoints', points);

    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildSector(points));
    geom.set('_controlPoints', points);
    this.handleManager.refreshExcept(points, this.draggingHandleIndex);
  }

  protected extractControlPoints(geom: Geometry): number[][] {
    return getSectorControlPoints(geom as Polygon);
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    const points = normalizeSectorControlPoints(coordinates.slice(0, 3));
    const geom = new Polygon(buildSector(points));
    geom.set('_controlPoints', points);
    return geom;
  }

  protected createFeature(coordinates: number[][]): Feature {
    const feature = super.createFeature(coordinates);
    const points = normalizeSectorControlPoints(coordinates.slice(0, 3));
    feature.set('plotType', 'sector');
    feature.set('controlPoints', points);
    return feature;
  }

  setCoordinates(coordinates: number[][], radiusSourceIndex: RadiusSourceIndex = 1): void {
    if (!this.activeFeature || coordinates.length < 3) return;

    const points = normalizeSectorControlPoints(coordinates.slice(0, 3), radiusSourceIndex);
    this.activeFeature.set('controlPoints', points);

    const geom = this.activeFeature.getGeometry() as Polygon;
    geom.setCoordinates(buildSector(points));
    geom.set('_controlPoints', points);
    this.handleManager.refresh(points);
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.get('controlPoints') as number[][]) || [];
  }

  getPointCount(): number {
    return this.activeFeature ? 3 : 0;
  }

  updatePoint(index: number, coordinate: number[]): void {
    if (index < 0 || index > 2) return;
    const coords = this.getCoordinates();
    if (coords.length < 3) return;
    coords[index] = coordinate;
    this.setCoordinates(coords, index === 2 ? 2 : 1);
  }

  getCenter(): number[] | null {
    return getSectorCenter(this.getCoordinates());
  }

  getRadius(): number {
    return getSectorRadius(this.getCoordinates());
  }

  getAngles(): SectorAngles | null {
    return getSectorAngles(this.getCoordinates());
  }

  private resolveDraggedControlPoints(controlPoints: number[][]): number[][] {
    if (controlPoints.length < 3) return controlPoints;

    const previous = this.getCoordinates();
    if (previous.length < 3) return normalizeSectorControlPoints(controlPoints.slice(0, 3));

    const centerMoved = this.draggingHandleIndex === 0 || moved(previous[0], controlPoints[0]);

    if (centerMoved && this.draggingHandleIndex !== 1 && this.draggingHandleIndex !== 2) {
      const dx = controlPoints[0][0] - previous[0][0];
      const dy = controlPoints[0][1] - previous[0][1];
      return [controlPoints[0], [previous[1][0] + dx, previous[1][1] + dy], [previous[2][0] + dx, previous[2][1] + dy]];
    }

    return normalizeSectorControlPoints(controlPoints.slice(0, 3), this.draggingHandleIndex === 2 ? 2 : 1);
  }
}

function moved(a: number[], b: number[]): boolean {
  return Math.abs(a[0] - b[0]) > MOVE_TOLERANCE || Math.abs(a[1] - b[1]) > MOVE_TOLERANCE;
}
