'use client';

/**
 * WindowManager
 *
 * Renders all open windows and manages their lifecycle.
 * Reads app components from the centralized appRegistry.
 */

import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { appRegistry } from '@/lib/appRegistry';
import { playSound } from '@/hooks/useSoundEffects';
import Window from './Window';
import AppLoader from './AppLoader';
import type { AppType } from '../../../../shared/types';

export default function WindowManager() {
  const windows = useOSStore(state => state.windows);

  // Track which apps we've seen to detect opens/closes
  const previousWindowIds = useRef<Set<string>>(new Set());

  const visibleWindows = useMemo(
    () => windows.filter(w => w.isOpen && !w.isMinimized),
    [windows]
  );

  // Stable serialized key for open window IDs to avoid effect re-firing
  const openWindowKey = useMemo(() => {
    const openWindows = windows.filter(w => w.isOpen);
    return openWindows.map(w => w.id).join(',');
  }, [windows]);

  const allOpenWindows = useMemo(
    () => windows.filter(w => w.isOpen),
    [windows]
  );

  // Track app opens and closes.
  // Uses getState() instead of selectors to avoid useSyncExternalStore
  // subscriptions that cause infinite re-render loops in React 19 when
  // the analytics store is updated during the commit phase.
  // Defer analytics tracking out of React's commit phase using setTimeout
  // to prevent useSyncExternalStore tearing detection from causing infinite loops
  useEffect(() => {
    const currentIds = new Set(allOpenWindows.map(w => w.id));
    const previousIds = previousWindowIds.current;

    const newWindows = allOpenWindows.filter(w => !previousIds.has(w.id));
    const closedIds = [...previousIds].filter(id => !currentIds.has(id));

    previousWindowIds.current = currentIds;

    if (newWindows.length === 0 && closedIds.length === 0) return;

    // Defer store updates to avoid triggering useSyncExternalStore during commit
    const timer = setTimeout(() => {
      const { trackAppOpen, trackAppClose } = useAnalyticsStore.getState();
      newWindows.forEach(w => {
        trackAppOpen(w.appType);
        playSound('windowOpen');
      });
      closedIds.forEach(id => {
        const appType = id.split('-').slice(0, -1).join('-') as AppType;
        trackAppClose(appType);
        playSound('windowClose');
      });
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openWindowKey]);

  return (
    <AnimatePresence mode="popLayout">
      {visibleWindows.map((window) => {
        const registration = appRegistry[window.appType];
        if (!registration) return null;
        const AppComponent = registration.component;

        return (
          <Window key={window.id} window={window}>
            <Suspense fallback={<AppLoader />}>
              <AppComponent />
            </Suspense>
          </Window>
        );
      })}
    </AnimatePresence>
  );
}
