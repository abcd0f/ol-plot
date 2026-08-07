import Map from 'ol/Map';
import type Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import type Geometry from 'ol/geom/Geometry';
import type { ImagePointConfig } from '../types/config';
import type { PlotFeatureData } from '../types/data';
import { DrawType } from '../constants/drawType';
import { BaseTool } from '../core/BaseTool';
import { buildStyleFromData, getFeatureStyleData } from '../utils/data';
import { buildImagePointStyle, mergeImageConfig, resolveImageConfig } from '../style/imagePoint';

export class ImagePointTool extends BaseTool {
  private imageConfig: NonNullable<ImagePointConfig['image']>;

  constructor(map: Map, config?: ImagePointConfig) {
    super(map, DrawType.ImagePoint, config);

    this.imageConfig = resolveImageConfig(config?.image);

    this.applyImageStyle();
  }

  /**
   * Create the icon style used in normal, selected, and modifying states.
   */
  private createImageStyle(): Style {
    if (!this.imageConfig.src) {
      console.warn('ImagePointTool: image src is not set, falling back to the default point style');
    }

    return buildImagePointStyle(this.imageConfig, this.config.nodeStyle, this.config.strokeColor);
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

  getFeatureData(feature: Feature): PlotFeatureData {
    const data = super.getFeatureData(feature);
    if (!data.style.image && (this.imageConfig.src || this.imageConfig.label?.text)) {
      data.style = {
        ...data.style,
        image: {
          ...this.imageConfig,
          label: this.imageConfig.label ? { ...this.imageConfig.label } : undefined,
        },
      };
    }
    return data;
  }

  /**
   * Update the image config and refresh all render states.
   */
  updateImageConfig(imageConfig: ImagePointConfig['image']): void {
    if (!imageConfig) return;

    this.imageConfig = mergeImageConfig(this.imageConfig, imageConfig);

    this.applyImageStyle();
    this.layerManager.getLayer().changed();
  }

  setStyleConfig(config?: ImagePointConfig): this {
    if (!config?.image) return super.setStyleConfig(config);

    this.imageConfig = mergeImageConfig(this.imageConfig, config.image);
    return super.setStyleConfig({
      ...config,
      image: this.imageConfig,
    });
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
