import { describe, it, expect, beforeEach } from 'vitest';
import { useMobileStore } from '@/store/mobileStore';

const reset = () => {
  useMobileStore.setState({
    locked: true,
    currentPage: 0,
    openApps: [],
    openAppType: null,
    controlCenterOpen: false,
    spotlightOpen: false,
    switcherOpen: false,
    wiggleMode: false,
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

  it('openApp closes overlays', () => {
    useMobileStore.setState({ spotlightOpen: true, switcherOpen: true });
    useMobileStore.getState().openApp('terminal');
    const state = useMobileStore.getState();
    expect(state.spotlightOpen).toBe(false);
    expect(state.switcherOpen).toBe(false);
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

  it('overlay setters work independently', () => {
    const { setControlCenter, setSpotlight, setSwitcher } =
      useMobileStore.getState();
    setControlCenter(true);
    setSpotlight(true);
    setSwitcher(true);
    const s = useMobileStore.getState();
    expect(s.controlCenterOpen).toBe(true);
    expect(s.spotlightOpen).toBe(true);
    expect(s.switcherOpen).toBe(true);
  });
});
