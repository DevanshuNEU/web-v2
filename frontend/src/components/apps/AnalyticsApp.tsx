'use client';

/**
 * AnalyticsApp - what this site recorded during the current visit, and the
 * switch that turns it off.
 *
 * Sections: the visit (time, device, apps, events), the event log, time per
 * app, and the privacy switch. The switch calls the store's setOptOut, which
 * also stops PostHog and saves the choice (store/analyticsStore.ts); the same
 * action backs the toggle in Preferences.
 *
 * Charts: one series (opens per app), so one neutral fill. Bar length is the
 * share of the busiest app with no floor, and every bar carries its count as
 * a direct label. With one or two apps there is nothing to compare, so the
 * list drops the bars. Color is used only for meaning: the "Recording"
 * square turns green in the Fun palette while tracking is on.
 *
 * Data: the store is polled via getState() once a second rather than
 * subscribed to (avoids React 19 useSyncExternalStore tearing during commit).
 * Layout keys off the window through the `.dapp` query container.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAnalyticsStore, appTitle, type AnalyticsEvent } from '@/store/analyticsStore';
import { useIsMono } from '@/hooks/usePalette';
import { Hairline } from '@/components/editorial';
import { reveal } from '@/lib/motion';
import { Monitor, Smartphone, Tablet, ExternalLink } from 'lucide-react';
import type { AppType } from '../../../../shared/types';

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const POSTHOG_DASHBOARD_URL = process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_URL || null;

/** Shown in the log; the store keeps the last 100. */
const LOG_ROWS = 15;

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

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
  if (seconds < 5) return 'now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function DeviceIcon({ type, size = 16 }: { type: string; size?: number }) {
  if (type === 'mobile') return <Smartphone size={size} aria-hidden />;
  if (type === 'tablet') return <Tablet size={size} aria-hidden />;
  return <Monitor size={size} aria-hidden />;
}

// ---------------------------------------------------------------------------
// Snapshot of the store, refreshed every second
// ---------------------------------------------------------------------------

interface UsageRow {
  appType: AppType;
  openCount: number;
  /** Closed sessions plus the running one, so an open app shows its time. */
  timeMs: number;
}

interface Snapshot {
  duration: number;
  isOptedOut: boolean;
  device: { type: string; browser: string; os: string };
  eventCount: number;
  recentEvents: AnalyticsEvent[];
  usage: UsageRow[];
}

