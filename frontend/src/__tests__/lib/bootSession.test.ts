// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hasBootedThisSession, markBootedThisSession, BOOT_REPLAY_MS } from '@/lib/bootSession';

describe('bootSession', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('reports not booted on a first visit', () => {
    expect(hasBootedThisSession()).toBe(false);
  });

  it('reports booted after the boot is marked (a same-tab refresh)', () => {
    markBootedThisSession();
    expect(hasBootedThisSession()).toBe(true);
  });

  it('stays booted in a new tab of the same browser', () => {
    markBootedThisSession();
    window.sessionStorage.clear(); // a new tab has empty sessionStorage
    expect(hasBootedThisSession()).toBe(true);
  });

  it('replays the boot after a week away', () => {
    const t0 = 1_000_000;
    markBootedThisSession(t0);
    window.sessionStorage.clear();
    expect(hasBootedThisSession(t0 + BOOT_REPLAY_MS - 1)).toBe(true);
    expect(hasBootedThisSession(t0 + BOOT_REPLAY_MS + 1)).toBe(false);
  });

  it('honours the legacy per-tab key', () => {
    window.sessionStorage.setItem('devos-booted-session', '1');
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
