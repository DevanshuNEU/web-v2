'use client';

/**
 * MobileBottomSheet — iOS-style modal sheet that slides up from the bottom.
 *
 * Built on top of Radix Dialog (handles focus trap, Escape key,
 * body-scroll-lock, ARIA roles) and Framer Motion (slide + drag-to-dismiss
 * gesture with spring physics). Reach for this when you'd reach for a
 * UIPresentationController .pageSheet on iOS: lightweight modal that the
 * user can swipe down to dismiss.
 *
 * Drag mechanics:
 *  • Only the handle area starts a drag (content underneath scrolls freely)
 *  • Releasing past 100px OR with velocity > 500px/s dismisses
 *  • Otherwise the sheet springs back to its rest position
 *  • Dragging up is rigid (no rubber-band) — sheet is at max height
 *
 * v1 limitation: single rest position sized to content (max 90vh).
 * Multi-snap-point behaviour (e.g. medium ↔ large) will land in a follow-up.
 */

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  motion,
  AnimatePresence,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from 'framer-motion';
import { spring, withReduced, INSTANT } from '@/lib/motion';

export interface MobileBottomSheetProps {
  open: boolean;
  /** Called when the user dismisses via backdrop tap, Escape, or drag-down. */
  onClose: () => void;
  /** Visible title rendered near the drag handle. Required for a11y — if you
   *  don't want one visible, pass it anyway and we'll visually hide it. */
  title: React.ReactNode;
  /** Hide the visible title (still rendered for screen readers). */
  hideTitle?: boolean;
  /** Hide the drag-handle pill. Default false. */
  hideHandle?: boolean;
  /** Disable backdrop click / Escape / drag dismissal. Default true. */
  dismissible?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const DRAG_DISMISS_OFFSET_PX = 100;
const DRAG_DISMISS_VELOCITY = 500;

export default function MobileBottomSheet({
  open,
  onClose,
  title,
  hideTitle = false,
  hideHandle = false,
  dismissible = true,
  children,
  className = '',
}: MobileBottomSheetProps) {
  const dragControls = useDragControls();
  const reduced = useReducedMotion();

  const handleDragEnd = (
    _: PointerEvent | MouseEvent | TouchEvent,
    info: PanInfo
  ) => {
    if (!dismissible) return;
    if (info.offset.y > DRAG_DISMISS_OFFSET_PX || info.velocity.y > DRAG_DISMISS_VELOCITY) {
      onClose();
    }
    // Otherwise: Framer Motion's `animate={{ y: 0 }}` springs it back automatically.
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && dismissible) onClose();
      }}
    >
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[60] bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={reduced ? INSTANT : { duration: 0.2 }}
              />
            </Dialog.Overlay>

            <Dialog.Content
              asChild
              forceMount
              // We don't render a Description — opt out of Radix's warning.
              // Sheets aren't confirmation dialogs; the title alone is enough.
              aria-describedby={undefined}
              onPointerDownOutside={(e) => {
                if (!dismissible) e.preventDefault();
              }}
              onEscapeKeyDown={(e) => {
                if (!dismissible) e.preventDefault();
              }}
            >
              <motion.div
                data-testid="sheet-content"
                drag={dismissible ? 'y' : false}
                dragControls={dragControls}
                dragListener={false}
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0, bottom: 0.15 }}
                onDragEnd={handleDragEnd}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={withReduced(spring.bubble, reduced)}
                // Upward-cast variant of --shadow-lg (same 8px/32px geometry,
                // theme-matched 0.10 light / 0.40 dark opacity). A bottom sheet
                // must cast its shadow up, so we can't use the downward shadow-lg
                // utility directly; the alpha tracks the token scale instead of
                // the previous arbitrary 0.18.
                className={`fixed bottom-0 left-0 right-0 z-[70] max-h-[90vh] flex flex-col bg-surface text-text rounded-t-[14px] shadow-[0_-8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.4)] pb-safe ${className}`}
              >
                {/* Drag-handle area — only this region starts a drag.
                    Content underneath remains free to scroll. */}
                <div
                  data-testid="sheet-drag-area"
                  onPointerDown={(e) => {
                    if (dismissible) dragControls.start(e);
                  }}
                  className={`flex items-center justify-center pt-2 pb-1 ${
                    dismissible ? 'cursor-grab active:cursor-grabbing' : ''
                  } touch-none`}
                >
                  {!hideHandle && (
                    <div
                      data-testid="sheet-handle"
                      className="w-9 h-[5px] rounded-full bg-text-secondary/40"
                    />
                  )}
                </div>

                <div
                  className={`px-5 pt-1 pb-3 ${hideTitle ? '' : 'border-b border-border/60'}`}
                >
                  <Dialog.Title
                    className={
                      hideTitle
                        ? 'sr-only'
                        : 'text-title font-semibold leading-tight'
                    }
                  >
                    {title}
                  </Dialog.Title>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain">
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
