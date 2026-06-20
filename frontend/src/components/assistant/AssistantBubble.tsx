'use client';

/**
 * AssistantBubble — the desktop floating assistant.
 *
 * A monochrome orb pinned to the bottom-right of the desktop. Clicking it
 * expands a chat panel anchored above the orb (transform-origin bottom-right),
 * hosting the shared ChatPanel. Closing keeps the conversation intact.
 *
 * Strictly neutral tokens (no accent). No idle pulse or glow: the orb is calm
 * at rest and only earns its magnetic pull from the global magnetic driver via
 * the data-magnetic attribute. Reduced-motion collapses the entrance.
 *
 * Z-index 8500 sits above resting windows / Spotlight backdrop but below the
 * custom cursor (10000).
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { useAssistantUiStore } from '@/store/assistantUiStore';
import { spring, withReduced } from '@/lib/motion';
import ChatPanel from '@/components/chat/ChatPanel';

export default function AssistantBubble() {
  const reduced = useReducedMotion();
  const open = useAssistantUiStore((s) => s.open);
  const toggleAssistant = useAssistantUiStore((s) => s.toggleAssistant);
  const closeAssistant = useAssistantUiStore((s) => s.closeAssistant);

  const orbRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Esc closes (listener only active while open). Return focus to the orb.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAssistant();
        orbRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeAssistant]);

  // Click-outside closes (no dim backdrop on desktop).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (orbRef.current?.contains(target)) return;
      closeAssistant();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, closeAssistant]);

  return (
    <div className="fixed bottom-6 right-6 z-[8500]">
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            key="assistant-panel"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={withReduced(spring.bubble, reduced)}
            style={{ transformOrigin: 'bottom right' }}
            className="absolute bottom-[72px] right-0 w-[380px] h-[560px] max-h-[calc(100vh-7rem)]
                       overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            role="dialog"
            aria-label="Chat with Devanshu"
          >
            <ChatPanel onClose={closeAssistant} />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        ref={orbRef}
        type="button"
        data-magnetic="button"
        onClick={toggleAssistant}
        aria-label="Ask Devanshu"
        aria-expanded={open}
        className="grid place-items-center w-14 h-14 rounded-full border border-border
                   bg-text text-bg shadow-xl transition-transform active:scale-95
                   hover:scale-[1.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-text-secondary"
      >
        <MessageSquare size={22} strokeWidth={2} />
      </button>
    </div>
  );
}
