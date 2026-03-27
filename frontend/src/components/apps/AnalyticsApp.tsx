'use client';

/**
 * AnalyticsApp
 * 
 * Transparent, real-time analytics dashboard showing:
 * - Live session data (current visitor)
 * - Activity feed (what you've done this visit)
 * - Embedded PostHog dashboard (real aggregate data)
 * - Privacy controls
 * 
 * Philosophy: No fake data. Everything shown is either real or clearly sourced.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { 
  Activity,
  Clock, 
  Monitor,
  Smartphone,
  Tablet,
  Shield,
  ExternalLink,
  Eye,
  MousePointer,
  Terminal,
  Palette,
  FolderOpen,
  Info,
  TrendingUp,
  BarChart3
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// PostHog public dashboard URL - set this after creating your dashboard
// Go to PostHog > Dashboard > ... > Share or embed > Toggle ON > Copy link
const POSTHOG_DASHBOARD_URL = process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_URL || null;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Format milliseconds to human readable duration */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/** Format timestamp to relative time */
function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  return `${Math.floor(minutes / 60)}h ago`;
}

/** Get icon for event type */
function getEventIcon(type: string) {
  switch (type) {
    case 'app_open':
    case 'app_close':
      return FolderOpen;
    case 'theme_change':
      return Palette;
    case 'terminal_command':
      return Terminal;
    case 'section_view':
      return Eye;
    default:
      return MousePointer;
  }
}

/** Device icon based on type */
function DeviceIcon({ type }: { type: string }) {
  switch (type) {
    case 'mobile':
      return <Smartphone size={18} />;
    case 'tablet':
      return <Tablet size={18} />;
    default:
      return <Monitor size={18} />;
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AnalyticsApp() {
  return (
    <div className="h-full flex flex-col bg-surface/30 overflow-auto p-6">
      <h1 className="text-3xl font-bold text-text">Analytics Test</h1>
      <p className="text-text-secondary">Minimal component - no hooks</p>
    </div>
  );
}
