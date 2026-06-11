import Map from 'ol/Map';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import GeometryCollection from 'ol/geom/GeometryCollection';
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
import { buildModifyStyle } from '../utils';
import { dist, computeDirectionAndNormal } from '../utils/arrow';

/**
 * Calculate arrow dimensions based on total length
 */
function calculateArrowHeadSize(length: number): { headLength: number; headWidth: number } {
  const headLength = Math.max(length * 0.15, 10);
  const headWidth = Math.max(length * 0.08, 6);
  return { headLength, headWidth };
}

/**
 * Build arrow head polygon coordinates
 */
function buildArrowHead(tail: number[], head: number[]): number[][][] {
  const length = dist(tail, head);

  if (length < 1e-10) {
    // Degenerate case - points are the same
    return [[tail, tail, tail, tail]];
  }

  const { dx, dy, nx, ny } = computeDirectionAndNormal(tail, head, length);
  const { headLength, headWidth } = calculateArrowHeadSize(length);

  // Calculate base center of arrowhead (where it meets the line)
  const baseCenterX = head[0] - dx * headLength;
  const baseCenterY = head[1] - dy * headLength;

  // Calculate left and right corners of the base
  const headLeftX = baseCenterX + nx * headWidth / 2;
  const headLeftY = baseCenterY + ny * headWidth /2;

  const headRightX = baseCenterX - nx * headWidth /2;
  const headRightY = baseCenterY - ny * headWidth /2;

  // Create the ring for the triangle (closed polygon)
  const ring: number[][] = [
    [headLeftX, headLeftY],  // left base corner
    [head[0], head[1]],     // tip
    [headRightX, headRightY], // right base corner
    [headLeftX, headLeftY]   // back to left base corner to close
  ];

  return [ring];
}

/**
 * Create the geometries for an arrow line from control points
 */
function createArrowLineGeometries(controlPoints: number[][]): Geometry[] {
  if (controlPoints.length < 2) return [];

  const [tail, head] = controlPoints;

  // Create line string for the body
  const lineString = new LineString([tail, head]);

  // Create polygon for the arrow head
  const arrowHead = new Polygon(buildArrowHead(tail, head));

  return [lineString, arrowHead];
}

/**
 * Create a geometry function for real-time preview during drawing
 */
export function createArrowLineGeometryFunction() {
  return (coordinates: number[][], geometry?: GeometryCollection): GeometryCollection => {
    const geom = geometry || new GeometryCollection([]);

    if (coordinates.length < 2) {
      return geom;
    }

    const controlPoints = coordinates.slice(0, 2);
    geom.setGeometries(createArrowLineGeometries(controlPoints));
    geom.set('_controlPoints', controlPoints);

    return geom;
  };
}

export class ArrowLineTool extends BaseTool {
  private handleSource: VectorSource;
  private handleLayer: VectorLayer;
  private handleModify: Modify;
  private syncing = false;

  constructor(map: Map, config?: PlotConfig) {
    super(map, DrawType.ArrowLine, config);

    // Disable default ModifyManager since we have complex geometry
    this.modifyManager.setActive(false);

    const ns = this.config.nodeStyle;

    // Create handle layer for control points
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

    // Create modify interaction for handles
    this.handleModify = new Modify({
      source: this.handleSource,
      style: buildModifyStyle(this.config),
    });

    // Wire up events
    this.handleModify.on('modifystart', () => {
      this.eventBus.emit(DrawEvent.MODIFY_START);
    });

    this.handleModify.on('modifyend', () => {
      this.eventBus.emit(DrawEvent.MODIFY_END, { features: this.activeFeature ? [this.activeFeature] : [] });
    });

    map.addInteraction(this.handleModify);

    this.bindEvents();
  }

  private bindEvents(): void {
    // On draw end, extract and store control points
    this.eventBus.on(DrawEvent.DRAW_END, ({ feature }: { feature: Feature }) => {
      const geom = feature.getGeometry() as GeometryCollection;
      const controlPoints = geom.get('_controlPoints') as number[][] | undefined;
      feature.set('plotType', 'arrowLine');
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
    if (!controlPoints || controlPoints.length < 2) return;

    controlPoints.forEach((pt, i) => {
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
    const geom = this.activeFeature.getGeometry() as GeometryCollection;
    geom.setGeometries(createArrowLineGeometries(controlPoints));

    this.syncing = false;
  }

  // Abstract method implementations
  protected createGeometry(coordinates: number[][]): Geometry {
    return new GeometryCollection(createArrowLineGeometries(coordinates));
  }

  addFeature(coordinates: number[][]): Feature {
    const feature = super.addFeature(coordinates);
    feature.set('plotType', 'arrowLine');
    feature.set('controlPoints', coordinates.slice(0, 2));
    return feature;
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 2) return;
    this.activeFeature.set('controlPoints', coordinates.slice(0, 2));
    const geom = this.activeFeature.getGeometry() as GeometryCollection;
    geom.setGeometries(createArrowLineGeometries(coordinates));
    this.refreshHandles();
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return (this.activeFeature.get('controlPoints') as number[][]) || [];
  }

  getPointCount(): number {
    return this.activeFeature ? 2 : 0;
  }

  updatePoint(index: number, coordinate: number[]): void {
    if (index !== 0 && index !== 1) return;
    const coords = this.getCoordinates();
    if (coords.length < 2) return;
    coords[index] = coordinate;
    this.setCoordinates(coords);
  }

  // Convenience API
  /**
   * Programmatically add an arrow line
   * @param tail Tail point coordinates
   * @param head Head point coordinates
   * @returns Created feature
   */
  addArrowLine(tail: number[], head: number[]): Feature {
    return this.addFeature([tail, head]);
  }

  /**
   * Get tail point coordinates
   * @returns Tail coordinates or null
   */
  getTail(): number[] | null {
    const coords = this.getCoordinates();
    if (coords.length < 2) return null;
    return coords[0];
  }

  /**
   * Get head point coordinates
   * @returns Head coordinates or null
   */
  getHead(): number[] | null {
    const coords = this.getCoordinates();
    if (coords.length < 2) return null;
    return coords[1];
  }

  /**
   * Get arrow line length
   * @returns Length or 0
   */
  getLength(): number {
    const coords = this.getCoordinates();
    if (coords.length < 2) return 0;
    const [tail, head] = coords;
    return dist(tail, head);
  }

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

  destroy(): void {
    this.hideHandles();
    this.map.removeInteraction(this.handleModify);
    this.map.removeLayer(this.handleLayer);
    super.destroy();
  }
}
