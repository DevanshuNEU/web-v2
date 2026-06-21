'use client';

/**
 * SettingsApp - "Preferences" in the Instrument house language.
 *
 * Reskinned from the old iOS-tinted sidebar into the monochrome editorial
 * register shared with AboutMeApp / ResumeApp: a numbered index rail on the
 * left (desktop) drives scroll-spy over one scrolled editorial document of
 * grouped settings. Every group is an EditorialSection; every control is a
 * hairline-divided row (MetaLabel label left, restrained control right).
 *
 * Groups: 01 Appearance / 02 Sound / 03 Privacy / 04 About.
 *
 * All wiring is preserved verbatim - theme mode, palette, accent (Fun-gated),
 * wallpaper, sound effects, and analytics opt-out still write to their stores.
 *
 * Animation contract (shared with AboutMeApp / ResumeApp): content reveals
 * ONCE on mount via a staggered container, never on scroll - a windowed inner
 * scroll container makes in-view triggers unreliable. Scroll-spy is a pure
 * scroll computation with a bottom-of-scroll fallback so the last group still
 * highlights; no IntersectionObserver, no global listeners.
 *
 * Monochrome contract: three tones only (text / text-secondary / bg+border).
 * The single inherently-colorful control - the accent picker - is gated to the
 * Fun ("color") palette, as before. Everything else branches via useIsMono().
 *
 * Micro-interactions (restrained, reduced-motion gated, mono-safe):
 *   (a) a LIVE PREVIEW tile that reflects the current mode / palette / accent /
 *       wallpaper choice in real time - a tiny editorial "window" mockup;
 *   (b) a satisfying spring on the monochrome toggle knob;
 *   (c) a one-shot hairline pulse + transient "Applied" mono tag on the row
 *       whose value last changed.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { toast } from 'sonner';
import { useTheme, ACCENT_COLORS } from '@/store/themeStore';
import type { Wallpaper } from '@/store/themeStore';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useIsMono } from '@/hooks/usePalette';
import { getWallpapersForTheme } from '@/data/wallpapers';
import {
  isSoundEnabled,
  setSoundEnabled,
  playSound,
} from '@/hooks/useSoundEffects';
import {
  EditorialSection,
  Hairline,
  MetaLabel,
} from '@/components/editorial';
import { reveal, spring, withReduced } from '@/lib/motion';
import MobileSettings from './MobileSettings';

interface SettingsAppProps {
  /**
   * Render variant. 'desktop' (default) shows the editorial document used by
   * the macOS shell. 'mobile' shows the iOS-style Settings app launched from
   * the phone shell's home screen.
   */
  variant?: 'desktop' | 'mobile';
}

/* ------------------------------------------------------------------ */
/*  Section registry - single source for the rail and the document.    */
/* ------------------------------------------------------------------ */

