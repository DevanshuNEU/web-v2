// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useMobileStore,
  pushPhoneNavEntry,
  syncPhoneHistory,
  phoneHistoryActive,
  isPhoneHistoryState,
} from '@/store/mobileStore';

describe('phone shell history', () => {
  beforeEach(() => {
    syncPhoneHistory(null);
    useMobileStore.setState({ openApps: [], openAppType: null, spotlightOpen: false });
    vi.restoreAllMocks();
  });

  it('opening an app pushes a depth-1 entry; a drill-in pushes depth 2', () => {
    const push = vi.spyOn(window.history, 'pushState');
    useMobileStore.getState().openApp('projects');
    expect(push).toHaveBeenLastCalledWith({ devosApp: true, devosDepth: 1 }, '');
    expect(phoneHistoryActive()).toBe(false);

    expect(pushPhoneNavEntry(2)).toBe(true);
    expect(push).toHaveBeenLastCalledWith({ devosApp: true, devosDepth: 2 }, '');
    expect(phoneHistoryActive()).toBe(true);
  });

  it('closing the app steps back over every entry it pushed', () => {
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    useMobileStore.getState().openApp('projects');
    pushPhoneNavEntry(2);
    pushPhoneNavEntry(3);
    useMobileStore.getState().closeApp();
    expect(go).toHaveBeenCalledWith(-3);
    expect(useMobileStore.getState().openAppType).toBeNull();
  });

  it('switching apps drops the previous app\'s drill-in entries only', () => {
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    useMobileStore.getState().openApp('projects');
    pushPhoneNavEntry(2);
    useMobileStore.getState().openApp('dev-ai');
    expect(go).toHaveBeenCalledWith(-1);
    expect(useMobileStore.getState().openAppType).toBe('dev-ai');
  });

  it('a drill-in without an open app does not touch history', () => {
    const push = vi.spyOn(window.history, 'pushState');
    expect(pushPhoneNavEntry(2)).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it('recognises only its own history states', () => {
    expect(isPhoneHistoryState({ devosApp: true, devosDepth: 1 })).toBe(true);
    expect(isPhoneHistoryState(null)).toBe(false);
    expect(isPhoneHistoryState({ other: 1 })).toBe(false);
  });
});
