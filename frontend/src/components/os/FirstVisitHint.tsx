'use client';

/**
 * FirstVisitHint: a one-time nudge that points first-time visitors at the
 * dock's grid (Launchpad) button.
 *
 * It sits to the LEFT of the dock, vertically centred on the grid button,
 * with a caret pointing at it. That band is reserved for the dock, so the hint
 * stays clear of window content; if a window has been dragged over the spot,
 * the hint stays hidden instead of covering it.
 *
 * Shows after a short delay, dismisses after 8s, on "Got it", or once the
 * Launchpad opens. Uses localStorage so it never shows again.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { getLaunchpadButtonRect } from '@/lib/dockRegistry';
import { MENUBAR_H, DOCK_H } from '@/lib/windowSnap';
import { Z } from '@/lib/zLayers';

const STORAGE_KEY = 'devos_hint_dismissed';
const GAP = 14;           // px between the hint's caret and the grid button
const HINT_W = 200;       // generous width estimate for the overlap check
const HINT_H = 40;

interface FirstVisitHintProps {
  /** False once the visitor has opened the Launchpad. */
  active?: boolean;
  onDismiss?: () => void;
}

interface Anchor { right: number; centerY: number }

function readAnchor(): Anchor | null {
  const r = getLaunchpadButtonRect();
  if (!r) return null;
  return { right: window.innerWidth - r.left + GAP, centerY: r.top + r.height / 2 };
}

export default function FirstVisitHint({ active = true, onDismiss }: FirstVisitHintProps) {
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const reduced = useReducedMotion();
  const windows = useOSStore(s => s.windows);

  const dismiss = useCallback(() => {
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    try { if (localStorage.getItem(STORAGE_KEY)) return; } catch { return; }
    const timer = setTimeout(() => { setAnchor(readAnchor()); setVisible(true); }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onResize = () => setAnchor(readAnchor());
    window.addEventListener('resize', onResize);
    const timer = setTimeout(dismiss, 8000);
    return () => { clearTimeout(timer); window.removeEventListener('resize', onResize); };
  }, [visible, dismiss]);

  // Never cover a window: hide while any open window overlaps the hint's box.
  const covered = anchor ? windows.some(w => {
    if (!w.isOpen || w.isMinimized) return false;
    const vw = window.innerWidth;
    const box = w.isMaximized
      ? { x: 0, y: MENUBAR_H, width: vw, height: window.innerHeight - MENUBAR_H - DOCK_H }
      : { ...w.position, ...w.size };
    const left = vw - anchor.right - HINT_W;
    const right = vw - anchor.right;
    const top = anchor.centerY - HINT_H / 2;
    const bottom = anchor.centerY + HINT_H / 2;
    return box.x < right && box.x + box.width > left && box.y < bottom && box.y + box.height > top;
  }) : false;

  const show = active && visible && !!anchor && !covered;

  return (
    <AnimatePresence>
      {show && anchor && (
        <motion.div
          role="status"
          initial={reduced ? { opacity: 0, y: '-50%' } : { opacity: 0, x: -6, y: '-50%' }}
          animate={{ opacity: 1, x: 0, y: '-50%' }}
          exit={reduced ? { opacity: 0, y: '-50%' } : { opacity: 0, x: -6, y: '-50%' }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed"
          style={{ zIndex: Z.hint, right: anchor.right, top: anchor.centerY }}
        >
          <div
            className="relative flex items-center gap-3 rounded-xl border border-border bg-surface/95
                       py-2 pl-3.5 pr-2 text-[13px] font-medium text-text shadow-xl backdrop-blur-xl select-none"
          >
            <span>All apps live here</span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss hint"
              className="rounded-md px-2 py-0.5 text-[12px] text-text-secondary hover:bg-text/10 hover:text-text"
            >
              Got it
            </button>
            {/* Caret pointing right, at the grid button */}
            <span
              aria-hidden
              className="absolute -right-[6px] top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-r border-t border-border bg-surface"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
