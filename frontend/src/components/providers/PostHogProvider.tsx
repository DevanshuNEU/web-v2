'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { startPostHog } from '@/store/analyticsStore';

/**
 * Starts PostHog once on mount. startPostHog (store/analyticsStore.ts) skips
 * init entirely for a visitor who opted out on an earlier visit, and is the
 * same path the opt-in toggle uses, so the choice is honored in one place.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    startPostHog();
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
