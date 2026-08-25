import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Text from 'ol/style/Text';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import CircleStyle from 'ol/style/Circle';
import type { ImageConfig, ImageLabelConfig, NodeStyle } from '../types/config';

const DEFAULT_LABEL_COLOR = '#1f2937';
const DEFAULT_LABEL_FONT_SIZE = 12;
const DEFAULT_LABEL_FONT_FAMILY = 'sans-serif';
const DEFAULT_LABEL_FONT_WEIGHT = 'normal';
const DEFAULT_LABEL_OFFSET_Y = 8;

/** 补全图片点配置。 */
export function resolveImageConfig(imageConfig?: ImageConfig): ImageConfig {
  return {
    src: imageConfig?.src ?? '',
    scale: imageConfig?.scale ?? 1,
    anchor: imageConfig?.anchor ?? [0.5, 0.5],
    opacity: imageConfig?.opacity ?? 1,
    label: imageConfig?.label ? { ...imageConfig.label } : undefined,
  };
}

/** 合并图片点配置。 */
export function mergeImageConfig(base: ImageConfig, update?: ImageConfig): ImageConfig {
  if (!update) return resolveImageConfig(base);

  return resolveImageConfig({
    src: update.src || base.src,
    scale: update.scale ?? base.scale,
    anchor: update.anchor ?? base.anchor,
    opacity: update.opacity ?? base.opacity,
    label: update.label
      ? {
          ...base.label,
          ...update.label,
        }
      : base.label,
  });
}

/** 创建图片点样式。 */
export function buildImagePointStyle(
  imageConfig: ImageConfig | undefined,
  nodeStyle: NodeStyle,
  strokeColor: string,
): Style {
  const image = resolveImageConfig(imageConfig);
  const text = createLabelText(image.label);

  return new Style({
    image: image.src
      ? new Icon({
          src: image.src,
          scale: image.scale,
          anchor: image.anchor,
          opacity: image.opacity,
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
        })
      : new CircleStyle({
          radius: nodeStyle.radius ?? 6,
          fill: new Fill({ color: nodeStyle.fill ?? '#ffffff' }),
          stroke: new Stroke({
            color: nodeStyle.stroke ?? strokeColor,
            width: nodeStyle.strokeWidth ?? 2,
          }),
        }),
    text,
  });
}

function createLabelText(label?: ImageLabelConfig): Text | undefined {
  if (!label?.text) return undefined;

  const fontSize =
    typeof label.fontSize === 'number' ? `${label.fontSize}px` : (label.fontSize ?? `${DEFAULT_LABEL_FONT_SIZE}px`);
  const font = `${label.fontWeight ?? DEFAULT_LABEL_FONT_WEIGHT} ${fontSize} ${label.fontFamily ?? DEFAULT_LABEL_FONT_FAMILY}`;

  return new Text({
    text: label.text,
    font,
    fill: new Fill({
      color: label.color ?? DEFAULT_LABEL_COLOR,
    }),
    textAlign: 'center',
    textBaseline: 'top',
    offsetX: label.offsetX ?? 0,
    offsetY: label.offsetY ?? DEFAULT_LABEL_OFFSET_Y,
  });
}
