'use client';

/**
 * PhoneShell — root component for the iOS-style devOS sibling.
 *
 * Renders inside a 100dvh viewport with the active wallpaper as backdrop.
 * Layer stack (bottom → top):
 *   1. Wallpaper (themeStore)
 *   2. HomeScreen — always mounted so swipes feel instant
 *   3. AppView    — animates over the home screen when an app is open
 *   4. LockScreen — overlays everything until unlocked
 *
 * On the very first visit (FIRST_VISIT_KEY parity with desktop), the lock
 * screen unlocks automatically into About Me after the dramatic moment.
 */

import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useMobileStore } from '@/store/mobileStore';
import { useTheme } from '@/store/themeStore';
import { useIsMono } from '@/hooks/usePalette';
import LockScreen from './LockScreen';
import HomeScreen from './HomeScreen';
import AppView from './AppView';
import AssistantSheet from './AssistantSheet';
import type { AppType } from '../../../../shared/types';

const FIRST_VISIT_KEY = 'devos-first-visit';

export default function PhoneShell() {
  const locked = useMobileStore((s) => s.locked);
  const openApp = useMobileStore((s) => s.openApp);
  const { wallpaper, mode } = useTheme();
  const mono = useIsMono();

  // First-visit auto-open About Me, mirroring src/app/page.tsx
  useEffect(() => {
    if (locked) return;
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(FIRST_VISIT_KEY)) {
      localStorage.setItem(FIRST_VISIT_KEY, '1');
      const t = setTimeout(() => openApp('about-me'), 150);
      return () => clearTimeout(t);
    }
  }, [locked, openApp]);

  // System back (Android gesture/button, browser back) closes the open app
  // instead of leaving the page. Pairs with the history.pushState wired up
  // inside mobileStore.openApp / closeApp.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      const { openAppType, closeAppFromPopstate } = useMobileStore.getState();
      if (openAppType) closeAppFromPopstate();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleOpen = (appType: AppType) => openApp(appType);

  return (
    <div
      className={`fixed inset-0 overflow-hidden ${mode === 'dark' ? 'dark' : ''}`}
      style={{ height: '100dvh' }}
    >
      {/* Wallpaper layer — its own element so mono can grayscale it without
          touching the foreground UI. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: wallpaperBackground(wallpaper),
          filter: mono ? 'grayscale(1)' : undefined,
        }}
      />

      {/* Subtle darkening overlay so icons/labels remain legible across wallpapers */}
      <div className="absolute inset-0 bg-black/15 pointer-events-none" />

      <HomeScreen onOpenApp={handleOpen} />

      <AppView />

      {/* Floating assistant — FAB + bottom sheet (self-hides while locked) */}
      <AssistantSheet />

      <AnimatePresence>{locked && <LockScreen />}</AnimatePresence>
    </div>
  );
}

function wallpaperBackground(
  wp: ReturnType<typeof useTheme>['wallpaper']
): string {
  if (!wp) {
    return 'linear-gradient(135deg, #0d1117 0%, #0f1923 50%, #1a0f2e 100%)';
  }
  if (wp.imageUrl) return `url(${wp.imageUrl}) center/cover`;
  if (wp.thumbnail) return wp.thumbnail;
  if (wp.gradientConfig) {
    const { colors, angle } = wp.gradientConfig;
    return `linear-gradient(${angle}deg, ${colors.join(', ')})`;
  }
  if (wp.animatedConfig) {
    // Static fallback for animated wallpapers — phone shell doesn't paint
    // the animated canvas (perf budget).
    return `linear-gradient(135deg, ${wp.animatedConfig.colors.join(', ')})`;
  }
  return 'linear-gradient(135deg, #0d1117 0%, #0f1923 50%, #1a0f2e 100%)';
}
