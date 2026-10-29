import { create } from 'zustand';

/**
 * Open state of the desktop Spotlight palette.
 *
 * Lives in a store so the menu bar search button and the right-click menu can
 * open the palette directly instead of faking a Cmd+K keystroke.
 */
interface SpotlightState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useSpotlightStore = create<SpotlightState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
