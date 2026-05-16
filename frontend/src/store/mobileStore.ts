import { create } from 'zustand';
import type { AppType } from '../../../shared/types';

/**
 * Phone-shell state. Parallel to osStore (window manager) — has no overlap.
 * Window concepts don't apply on mobile; instead we track which app is
 * currently fullscreen, which home page is visible, and which overlay
 * (Control Center, Spotlight, App Switcher) is up.
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

export const useMobileStore = create<MobileStore>((set) => ({
  // Lock
  locked: true,
  unlock: () => set({ locked: false }),
  lock: () => set({ locked: true, openAppType: null, openApps: [] }),

  // Home
  currentPage: 0,
  setPage: (currentPage) => set({ currentPage }),

  // Apps
  openApps: [],
  openAppType: null,
  openApp: (appType) =>
    set((state) => ({
      openAppType: appType,
      // Move to front, dedupe
      openApps: [appType, ...state.openApps.filter((a) => a !== appType)],
      switcherOpen: false,
      spotlightOpen: false,
    })),
  closeApp: (appType) =>
    set((state) => {
      const target = appType ?? state.openAppType;
      if (!target) return state;
      const remaining = state.openApps.filter((a) => a !== target);
      return {
        openApps: remaining,
        openAppType:
          state.openAppType === target ? null : state.openAppType,
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
