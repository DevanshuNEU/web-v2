import { create } from 'zustand';

/**
 * Terminal handoff state. Mirrors chatStore's `seed` pattern: a Spotlight /
 * App Library "command" row stashes the command here, opens the Terminal, and
 * the Terminal runs it once on mount then clears it. This is what makes
 * `hire devanshu` (and every other command row) actually execute instead of
 * just opening a blank terminal.
 *
 * Deliberately separate from the terminal's own history/input state so it works
 * the same on desktop (window) and mobile (AppView) — both mount TerminalApp.
 */
interface TerminalStore {
  /** A command to auto-run when the Terminal next mounts (null = nothing pending). */
  pendingCommand: string | null;
  setPendingCommand: (cmd: string | null) => void;
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  pendingCommand: null,
  setPendingCommand: (pendingCommand) => set({ pendingCommand }),
}));
