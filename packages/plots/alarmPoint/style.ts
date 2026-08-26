import Style, { type RenderFunction } from 'ol/style/Style';
import type { AlarmPointStyleConfig, NodeStyle } from '../../kernel/types/config';

const DEFAULT_ALARM_COLOR = '#ff3b30';
const DEFAULT_DURATION = 1200;
const DEFAULT_FRAME_RATE = 30;

export type ResolvedAlarmPointStyleConfig = Required<AlarmPointStyleConfig>;

/** 补全并约束告警点样式配置。 */
export function resolveAlarmPointConfig(
  alarmConfig: AlarmPointStyleConfig | undefined,
  nodeStyle: NodeStyle,
  strokeColor: string,
): ResolvedAlarmPointStyleConfig {
  const coreRadius = numberOr(alarmConfig?.radius, Math.max((nodeStyle.radius ?? 6) + 3, 9));
  const color = alarmConfig?.color ?? nodeStyle.stroke ?? strokeColor ?? DEFAULT_ALARM_COLOR;

  return {
    radius: coreRadius,
    color,
    fill: alarmConfig?.fill ?? color,
    stroke: alarmConfig?.stroke ?? color,
    strokeWidth: numberOr(alarmConfig?.strokeWidth, nodeStyle.strokeWidth ?? 2),
    pulseRadius: Math.max(numberOr(alarmConfig?.pulseRadius, coreRadius * 3.2), coreRadius + 1),
    pulseStrokeWidth: numberOr(alarmConfig?.pulseStrokeWidth, 2),
    duration: Math.max(numberOr(alarmConfig?.duration, DEFAULT_DURATION), 16),
    rings: clamp(Math.round(numberOr(alarmConfig?.rings, 2)), 1, 4),
    haloOpacity: clamp(numberOr(alarmConfig?.haloOpacity, 0.42), 0, 1),
    minOpacity: clamp(numberOr(alarmConfig?.minOpacity, 0.56), 0, 1),
    maxOpacity: clamp(numberOr(alarmConfig?.maxOpacity, 1), 0, 1),
    frameRate: clamp(Math.round(numberOr(alarmConfig?.frameRate, DEFAULT_FRAME_RATE)), 1, 60),
  };
}

/** 创建告警点动画样式。 */
export function buildAlarmPointStyle(
  alarmConfig: AlarmPointStyleConfig | undefined,
  nodeStyle: NodeStyle,
  strokeColor: string,
  getTime = now,
): Style {
  const config = resolveAlarmPointConfig(alarmConfig, nodeStyle, strokeColor);
  return new Style({
    renderer: createAlarmRenderer(config, getTime),
    hitDetectionRenderer: createHitDetectionRenderer(config),
    zIndex: Infinity,
  });
}

function createAlarmRenderer(config: ResolvedAlarmPointStyleConfig, getTime: () => number): RenderFunction {
  return (pixelCoordinates, state) => {
    const point = getFirstCoordinate(pixelCoordinates);
    if (!point) return;

    const context = state.context;
    const phase = (getTime() % config.duration) / config.duration;
    const flash =
      config.minOpacity + (config.maxOpacity - config.minOpacity) * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2));

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';

    for (let i = 0; i < config.rings; i += 1) {
      const ringPhase = (phase + i / config.rings) % 1;
      const eased = 1 - Math.pow(1 - ringPhase, 2);
      const radius = config.radius + (config.pulseRadius - config.radius) * eased;
      const opacity = config.haloOpacity * Math.pow(1 - ringPhase, 1.45);

      context.globalAlpha = opacity;
      context.strokeStyle = config.color;
      context.lineWidth = config.pulseStrokeWidth;
      context.beginPath();
      context.arc(point[0], point[1], radius, 0, Math.PI * 2);
      context.stroke();
    }

    context.globalAlpha = flash * 0.22;
    context.fillStyle = config.color;
    context.beginPath();
    context.arc(point[0], point[1], config.radius * 1.65, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = flash;
    context.fillStyle = config.fill;
    context.strokeStyle = config.stroke;
    context.lineWidth = config.strokeWidth;
    context.beginPath();
    context.arc(point[0], point[1], config.radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.globalAlpha = Math.min(1, flash + 0.12);
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(point[0], point[1], Math.max(2, config.radius * 0.34), 0, Math.PI * 2);
    context.fill();

    context.restore();
  };
}

function createHitDetectionRenderer(config: ResolvedAlarmPointStyleConfig): RenderFunction {
  return (pixelCoordinates, state) => {
    const point = getFirstCoordinate(pixelCoordinates);
    if (!point) return;

    const context = state.context;
    context.save();
    context.fillStyle = '#000000';
    context.beginPath();
    context.arc(point[0], point[1], config.radius + 6, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };
}

function getFirstCoordinate(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  if (typeof value[0] === 'number' && typeof value[1] === 'number') return value as number[];
  return getFirstCoordinate(value[0]);
}

function now(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

function numberOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
