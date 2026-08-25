import { describe, expect, it } from 'vitest';
import { mergeConfig } from '../packages/constants';
import { resolveDrawEndAction } from '../packages/core/drawBehavior';

describe('绘制行为配置', () => {
  it('保持原有默认行为', () => {
    const config = mergeConfig();

    expect(config.editable).toBe(true);
    expect(config.autoEditAfterDraw).toBe(true);
    expect(config.continuousDraw).toBe(false);
    expect(resolveDrawEndAction(config)).toBe('edit');
  });

  it('连续绘制优先于自动编辑', () => {
    const config = mergeConfig({ continuousDraw: true });

    expect(resolveDrawEndAction(config)).toBe('continue');
  });

  it('关闭自动编辑后停止绘制', () => {
    const config = mergeConfig({ autoEditAfterDraw: false });

    expect(resolveDrawEndAction(config)).toBe('stop');
  });

  it('禁止编辑时不自动进入编辑', () => {
    const config = mergeConfig({ editable: false });

    expect(resolveDrawEndAction(config)).toBe('stop');
  });
});
