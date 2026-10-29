// @vitest-environment jsdom

/**
 * The tracking choice: every toggle calls setOptOut, which must really stop
 * PostHog, survive a reload, and keep PostHog from loading on the next visit.
 * posthog-js is mocked; no network.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ph = vi.hoisted(() => ({
  __loaded: false,
  init: vi.fn(),
  opt_out_capturing: vi.fn(),
  opt_in_capturing: vi.fn(),
}));
vi.mock('posthog-js', () => ({ default: ph }));

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
};

async function freshStore() {
  vi.resetModules();
  return import('@/store/analyticsStore');
}

beforeEach(() => {
  localStorage.clear();
  ph.__loaded = false;
  ph.init.mockReset();
  ph.opt_out_capturing.mockReset();
  ph.opt_in_capturing.mockReset();
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('analytics opt-out', () => {
  it('stops PostHog, clears the log and saves the choice', async () => {
    const { useAnalyticsStore, OPT_OUT_KEY } = await freshStore();
    ph.__loaded = true;
    useAnalyticsStore.getState().trackEvent('interaction', 'clicked');
    useAnalyticsStore.getState().setOptOut(true);
    expect(ph.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(useAnalyticsStore.getState().events).toHaveLength(0);
    expect(localStorage.getItem(OPT_OUT_KEY)).toBe('1');
  });

  it('starts opted out after a reload and never initializes PostHog', async () => {
    localStorage.setItem('devos-analytics-optout', '1');
    const { useAnalyticsStore, startPostHog } = await freshStore();
    expect(useAnalyticsStore.getState().isOptedOut).toBe(true);
    startPostHog();
    expect(ph.init).not.toHaveBeenCalled();
  });

  it('initializes PostHog on opt-in when it never loaded', async () => {
    localStorage.setItem('devos-analytics-optout', '1');
    const { useAnalyticsStore } = await freshStore();
    useAnalyticsStore.getState().setOptOut(false);
    expect(localStorage.getItem('devos-analytics-optout')).toBeNull();
    expect(ph.init).toHaveBeenCalledTimes(1);
  });

  it('resumes a loaded PostHog on opt-in', async () => {
    const { useAnalyticsStore } = await freshStore();
    ph.__loaded = true;
    useAnalyticsStore.getState().setOptOut(true);
    useAnalyticsStore.getState().setOptOut(false);
    expect(ph.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(useAnalyticsStore.getState().isOptedOut).toBe(false);
  });

  it('records nothing while opted out', async () => {
    const { useAnalyticsStore } = await freshStore();
    useAnalyticsStore.getState().setOptOut(true);
    useAnalyticsStore.getState().trackAppOpen('projects');
    expect(useAnalyticsStore.getState().events).toHaveLength(0);
  });
});

describe('analytics labels and device', () => {
  it('logs app titles, not internal ids', async () => {
    const { useAnalyticsStore } = await freshStore();
    useAnalyticsStore.getState().trackAppOpen('skills-dashboard');
    expect(useAnalyticsStore.getState().events.at(-1)?.label).toBe('Opened Skill Tree');
  });

  it.each([
    ['iphone', 'iOS', 'Safari', 'mobile'],
    ['android', 'Android', 'Chrome', 'mobile'],
    ['mac', 'macOS', 'Chrome', 'desktop'],
  ] as const)('detects %s', async (key, os, browser, type) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(UA[key]);
    const { useAnalyticsStore } = await freshStore();
    expect(useAnalyticsStore.getState().device).toEqual({ type, browser, os });
    vi.restoreAllMocks();
  });
});
