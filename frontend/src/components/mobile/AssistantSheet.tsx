'use client';

/**
 * AssistantSheet — the mobile floating assistant.
 *
 * A monochrome FAB pinned to the bottom-right, offset above the sticky dock so
 * it never collides with it. Tapping opens a bottom sheet that slides up and
 * hosts the shared ChatPanel. A dim backdrop (tap to close) sits behind the
 * sheet. Hidden while the phone is locked.
 *
 * Strictly neutral tokens (no accent). Reduced-motion collapses the slide.
 */

import { useReducedMotion, motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { useMobileStore } from '@/store/mobileStore';
import { useAssistantUiStore } from '@/store/assistantUiStore';
import { spring, withReduced } from '@/lib/motion';
import ChatPanel from '@/components/chat/ChatPanel';

// The dock (icon 54 + py-3 + mb-3) is ~96px tall above the safe area; the FAB
// floats 16px above that so a thumb never lands on both.
const DOCK_CLEARANCE = 96;

export default function AssistantSheet() {
  const reduced = useReducedMotion();
  const locked = useMobileStore((s) => s.locked);
  const open = useAssistantUiStore((s) => s.open);
  const openAssistant = useAssistantUiStore((s) => s.openAssistant);
  const closeAssistant = useAssistantUiStore((s) => s.closeAssistant);

  if (locked) return null;

  return (
    <>
      {/* FAB — hidden while the sheet is open so it doesn't sit over the sheet */}
      {!open && (
        <button
          type="button"
          onClick={() => openAssistant()}
          aria-label="Ask Devanshu"
          className="fixed z-[60] grid place-items-center w-14 h-14 rounded-full
                     border border-border bg-text text-bg shadow-xl active:scale-95 transition-transform"
          style={{
            right: 16,
            bottom: `calc(env(safe-area-inset-bottom) + ${DOCK_CLEARANCE}px + 16px)`,
          }}
        >
          <MessageSquare size={22} strokeWidth={2} />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <>
            {/* Dim backdrop — tap to close */}
            <motion.div
              key="assistant-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.18 }}
              onClick={closeAssistant}
              className="fixed inset-0 z-[70] bg-black/40"
            />

            {/* Bottom sheet */}
            <motion.div
              key="assistant-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={withReduced(spring.bubble, reduced)}
              className="fixed inset-x-0 bottom-0 z-[71] h-[85dvh] flex flex-col
                         overflow-hidden rounded-t-3xl border-t border-border bg-surface shadow-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              role="dialog"
              aria-label="Chat with Devanshu"
            >
              {/* Grabber */}
              <div className="flex-shrink-0 flex justify-center pt-2.5 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="flex-1 min-h-0">
                <ChatPanel onClose={closeAssistant} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
