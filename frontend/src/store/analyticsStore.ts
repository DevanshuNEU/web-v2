/**
 * Analytics Store
 * 
 * Manages session-level analytics data for the current visitor.
 * Tracks app usage, interactions, and provides data for the Analytics app.
 * 
 * This store handles CLIENT-SIDE tracking only. Aggregate data comes from PostHog.
 */

import { create } from 'zustand';
import { useMemo } from 'react';
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
  if (/Mobi|Android/i.test(ua)) {
    type = /Tablet|iPad/i.test(ua) ? 'tablet' : 'mobile';
  }
  
  // Detect browser (simplified)
  let browser = 'Other';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  
  // Detect OS (simplified)
  let os = 'Other';
  if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  
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
  isOptedOut: false,
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
        label: `Opened ${appType}`,
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
        label: `Closed ${appType}`,
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
        label: `Focused ${appType}`,
        timestamp: Date.now(),
      };
      return { events: [...state.events, event].slice(-100) };
    });
  },

  // -------------------------------------------------------------------------
  // Privacy controls
  // -------------------------------------------------------------------------

  setOptOut: (optedOut) => {
    set({ isOptedOut: optedOut });
    
    // Clear events if opting out
    if (optedOut) {
      set({ events: [] });
    }
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
