'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import Desktop from '@/components/os/Desktop';
import WindowManager from '@/components/os/WindowManager';
import BootSequence from '@/components/os/BootSequence';
import NotificationCenter from '@/components/os/NotificationCenter';
import { DesktopWidgets } from '@/components/widgets/DesktopWidgets';
import MobileFallback from '@/components/os/MobileFallback';
import PhoneShell from '@/components/mobile/PhoneShell';
import Spotlight from '@/components/os/Spotlight';
import AppSwitcher from '@/components/os/AppSwitcher';
import AssistantBubble from '@/components/assistant/AssistantBubble';
import { hasBootedThisSession, markBootedThisSession } from '@/lib/bootSession';

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

export default function DesktopHome() {
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

    // The boot plays once per browser (lib/bootSession.ts), not once per tab.
    if (hasBootedThisSession()) setBooted();

    setMounted(true);

    return () => window.removeEventListener('resize', check);
  }, [setBooted]);

  // Re-check on a mobile-to-desktop switch: unlocking the phone shell marks
  // the session, and the desktop should not replay the boot after that.
  // Layout effect so BootSequence never paints for a frame.
  useLayoutEffect(() => {
    if (!isMobile && !isBooted && hasBootedThisSession()) setBooted();
  }, [isMobile, isBooted, setBooted]);

  useEffect(() => {
    if (!isBooted) return;
    markBootedThisSession();

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

  // Mobile users get the iOS-style PhoneShell — a parallel devOS that mirrors
  // the macOS shell on phones. The old static fallback is preserved behind
  // ?legacy-mobile=1 as an escape hatch during build-out.
  if (isMobile) {
    const useLegacy =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('legacy-mobile');
    return useLegacy ? <MobileFallback /> : <PhoneShell />;
  }

  return (
    <>
      {/* The intro dissolves over the desktop once it has mounted */}
      <AnimatePresence>{!isBooted && <BootSequence key="boot" />}</AnimatePresence>

      {isBooted && (
        <Desktop
          overlays={
            <>
              <NotificationCenter />
              {/* Spotlight search: Cmd+K, /, the menu bar button or the right-click menu */}
              <Spotlight />
              {/* App switcher: Option+Tab / Option+Shift+Tab cycles open windows */}
              <AppSwitcher />
              {/* Floating assistant: orb that expands into a chat panel */}
              <AssistantBubble />
            </>
          }
        >
          {/* Stage Manager is gone: it covered the desktop icons and repeated
              the dock's running-app dots. The dock and Option+Tab cover it. */}
          <WindowManager />
          <DesktopWidgets />
        </Desktop>
      )}
    </>
  );
}
