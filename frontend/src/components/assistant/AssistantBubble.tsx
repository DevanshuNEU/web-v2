'use client';

/**
 * AssistantBubble — the desktop floating assistant.
 *
 * A monochrome orb pinned to the bottom-right of the desktop. Clicking it
 * expands a chat panel anchored above the orb (transform-origin bottom-right),
 * hosting the shared ChatPanel. Closing keeps the conversation intact.
 *
 * Strictly neutral tokens (no accent). A graphite orb, not a white one, so it
 * does not outshine the content; it turns into a close button while open.
 * Reduced-motion collapses the entrance.
 *
 * Rendered in Desktop's overlays slot at Z.assistant: above windows and the
 * dock, below Spotlight (lib/zLayers.ts).
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MessageSquare, X } from 'lucide-react';
import { useAssistantUiStore } from '@/store/assistantUiStore';
import { spring, withReduced } from '@/lib/motion';
import ChatPanel from '@/components/chat/ChatPanel';
import { useEscapeLayer } from '@/lib/escapeStack';
import { Z } from '@/lib/zLayers';

export default function AssistantBubble() {
  const reduced = useReducedMotion();
  const open = useAssistantUiStore((s) => s.open);
  const toggleAssistant = useAssistantUiStore((s) => s.toggleAssistant);
  const closeAssistant = useAssistantUiStore((s) => s.closeAssistant);

  const orbRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close and hand focus back to the orb (Esc and the header X both do this).
  const closeAndRefocus = () => {
    closeAssistant();
    orbRef.current?.focus();
  };

  // Esc closes the panel when it is the topmost layer.
  useEscapeLayer(open, closeAndRefocus);

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
    <div className="fixed bottom-6 right-6" style={{ zIndex: Z.assistant }}>
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
            className="absolute bottom-[72px] right-0 w-[380px] h-[min(520px,calc(100vh-9rem))]
                       overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            role="dialog"
            aria-label="Ask Devanshu (AI)"
          >
            <ChatPanel onClose={closeAndRefocus} />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        ref={orbRef}
        type="button"
        data-magnetic="button"
        onClick={toggleAssistant}
        aria-label={open ? 'Close chat' : 'Ask Devanshu (AI)'}
        title={open ? 'Close chat' : 'Ask Devanshu (AI)'}
        aria-expanded={open}
        className="grid place-items-center w-14 h-14 rounded-full border border-border
                   bg-surface text-text shadow-xl transition-transform active:scale-95
                   hover:scale-[1.04] hover:border-text-secondary"
      >
        {open ? <X size={22} strokeWidth={2} aria-hidden /> : <MessageSquare size={22} strokeWidth={2} aria-hidden />}
      </button>
    </div>
  );
}
