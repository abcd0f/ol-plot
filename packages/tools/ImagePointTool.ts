import Map from 'ol/Map';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import type Geometry from 'ol/geom/Geometry';
import type { ImagePointConfig } from '../types/config';
import { DrawType } from '../constants/drawType';
import { BaseTool } from '../core/BaseTool';
import { buildStyleFromData, getFeatureStyleData } from '../utils/data';

export class ImagePointTool extends BaseTool {
  private imageConfig: Required<ImagePointConfig>['image'];

  constructor(map: Map, config?: ImagePointConfig) {
    super(map, DrawType.ImagePoint, config);

    const imgCfg = config?.image;
    this.imageConfig = {
      src: imgCfg?.src || '',
      scale: imgCfg?.scale ?? 1,
      anchor: imgCfg?.anchor ?? [0.5, 0.5],
      opacity: imgCfg?.opacity ?? 1,
    };

    this.applyImageStyle();
  }

  /**
   * Create the icon style used in normal, selected, and modifying states.
   */
  private createImageStyle(): Style {
    if (!this.imageConfig.src) {
      console.warn('ImagePointTool: image src is not set, icon will not be displayed');
    }

    return new Style({
      image: new Icon({
        src: this.imageConfig.src,
        scale: this.imageConfig.scale,
        anchor: this.imageConfig.anchor,
        opacity: this.imageConfig.opacity,
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
      }),
    });
  }

  /**
   * Apply the icon style everywhere OpenLayers may render this point.
   */
  private applyImageStyle(): void {
    const imageStyle = this.createImageStyle();

    this.layerManager.getLayer().setStyle(imageStyle);
    this.selectManager.setStyle(imageStyle);
    this.modifyManager.setStyle(imageStyle);
  }

  protected createGeometry(coordinates: number[][]): Geometry {
    return new Point(coordinates[0]);
  }

  setCoordinates(coordinates: number[][]): void {
    if (!this.activeFeature || coordinates.length < 1) return;
    (this.activeFeature.getGeometry() as Point).setCoordinates(coordinates[0]);
  }

  getCoordinates(): number[][] {
    if (!this.activeFeature) return [];
    return [(this.activeFeature.getGeometry() as Point).getCoordinates()];
  }

  getPointCount(): number {
    return this.activeFeature ? 1 : 0;
  }

  updatePoint(index: number, coordinate: number[]): void {
    if (index !== 0) return;
    this.setCoordinates([coordinate]);
  }

  getPosition(): number[] | null {
    if (!this.activeFeature) return null;
    return (this.activeFeature.getGeometry() as Point).getCoordinates();
  }

  /**
   * Update the image config and refresh all render states.
   */
  updateImageConfig(imageConfig: ImagePointConfig['image']): void {
    if (!imageConfig) return;

    this.imageConfig = {
      src: imageConfig.src || this.imageConfig.src,
      scale: imageConfig.scale ?? this.imageConfig.scale,
      anchor: imageConfig.anchor ?? this.imageConfig.anchor,
      opacity: imageConfig.opacity ?? this.imageConfig.opacity,
    };

    this.applyImageStyle();
    this.layerManager.getLayer().changed();
  }

  setStyleConfig(config?: ImagePointConfig): this {
    return super.setStyleConfig(config);
  }

  protected refreshStyles(): void {
    super.refreshStyles();
    this.applyImageStyle();
  }

  protected refreshActiveFeatureStyle(): void {
    super.refreshActiveFeatureStyle();
    if (!this.activeFeature) return;

    const styleData = getFeatureStyleData(this.activeFeature);
    if (!styleData) return;

    const imageStyle = buildStyleFromData(styleData);
    this.selectManager.setStyle(imageStyle);
    this.modifyManager.setStyle(imageStyle);
  }
}
