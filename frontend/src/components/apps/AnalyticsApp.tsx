'use client';

/**
 * AnalyticsApp
 *
 * Transparent, real-time analytics dashboard showing:
 * - Live session data (current visitor)
 * - Activity feed (what you've done this visit)
 * - App usage stats
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
  BarChart3,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const POSTHOG_DASHBOARD_URL = process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_URL || null;

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function getEventIcon(type: string) {
  switch (type) {
    case 'app_open':
    case 'app_close': return FolderOpen;
    case 'theme_change': return Palette;
    case 'terminal_command': return Terminal;
    case 'section_view': return Eye;
    default: return MousePointer;
  }
}

function DeviceIcon({ type }: { type: string }) {
  if (type === 'mobile') return <Smartphone size={18} />;
  if (type === 'tablet') return <Tablet size={18} />;
  return <Monitor size={18} />;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AnalyticsApp() {
  // Poll via getState() — no reactive subscriptions to avoid React 19
  // useSyncExternalStore tearing issues during commit phase.
  const [data, setData] = useState(() => {
    const s = useAnalyticsStore.getState();
    return {
      duration: Date.now() - s.sessionStartTime,
      isOptedOut: s.isOptedOut,
      sessionId: s.sessionId,
      device: s.device,
      recentEvents: s.events.slice(-15).reverse(),
      appUsage: Object.values(s.appUsage)
        .filter(u => u.openCount > 0)
        .sort((a, b) => b.openCount - a.openCount),
    };
  });

  useEffect(() => {
    const tick = () => {
      const s = useAnalyticsStore.getState();
      setData({
        duration: Date.now() - s.sessionStartTime,
        isOptedOut: s.isOptedOut,
        sessionId: s.sessionId,
        device: s.device,
        recentEvents: s.events.slice(-15).reverse(),
        appUsage: Object.values(s.appUsage)
          .filter(u => u.openCount > 0)
          .sort((a, b) => b.openCount - a.openCount),
      });
    };
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const { duration, isOptedOut, sessionId, device, recentEvents, appUsage } = data;

  const handleOptToggle = () => {
    const store = useAnalyticsStore.getState();
    store.setOptOut(!store.isOptedOut);
  };

  return (
    <div className="h-full flex flex-col bg-surface/30 overflow-auto">
      <div className="p-6 space-y-5 max-w-4xl mx-auto w-full">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-text">
            Live <span className="text-accent">Analytics</span>
          </h1>
          <p className="text-text-secondary text-sm">
            Real-time insights from your visit. No fake data.
          </p>
        </div>

        {/* Privacy Notice */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-subtle rounded-xl p-4 border-l-4 border-accent"
        >
          <div className="flex items-start gap-3">
            <Shield className="text-accent flex-shrink-0 mt-0.5" size={18} />
            <div className="flex-1 space-y-2">
              <p className="text-text-secondary text-sm leading-relaxed">
                Anonymous tracking via PostHog. No personal data collected.
                All data shown here is from <strong className="text-text">your current session</strong>.
              </p>
              <button
                onClick={handleOptToggle}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  isOptedOut
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-accent/20 text-accent hover:bg-accent/30'
                }`}
              >
                {isOptedOut ? 'Tracking Disabled — Click to Enable' : 'Disable Tracking'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Live Session Stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass-subtle rounded-xl p-5 border border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <h3 className="font-semibold text-text text-sm">Your Session</h3>
            <span className="text-xs text-text-secondary ml-auto font-mono">
              {sessionId.slice(0, 8)}...
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-text-secondary text-xs mb-1 flex items-center gap-1">
                <Clock size={11} /> Duration
              </div>
              <div className="text-xl font-bold text-text">{formatDuration(duration)}</div>
            </div>
            <div>
              <div className="text-text-secondary text-xs mb-1 flex items-center gap-1">
                <DeviceIcon type={device.type} /> Device
              </div>
              <div className="text-sm font-medium text-text capitalize">{device.type}</div>
              <div className="text-xs text-text-secondary">{device.browser} · {device.os}</div>
            </div>
            <div>
              <div className="text-text-secondary text-xs mb-1 flex items-center gap-1">
                <FolderOpen size={11} /> Apps Opened
              </div>
              <div className="text-xl font-bold text-text">{appUsage.length}</div>
            </div>
            <div>
              <div className="text-text-secondary text-xs mb-1 flex items-center gap-1">
                <Activity size={11} /> Events
              </div>
              <div className="text-xl font-bold text-text">{recentEvents.length}</div>
            </div>
          </div>
        </motion.div>

        {/* Two Column */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-subtle rounded-xl p-5 border border-white/10"
          >
            <h3 className="font-semibold text-text mb-3 flex items-center gap-2 text-sm">
              <Activity size={14} className="text-accent" />
              Live Activity Feed
            </h3>
            {recentEvents.length === 0 ? (
              <div className="text-center py-6 text-text-secondary text-xs">
                <MousePointer size={20} className="mx-auto mb-2 opacity-40" />
                <p>No activity yet</p>
                <p className="mt-0.5 opacity-70">Open some apps to see events here</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {recentEvents.map((event, index) => {
                  const Icon = getEventIcon(event.type);
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg bg-surface/30 hover:bg-surface/50 transition-colors"
                    >
                      <Icon size={12} className="text-accent flex-shrink-0" />
                      <span className="text-xs text-text truncate flex-1">{event.label}</span>
                      <span className="text-xs text-text-secondary whitespace-nowrap">
                        {formatRelativeTime(event.timestamp)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* App Usage */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="glass-subtle rounded-xl p-5 border border-white/10"
          >
            <h3 className="font-semibold text-text mb-3 flex items-center gap-2 text-sm">
              <BarChart3 size={14} className="text-accent" />
              Apps Explored
            </h3>
            {appUsage.length === 0 ? (
              <div className="text-center py-6 text-text-secondary text-xs">
                <FolderOpen size={20} className="mx-auto mb-2 opacity-40" />
                <p>No apps opened yet</p>
                <p className="mt-0.5 opacity-70">Double-click icons to explore</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {appUsage.map(app => (
                  <div
                    key={app.appType}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-surface/30"
                  >
                    <span className="text-xs text-text capitalize">
                      {app.appType.replace(/-/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span>{app.openCount}x</span>
                      {app.totalTimeMs > 0 && (
                        <span className="text-accent">{formatDuration(app.totalTimeMs)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Aggregate / PostHog link */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-subtle rounded-xl p-5 border border-accent/20"
        >
          <div className="flex items-start gap-3">
            <TrendingUp className="text-accent flex-shrink-0 mt-0.5" size={18} />
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-text text-sm">Aggregate Analytics</h3>
              {POSTHOG_DASHBOARD_URL ? (
                <a
                  href={POSTHOG_DASHBOARD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-all text-xs font-medium"
                >
                  View Full Dashboard <ExternalLink size={12} />
                </a>
              ) : (
                <p className="text-text-secondary text-xs leading-relaxed">
                  Aggregate data is tracked via PostHog. Set{' '}
                  <code className="px-1 py-0.5 bg-black/20 rounded text-accent text-xs">
                    NEXT_PUBLIC_POSTHOG_DASHBOARD_URL
                  </code>{' '}
                  to embed a public dashboard here.
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Why transparency */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="glass-subtle rounded-xl p-5 border border-white/10"
        >
          <div className="flex items-start gap-3">
            <Info className="text-accent flex-shrink-0 mt-0.5" size={16} />
            <div>
              <h3 className="font-semibold text-text text-sm mb-1">Why show this publicly?</h3>
              <p className="text-text-secondary text-xs leading-relaxed">
                Inspired by PostHog's "build in public" philosophy. You should know exactly what
                data I collect and how visitors interact with this portfolio. No hidden tracking,
                no dark patterns.
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