const SECTIONS = [
  { id: 'appearance', number: '01', label: 'Appearance' },
  { id: 'sound', number: '02', label: 'Sound' },
  { id: 'privacy', number: '03', label: 'Privacy' },
  { id: 'about', number: '04', label: 'About' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const SECTION_DOM_ID = (id: SectionId) => `settings-section-${id}`;

/* ------------------------------------------------------------------ */
/*  Applied pulse - shared "a setting just changed" feedback.          */
/*                                                                     */
/*  A row registers a key; calling ping(key) flashes a one-shot        */
/*  hairline pulse + a transient "Applied" mono tag on that row. Pure  */
/*  monochrome, auto-clears, and collapses to nothing under reduced    */
/*  motion (no flash, the value just updates).                         */
/* ------------------------------------------------------------------ */

function useAppliedPulse(reduced: boolean | null) {
  const [pinged, setPinged] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ping = useCallback(
    (key: string) => {
      if (reduced) return;
      if (timer.current) clearTimeout(timer.current);
      setPinged(key);
      timer.current = setTimeout(() => setPinged(null), 1100);
    },
    [reduced],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { pinged, ping };
}

/** Transient "Applied" mono tag, shown next to a row that just changed. */
function AppliedTag({ show, reduced }: { show: boolean; reduced: boolean | null }) {
  return (
    <AnimatePresence>
      {show && !reduced && (
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="font-mono-meta text-text-secondary"
        >
          Applied
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  SettingRow - hairline-divided row: label (+ hint) left, control    */
/*  right, with the one-shot applied pulse along the bottom rule.       */
/* ------------------------------------------------------------------ */

function SettingRow({
  label,
  hint,
  control,
  pulse,
  applied,
  reduced,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  control: React.ReactNode;
  /** When true, run the one-shot hairline pulse along this row's bottom rule. */
  pulse?: boolean;
  /** When true, show the transient "Applied" tag. */
  applied?: boolean;
  reduced: boolean | null;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-6 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <MetaLabel className="text-text">{label}</MetaLabel>
          {hint !== undefined && (
            <span className="text-sm leading-snug text-text-secondary">
              {hint}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <AppliedTag show={!!applied} reduced={reduced} />
          {control}
        </div>
      </div>

      {/* Bottom rule doubles as the applied-pulse surface. */}
      <div className="relative">
        <Hairline />
        <AnimatePresence>
          {pulse && !reduced && (
            <motion.span
              aria-hidden
              initial={{ scaleX: 0, opacity: 0.9 }}
              animate={{ scaleX: 1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="absolute inset-x-0 top-0 h-px origin-left bg-text"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MonoToggle - restrained monochrome switch.                         */
/*                                                                     */
/*  No colored "on" state: the track fills graphite (bg-text) when on, */
/*  hairline-bordered + empty when off; the knob is bg-bg and springs   */
/*  across. Mono-safe by construction (no hue, only fill + border).     */
/* ------------------------------------------------------------------ */

function MonoToggle({
  on,
  onChange,
  label,
  reduced,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  reduced: boolean | null;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30
                  ${on ? 'border-text bg-text' : 'border-border bg-transparent'}`}
    >
      <motion.span
        aria-hidden
        layout
        transition={withReduced(
          { type: 'spring', damping: 22, stiffness: 420, mass: 0.6 },
          reduced,
        )}
        className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full shadow-sm
                    ${on ? 'bg-bg' : 'bg-text'}`}
        style={{ left: on ? 'calc(100% - 20px)' : '4px' }}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  EditorialChoice - quiet two-option control (mode / palette).       */
/*                                                                     */
/*  Mono labels with a sliding hairline underline marking the active   */
/*  choice (the ResumeApp ModeToggle register), monochrome only.       */
/* ------------------------------------------------------------------ */

function EditorialChoice<T extends string>({
  options,
  value,
  onChange,
  markerId,
  reduced,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  markerId: string;
  reduced: boolean | null;
}) {
  return (
    <div className="flex items-center gap-5">
      {options.map(({ id, label }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={active ? 'true' : undefined}
            className="group relative focus-visible:outline-none"
          >
            <MetaLabel
              className={
                active
                  ? 'text-text'
                  : 'text-text-secondary transition-colors group-hover:text-text'
              }
            >
              {label}
            </MetaLabel>
            {active && (
              <motion.span
                layoutId={markerId}
                aria-hidden
                className="absolute -bottom-1 left-0 right-0 h-px bg-text"
                transition={withReduced(spring.window, reduced)}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LivePreview - a tiny editorial "window" mockup that reflects the    */
/*  live mode / palette / accent / wallpaper choice in real time.      */
/*                                                                     */
/*  Mono-safe: in Mono the chrome + accent dot stay graphite; only the  */
/*  Fun palette lets the accent dot carry the live accent color, which  */
/*  is the one place color is intentionally on (gated by useIsMono).   */
/* ------------------------------------------------------------------ */

function LivePreview({
  mode,
  accentColor,
  wallpaper,
  reduced,
}: {
  mode: 'light' | 'dark';
  accentColor: string;
  wallpaper: Wallpaper | null;
  reduced: boolean | null;
}) {
  const mono = useIsMono();

  const wallStyle: React.CSSProperties = wallpaper?.imageUrl
    ? { backgroundImage: `url(${wallpaper.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : wallpaper?.thumbnail
      ? { background: wallpaper.thumbnail }
      : wallpaper?.gradientConfig
        ? {
            background: `linear-gradient(${wallpaper.gradientConfig.angle}deg, ${wallpaper.gradientConfig.colors.join(',')})`,
          }
        : { background: mode === 'dark' ? '#0b0b0c' : '#f3f3f3' };

  // The mock window's surface tracks the chosen mode so the preview reads
  // as the actual theme, not the current app chrome.
  const surface = mode === 'dark' ? '#161617' : '#ffffff';
  const surfaceLine = mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)';
  const dot = mode === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)';

  return (
    <div className="flex flex-col gap-3">
      <MetaLabel as="p" className="text-text-secondary">
        Live Preview
      </MetaLabel>
      <div
        className="relative aspect-[16/10] w-full max-w-sm overflow-hidden border border-border"
        style={{ filter: mono ? 'grayscale(1)' : undefined }}
      >
        {/* Wallpaper plate. */}
        <div className="absolute inset-0" style={wallStyle} aria-hidden />

        {/* A small floating "window" centered on the wallpaper. */}
        <motion.div
          key={`${mode}-${wallpaper?.id ?? 'none'}`}
          initial={reduced ? false : { opacity: 0, y: 6, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={withReduced(spring.window, reduced)}
          className="absolute inset-[14%] flex flex-col overflow-hidden rounded-md shadow-lg"
          style={{ background: surface }}
        >
          {/* Titlebar with traffic dots + a live accent dot. */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5"
            style={{ borderBottom: `1px solid ${surfaceLine}` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
            <span
              className="ml-auto h-2 w-2 rounded-full"
              style={{ background: mono ? dot : accentColor }}
              aria-hidden
            />
          </div>
          {/* Body: a couple of mono text-rule stand-ins. */}
          <div className="flex flex-1 flex-col gap-1.5 p-2.5">
            <span className="h-1.5 w-3/4 rounded-full" style={{ background: surfaceLine }} />
            <span className="h-1.5 w-1/2 rounded-full" style={{ background: surfaceLine }} />
            <span className="mt-auto h-1.5 w-2/3 rounded-full" style={{ background: surfaceLine }} />
          </div>
        </motion.div>
      </div>
      <p className="text-sm text-text-secondary">
        Reflects your current theme, palette
        {mono ? '' : ', accent'} and wallpaper.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wallpaper thumbnail - reframed with hairlines, monochrome chrome.  */
/* ------------------------------------------------------------------ */

function WallpaperThumb({
  wp,
  selected,
  onSelect,
}: {
  wp: Wallpaper;
  selected: boolean;
  onSelect: (wp: Wallpaper) => void;
}) {
  const mono = useIsMono();
  return (
    <button
      type="button"
      onClick={() => onSelect(wp)}
      aria-label={`Use ${wp.name} wallpaper`}
      aria-pressed={selected}
      className={`group relative w-full overflow-hidden border transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30
                  ${selected ? 'border-text' : 'border-border hover:border-text/50'}`}
      style={{ aspectRatio: '16/9', filter: mono ? 'grayscale(1)' : undefined }}
    >
      {wp.imageUrl ? (
        <Image src={wp.imageUrl} alt={wp.name} fill className="object-cover" />
      ) : wp.thumbnail ? (
        <div className="absolute inset-0" style={{ background: wp.thumbnail }} />
      ) : wp.gradientConfig ? (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(${wp.gradientConfig.angle}deg, ${wp.gradientConfig.colors.join(',')})`,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-bg" />
      )}

      {/* Live tag - mono, hairline-bordered, no color. */}
      {wp.type === 'animated' && (
        <span className="absolute left-1.5 top-1.5 border border-text/70 bg-bg/70 px-1.5 py-0.5 font-mono-meta text-text backdrop-blur-sm">
          Live
        </span>
      )}

      {/* Selected marker - a filled graphite square in the corner. */}
      {selected && (
        <span
          aria-hidden
          className="absolute bottom-1.5 right-1.5 h-3 w-3 bg-text shadow-sm ring-1 ring-bg"
        />
      )}

      {/* Name plate - mono label over a hairline-darkened base. */}
      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/65 to-transparent px-2 pb-1.5 pt-5 text-left font-mono-meta text-white">
        {wp.name}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Section bodies                                                      */
/* ------------------------------------------------------------------ */

function AppearanceBody({ reduced }: { reduced: boolean | null }) {
  const {
    mode,
    setMode,
    palette,
    setPalette,
    accentColor,
    setAccent,
    wallpaper,
    setWallpaper,
  } = useTheme();
  const { pinged, ping } = useAppliedPulse(reduced);

  const available = getWallpapersForTheme(mode);
  const animated = available.filter((w) => w.type === 'animated');
  const staticWps = available.filter((w) => w.type === 'static');

  const handleMode = (next: 'light' | 'dark') => {
    setMode(next);
    ping('mode');
    toast.success(
      next === 'dark'
        ? 'Dark mode. Very mysterious.'
        : 'Light mode. Welcome to the bright side.',
    );
  };

  const handlePalette = (next: 'mono' | 'color') => {
    setPalette(next);
    ping('palette');
    toast.success(
      next === 'mono'
        ? 'Mono. Premium black and white.'
        : 'Fun mode. Color, unleashed.',
    );
  };

  const handleWallpaper = (wp: Wallpaper) => {
    setWallpaper(wp);
    ping('wallpaper');
    toast.success(`Wallpaper: ${wp.name}`);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Live preview tile - top of the group, reflects live choices. */}
      <LivePreview
        mode={mode}
        accentColor={accentColor}
        wallpaper={wallpaper}
        reduced={reduced}
      />

      {/* Theme + palette - quiet editorial choices on hairline rows. */}
      <div className="flex flex-col">
        <Hairline />
        <SettingRow
          label="Theme"
          hint="Light or dark across every window."
          reduced={reduced}
          pulse={pinged === 'mode'}
          applied={pinged === 'mode'}
          control={
            <EditorialChoice
              options={[
                { id: 'light', label: 'Light' },
                { id: 'dark', label: 'Dark' },
              ]}
              value={mode}
              onChange={handleMode}
              markerId="settings-mode-active"
              reduced={reduced}
            />
          }
        />
        <SettingRow
          label="Palette"
          hint={
            palette === 'mono'
              ? 'Black and white, the way it ships by default.'
              : 'The original color theme, including your accent.'
          }
          reduced={reduced}
          pulse={pinged === 'palette'}
          applied={pinged === 'palette'}
          control={
            <EditorialChoice
              options={[
                { id: 'mono', label: 'Mono' },
                { id: 'color', label: 'Fun' },
              ]}
              value={palette}
              onChange={handlePalette}
              markerId="settings-palette-active"
              reduced={reduced}
            />
          }
        />

        {/* Accent picker - inherently colorful, gated to the Fun palette. */}
        <AnimatePresence initial={false}>
          {palette === 'color' && (
            <motion.div
              key="accent"
              initial={reduced ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: reduced ? 0 : 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3 py-4">
                <MetaLabel className="text-text">Accent Color</MetaLabel>
                <div
                  className="flex flex-wrap gap-2.5"
                  data-testid="accent-swatches"
                >
                  {Object.entries(ACCENT_COLORS).map(([name, color]) => {
                    const isActive = accentColor === color;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setAccent(color);
                          ping('accent');
                          toast.success('New accent. Same great developer.');
                        }}
                        aria-label={`Set accent ${name}`}
                        aria-pressed={isActive}
                        className="relative h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                        style={{
                          background: color,
                          boxShadow: isActive
                            ? `0 0 0 2px rgb(var(--bg, 255 255 255)), 0 0 0 4px ${color}`
                            : '0 1px 3px rgba(0,0,0,0.18)',
                        }}
                      >
                        {isActive && (
                          <span
                            aria-hidden
                            className="absolute inset-0 m-auto h-2.5 w-2.5 rounded-full bg-white/90"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="font-mono-meta capitalize text-text-secondary">
                  {Object.entries(ACCENT_COLORS).find(
                    ([, c]) => c === accentColor,
                  )?.[0] ?? 'Custom'}
                </p>
              </div>
              <Hairline />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Wallpaper - hairline-framed thumbnail grids. */}
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <MetaLabel className="text-text">Wallpaper</MetaLabel>
          <span className="font-mono-meta text-text-secondary">
            {wallpaper?.name ?? 'None'}
            {wallpaper?.type === 'animated' && (
              <span aria-hidden className="ml-1 opacity-60">
                / live
              </span>
            )}
          </span>
        </div>

        {animated.length > 0 && (
          <div className="flex flex-col gap-2">
            <MetaLabel as="p" className="text-text-secondary">
              Live
            </MetaLabel>
            <div className="grid grid-cols-2 gap-3" data-testid="wallpaper-grid-live">
              {animated.map((wp) => (
                <WallpaperThumb
                  key={wp.id}
                  wp={wp}
                  selected={wallpaper?.id === wp.id}
                  onSelect={handleWallpaper}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <MetaLabel as="p" className="text-text-secondary">
            Static
          </MetaLabel>
          <div className="grid grid-cols-2 gap-3" data-testid="wallpaper-grid-static">
            {staticWps.map((wp) => (
              <WallpaperThumb
                key={wp.id}
                wp={wp}
                selected={wallpaper?.id === wp.id}
                onSelect={handleWallpaper}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SoundBody({ reduced }: { reduced: boolean | null }) {
  const [soundOn, setSoundOn] = useState(false);
  const { pinged, ping } = useAppliedPulse(reduced);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  const toggleSound = (next: boolean) => {
    setSoundEnabled(next);
    setSoundOn(next);
    ping('sound');
    if (next) {
      setTimeout(() => playSound('notify'), 100);
      toast.success('Sound on. ding!');
    } else {
      toast.success('Sound off. Silence is golden.');
    }
  };

  return (
    <div className="flex flex-col">
      <Hairline />
      <SettingRow
        label="UI Sound Effects"
        hint={
          soundOn
            ? 'A gentle chime on window open, close, and notifications.'
            : 'Silence is golden.'
        }
        reduced={reduced}
        pulse={pinged === 'sound'}
        applied={pinged === 'sound'}
        control={
          <MonoToggle
            on={soundOn}
            onChange={toggleSound}
            label="UI Sound Effects"
            reduced={reduced}
          />
        }
      />
    </div>
  );
}

function PrivacyBody({ reduced }: { reduced: boolean | null }) {
  const isOptedOut = useAnalyticsStore((s) => s.isOptedOut);
  const setOptOut = useAnalyticsStore((s) => s.setOptOut);
  const { pinged, ping } = useAppliedPulse(reduced);

  // The control reads as "Usage Analytics ON" so the toggle's filled state
  // means "sharing" - flipping it off opts out. We invert the store flag.
  const analyticsOn = !isOptedOut;

  const toggleAnalytics = (next: boolean) => {
    setOptOut(!next);
    ping('analytics');
    toast.success(
      next
        ? 'Analytics on. Anonymous usage only.'
        : 'Analytics off. Nothing leaves this tab.',
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-[60ch] text-sm leading-relaxed text-text-secondary">
        This portfolio records anonymous, session-only usage to understand which
        apps people open. No accounts, no personal data, no cross-site tracking.
      </p>
      <div className="flex flex-col">
        <Hairline />
        <SettingRow
          label="Usage Analytics"
          hint={
            analyticsOn
              ? 'Anonymous, session-only. Helps me see which apps land.'
              : 'Opted out. Nothing leaves this tab.'
          }
          reduced={reduced}
          pulse={pinged === 'analytics'}
          applied={pinged === 'analytics'}
          control={
            <MonoToggle
              on={analyticsOn}
              onChange={toggleAnalytics}
              label="Usage Analytics"
              reduced={reduced}
            />
          }
        />
      </div>
    </div>
  );
}

const STACK = [
  'Next.js 15',
  'React 19',
  'TypeScript',
  'Tailwind CSS',
  'Framer Motion',
  'Zustand',
  'PostHog',
];

const V22_HIGHLIGHTS = [
  'iOS-style phone shell: squircle home screen, paged dock, lock screen',
  'iOS push navigation with edge-swipe back across mobile apps',
  'Visible Done button in open apps + system back closes the app',
  'Live GitHub Activity: contribution heatmap, events, active repos',
  'Fluid type so heroes scale smoothly from 360px Android to desktop',
  'File Explorer star counts live from /api/github/repos',
  'Native mobile variants for Projects, Resume, Contact, Terminal, Games',
  'Safe-area handling across notches and home indicators',
];

function AboutBody() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h3 className="font-display text-3xl leading-tight text-text">devOS</h3>
        <MetaLabel as="p" className="text-text-secondary">
          Version 2.2.0 / Sprint 4
        </MetaLabel>
        <MetaLabel as="p" className="text-text-secondary">
          Built by Devanshu Chicholikar
        </MetaLabel>
      </div>

      {/* Stack - mono run separated by middots, hairline above. */}
      <div className="flex flex-col gap-3">
        <MetaLabel as="p" className="text-text">
          Stack
        </MetaLabel>
        <Hairline />
        <p className="flex flex-wrap items-baseline gap-x-1 gap-y-1 pt-1">
          {STACK.map((tech, i) => (
            <React.Fragment key={tech}>
              {i > 0 && (
                <span aria-hidden className="font-mono-meta opacity-40">
                  &middot;
                </span>
              )}
              <span className="font-mono text-[13px] leading-snug text-text">
                {tech}
              </span>
            </React.Fragment>
          ))}
        </p>
      </div>

      {/* What's in v2.2 - hairline-led bullet column. */}
      <div className="flex flex-col gap-3">
        <MetaLabel as="p" className="text-text">
          What&apos;s in v2.2
        </MetaLabel>
        <Hairline />
        <ul className="flex flex-col gap-2 pt-1">
          {V22_HIGHLIGHTS.map((item) => (
            <li
              key={item}
              className="flex gap-3 text-sm leading-relaxed text-text-secondary"
            >
              <span aria-hidden className="mt-[0.5em] h-px w-3 shrink-0 bg-text/40" />
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="max-w-[64ch] text-sm leading-relaxed text-text-secondary">
        An interactive portfolio built as a desktop OS. Every app is a window
        into who I am, what I&apos;ve built, and how I think about software.
      </p>
    </div>
  );
}

function SectionBody({ id, reduced }: { id: SectionId; reduced: boolean | null }) {
  switch (id) {
    case 'appearance':
      return <AppearanceBody reduced={reduced} />;
    case 'sound':
      return <SoundBody reduced={reduced} />;
    case 'privacy':
      return <PrivacyBody reduced={reduced} />;
    case 'about':
      return <AboutBody />;
  }
}

/* ------------------------------------------------------------------ */
/*  Index rail (desktop) - numbered scroll-spy navigation, monochrome. */
/* ------------------------------------------------------------------ */

const RAIL_MARKER_ID = 'settings-rail-active';

function RailRow({
  number,
  label,
  active,
  reduced,
  onClick,
}: {
  number: string;
  label: string;
  active: boolean;
  reduced: boolean | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="rail-row"
      aria-current={active ? 'true' : undefined}
      className="group relative flex w-full items-center gap-3 px-4 py-2 text-left focus-visible:outline-none"
    >
      {active && (
        <motion.span
          layoutId={RAIL_MARKER_ID}
          aria-hidden
          className="absolute left-0 top-1/2 h-[1.1em] w-[2px] -translate-y-1/2 bg-text"
          transition={withReduced(
            { type: 'spring', stiffness: 520, damping: 40, mass: 0.6 },
            reduced,
          )}
        />
      )}
      <span
        className={`font-mono-meta shrink-0 transition-opacity ${
          active ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'
        }`}
      >
        {number}
      </span>
      <span
        className={`font-display min-w-0 flex-1 truncate transition-transform ${
          active ? 'text-text' : 'text-text-secondary group-hover:text-text'
        } ${reduced ? '' : 'group-hover:translate-x-0.5'}`}
      >
        {label}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Scroll-spy - highlights the rail row in view (never reveals).      */
/* ------------------------------------------------------------------ */

function useScrollSpy(scrollRef: React.RefObject<HTMLDivElement | null>) {
  const [active, setActive] = useState<SectionId>('appearance');

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    let raf = 0;
    const compute = () => {
      raf = 0;
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>('[data-section-id]'),
      );
      if (nodes.length === 0) return;

      // Bottom of scroll: a short last section can never cross a top trigger
      // line, so force it active at the end (last group still highlights).
      const atBottom =
        root.scrollTop + root.clientHeight >= root.scrollHeight - 4;
      if (atBottom) {
        const last = nodes[nodes.length - 1].getAttribute('data-section-id');
        if (last) setActive(last as SectionId);
        return;
      }

      // Active = last section whose top has passed a line ~32% down the area.
      const line = root.getBoundingClientRect().top + root.clientHeight * 0.32;
      let current = nodes[0].getAttribute('data-section-id');
      for (const node of nodes) {
        if (node.getBoundingClientRect().top <= line) {
          current = node.getAttribute('data-section-id');
        } else {
          break;
        }
      }
      if (current) setActive(current as SectionId);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    compute();
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrollRef]);

  return active;
}

/* ------------------------------------------------------------------ */
/*  Main app - desktop default, mobile branch.                         */
/* ------------------------------------------------------------------ */

export default function SettingsApp({ variant = 'desktop' }: SettingsAppProps = {}) {
  if (variant === 'mobile') return <MobileSettings />;
  return <DesktopSettings />;
}

function DesktopSettings() {
  const reduced = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const active = useScrollSpy(scrollRef);

  const scrollTo = useCallback(
    (id: SectionId) => {
      const root = scrollRef.current;
      if (!root) return;
      const target = root.querySelector<HTMLElement>(`#${SECTION_DOM_ID(id)}`);
      if (!target) return;
      root.scrollTo({
        top: target.offsetTop - 24,
        behavior: reduced ? 'auto' : 'smooth',
      });
    },
    [reduced],
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Index rail. */}
      <nav
        aria-label="Settings sections"
        className="hidden w-44 shrink-0 flex-col overflow-y-auto border-r border-border md:flex"
      >
        <div className="px-4 py-5">
          <MetaLabel as="p">Preferences</MetaLabel>
        </div>
        <Hairline />
        <div className="flex flex-col py-2">
          {SECTIONS.map(({ id, number, label }) => (
            <RailRow
              key={id}
              number={number}
              label={label}
              active={active === id}
              reduced={reduced}
              onClick={() => scrollTo(id)}
            />
          ))}
        </div>
      </nav>

      {/* Scrolled editorial document. */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <motion.div
          className="mx-auto flex max-w-2xl flex-col gap-16 px-6 py-10 sm:px-10 sm:py-12"
          variants={reveal.container(reduced)}
          initial="hidden"
          animate="show"
        >
          {SECTIONS.map(({ id, number, label }) => (
            <motion.div
              key={id}
              id={SECTION_DOM_ID(id)}
              data-section-id={id}
              variants={reveal.item(reduced)}
            >
              <EditorialSection number={number} eyebrow={label} title={label}>
                <SectionBody id={id} reduced={reduced} />
              </EditorialSection>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
