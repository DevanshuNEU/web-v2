/**
 * useAnalytics Hook
 * 
 * Provides a clean interface for tracking analytics events throughout the app.
 * Integrates with both local analyticsStore and PostHog for persistence.
 * 
 * Usage:
 *   const { trackEvent, trackAppOpen } = useAnalytics();
 *   trackEvent('interaction', 'Clicked CTA button');
 */

import { useCallback } from 'react';
import { usePostHog } from 'posthog-js/react';
import { useAnalyticsStore, type EventType } from '@/store/analyticsStore';
import type { AppType } from '../../../shared/types';

// ============================================================================
// Hook
// ============================================================================

export function useAnalytics() {
  const posthog = usePostHog();
  const storeTrackEvent = useAnalyticsStore(state => state.trackEvent);
  const storeTrackAppOpen = useAnalyticsStore(state => state.trackAppOpen);
  const storeTrackAppClose = useAnalyticsStore(state => state.trackAppClose);
  const storeTrackAppFocus = useAnalyticsStore(state => state.trackAppFocus);
  const storeSetOptOut = useAnalyticsStore(state => state.setOptOut);
  const isOptedOut = useAnalyticsStore(state => state.isOptedOut);
  const sessionId = useAnalyticsStore(state => state.sessionId);
  const device = useAnalyticsStore(state => state.device);
  const getSessionDuration = useAnalyticsStore(state => state.getSessionDuration);
  const getRecentEvents = useAnalyticsStore(state => state.getRecentEvents);

  // -------------------------------------------------------------------------
  // Generic event tracking (local + PostHog)
  // -------------------------------------------------------------------------
  
  const trackEvent = useCallback((
    type: EventType,
    label: string,
    metadata?: Record<string, unknown>
  ) => {
    // Track locally for live feed
    storeTrackEvent(type, label, metadata);

    // Send to PostHog for persistence
    if (!isOptedOut) {
      posthog.capture(`portfolio_${type}`, {
        label,
        ...metadata,
      });
    }
  }, [posthog, storeTrackEvent, isOptedOut]);

  // -------------------------------------------------------------------------
  // App lifecycle tracking
  // -------------------------------------------------------------------------

  const trackAppOpen = useCallback((appType: AppType) => {
    storeTrackAppOpen(appType);

    if (!isOptedOut) {
      posthog.capture('portfolio_app_open', {
        app: appType,
        app_name: formatAppName(appType),
      });
    }
  }, [posthog, storeTrackAppOpen, isOptedOut]);

  const trackAppClose = useCallback((appType: AppType) => {
    storeTrackAppClose(appType);

    if (!isOptedOut) {
      posthog.capture('portfolio_app_close', {
        app: appType,
        app_name: formatAppName(appType),
      });
    }
  }, [posthog, storeTrackAppClose, isOptedOut]);

  const trackAppFocus = useCallback((appType: AppType) => {
    storeTrackAppFocus(appType);

    // Don't send focus events to PostHog - too noisy
  }, [storeTrackAppFocus]);

  // -------------------------------------------------------------------------
  // Specific event helpers
  // -------------------------------------------------------------------------

  /** Track theme change */
  const trackThemeChange = useCallback((newTheme: 'light' | 'dark') => {
    trackEvent('theme_change', `Switched to ${newTheme} mode`, { theme: newTheme });
  }, [trackEvent]);

  /** Track terminal command usage */
  const trackTerminalCommand = useCallback((command: string) => {
    trackEvent('terminal_command', `Ran: ${command}`, { command });
  }, [trackEvent]);

  /** Track section view (e.g., About Me sections) */
  const trackSectionView = useCallback((section: string, context?: string) => {
    trackEvent('section_view', `Viewed ${section}`, { section, context });
  }, [trackEvent]);

  /** Track external link clicks */
  const trackExternalLink = useCallback((url: string, label?: string) => {
    trackEvent('external_link', label || url, { url });
  }, [trackEvent]);

  /** Track generic interactions */
  const trackInteraction = useCallback((label: string, metadata?: Record<string, unknown>) => {
    trackEvent('interaction', label, metadata);
  }, [trackEvent]);

  // -------------------------------------------------------------------------
  // Privacy controls
  // -------------------------------------------------------------------------

  const optOut = useCallback(() => {
    storeSetOptOut(true);
    posthog.opt_out_capturing();
  }, [posthog, storeSetOptOut]);

  const optIn = useCallback(() => {
    storeSetOptOut(false);
    posthog.opt_in_capturing();
  }, [posthog, storeSetOptOut]);

  // -------------------------------------------------------------------------
  // Return interface
  // -------------------------------------------------------------------------

  return {
    // Core tracking
    trackEvent,
    trackAppOpen,
    trackAppClose,
    trackAppFocus,
    
    // Convenience methods
    trackThemeChange,
    trackTerminalCommand,
    trackSectionView,
    trackExternalLink,
    trackInteraction,
    
    // Privacy
    optOut,
    optIn,
    isOptedOut,

    // Session info
    sessionId,
    device,
    getSessionDuration,
    getRecentEvents,
  };
}

// ============================================================================
// Utilities
// ============================================================================

/** Convert app type slug to readable name */
function formatAppName(appType: AppType): string {
  const names: Record<AppType, string> = {
    'about-me': 'About Me',
    'projects': 'Projects',
    'skills-dashboard': 'Skill Tree',
    'analytics': 'Analytics',
    'contact': 'Ping Me',
    'terminal': 'Terminal',
    'games': 'Arcade',
    'display-options': 'Preferences',
    'file-explorer': 'Finder',
    'resume': 'Resume',
    'changelog': 'Changelog',
  };
  return names[appType] || appType;
}

/** Export for use elsewhere */
export { formatAppName };
