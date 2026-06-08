import Map from 'ol/Map';
import Draw, { createBox, type GeometryFunction } from 'ol/interaction/Draw';
import type VectorSource from 'ol/source/Vector';
import type { EventBus } from './EventBus';
import { DrawType } from '../constants/drawType';
import { DrawEvent } from '../constants/events';

type OLType = 'Point' | 'LineString' | 'Polygon' | 'Circle';

export class DrawManager {
  private map: Map;
  private source: VectorSource;
  private eventBus: EventBus;
  private draw: Draw | null = null;

  constructor(map: Map, source: VectorSource, eventBus: EventBus) {
    this.map = map;
    this.source = source;
    this.eventBus = eventBus;
  }

  activate(drawType: DrawType): void {
    this.deactivate();

    let type: OLType;
    let geometryFunction: GeometryFunction | undefined;
    let freehand = false;

    if (drawType === DrawType.Rectangle) {
      type = 'Circle';
      geometryFunction = createBox();
    } else if (drawType === DrawType.FreehandLine) {
      type = 'LineString';
      freehand = true;
    } else {
      type = drawType as OLType;
    }

    this.draw = new Draw({ source: this.source, type, geometryFunction, freehand });

    this.draw.on('drawstart', (e) => this.eventBus.emit(DrawEvent.DRAW_START, { feature: e.feature }));
    this.draw.on('drawend', (e) => this.eventBus.emit(DrawEvent.DRAW_END, { feature: e.feature }));

    this.map.addInteraction(this.draw);
  }

  deactivate(): void {
    if (this.draw) {
      this.map.removeInteraction(this.draw);
      this.draw = null;
    }
  }

  destroy(): void {
    this.deactivate();
  }
}
