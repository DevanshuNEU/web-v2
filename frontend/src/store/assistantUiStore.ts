import { create } from 'zustand';
import { useChatStore } from '@/store/chatStore';
import { useMobileStore } from '@/store/mobileStore';

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
   *  the panel sends it on mount. Platform-aware: on mobile this routes to the
   *  dedicated full-screen DevAI app; on desktop it shows the floating orb. */
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

    // Mobile routes to the dedicated full-screen DevAI app (opened through the
    // mobile AppView). Desktop keeps the floating orb path untouched.
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      useMobileStore.getState().openApp('dev-ai');
    } else {
      set({ open: true });
    }
  },

  closeAssistant: () => set({ open: false }),

  toggleAssistant: () => {
    if (get().open) set({ open: false });
    else get().openAssistant();
  },
}));
