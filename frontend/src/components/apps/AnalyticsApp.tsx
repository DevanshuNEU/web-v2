'use client';

/**
 * AnalyticsApp - the live-session analytics surface in the monochrome editorial
 * register.
 *
 * Redesign contract:
 *   - SIGNATURE (mono): the activity feed renders as an AsciiField "log tape" -
 *     a single selectable monospace block where every event is one fixed-width
 *     row: a mono clock stamp, a distinct ASCII glyph per event type, the label,
 *     and a right-aligned relative time. It reads like a Unix system log. Because
 *     AsciiField takes a verbatim string, the whole tape is ONE static <pre> with
 *     zero per-row redraw (Emil's frequency rule: the feed updates often, so it
 *     must not animate). Gated on useIsMono; the color palette gets a plain
 *     editorial IndexRow-style list fallback.
 *   - DATA-VIZ (hue-free): app-usage counts read as horizontal bars whose fill is
 *     a GPU scaleX (never an animated width, never color) plus an opacity ramp,
 *     so "more opens" reads as a longer, denser bar. Device breakdown is an icon
 *     + mono label. Session stats sit in an editorial spec grid (MetaLabel keys,
 *     mono values), no nested cards.
 *   - REGISTER: serif section heads via EditorialSection numbered eyebrows,
 *     hairline dividers, generous space, no glass cards. The PostHog link is a
 *     quiet editorial link (text + hairline underline), not a filled accent
 *     button. The live indicator is a single small filled square - no green, no
 *     infinite pulse (Emil bans unmotivated loops).
 *
 * Motion (Emil): sections reveal ONCE on mount via the shared staggered
 * container (never on scroll - a windowed inner scroll container makes in-view
 * triggers unreliable). The high-frequency feed does NOT animate row entries.
 * The usage bars draw once per mount (occasional, so they earn an entrance) via
 * scaleX + opacity on a strong ease-out, under reduced motion they snap to their
 * resting state. Pressable controls get a restrained :active scale, gated on
 * reduced motion. transform/opacity only.
 *
 * Persona / house rules: strictly three-tone, color branched only via
 * useIsMono(); the AsciiField signature self-gates to mono; no em dashes; no
 * scroll listeners reveal content; PostHog opens in a new tab, never embedded.
 *
 * Data preserved verbatim from the prior build: useAnalyticsStore polling via
 * getState() (no reactive subscription, to dodge React 19 useSyncExternalStore
 * tearing), the 1s session-duration tick, recent-events filtering (last 15,
 * most-recent-first), app-usage filtering (openCount > 0) + sort (by openCount
 * desc), device detection, and the opt-out toggle.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAnalyticsStore, type EventType } from '@/store/analyticsStore';
import { useIsMono } from '@/hooks/usePalette';
import {
  EditorialSection,
  MetaLabel,
  Hairline,
} from '@/components/editorial';
import AsciiField from '@/components/signature/AsciiField';
import { reveal } from '@/lib/motion';
import {
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Strong ease-out (Emil): "starts fast, feels responsive" for the bar draw.
// ---------------------------------------------------------------------------
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

// Window-dynamic size for mono DATA values (relative times, counts, the log
// tape). font-mono-meta would re-proportion too, but it forces uppercase +
// tracking + a fixed ink, which is wrong for mixed-case values and the dot-leader
// tape. So this is a bespoke size-only clamp: it tracks the window the same way
// (cqi = 1% of the window's inline size) with the upper bound pinned to the
// original 0.75rem, so a maximized window is unchanged and small windows shrink.
const MONO_DATA_FS = 'clamp(0.66rem, 1.5cqi, 0.75rem)';

const POSTHOG_DASHBOARD_URL = process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_URL || null;

// ---------------------------------------------------------------------------
// Formatting helpers (logic preserved from the prior build)
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

/** Wall-clock stamp HH:MM:SS for the log tape's left column. */
function formatClock(timestamp: number): string {
  const d = new Date(timestamp);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Distinct ASCII glyph per event type for the log tape. Hue-free signal: the
 * shape itself disambiguates the event class the way a syslog facility tag does.
 */
function eventGlyph(type: EventType): string {
  switch (type) {
    case 'app_open':        return '+'; // a window opened
    case 'app_close':       return '-'; // a window closed
    case 'app_focus':       return '*'; // focus moved
    case 'theme_change':    return '~'; // appearance toggled
    case 'section_view':    return '>'; // scrolled into a section
    case 'terminal_command':return '$'; // a shell command
    case 'external_link':   return '^'; // left the site
    default:                return '.'; // generic interaction
  }
}

// ---------------------------------------------------------------------------
// Device icon (lucide, kept; rendered in current ink, never accent)
// ---------------------------------------------------------------------------

function DeviceIcon({ type, size = 16 }: { type: string; size?: number }) {
  if (type === 'mobile') return <Smartphone size={size} />;
  if (type === 'tablet') return <Tablet size={size} />;
  return <Monitor size={size} />;
}

// ---------------------------------------------------------------------------
// Log tape - the AsciiField signature for the activity feed.
//
// Every event becomes one fixed-width line:
//   12:04:51  +  Opened terminal ................................ 8s ago
// Columns are space-padded to a monospace grid so the stamps, glyphs and times
// line up into rails. The whole thing is a single string handed to AsciiField,
// which renders it as one selectable <pre> with no per-row motion. Dot leaders
// connect the label to the right-aligned time the way a printed index does.
// ---------------------------------------------------------------------------

const TAPE_WIDTH = 64; // total monospace columns the tape is padded to

function buildLogTape(events: { type: EventType; label: string; timestamp: number }[]): string {
  return events
    .map((e) => {
      const stamp = formatClock(e.timestamp);
      const glyph = eventGlyph(e.type);
      const rel = formatRelativeTime(e.timestamp);
      const head = `${stamp}  ${glyph}  `;
      const tail = ` ${rel}`;
      // Space available for the label + dot leaders between head and tail.
      const room = Math.max(1, TAPE_WIDTH - head.length - tail.length);
      let label = e.label;
      if (label.length > room - 2) {
        // Truncate over-long labels so the leader/time stay on the grid.
        label = label.slice(0, Math.max(1, room - 3)) + '…';
      }
      const leaderCount = Math.max(1, room - label.length - 1);
      const leader = ' ' + '.'.repeat(leaderCount);
      return `${head}${label}${leader}${tail}`;
    })
    .join('\n');
}

// ---------------------------------------------------------------------------
// Usage bar - count as length + density, never hue, never animated width.
// ---------------------------------------------------------------------------

function UsageBar({
  fraction,
  reduced,
}: {
  fraction: number; // 0..1 share of the max open-count
  reduced: boolean | null;
}) {
  // Floor so even a single open is a visible bar; opacity ramps with the share
  // so a busier app reads denser as well as longer (two reinforcing channels).
  const scale = 0.12 + fraction * 0.88;
  const opacity = 0.4 + fraction * 0.6;
  return (
    <span
      aria-hidden
      className="relative block h-1 w-full overflow-hidden bg-border/50"
    >
      <motion.span
        className="absolute inset-y-0 left-0 right-0 bg-text"
        style={{ opacity, transformOrigin: 'left center' }}
        // Full transform string (not the scaleX shorthand) so the once-per-mount
        // draw stays hardware-accelerated and never drops frames while the OS is
        // mounting the window. The bar grows from the left like a fill, not a
        // pop-in. Reduced motion lands on the resting scale with no draw.
        initial={reduced ? { transform: `scaleX(${scale})` } : { transform: 'scaleX(0)' }}
        animate={{ transform: `scaleX(${scale})` }}
        transition={reduced ? { duration: 0 } : { duration: 0.3, delay: 0.06, ease: EASE_OUT }}
      />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface AnalyticsAppProps {
  variant?: 'desktop' | 'mobile';
}

export default function AnalyticsApp(_props: AnalyticsAppProps = {}) {
  // variant is accepted for parity with the app contract; the layout is a single
  // responsive editorial column (grids collapse to one column on narrow), so no
  // separate mobile tree is needed.
  const mono = useIsMono();
  const reduced = useReducedMotion();

  // Poll via getState() - no reactive subscription, to avoid React 19
  // useSyncExternalStore tearing during the commit phase (preserved).
  const [data, setData] = useState(() => {
    const s = useAnalyticsStore.getState();
    return {
      duration: Date.now() - s.sessionStartTime,
      isOptedOut: s.isOptedOut,
      sessionId: s.sessionId,
      device: s.device,
      recentEvents: s.events.slice(-15).reverse(),
      appUsage: Object.values(s.appUsage)
        .filter((u) => u.openCount > 0)
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
          .filter((u) => u.openCount > 0)
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

  // The log tape recomputes each tick (cheap string build); memo keyed on the
  // event ids + the duration so relative times stay live without per-row motion.
  const tape = useMemo(
    () => buildLogTape(recentEvents),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recentEvents, duration],
  );

  const maxOpens = appUsage.length > 0 ? appUsage[0].openCount : 1;

  return (
    <div className="h-full overflow-auto bg-transparent">
      <motion.div
        variants={reveal.container(reduced)}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10 sm:py-12 flex flex-col gap-14"
      >
        {/* ── Masthead ── serif hero + mono sub-line + single live square. */}
        <motion.header variants={reveal.item(reduced)} className="flex flex-col gap-4">
          <h1 className="editorial-hero font-display text-text leading-none">
            Live Analytics
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {/* Live indicator: ONE small filled square. No infinite pulse: the
                1s tick already proves liveness; an animated dot would be an
                unmotivated loop (Emil). Mono = ink, color = green. */}
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className={`h-2 w-2 ${mono ? 'bg-text' : 'bg-green-500'}`}
              />
              <MetaLabel className="text-text-secondary">
                Live <span aria-hidden className="opacity-40 mx-1">/</span>{' '}
                <span className="font-[family-name:var(--font-geist-mono)]">
                  {sessionId.slice(0, 8)}
                </span>
              </MetaLabel>
            </span>
          </div>
          <p className="max-w-[60ch] text-base text-text-secondary leading-relaxed">
            Everything below is real, measured from your current visit. Anonymous,
            via PostHog. No personal data, no fake numbers.
          </p>
        </motion.header>

        {/* ── 01 Session ── editorial spec grid (MetaLabel keys, mono values). */}
        <motion.div variants={reveal.item(reduced)}>
          <EditorialSection number="01" eyebrow="This visit" title="Session">
            {/* Editorial spec grid. Grid's column count is fixed by design, so
                the mobile collapse is handled here with a responsive wrapper
                (2-up on narrow, 4-up from sm). */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
              <SpecCell label="Duration" value={formatDuration(duration)} />
              <SpecCell
                label="Device"
                value={
                  <span className="inline-flex items-center gap-2 capitalize">
                    <DeviceIcon type={device.type} size={15} />
                    {device.type}
                  </span>
                }
                sub={`${device.browser} / ${device.os}`}
              />
              <SpecCell label="Apps opened" value={String(appUsage.length)} />
              <SpecCell label="Events" value={String(recentEvents.length)} />
            </div>
          </EditorialSection>
        </motion.div>

        {/* ── 02 Activity ── the AsciiField log tape (mono) / list (color). */}
        <motion.div variants={reveal.item(reduced)}>
          <EditorialSection number="02" eyebrow="Event log" title="Activity">
            {recentEvents.length === 0 ? (
              <EmptyNote
                line="No activity yet."
                hint="Open an app or run a terminal command to write to the log."
              />
            ) : mono ? (
              // Signature: one selectable <pre>, zero per-row motion. The tape is
              // scrollable but never redrawn row-by-row as the feed updates.
              // AsciiField is aria-hidden, so a screen-reader-only list carries
              // the same events for assistive tech.
              <div className="max-h-72 overflow-auto">
                <AsciiField
                  source={tape}
                  paletteKey={`tape-${recentEvents.length}`}
                  className="text-[clamp(0.66rem,1.5cqi,0.75rem)] text-text-secondary leading-[1.5]"
                />
                <ul className="sr-only">
                  {recentEvents.map((e) => (
                    <li key={`${e.timestamp}-${e.label}`}>
                      {e.label}, {formatRelativeTime(e.timestamp)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              // Color fallback: a plain editorial list (no ASCII), still hue-clean
              // in structure - glyph + label + mono time, hairline-divided.
              <ul className="flex flex-col">
                <Hairline />
                {recentEvents.map((e) => (
                  <li key={`${e.timestamp}-${e.label}`}>
                    <div className="flex items-baseline gap-3 py-2.5">
                      <span
                        aria-hidden
                        className="w-4 shrink-0 text-center font-[family-name:var(--font-geist-mono)] text-text-secondary"
                      >
                        {eventGlyph(e.type)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-text">
                        {e.label}
                      </span>
                      <span
                        className="shrink-0 font-[family-name:var(--font-geist-mono)] text-text-secondary"
                        style={{ fontSize: MONO_DATA_FS }}
                      >
                        {formatRelativeTime(e.timestamp)}
                      </span>
                    </div>
                    <Hairline />
                  </li>
                ))}
              </ul>
            )}
          </EditorialSection>
        </motion.div>

        {/* ── 03 Apps ── usage as scaleX + opacity bars, no hue, no width anim. */}
        <motion.div variants={reveal.item(reduced)}>
          <EditorialSection number="03" eyebrow="Per app" title="Usage">
            {appUsage.length === 0 ? (
              <EmptyNote
                line="No apps opened yet."
                hint="Double-click an icon on the desktop to start exploring."
              />
            ) : (
              <ul className="flex flex-col gap-5">
                {appUsage.map((app) => (
                  <li key={app.appType} className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-sm capitalize text-text">
                        {app.appType.replace(/-/g, ' ')}
                      </span>
                      <span
                        className="shrink-0 font-[family-name:var(--font-geist-mono)] text-text-secondary"
                        style={{ fontSize: MONO_DATA_FS }}
                      >
                        {app.openCount}x
                        {app.totalTimeMs > 0 && (
                          <>
                            <span aria-hidden className="opacity-40 mx-1.5">/</span>
                            {formatDuration(app.totalTimeMs)}
                          </>
                        )}
                      </span>
                    </div>
                    <UsageBar fraction={app.openCount / maxOpens} reduced={reduced} />
                  </li>
                ))}
              </ul>
            )}
          </EditorialSection>
        </motion.div>

        {/* ── 04 Privacy ── opt-out as a quiet pressable, no filled accent. */}
        <motion.div variants={reveal.item(reduced)}>
          <EditorialSection number="04" eyebrow="Your data" title="Privacy">
            <div className="flex flex-col gap-4 max-w-[60ch]">
              <p className="text-base text-text-secondary leading-relaxed">
                Tracking is anonymous and scoped to this session. You can turn it
                off; the live log above clears the moment you do.
              </p>
              <QuietToggle
                on={isOptedOut}
                reduced={reduced}
                onClick={handleOptToggle}
                offLabel="Disable tracking"
                onLabel="Tracking disabled, click to re-enable"
              />
            </div>
          </EditorialSection>
        </motion.div>

        {/* ── 05 Aggregate ── PostHog as a quiet editorial link, new tab. */}
        <motion.div variants={reveal.item(reduced)}>
          <EditorialSection number="05" eyebrow="Everyone" title="Aggregate">
            <div className="flex flex-col gap-4 max-w-[60ch]">
              <p className="text-base text-text-secondary leading-relaxed">
                Cross-visitor numbers live in PostHog, in the same build-in-public
                spirit. The dashboard opens in a new tab, nothing is embedded here.
              </p>
              {POSTHOG_DASHBOARD_URL ? (
                <QuietLink
                  href={POSTHOG_DASHBOARD_URL}
                  reduced={reduced}
                  label="View the full dashboard"
                />
              ) : (
                <p className="text-sm text-text-secondary leading-relaxed">
                  Set{' '}
                  <code className="font-[family-name:var(--font-geist-mono)] text-text">
                    NEXT_PUBLIC_POSTHOG_DASHBOARD_URL
                  </code>{' '}
                  to link a public dashboard here.
                </p>
              )}
            </div>
          </EditorialSection>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

/** Spec cell: a MetaLabel key over a mono value, optional mono sub-line. */
function SpecCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <MetaLabel as="p" className="text-text-secondary">
        {label}
      </MetaLabel>
      <div className="font-[family-name:var(--font-geist-mono)] text-lg text-text leading-snug">
        {value}
      </div>
      {sub && (
        <div
          className="font-[family-name:var(--font-geist-mono)] text-text-secondary leading-snug"
          style={{ fontSize: MONO_DATA_FS }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

/** Empty state: hairline-bounded, editorial, no spinner, no icon theatrics. */
function EmptyNote({ line, hint }: { line: string; hint: string }) {
  return (
    <div className="flex flex-col gap-2 py-2">
      <Hairline />
      <p className="pt-4 text-sm text-text">{line}</p>
      <p className="text-sm text-text-secondary">{hint}</p>
    </div>
  );
}

/**
 * Quiet editorial link: text + a hairline underline that grows from the left on
 * hover (transform-only, ease via CSS). Opens in a new tab. No filled accent.
 */
function QuietLink({
  href,
  label,
  reduced,
}: {
  href: string;
  label: string;
  reduced: boolean | null;
}) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={reduced ? undefined : { transform: 'scale(0.97)', transition: { duration: 0.16, ease: EASE_OUT } }}
      className="group inline-flex w-fit items-center gap-2 text-sm text-text focus-visible:outline-none"
    >
      <span className="relative">
        {label}
        <span
          aria-hidden
          className="absolute -bottom-0.5 left-0 right-0 block h-px origin-left scale-x-100 bg-text/40
                     transition-transform duration-200 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-x-0 motion-reduce:transition-none"
        />
        <span
          aria-hidden
          className="absolute -bottom-0.5 left-0 right-0 block h-px origin-left scale-x-0 bg-text
                     transition-transform duration-200 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-x-100 motion-reduce:transition-none"
        />
      </span>
      <ExternalLink size={13} className="shrink-0" />
    </motion.a>
  );
}

/**
 * Quiet toggle: a pressable text control with a hairline border. State reads
 * from the label + a small leading square (filled when off / active tracking,
 * hollow when disabled). Restrained :active press, reduced-motion gated. No hue,
 * no glow, no filled-accent button.
 */
function QuietToggle({
  on,
  offLabel,
  onLabel,
  reduced,
  onClick,
}: {
  on: boolean;
  offLabel: string;
  onLabel: string;
  reduced: boolean | null;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      whileTap={reduced ? undefined : { transform: 'scale(0.97)', transition: { duration: 0.16, ease: EASE_OUT } }}
      className="group inline-flex w-fit items-center gap-2.5 border border-border px-3 py-1.5
                 transition-colors hover:border-text/40 focus-visible:outline-none"
    >
      <span
        aria-hidden
        className={`h-2 w-2 shrink-0 ${on ? 'border border-text' : 'bg-text'}`}
      />
      <MetaLabel className="text-text">{on ? onLabel : offLabel}</MetaLabel>
    </motion.button>
  );
}
