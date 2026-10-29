/**
 * Analytics Store
 *
 * Manages session-level analytics data for the current visitor.
 * Tracks app usage, interactions, and provides data for the Analytics app.
 *
 * It also owns the visitor's tracking choice. `setOptOut` is the one switch
 * every toggle calls (the Analytics app, Preferences on desktop and phone):
 * it stops or restarts PostHog, clears the local log, and saves the choice in
 * localStorage so the next visit honors it before PostHog loads at all
 * (`startPostHog` skips init for an opted-out visitor).
 */

import { create } from 'zustand';
import { useMemo } from 'react';
import posthog from 'posthog-js';
import { appLabels } from '@/data/copy';
import type { AppType } from '../../../shared/types';

// ============================================================================
// Types
// ============================================================================

/** Single tracked event with timestamp */
export interface AnalyticsEvent {
  id: string;
  type: EventType;
  label: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/** Categories of trackable events */
export type EventType = 
  | 'app_open'
  | 'app_close'
  | 'app_focus'
  | 'theme_change'
  | 'section_view'
  | 'terminal_command'
  | 'external_link'
  | 'interaction';

/** Tracks time spent in each app */
export interface AppUsageRecord {
  appType: AppType;
  openCount: number;
  totalTimeMs: number;
  lastOpenedAt: number | null;
}

/** Device info detected from browser */
export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
}

/** Main store state */
interface AnalyticsState {
  // Session info
  sessionId: string;
  sessionStartTime: number;
  isOptedOut: boolean;
  
  // Device info
  device: DeviceInfo;
  
  // Event tracking
  events: AnalyticsEvent[];
  
  // App usage tracking
  appUsage: Record<AppType, AppUsageRecord>;
  currentlyOpenApps: Set<AppType>;
  
  // Actions
  trackEvent: (type: EventType, label: string, metadata?: Record<string, unknown>) => void;
  trackAppOpen: (appType: AppType) => void;
  trackAppClose: (appType: AppType) => void;
  trackAppFocus: (appType: AppType) => void;
  setOptOut: (optedOut: boolean) => void;
  getSessionDuration: () => number;
  getRecentEvents: (count: number) => AnalyticsEvent[];
}

// ============================================================================
// Tracking choice + PostHog lifecycle
// ============================================================================

/** localStorage key for the opt-out. "1" = opted out; absent = sharing. */
export const OPT_OUT_KEY = 'devos-analytics-optout';

/** The saved choice. False on the server and when storage is unavailable. */
export function readOptOut(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(OPT_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

function writeOptOut(optedOut: boolean): void {
  try {
    if (optedOut) window.localStorage.setItem(OPT_OUT_KEY, '1');
    else window.localStorage.removeItem(OPT_OUT_KEY);
  } catch {
    // Private mode or storage disabled: the choice still holds for this visit.
  }
}

let posthogStarted = false;

/**
 * Initialize PostHog, unless the visitor opted out or no key is configured.
 * Called once by PostHogProvider on mount, and again when an opted-out
 * visitor turns sharing back on. An opted-out visitor never loads PostHog,
 * so no pageview or autocapture event can leave before the choice applies.
 */
export function startPostHog(): void {
  if (typeof window === 'undefined' || posthogStarted || readOptOut()) return;
  // NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = set by the Vercel PostHog integration (production)
  // NEXT_PUBLIC_POSTHOG_KEY           = legacy name used in .env.local (local dev)
  const key = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
           || process.env.NEXT_PUBLIC_POSTHOG_KEY
           || '';
  if (!key) return;
  posthogStarted = true;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    respect_dnt: true,
    opt_out_capturing_by_default: false,
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') ph.debug();
    },
  });
}

/** Apply the choice to PostHog: stop it, resume it, or load it for the first time. */
function applyToPostHog(optedOut: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (posthog.__loaded) {
      if (optedOut) posthog.opt_out_capturing();
      else posthog.opt_in_capturing();
    } else if (!optedOut) {
      startPostHog();
    }
  } catch (err) {
    console.error('PostHog opt-out update failed:', err);
  }
}

/** Visitor-facing app name ("Skill Tree", not "skills-dashboard"). */
export function appTitle(appType: AppType): string {
  return appLabels[appType]?.title ?? appType;
}

// ============================================================================
// Utilities
// ============================================================================

/** Generate a simple unique ID */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/** Detect device type from user agent */
const detectDevice = (): DeviceInfo => {
  if (typeof window === 'undefined') {
    return { type: 'desktop', browser: 'unknown', os: 'unknown' };
  }

  const ua = navigator.userAgent;
  
  // Detect device type
  let type: DeviceInfo['type'] = 'desktop';
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobi/i.test(ua))) {
    type = 'tablet';
  } else if (/Mobi|Android|iPhone/i.test(ua)) {
    type = 'mobile';
  }
  
  // Detect browser (simplified). Edge and iOS Chrome/Firefox carry other
  // browsers' tokens too, so check them first.
  let browser = 'Other';
  if (ua.includes('Edg')) browser = 'Edge';
  else if (/Firefox|FxiOS/.test(ua)) browser = 'Firefox';
  else if (/Chrome|CriOS/.test(ua)) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  
  // Detect OS (simplified). Phones first: an iPhone UA contains "like Mac OS X"
  // and an Android UA contains "Linux".
  let os = 'Other';
  if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('CrOS')) os = 'ChromeOS';
  else if (ua.includes('Linux')) os = 'Linux';
  
  return { type, browser, os };
};

