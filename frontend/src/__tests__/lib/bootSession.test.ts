// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hasBootedThisSession, markBootedThisSession } from '@/lib/bootSession';

describe('bootSession', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('reports not booted on a fresh tab', () => {
    expect(hasBootedThisSession()).toBe(false);
  });

  it('reports booted after the boot is marked (a same-tab refresh)', () => {
    markBootedThisSession();
    expect(hasBootedThisSession()).toBe(true);
  });

  it('falls back to playing the boot when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => markBootedThisSession()).not.toThrow();
    expect(hasBootedThisSession()).toBe(false);
  });
});
