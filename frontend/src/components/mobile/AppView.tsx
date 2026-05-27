'use client';

/**
 * AppView — fullscreen wrapper that mounts a single app component with
 * `variant='mobile'`. Handles entrance/exit transition and pull-down-to-close.
 *
 * Only one app is mounted at a time (mobileStore.openAppType). The dismiss
 * gesture is anchored to the top "grabber" strip so it doesn't conflict with
 * intra-app scrolling.
 */

import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { appRegistry, getAppLabel } from '@/lib/appRegistry';
import { useMobileStore } from '@/store/mobileStore';
import { usePullToDismiss } from '@/hooks/usePullToDismiss';
import { useHaptics } from '@/hooks/useHaptics';
import ErrorBoundary from '@/components/util/ErrorBoundary';
import StatusBar from './StatusBar';
import type { AppType } from '../../../../shared/types';

interface AppComponentProps {
  variant?: 'desktop' | 'mobile';
}

export default function AppView() {
  const openAppType = useMobileStore((s) => s.openAppType);
  const closeApp = useMobileStore((s) => s.closeApp);
  const haptics = useHaptics();

  const { offsetY, handlers } = usePullToDismiss({
    onDismiss: () => {
      haptics('medium');
      closeApp();
    },
  });

  return (
    <AnimatePresence>
      {openAppType && (
        <motion.div
          key={openAppType}
          initial={{ y: '100%' }}
          animate={{ y: offsetY }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          className="absolute inset-0 z-30 flex flex-col bg-bg text-text overflow-hidden"
        >
          {/* Drag handle / status bar — pull-down dismisses; "Done" is the visible affordance. */}
          <div
            {...handlers}
            className="flex-shrink-0 pt-safe relative cursor-grab active:cursor-grabbing"
          >
            <StatusBar light={false} />
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-9 h-1 rounded-full bg-text-secondary/30" />
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                haptics('light');
                closeApp();
              }}
              aria-label="Close app"
              className="touch-target absolute top-0 right-2 px-3 flex items-center justify-center text-accent text-[15px] font-medium active:opacity-50 transition-opacity cursor-pointer"
            >
              Done
            </button>
          </div>

          {/* App body */}
          <div className="flex-1 overflow-hidden">
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
