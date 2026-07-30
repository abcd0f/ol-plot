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

export class SectorTool extends HandleBasedTool {
  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.Sector, config);

    this.handleManager.handleModify.on('modifyend', () => {
      if (!this.activeFeature) return;
      this.handleManager.refresh(this.getCoordinates());
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

  addFeature(coordinates: number[][]): Feature {
    const feature = super.addFeature(coordinates);
    const points = normalizeSectorControlPoints(coordinates.slice(0, 3));
    feature.set('plotType', 'sector');
    feature.set('controlPoints', points);
    return feature;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 3) return;

    const points = normalizeSectorControlPoints(coordinates.slice(0, 3));
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
    this.setCoordinates(coords);
  }

  addSector(center: number[], radiusPoint: number[], anglePoint: number[]): Feature {
    return this.addFeature([center, radiusPoint, anglePoint]);
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

    const centerMoved = moved(previous[0], controlPoints[0]);
    const startMoved = moved(previous[1], controlPoints[1]);
    const endMoved = moved(previous[2], controlPoints[2]);

    if (centerMoved && !startMoved && !endMoved) {
      const dx = controlPoints[0][0] - previous[0][0];
      const dy = controlPoints[0][1] - previous[0][1];
      return [
        controlPoints[0],
        [previous[1][0] + dx, previous[1][1] + dy],
        [previous[2][0] + dx, previous[2][1] + dy],
      ];
    }

    return normalizeSectorControlPoints(controlPoints.slice(0, 3));
  }
}

function moved(a: number[], b: number[]): boolean {
  return Math.abs(a[0] - b[0]) > MOVE_TOLERANCE || Math.abs(a[1] - b[1]) > MOVE_TOLERANCE;
}
