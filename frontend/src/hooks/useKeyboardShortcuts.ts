'use client';

import { useEffect } from 'react';
import { useOSStore } from '@/store/osStore';
import { runRecruiterTour } from '@/lib/recruiterTour';
import {
  allowsOptionShortcut,
  appShortcutDigit,
  isCloseWindowShortcut,
  isTourShortcut,
} from '@/lib/shortcuts';
import type { AppType } from '../../../shared/types';

const APP_BY_DIGIT: Record<1 | 2 | 3 | 4, AppType> = {
  1: 'about-me',
  2: 'projects',
  3: 'skills-dashboard',
  4: 'contact',
};

/**
 * Global Option shortcuts. Esc is deliberately not handled here: macOS never
 * closes a window on Esc, and Esc belongs to whatever menu or popover is on
 * top (lib/escapeStack.ts). Option+W closes the focused window.
 */
export function useKeyboardShortcuts() {
  const openWindow = useOSStore(state => state.openWindow);
  const closeWindow = useOSStore(state => state.closeWindow);
  const activeWindowId = useOSStore(state => state.activeWindowId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || !e.altKey) return;
      // Single-line fields (Terminal prompt, search boxes) still get the
      // shortcuts; multi-line text keeps Option characters. See shortcuts.ts.
      if (!allowsOptionShortcut(e.target)) return;

      // Cmd+1..4, Cmd+W and Cmd+Shift+T belong to the browser (switch tab,
      // close tab, reopen tab) and never reach the page.
      const digit = appShortcutDigit(e);
      if (digit) {
        e.preventDefault();
        openWindow(APP_BY_DIGIT[digit]);
        return;
      }
      if (isCloseWindowShortcut(e)) {
        e.preventDefault();
        if (activeWindowId) closeWindow(activeWindowId);
        return;
      }
      if (isTourShortcut(e)) {
        e.preventDefault();
        runRecruiterTour();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openWindow, closeWindow, activeWindowId]);
}
