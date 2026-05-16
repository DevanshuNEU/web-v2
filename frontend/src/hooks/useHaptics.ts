'use client';

import { useCallback } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 8,
  medium: 14,
  heavy: 24,
  success: [10, 30, 10],
  warning: [20, 40, 20],
};

/**
 * Thin wrapper around navigator.vibrate. No-op on browsers that don't support
 * it (most desktops, iOS Safari). Calls are safe to issue unconditionally.
 */
export function useHaptics() {
  return useCallback((pattern: HapticPattern = 'light') => {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      // Some browsers throw on disallowed contexts; swallow silently.
    }
  }, []);
}