/** Create initial app usage record */
const createAppUsageRecord = (appType: AppType): AppUsageRecord => ({
  appType,
  openCount: 0,
  totalTimeMs: 0,
  lastOpenedAt: null,
});

/** All app types for initialization */
const ALL_APP_TYPES: AppType[] = [
  'about-me',
  'projects', 
  'skills-dashboard',
  'analytics',
  'contact',
  'terminal',
  'games',
  'display-options',
];

// ============================================================================
// Store
// ============================================================================

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  // Initial state
  sessionId: generateId(),
  sessionStartTime: Date.now(),
  isOptedOut: readOptOut(),
  device: detectDevice(),
  events: [],
  appUsage: Object.fromEntries(
    ALL_APP_TYPES.map(type => [type, createAppUsageRecord(type)])
  ) as Record<AppType, AppUsageRecord>,
  currentlyOpenApps: new Set<AppType>(),

  // -------------------------------------------------------------------------
  // Core event tracking
  // -------------------------------------------------------------------------
  
  trackEvent: (type, label, metadata) => {
    const { isOptedOut } = get();
    if (isOptedOut) return;

    const event: AnalyticsEvent = {
      id: generateId(),
      type,
      label,
      timestamp: Date.now(),
      metadata,
    };

    set(state => ({
      events: [...state.events, event].slice(-100), // Keep last 100 events
    }));
  },

  // -------------------------------------------------------------------------
  // App lifecycle tracking
  // -------------------------------------------------------------------------

  trackAppOpen: (appType) => {
    const { isOptedOut } = get();
    if (isOptedOut) return;

    // Single atomic update: event + app usage together
    set(state => {
      const event: AnalyticsEvent = {
        id: generateId(),
        type: 'app_open',
        label: `Opened ${appTitle(appType)}`,
        timestamp: Date.now(),
      };
      const currentUsage = state.appUsage[appType] ?? createAppUsageRecord(appType);
      const newOpenApps = new Set(state.currentlyOpenApps);
      newOpenApps.add(appType);

      return {
        events: [...state.events, event].slice(-100),
        currentlyOpenApps: newOpenApps,
        appUsage: {
          ...state.appUsage,
          [appType]: {
            ...currentUsage,
            openCount: currentUsage.openCount + 1,
            lastOpenedAt: Date.now(),
          },
        },
      };
    });
  },

  trackAppClose: (appType) => {
    const { isOptedOut } = get();
    if (isOptedOut) return;

    // Single atomic update: event + app usage together
    set(state => {
      const event: AnalyticsEvent = {
        id: generateId(),
        type: 'app_close',
        label: `Closed ${appTitle(appType)}`,
        timestamp: Date.now(),
      };
      const currentUsage = state.appUsage[appType] ?? createAppUsageRecord(appType);
      const newOpenApps = new Set(state.currentlyOpenApps);
      newOpenApps.delete(appType);

      let additionalTime = 0;
      if (currentUsage.lastOpenedAt) {
        additionalTime = Date.now() - currentUsage.lastOpenedAt;
      }

      return {
        events: [...state.events, event].slice(-100),
        currentlyOpenApps: newOpenApps,
        appUsage: {
          ...state.appUsage,
          [appType]: {
            ...currentUsage,
            totalTimeMs: currentUsage.totalTimeMs + additionalTime,
            lastOpenedAt: null,
          },
        },
      };
    });
  },

  trackAppFocus: (appType) => {
    const { isOptedOut } = get();
    if (isOptedOut) return;

    // Inline the event creation to avoid double set()
    set(state => {
      const event: AnalyticsEvent = {
        id: generateId(),
        type: 'app_focus',
        label: `Focused ${appTitle(appType)}`,
        timestamp: Date.now(),
      };
      return { events: [...state.events, event].slice(-100) };
    });
  },

  // -------------------------------------------------------------------------
  // Privacy controls
  // -------------------------------------------------------------------------

  setOptOut: (optedOut) => {
    writeOptOut(optedOut);
    applyToPostHog(optedOut);
    // Opting out also clears what this visit already logged.
    set(optedOut ? { isOptedOut: true, events: [] } : { isOptedOut: false });
  },

  // -------------------------------------------------------------------------
  // Computed values / getters
  // -------------------------------------------------------------------------

  getSessionDuration: () => {
    return Date.now() - get().sessionStartTime;
  },

  getRecentEvents: (count) => {
    const { events } = get();
    return events.slice(-count).reverse(); // Most recent first
  },
}));

// ============================================================================
// Selector hooks for performance
// ============================================================================

/** Get session duration (updates require manual re-render) */
export const useSessionDuration = () => {
  const sessionStartTime = useAnalyticsStore(state => state.sessionStartTime);
  return Date.now() - sessionStartTime;
};

/** Get recent events — memoized to avoid infinite re-renders */
export const useRecentEvents = (count: number = 10) => {
  const events = useAnalyticsStore(state => state.events);
  return useMemo(() => events.slice(-count).reverse(), [events, count]);
};

/** Get device info */
export const useDeviceInfo = () => {
  return useAnalyticsStore(state => state.device);
};

/** Get app usage stats sorted by open count — memoized to avoid infinite re-renders */
export const useAppUsageStats = () => {
  const appUsage = useAnalyticsStore(state => state.appUsage);
  return useMemo(
    () => Object.values(appUsage).filter(u => u.openCount > 0).sort((a, b) => b.openCount - a.openCount),
    [appUsage]
  );
};
