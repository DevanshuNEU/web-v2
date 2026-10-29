import { create } from 'zustand';

/**
 * Open state of the Launchpad overlay.
 *
 * Shared so the desktop icons and the owner card can step out of the way while
 * it is open: Launchpad is modal, so what sits behind it should not be
 * reachable by Tab, screen readers or a stray click.
 */
interface LaunchpadState {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

export const useLaunchpadStore = create<LaunchpadState>((set) => ({
  isOpen: false,
  setOpen: (isOpen) => set({ isOpen }),
}));