function snapshot(): Snapshot {
  const s = useAnalyticsStore.getState();
  const now = Date.now();
  return {
    duration: now - s.sessionStartTime,
    isOptedOut: s.isOptedOut,
    device: s.device,
    eventCount: s.events.length,
    recentEvents: s.events.slice(-LOG_ROWS).reverse(),
    usage: Object.values(s.appUsage)
      .filter((u) => u.openCount > 0)
      .map((u) => ({
        appType: u.appType,
        openCount: u.openCount,
        timeMs: u.totalTimeMs + (s.currentlyOpenApps.has(u.appType) && u.lastOpenedAt ? now - u.lastOpenedAt : 0),
      }))
      .sort((a, b) => b.openCount - a.openCount || b.timeMs - a.timeMs),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface AnalyticsAppProps {
  variant?: 'desktop' | 'mobile';
}

export default function AnalyticsApp({ variant = 'desktop' }: AnalyticsAppProps = {}) {
  const mono = useIsMono();
  const reduced = useReducedMotion();
  const [data, setData] = useState<Snapshot>(snapshot);

  useEffect(() => {
    const interval = setInterval(() => setData(snapshot()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { duration, isOptedOut, device, eventCount, recentEvents, usage } = data;

  const toggleSharing = () => {
    const store = useAnalyticsStore.getState();
    store.setOptOut(!store.isOptedOut);
    setData(snapshot());
  };

  return (
    <div className="dapp h-full overflow-auto bg-transparent" data-variant={variant}>
      <motion.div
        variants={reveal.container(reduced)}
        initial="hidden"
        animate="show"
        className="dapp-col dapp-col--read flex flex-col gap-12"
      >
        <motion.header variants={reveal.item(reduced)} className="flex flex-col gap-3">
          <h1 className="dapp-title">This visit</h1>
          <p className="dapp-lede">
            What this site recorded during your visit. Anonymous, sent to
            PostHog. Turn it off below.
          </p>
          <p className="inline-flex items-center gap-2 text-sm text-text-secondary" role="status">
            <span
              aria-hidden
              className={`h-2 w-2 shrink-0 ${
                isOptedOut ? 'border border-text-secondary' : mono ? 'bg-text' : 'bg-green-500'
              }`}
            />
            {isOptedOut ? 'Not recording' : 'Recording'}
          </p>
        </motion.header>

        <motion.div variants={reveal.item(reduced)}>
          <Section title="Session">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-x-6 gap-y-6">
              <SpecCell label="Time here" value={formatDuration(duration)} />
              <SpecCell
                label="Device"
                value={
                  <span className="inline-flex items-center gap-2 capitalize">
                    <DeviceIcon type={device.type} size={15} />
                    {device.type}
                  </span>
                }
                sub={`${device.browser} on ${device.os}`}
              />
              <SpecCell label="Apps opened" value={String(usage.length)} />
              <SpecCell label="Events this visit" value={String(eventCount)} />
            </div>
          </Section>
        </motion.div>

        <motion.div variants={reveal.item(reduced)}>
          <Section title="Event log" note={eventCount > LOG_ROWS ? `Latest ${LOG_ROWS} of ${eventCount}` : undefined}>
            {recentEvents.length === 0 ? (
              <EmptyNote
                line={isOptedOut ? 'Nothing is being recorded.' : 'No activity yet.'}
                hint={isOptedOut ? 'Turn sharing back on below to see the log.' : 'Open an app or run a terminal command to write to the log.'}
              />
            ) : (
              <ul className="flex flex-col">
                {recentEvents.map((e) => (
                  <li key={e.id}>
                    <div className="flex items-baseline gap-4 py-2.5">
                      <span className="min-w-0 flex-1 text-sm text-text [overflow-wrap:anywhere]">{e.label}</span>
                      <span className="shrink-0 text-xs text-text-secondary tabular-nums">
                        {formatRelativeTime(e.timestamp)}
                      </span>
                    </div>
                    <Hairline />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </motion.div>

        <motion.div variants={reveal.item(reduced)}>
          <Section title="Apps you opened" note={usage.length > 2 ? 'Bar length = opens' : undefined}>
            {usage.length === 0 ? (
              <EmptyNote
                line="No apps opened yet."
                hint="Open an app from the dock or the desktop to start."
              />
            ) : (
              <UsageList usage={usage} reduced={reduced} />
            )}
          </Section>
        </motion.div>

        <motion.div variants={reveal.item(reduced)}>
          <Section title="Privacy">
            <div className="flex flex-col gap-4 max-w-[60ch]">
              <p className="text-base text-text-secondary leading-relaxed">
                Anonymous usage only. Turning it off stops all tracking on this
                site, including PostHog, clears the log above, and is remembered
                in this browser.
              </p>
              <SharingSwitch on={!isOptedOut} onToggle={toggleSharing} />
            </div>
          </Section>
        </motion.div>

        {POSTHOG_DASHBOARD_URL && (
          <motion.div variants={reveal.item(reduced)}>
            <Section title="Everyone">
              <div className="flex flex-col gap-4 max-w-[60ch]">
                <p className="text-base text-text-secondary leading-relaxed">
                  Totals across all visitors live in a public PostHog dashboard.
                </p>
                <a
                  href={POSTHOG_DASHBOARD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dapp-link inline-flex w-fit items-center gap-2 text-sm text-text"
                >
                  Open the dashboard
                  <ExternalLink size={13} aria-hidden />
                </a>
              </div>
            </Section>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-4">
        <h2 className="dapp-h2">{title}</h2>
        {note && <p className="text-sm text-text-secondary">{note}</p>}
      </header>
      <Hairline />
      <div className="pt-5">{children}</div>
    </section>
  );
}

function SpecCell({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <p className="text-sm text-text-secondary">{label}</p>
      <div className="font-display text-[1.625rem] leading-tight text-text">{value}</div>
      {sub && <p className="text-sm text-text-secondary leading-snug">{sub}</p>}
    </div>
  );
}

function usageLabel(u: UsageRow): string {
  const opens = `${u.openCount} ${u.openCount === 1 ? 'open' : 'opens'}`;
  return u.timeMs >= 1000 ? `${opens}, ${formatDuration(u.timeMs)}` : opens;
}

/**
 * Opens per app. Bars only when there are three or more apps to compare; the
 * bar's length is openCount / max with no floor, and the count is the label.
 */
function UsageList({ usage, reduced }: { usage: UsageRow[]; reduced: boolean | null }) {
  const showBars = usage.length > 2;
  const max = usage[0]?.openCount || 1;
  return (
    <ul className="flex flex-col gap-4">
      {usage.map((u) => (
        <li key={u.appType} className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <span className="text-sm text-text">{appTitle(u.appType)}</span>
            <span className="text-sm text-text-secondary tabular-nums">{usageLabel(u)}</span>
          </div>
          {showBars && (
            <span aria-hidden className="relative block h-1 w-full overflow-hidden rounded-full bg-text/[0.08]">
              <motion.span
                className="absolute inset-0 rounded-full bg-text-secondary"
                style={{ transformOrigin: 'left center' }}
                initial={reduced ? { transform: `scaleX(${u.openCount / max})` } : { transform: 'scaleX(0)' }}
                animate={{ transform: `scaleX(${u.openCount / max})` }}
                transition={reduced ? { duration: 0 } : { duration: 0.3, delay: 0.06, ease: EASE_OUT }}
              />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function EmptyNote({ line, hint }: { line: string; hint: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm text-text">{line}</p>
      <p className="text-sm text-text-secondary">{hint}</p>
    </div>
  );
}

/** One switch with a fixed label; its checked state carries on / off. */
function SharingSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="group inline-flex w-fit min-h-[2.75rem] items-center gap-3 text-sm text-text"
    >
      <span
        aria-hidden
        className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors ${
          on ? 'border-text bg-text' : 'border-text-secondary bg-transparent'
        }`}
      >
        <span
          className={`absolute h-4 w-4 rounded-full transition-transform motion-reduce:transition-none ${
            on ? 'translate-x-[1.125rem] bg-bg' : 'translate-x-[0.1875rem] bg-text-secondary'
          }`}
        />
      </span>
      Share anonymous usage
      <span aria-hidden className="text-text-secondary">{on ? 'On' : 'Off'}</span>
    </button>
  );
}
