'use client';

import { useEffect } from 'react';
import { useOSStore } from '@/store/osStore';
import { runRecruiterTour } from '@/lib/recruiterTour';
import { appShortcutDigit, isCloseWindowShortcut, isTourShortcut } from '@/lib/shortcuts';
import type { AppType } from '../../../shared/types';

const APP_BY_DIGIT: Record<1 | 2 | 3 | 4, AppType> = {
  1: 'about-me',
  2: 'projects',
  3: 'skills-dashboard',
  4: 'contact',
};

export function useKeyboardShortcuts() {
  const openWindow = useOSStore(state => state.openWindow);
  const focusWindow = useOSStore(state => state.focusWindow);
  const closeWindow = useOSStore(state => state.closeWindow);
  const windows = useOSStore(state => state.windows);
  const activeWindowId = useOSStore(state => state.activeWindowId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when no input is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Option/Alt shortcuts. Cmd+1..4, Cmd+W and Cmd+Shift+T belong to the
      // browser (switch tab, close tab, reopen tab) and never reach the page.
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
        return;
      }

      // Escape key to close active window
      if (e.key === 'Escape' && activeWindowId) {
        closeWindow(activeWindowId);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openWindow, focusWindow, closeWindow, windows, activeWindowId]);
}
