'use client';

import { useState, useEffect } from 'react';
import { useOSStore } from '@/store/osStore';
import Desktop from '@/components/os/Desktop';
import WindowManager from '@/components/os/WindowManager';
import StageManager from '@/components/os/StageManager';
import BootSequence from '@/components/os/BootSequence';
import NotificationCenter from '@/components/os/NotificationCenter';
import { DesktopWidgets } from '@/components/widgets/DesktopWidgets';
import MobileFallback from '@/components/os/MobileFallback';
import Spotlight from '@/components/os/Spotlight';
import AppSwitcher from '@/components/os/AppSwitcher';

/**
 * localStorage key that marks whether the user has ever visited devOS.
 * Unlike sessionStorage (cleared on tab close), localStorage persists across
 * sessions so About Me only auto-opens on the absolute first visit.
 */
const FIRST_VISIT_KEY = 'devos-first-visit';

/**
 * Screen width below which we show the mobile fallback instead of the
 * full macOS desktop simulation. 768px matches Tailwind's `md` breakpoint.
 * The desktop sim relies on hover/drag interactions that don't work on touch.
 */
const MOBILE_BREAKPOINT = 768;

export default function Home() {
  const isBooted   = useOSStore(state => state.isBooted);
  const setBooted  = useOSStore(state => state.setBooted);
  const openWindow = useOSStore(state => state.openWindow);

  // mounted guards against SSR/hydration mismatch — window is undefined on the server
  const [mounted,  setMounted]  = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile on mount and on resize
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);

    setMounted(true);

    return () => window.removeEventListener('resize', check);
  }, [setBooted]);

  useEffect(() => {
    if (!isBooted) return;

    // Auto-open About Me on the very first visit ever.
    // A short delay lets the desktop finish mounting so the window entrance
    // feels smooth rather than appearing mid-animation.
    if (!localStorage.getItem(FIRST_VISIT_KEY)) {
      localStorage.setItem(FIRST_VISIT_KEY, '1');
      const timer = setTimeout(() => openWindow('about-me'), 700);
      return () => clearTimeout(timer);
    }
  }, [isBooted, openWindow]);

  // Avoid hydration mismatch — render nothing until client mounts
  if (!mounted) return null;

  // Mobile users get a clean, touch-friendly layout instead of the desktop sim
  if (isMobile) return <MobileFallback />;

  return (
    <>
      {!isBooted && <BootSequence />}

      {isBooted && (
        <Desktop>
          <StageManager />
          <WindowManager />
          <NotificationCenter />
          <DesktopWidgets />
          {/* Spotlight search — self-contained, listens for Cmd+K globally */}
          <Spotlight />
          {/* App switcher — Alt+Tab / Alt+Shift+Tab cycles open windows */}
          <AppSwitcher />
        </Desktop>
      )}
    </>
  );
}
