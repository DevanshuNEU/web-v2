'use client';

/**
 * FirstVisitHint — a one-time, auto-dismissing nudge for new visitors.
 *
 * Shows above the dock grid (launchpad) button after a short delay.
 * Disappears after 7s, on click anywhere, or once the launchpad opens.
 * Uses localStorage so it never shows again after the first visit.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, ArrowDown } from 'lucide-react';

const STORAGE_KEY = 'devos_hint_dismissed';

interface FirstVisitHintProps {
  onDismiss?: () => void;
}

export default function FirstVisitHint({ onDismiss }: FirstVisitHintProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already seen
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    // Auto-dismiss after 7s
    const timer = setTimeout(() => dismiss(), 7000);
    return () => clearTimeout(timer);
  }, [visible]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, '1');
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={dismiss}
          className="fixed bottom-[90px] left-1/2 -translate-x-1/2 z-[60] cursor-pointer"
        >
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm font-medium select-none"
            style={{
              background: 'rgba(30, 30, 30, 0.82)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              color: 'rgba(255,255,255,0.92)',
            }}
          >
            <LayoutGrid size={14} className="flex-shrink-0 text-blue-400" />
            <span>Click the grid to explore more · or open the icons above ↖</span>
            <ArrowDown size={12} className="flex-shrink-0 text-white/40 animate-bounce" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
