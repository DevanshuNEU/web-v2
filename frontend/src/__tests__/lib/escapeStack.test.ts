// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { pushEscapeLayer, escapeLayerCount } from '@/lib/escapeStack';

const esc = () => {
  const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  document.body.dispatchEvent(e);
  return e;
};

describe('escapeStack', () => {
  it('closes only the topmost layer and hides Esc from everything behind it', () => {
    const behind = vi.fn();
    document.addEventListener('keydown', behind);
    const lower = vi.fn();
    const upper = vi.fn();
    const offLower = pushEscapeLayer(lower);
    const offUpper = pushEscapeLayer(upper);

    const e = esc();
    expect(upper).toHaveBeenCalledTimes(1);
    expect(lower).not.toHaveBeenCalled();
    expect(behind).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(true);

    offUpper();
    esc();
    expect(lower).toHaveBeenCalledTimes(1);
    offLower();
    document.removeEventListener('keydown', behind);
  });

  it('lets Esc through when nothing transient is open', () => {
    expect(escapeLayerCount()).toBe(0);
    const behind = vi.fn();
    document.addEventListener('keydown', behind);
    const e = esc();
    expect(behind).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(false);
    document.removeEventListener('keydown', behind);
  });
});
