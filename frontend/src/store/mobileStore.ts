import { create } from 'zustand';
import { hasBootedThisSession, markBootedThisSession } from '@/lib/bootSession';
import { useAnalyticsStore } from '@/store/analyticsStore';
import type { AppType } from '../../../shared/types';

/**
 * Phone-shell state. Parallel to osStore (window manager) — has no overlap.
 * Window concepts don't apply on mobile; instead we track which app is
 * currently fullscreen, which home page is visible, and whether the
 * library search is up.
 *
 * History-API wiring: opening an app pushes one history entry
 * ({ devosApp: true, devosDepth: 1 }), and each drill-in inside the app's
 * MobilePushView pushes one more (devosDepth 2, 3, ...). Browser back, the
 * Android back gesture and Safari's left-edge swipe therefore step back one
 * level: detail to list first, then list to home. PhoneShell's popstate
 * listener closes the app only when the entry it lands on is not one of ours.
 */
interface MobileStore {
  // Lock
  locked: boolean;
  /** True only after an explicit lock(); the initial lock is not the user's. */
  lockedByUser: boolean;
  unlock: () => void;
  lock: () => void;
  /** Drop a stale initial lock when this tab already booted (e.g. desktop, then resized to mobile). */
  syncLockWithSession: () => void;

  // Home
  currentPage: number;
  setPage: (page: number) => void;

  // App stack — most-recent first
  openApps: AppType[];
  openAppType: AppType | null;
  openApp: (appType: AppType) => void;
  closeApp: (appType?: AppType) => void;
  /** Called by the popstate listener — clears state without popping history again. */
  closeAppFromPopstate: () => void;

  // Overlays
  spotlightOpen: boolean;
  setSpotlight: (open: boolean) => void;
}

/** History state the phone shell writes. devosDepth 1 = an app's root view. */
export interface PhoneHistoryState {
  devosApp: true;
  devosDepth: number;
}

export function isPhoneHistoryState(state: unknown): state is PhoneHistoryState {
  return !!state && typeof state === 'object' && (state as { devosApp?: unknown }).devosApp === true;
}

// Internal: how many history entries the open app owns (its root plus one per
// drill-in), so closing it can step back over all of them at once.
let historyEntries = 0;

function pushHistoryEntry(depth: number) {
  if (typeof window === 'undefined') return false;
  try {
    const state: PhoneHistoryState = { devosApp: true, devosDepth: depth };
    window.history.pushState(state, '');
    historyEntries = depth;
    return true;
  } catch {
    /* swallow: some sandboxed contexts disallow */
    return false;
  }
}

/** Step back `count` of our entries (all of them by default). */
function popHistoryEntries(count = historyEntries) {
  if (typeof window === 'undefined') return;
  const n = Math.min(count, historyEntries);
  if (n <= 0) return;
  historyEntries -= n;
  try {
    window.history.go(-n);
  } catch {
    /* swallow */
  }
}

/**
 * Called by MobilePushView when it drills in. Pushes a history entry so the
 * system back gesture returns to the previous view. Returns false when history
 * is unavailable, so the caller can fall back to a plain in-memory pop.
 */
export function pushPhoneNavEntry(depth: number): boolean {
  if (historyEntries === 0) return false;
  return pushHistoryEntry(depth);
}

/** Called from popstate: record which of our entries the browser landed on. */
export function syncPhoneHistory(state: unknown) {
  historyEntries = isPhoneHistoryState(state) ? state.devosDepth : 0;
}

/** True when MobilePushView's back can go through history.back(). */
export function phoneHistoryActive(): boolean {
  return historyEntries > 1;
}

const analytics = () => useAnalyticsStore.getState();

export const useMobileStore = create<MobileStore>((set) => ({
  // Lock: the lock screen plays once per visit, like the desktop boot.
  locked: !hasBootedThisSession(),
  lockedByUser: false,
  unlock: () => {
    markBootedThisSession();
    set({ locked: false, lockedByUser: false });
  },
  lock: () => {
    popHistoryEntries();
    set({ locked: true, lockedByUser: true, openAppType: null, openApps: [] });
  },
  syncLockWithSession: () =>
    set((s) => (s.locked && !s.lockedByUser && hasBootedThisSession() ? { locked: false } : {})),

  // Home
  currentPage: 0,
  setPage: (currentPage) => set({ currentPage }),

  // Apps
  openApps: [],
  openAppType: null,
  openApp: (appType) =>
    set((state) => {
      // Only push a history entry on the first open (home → app).
      // App-to-app navigation reuses the app's root entry so "back" still
      // means "leave to home"; drill-in entries of the previous app are
      // dropped because its push stack unmounts.
      if (state.openAppType === null) pushHistoryEntry(1);
      else if (state.openAppType !== appType) popHistoryEntries(historyEntries - 1);
      if (state.openAppType !== appType) analytics().trackAppOpen(appType);
      return {
        openAppType: appType,
        // Move to front, dedupe
        openApps: [appType, ...state.openApps.filter((a) => a !== appType)],
        spotlightOpen: false,
      };
    }),
  closeApp: (appType) =>
    set((state) => {
      const target = appType ?? state.openAppType;
      if (!target) return state;
      const remaining = state.openApps.filter((a) => a !== target);
      const newOpenAppType =
        state.openAppType === target ? null : state.openAppType;
      // Transitioning to "no app": pop every history entry the app pushed.
      if (newOpenAppType === null) popHistoryEntries();
      analytics().trackAppClose(target);
      return { openApps: remaining, openAppType: newOpenAppType };
    }),
  closeAppFromPopstate: () =>
    set((state) => {
      // The user (or system) already popped history; just clear state.
      historyEntries = 0;
      if (!state.openAppType) return state;
      const target = state.openAppType;
      analytics().trackAppClose(target);
      return {
        openApps: state.openApps.filter((a) => a !== target),
        openAppType: null,
      };
    }),

  // Overlays
  spotlightOpen: false,
  setSpotlight: (spotlightOpen) => set({ spotlightOpen }),
}));
