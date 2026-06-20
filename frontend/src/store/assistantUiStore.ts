import { create } from 'zustand';
import { useChatStore } from '@/store/chatStore';

/**
 * UI state for the floating assistant (desktop orb + mobile sheet).
 *
 * This is deliberately separate from chatStore: chatStore owns the
 * conversation (messages / status / seed) and survives open/close, while this
 * store only tracks whether the assistant surface is currently shown. Closing
 * the assistant never resets the thread, so a visitor can reopen and continue.
 */
interface AssistantUiStore {
  open: boolean;
  /** Open the assistant. If a seed question is given, hand it to chatStore so
   *  the panel sends it on mount. */
  openAssistant: (seed?: string) => void;
  /** Hide the assistant surface. Does NOT clear the conversation. */
  closeAssistant: () => void;
  toggleAssistant: () => void;
}

export const useAssistantUiStore = create<AssistantUiStore>((set, get) => ({
  open: false,

  openAssistant: (seed) => {
    const q = seed?.trim();
    if (q) useChatStore.getState().setSeed(q);
    set({ open: true });
  },

  closeAssistant: () => set({ open: false }),

  toggleAssistant: () => {
    if (get().open) set({ open: false });
    else get().openAssistant();
  },
}));
