'use client';

import { useState, useEffect } from 'react';
import { useOSStore } from '@/store/osStore';
import Desktop from '@/components/os/Desktop';
import WindowManager from '@/components/os/WindowManager';
import StageManager from '@/components/os/StageManager';
import BootSequence from '@/components/os/BootSequence';
import NotificationCenter from '@/components/os/NotificationCenter';
import { DesktopWidgets } from '@/components/widgets/DesktopWidgets';

/**
 * localStorage key that marks whether the user has ever visited devOS.
 * Unlike sessionStorage (cleared on tab close), localStorage persists so
 * About Me only auto-opens on the first-ever visit, not every page refresh.
 */
const FIRST_VISIT_KEY = 'devos-first-visit';

export default function Home() {
  const isBooted     = useOSStore(state => state.isBooted);
  const setBooted    = useOSStore(state => state.setBooted);
  const openWindow   = useOSStore(state => state.openWindow);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Skip the boot sequence if the user already saw it this session
    if (sessionStorage.getItem('devos-booted') === '1') {
      setBooted();
    }
  }, [setBooted]);

  useEffect(() => {
    if (!isBooted) return;

    // Persist boot state for this browser session (skips animation on refresh)
    sessionStorage.setItem('devos-booted', '1');

    // Auto-open About Me on the very first visit ever.
    // A brief delay lets the desktop finish its mount animation first so the
    // window entrance feels intentional rather than janky.
    if (!localStorage.getItem(FIRST_VISIT_KEY)) {
      localStorage.setItem(FIRST_VISIT_KEY, '1');
      const timer = setTimeout(() => openWindow('about-me'), 700);
      return () => clearTimeout(timer);
    }
  }, [isBooted, openWindow]);

  // Avoid hydration mismatch — render nothing until client mounts
  if (!mounted) return null;

  return (
    <>
      {!isBooted && <BootSequence />}

      {isBooted && (
        <Desktop>
          <StageManager />
          <WindowManager />
          <NotificationCenter />
          <DesktopWidgets />
        </Desktop>
      )}
    </>
  );
}
