import { create } from 'zustand';
import type { AppType } from '../../../shared/types';

/**
 * Phone-shell state. Parallel to osStore (window manager) — has no overlap.
 * Window concepts don't apply on mobile; instead we track which app is
 * currently fullscreen, which home page is visible, and which overlay
 * (Control Center, Spotlight, App Switcher) is up.
 *
 * History-API wiring: opening an app pushes a no-op history entry so that
 * the browser back button / Android system-back gesture closes the app
 * instead of leaving the page. PhoneShell installs a popstate listener
 * that routes the event into `closeAppFromPopstate()`.
 */
interface MobileStore {
  // Lock
  locked: boolean;
  unlock: () => void;
  lock: () => void;

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
  controlCenterOpen: boolean;
  spotlightOpen: boolean;
  switcherOpen: boolean;
  setControlCenter: (open: boolean) => void;
  setSpotlight: (open: boolean) => void;
  setSwitcher: (open: boolean) => void;

  // Wiggle mode (long-press → "edit home screen")
  wiggleMode: boolean;
  setWiggleMode: (on: boolean) => void;
}

// Internal — tracks whether openApp pushed a history entry on the
// open-from-empty transition, so closeApp knows whether to pop.
let historyPushed = false;

function pushHistoryEntry() {
  if (typeof window === 'undefined') return;
  try {
    window.history.pushState({ devosApp: true }, '');
    historyPushed = true;
  } catch {
    /* swallow — some sandboxed contexts disallow */
  }
}

function popHistoryEntry() {
  if (typeof window === 'undefined') return;
  if (!historyPushed) return;
  historyPushed = false;
  try {
    window.history.back();
  } catch {
    /* swallow */
  }
}

export const useMobileStore = create<MobileStore>((set) => ({
  // Lock
  locked: true,
  unlock: () => set({ locked: false }),
  lock: () => {
    popHistoryEntry();
    set({ locked: true, openAppType: null, openApps: [] });
  },

  // Home
  currentPage: 0,
  setPage: (currentPage) => set({ currentPage }),

  // Apps
  openApps: [],
  openAppType: null,
  openApp: (appType) =>
    set((state) => {
      // Only push a history entry on the first open (home → app).
      // App-to-app navigation reuses the existing entry so "back" still
      // means "leave to home" rather than walking back through the stack.
      if (state.openAppType === null) pushHistoryEntry();
      return {
        openAppType: appType,
        // Move to front, dedupe
        openApps: [appType, ...state.openApps.filter((a) => a !== appType)],
        switcherOpen: false,
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
      // Transitioning to "no app" — pop the history entry we pushed.
      if (newOpenAppType === null) popHistoryEntry();
      return { openApps: remaining, openAppType: newOpenAppType };
    }),
  closeAppFromPopstate: () =>
    set((state) => {
      // The user (or system) already popped history; just clear state.
      historyPushed = false;
      if (!state.openAppType) return state;
      const target = state.openAppType;
      return {
        openApps: state.openApps.filter((a) => a !== target),
        openAppType: null,
      };
    }),

  // Overlays
  controlCenterOpen: false,
  spotlightOpen: false,
  switcherOpen: false,
  setControlCenter: (controlCenterOpen) => set({ controlCenterOpen }),
  setSpotlight: (spotlightOpen) => set({ spotlightOpen }),
  setSwitcher: (switcherOpen) => set({ switcherOpen }),

  // Wiggle
  wiggleMode: false,
  setWiggleMode: (wiggleMode) => set({ wiggleMode }),
}));
