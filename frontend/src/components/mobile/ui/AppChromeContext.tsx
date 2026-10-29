'use client';

/**
 * AppChromeContext: lets an app's MobilePushView hand its navigation (title,
 * back, right action) up to the phone shell's single nav bar in AppView.
 *
 * Without it, a drill-in app stacked three bars (shell row with Done, then the
 * push view's own bar with Back and title). With it, AppView draws one 44px bar:
 * Back on the left, the current view's title in the middle, Ask and Done on the
 * right. Outside the phone shell (tests, /mobile-preview) there is no provider,
 * so MobilePushView keeps rendering its own MobileNavBar.
 */

import { createContext, useContext } from 'react';
import type React from 'react';

export interface AppNavState {
  /** Title of the view on top of the stack. */
  title?: string;
  /** Present when the stack is deeper than its root. */
  onBack?: () => void;
  /** Title of the view underneath, shown after the chevron. */
  backLabel?: string;
  /** Optional per-view action, drawn before Ask and Done. */
  rightAction?: React.ReactNode;
}

export interface AppChrome {
  setNav: (nav: AppNavState | null) => void;
}

export const AppChromeContext = createContext<AppChrome | null>(null);

export function useAppChrome(): AppChrome | null {
  return useContext(AppChromeContext);
}
