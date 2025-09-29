'use client';

import { useEffect } from 'react';
import { useOSStore } from '@/store/osStore';

export function useKeyboardShortcuts() {
  const { openWindow, focusWindow, closeWindow, windows, activeWindowId } = useOSStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when no input is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Cmd/Ctrl key shortcuts
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            openWindow('about-me');
            break;
          case '2':
            e.preventDefault();
            openWindow('projects');
            break;
          case '3':
            e.preventDefault();
            openWindow('skills-dashboard');
            break;
          case '4':
            e.preventDefault();
            openWindow('contact');
            break;
          case 'w':
            e.preventDefault();
            if (activeWindowId) {
              closeWindow(activeWindowId);
            }
            break;
        }
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
