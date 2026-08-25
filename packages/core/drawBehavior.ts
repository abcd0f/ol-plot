import type { ResolvedPlotConfig } from '../types/config';

export type DrawEndAction = 'continue' | 'edit' | 'stop';

/** 根据配置确定绘制结束后的行为。 */
export function resolveDrawEndAction(
  config: Pick<ResolvedPlotConfig, 'editable' | 'autoEditAfterDraw' | 'continuousDraw'>,
): DrawEndAction {
  if (config.continuousDraw) return 'continue';
  if (config.editable && config.autoEditAfterDraw) return 'edit';
  return 'stop';
}
