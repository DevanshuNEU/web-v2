import { describe, it, expect, beforeEach } from 'vitest';
import { useMobileStore } from '@/store/mobileStore';
import { useAnalyticsStore } from '@/store/analyticsStore';

const reset = () => {
  useMobileStore.setState({
    locked: true,
    currentPage: 0,
    openApps: [],
    openAppType: null,
    spotlightOpen: false,
  });
};

describe('mobileStore', () => {
  beforeEach(reset);

  it('starts locked', () => {
    expect(useMobileStore.getState().locked).toBe(true);
  });

  it('unlocks', () => {
    useMobileStore.getState().unlock();
    expect(useMobileStore.getState().locked).toBe(false);
  });

  it('lock clears open apps', () => {
    const s = useMobileStore.getState();
    s.openApp('about-me');
    expect(useMobileStore.getState().openApps).toContain('about-me');
    useMobileStore.getState().lock();
    expect(useMobileStore.getState().openApps).toEqual([]);
    expect(useMobileStore.getState().openAppType).toBeNull();
  });

  it('openApp pushes to front and dedupes', () => {
    const s = useMobileStore.getState();
    s.openApp('about-me');
    s.openApp('projects');
    s.openApp('about-me');
    const state = useMobileStore.getState();
    expect(state.openAppType).toBe('about-me');
    expect(state.openApps).toEqual(['about-me', 'projects']);
  });

  it('openApp closes the spotlight', () => {
    useMobileStore.setState({ spotlightOpen: true });
    useMobileStore.getState().openApp('terminal');
    expect(useMobileStore.getState().spotlightOpen).toBe(false);
  });

  it('openApp records the open for the Analytics app', () => {
    const before = useAnalyticsStore.getState().events.length;
    useMobileStore.getState().openApp('projects');
    const events = useAnalyticsStore.getState().events;
    expect(events.length).toBe(before + 1);
    expect(events[events.length - 1].type).toBe('app_open');
  });

  it('closeApp removes the current app and clears openAppType', () => {
    const s = useMobileStore.getState();
    s.openApp('about-me');
    s.openApp('terminal');
    useMobileStore.getState().closeApp();
    const state = useMobileStore.getState();
    expect(state.openAppType).toBeNull();
    expect(state.openApps).toEqual(['about-me']);
  });

  it('closeApp with explicit type removes only that app', () => {
    const s = useMobileStore.getState();
    s.openApp('about-me');
    s.openApp('terminal');
    useMobileStore.getState().closeApp('about-me');
    expect(useMobileStore.getState().openApps).toEqual(['terminal']);
    expect(useMobileStore.getState().openAppType).toBe('terminal');
  });

  it('setPage updates current page', () => {
    useMobileStore.getState().setPage(2);
    expect(useMobileStore.getState().currentPage).toBe(2);
  });

  it('spotlight setter works', () => {
    useMobileStore.getState().setSpotlight(true);
    expect(useMobileStore.getState().spotlightOpen).toBe(true);
  });
});
