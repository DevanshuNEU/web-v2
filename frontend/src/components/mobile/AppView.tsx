'use client';

/**
 * AppView — fullscreen wrapper that mounts a single app component with
 * `variant='mobile'`. Handles entrance/exit transition and pull-down-to-close.
 *
 * Only one app is mounted at a time (mobileStore.openAppType). Chrome is one
 * 44px nav bar (plus the safe-area inset): Back on the left when the app has
 * drilled in, the current title in the middle, Ask and Done on the right. It
 * replaces the old fake status bar plus a separate Done row (88px before any
 * content, 132px in drill-in apps). Apps built on MobilePushView hand their
 * title and Back up through AppChromeContext instead of drawing a second bar.
 *
 * The bar is also the pull-down grabber, so the dismiss gesture never fights
 * the app's own scrolling.
 */

import { Suspense, useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, MessageSquare } from 'lucide-react';
import { appRegistry, getAppLabel } from '@/lib/appRegistry';
import { getMobileApp } from '@/lib/mobileAppRegistry';
import { useMobileStore } from '@/store/mobileStore';
import { useAssistantUiStore } from '@/store/assistantUiStore';
import { usePullToDismiss } from '@/hooks/usePullToDismiss';
import { useHaptics } from '@/hooks/useHaptics';
import { useIsMono } from '@/hooks/usePalette';
import { spring, withReduced } from '@/lib/motion';
import ErrorBoundary from '@/components/util/ErrorBoundary';
import { AppChromeContext, type AppChrome, type AppNavState } from './ui/AppChromeContext';
import type { AppType } from '../../../../shared/types';

interface AppComponentProps {
  variant?: 'desktop' | 'mobile';
}

export default function AppView() {
  const openAppType = useMobileStore((s) => s.openAppType);
  const closeApp = useMobileStore((s) => s.closeApp);
  const openAssistant = useAssistantUiStore((s) => s.openAssistant);
  const haptics = useHaptics();
  const reduced = useReducedMotion();
  const mono = useIsMono();

  // Navigation handed up by the app's MobilePushView, if it has one.
  const [pushNav, setPushNav] = useState<AppNavState | null>(null);
  const chrome = useMemo<AppChrome>(() => ({ setNav: setPushNav }), []);

  const close = useCallback(() => {
    haptics('light');
    closeApp();
  }, [haptics, closeApp]);

  const { offsetY, handlers } = usePullToDismiss({
    onDismiss: () => {
      haptics('medium');
      closeApp();
    },
  });

  // Capture the pointer so the drag keeps tracking when the finger leaves the
  // bar; touch-none on the bar stops the browser claiming it as a scroll.
  const onBarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    handlers.onPointerDown(e);
  };

  const ink = mono ? 'text-text' : 'text-accent';
  const title = openAppType ? pushNav?.title ?? getMobileApp(openAppType).label : '';

  return (
    <AnimatePresence>
      {openAppType && (
        <motion.div
          key={openAppType}
          initial={{ y: '100%' }}
          animate={{ y: offsetY }}
          exit={{ y: '100%' }}
          transition={withReduced(spring.bubble, reduced)}
          className="absolute inset-0 z-30 flex flex-col bg-bg text-text overflow-hidden"
        >
          <div
            {...handlers}
            onPointerDown={onBarPointerDown}
            className="relative flex-shrink-0 pt-safe border-b border-border/60 touch-none select-none cursor-grab active:cursor-grabbing"
          >
            {/* Grabber: says "pull me down" without taking a row of its own. */}
            <div
              aria-hidden
              className="absolute left-1/2 -translate-x-1/2 w-9 h-1 rounded-full bg-text-secondary/30"
              style={{ top: 'calc(env(safe-area-inset-top) + 4px)' }}
            />
            {/* Side columns grow to their content and share what is left
                equally, so the title stays centred until it has to truncate. */}
            <nav
              aria-label={`${title} navigation`}
              className="grid h-11 grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)] items-center px-1"
            >
              <div className="flex items-center justify-start">
                {pushNav?.onBack && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={pushNav.onBack}
                    aria-label={pushNav.backLabel ? `Back to ${pushNav.backLabel}` : 'Back'}
                    className={`touch-target flex items-center pr-2 text-[16px] active:opacity-50 transition-opacity ${ink}`}
                  >
                    <ChevronLeft size={26} strokeWidth={2.2} aria-hidden />
                    {pushNav.backLabel && (
                      <span className="max-w-[96px] truncate leading-none">{pushNav.backLabel}</span>
                    )}
                  </button>
                )}
              </div>

              <div className="min-w-0 px-1 text-center">
                {/* Not a heading: the app body owns its own h1. */}
                <span className="block truncate text-[17px] font-semibold text-text">{title}</span>
              </div>

              <div className="flex items-center justify-end">
                {pushNav?.rightAction}
                {openAppType !== 'dev-ai' && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      haptics('light');
                      openAssistant();
                    }}
                    aria-label="Ask AI about Devanshu"
                    className="touch-target grid place-items-center text-text-secondary active:opacity-50 transition-opacity"
                  >
                    <MessageSquare size={20} strokeWidth={2} aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={close}
                  className={`touch-target flex items-center justify-center px-3 text-[16px] font-semibold active:opacity-50 transition-opacity ${ink}`}
                >
                  Done
                </button>
              </div>
            </nav>
          </div>

          {/* App body */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <AppChromeContext.Provider value={chrome}>
              <Suspense
                fallback={
                  <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                    Loading…
                  </div>
                }
              >
                <ErrorBoundary key={openAppType} label={getAppLabel(openAppType).title}>
                  <MobileAppHost appType={openAppType} />
                </ErrorBoundary>
              </Suspense>
            </AppChromeContext.Provider>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MobileAppHost({ appType }: { appType: AppType }) {
  const reg = appRegistry[appType];
  const Component = reg.component as React.LazyExoticComponent<
    React.ComponentType<AppComponentProps>
  >;
  return <Component variant="mobile" />;
}
