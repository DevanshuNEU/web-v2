'use client';

/**
 * SettingsApp - "Preferences" in the Instrument house language.
 *
 * A section rail on the left drives scroll-spy over one scrolled document of
 * grouped settings; every control is a hairline-divided row (label left,
 * control right). Controls come first: the preview sits beside them in wide
 * windows and is dropped in narrow ones.
 *
 * Groups: Appearance / Sound / Privacy / About.
 *
 * Window-responsive: everything keys off the window (container queries), never
 * the viewport. The rail shows from a 600px window; the document column is its
 * own query container, so rows stack under 480px of column and the preview
 * moves beside the controls from 640px of column.
 *
 * All wiring is preserved verbatim - theme mode, palette, accent (Color-gated),
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
 * Color palette, as before. Everything else branches via useIsMono().
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
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme, ACCENT_COLORS } from '@/store/themeStore';
import type { Wallpaper } from '@/store/themeStore';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useOSStore } from '@/store/osStore';
import { useIsMono } from '@/hooks/usePalette';
import { getWallpapersForTheme } from '@/data/wallpapers';
import {
  isSoundEnabled,
  setSoundEnabled,
  playSound,
} from '@/hooks/useSoundEffects';
import { Hairline, MetaLabel } from '@/components/editorial';
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
  { id: 'appearance', label: 'Appearance' },
  { id: 'sound', label: 'Sound' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'about', label: 'About' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const SECTION_DOM_ID = (id: SectionId) => `settings-section-${id}`;

/* ------------------------------------------------------------------ */
/*  Applied pulse - shared "a setting just changed" feedback.          */
/*                                                                     */
/*  A row registers a key; calling ping(key) flashes a one-shot        */
/*  hairline pulse + a transient "Applied" mono tag on that row. Pure  */
/*  monochrome and auto-clears. Under reduced motion the tag still     */
/*  shows (without motion) and the pulse line is skipped, so every     */
/*  setting confirms itself either way.                                 */
/* ------------------------------------------------------------------ */

function useAppliedPulse(reduced: boolean | null) {
  const [pinged, setPinged] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ping = useCallback(
    (key: string) => {
      if (timer.current) clearTimeout(timer.current);
      setPinged(key);
      timer.current = setTimeout(() => setPinged(null), reduced ? 1800 : 1400);
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

/** Transient "Applied" mono tag, shown next to a row that just changed. Its
 *  wrapper is a polite live region, so screen readers hear it too. */
function AppliedTag({ show, reduced }: { show: boolean; reduced: boolean | null }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex min-w-[4.5rem] justify-end">
      <AnimatePresence>
        {show && (
          <motion.span
            initial={reduced ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="font-mono-meta text-text"
          >
            Applied
          </motion.span>
        )}
      </AnimatePresence>
    </span>
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
      {/* Stacks under 480px of column so hints never wrap one word per line. */}
      <div className="flex flex-col items-start gap-3 py-4 [@container(min-width:480px)]:flex-row [@container(min-width:480px)]:items-center [@container(min-width:480px)]:justify-between [@container(min-width:480px)]:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <MetaLabel className="text-text">{label}</MetaLabel>
          {hint !== undefined && (
            <span className="text-sm leading-snug text-text-secondary">
              {hint}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-row-reverse items-center gap-3 [@container(min-width:480px)]:flex-row">
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
              transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
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
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-[background-color,border-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]
                  ${on ? 'border-text bg-text' : 'border-text-secondary bg-transparent'}`}
    >
      <motion.span
        aria-hidden
        // GPU-only: animate the transform string (not framer's `x` shorthand or
        // a `left` layout prop) so the thumb stays on the compositor. A snappy
        // interruptible spring lets a rapid double-toggle retarget mid-travel.
        animate={{ transform: `translate(${on ? 20 : 0}px, -50%)` }}
        transition={withReduced(
          { type: 'spring', damping: 22, stiffness: 420, mass: 0.6 },
          reduced,
        )}
        className={`absolute left-1 top-1/2 h-4 w-4 rounded-full shadow-sm
                    ${on ? 'bg-bg' : 'bg-text'}`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  EditorialChoice - two-option segmented control (mode / palette).   */
/*                                                                     */
/*  A hairline box with the active option filled ink-on-paper, so the   */
/*  choice reads at a glance in light, dark, mono and color. Exposed as a */
/*  radiogroup: arrow keys move the selection, one tab stop.            */
/* ------------------------------------------------------------------ */

function EditorialChoice<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const n = (i + step + options.length) % options.length;
    onChange(options[n].id);
    refs.current[n]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex border border-text-secondary">
      {options.map(({ id, label: optionLabel }, i) => {
        const active = value === id;
        return (
          <button
            key={id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`font-mono-meta min-h-[36px] min-w-[4.5rem] px-3.5 transition-colors duration-150
                        ${active ? 'bg-text font-semibold text-bg' : 'text-text-secondary hover:text-text'}`}
          >
            {optionLabel}
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
/*  Color palette lets the accent dot carry the live accent color, which  */
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

  const still = wallpaper?.imageUrl ?? wallpaper?.previewUrl;
  const wallStyle: React.CSSProperties = still
    ? { backgroundImage: `url(${still})`, backgroundSize: 'cover', backgroundPosition: 'center' }
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
    <div className="flex flex-col gap-2" aria-hidden>
      <div
        className="relative aspect-[16/10] w-full overflow-hidden border border-border"
        style={{ filter: mono ? 'grayscale(1)' : undefined }}
      >
        {/* Wallpaper plate. */}
        <div className="absolute inset-0" style={wallStyle} aria-hidden />

        {/* A small floating "window" centered on the wallpaper. */}
        <motion.div
          key={`${mode}-${wallpaper?.id ?? 'none'}`}
          // Theme/palette swap crossfade: GPU-only (transform + opacity), with a
          // brief blur to bridge the outgoing and incoming surface so the swap
          // reads as one transformation rather than two overlapping windows
          // (Kowalski blur-mask trick; blur < 20px, transitions out to 0).
          initial={
            reduced
              ? false
              : { opacity: 0, transform: 'translateY(6px) scale(0.985)', filter: 'blur(3px)' }
          }
          animate={{ opacity: 1, transform: 'translateY(0px) scale(1)', filter: 'blur(0px)' }}
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
      <MetaLabel as="p" className="text-text-secondary">Preview</MetaLabel>
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
      className={`group relative w-full overflow-hidden border transition-[border-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]
                  ${selected ? 'border-text ring-2 ring-text ring-offset-2 ring-offset-bg' : 'border-border [@media(hover:hover)and(pointer:fine)]:hover:border-text/50'}`}
      style={{ aspectRatio: '16/9', filter: mono ? 'grayscale(1)' : undefined }}
    >
      {wp.imageUrl || wp.previewUrl ? (
        <Image src={(wp.imageUrl ?? wp.previewUrl) as string} alt="" fill sizes="(min-width: 1200px) 320px, 240px" className="object-cover" />
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

      {/* Selected marker - an ink check badge in the corner. */}
      {selected && (
        <span
          aria-hidden
          className="absolute right-1.5 top-1.5 z-10 grid h-5 w-5 place-items-center bg-text text-bg shadow-sm"
        >
          <Check size={13} strokeWidth={2.5} />
        </span>
      )}

      {/* Name plate - mono label over a hairline-darkened base. */}
      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-6 text-left font-mono-meta text-white">
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

  // No toasts here: the whole screen changes, and the row says "Applied".
  const handleMode = (next: 'light' | 'dark') => {
    if (next === mode) return;
    setMode(next);
    ping('mode');
  };

  const handlePalette = (next: 'mono' | 'color') => {
    if (next === palette) return;
    setPalette(next);
    ping('palette');
  };

  const handleWallpaper = (wp: Wallpaper) => {
    setWallpaper(wp);
    ping('wallpaper');
  };

  const accentName =
    Object.entries(ACCENT_COLORS).find(([, c]) => c === accentColor)?.[0] ?? 'Custom';

  return (
    <div className="flex flex-col gap-10">
      {/* Controls first; the preview sits beside them from 640px of column
          and is dropped below that, so a control is always in view. */}
      <div className="grid grid-cols-1 gap-6 [@container(min-width:640px)]:grid-cols-[minmax(0,1fr)_13rem] [@container(min-width:640px)]:gap-8">
        <div className="flex min-w-0 flex-col">
          <Hairline />
          <SettingRow
            label="Theme"
            hint="Light or dark, across every window."
            reduced={reduced}
            pulse={pinged === 'mode'}
            applied={pinged === 'mode'}
            control={
              <EditorialChoice
                label="Theme"
                options={[
                  { id: 'light', label: 'Light' },
                  { id: 'dark', label: 'Dark' },
                ]}
                value={mode}
                onChange={handleMode}
              />
            }
          />
          <SettingRow
            label="Palette"
            hint={
              palette === 'mono'
                ? 'Black and white.'
                : 'Navy tiles, two-tone icons.'
            }
            reduced={reduced}
            pulse={pinged === 'palette'}
            applied={pinged === 'palette'}
            control={
              <EditorialChoice
                label="Palette"
                options={[
                  { id: 'color', label: 'Color' },
                  { id: 'mono', label: 'Mono' },
                ]}
                value={palette}
                onChange={handlePalette}
              />
            }
          />

          {/* Accent picker - inherently colorful, gated to the Color palette. */}
          <AnimatePresence initial={false}>
            {palette === 'color' && (
              <motion.div
                key="accent"
                initial={reduced ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: reduced ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-3 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <MetaLabel className="text-text">Accent</MetaLabel>
                    <AppliedTag show={pinged === 'accent'} reduced={reduced} />
                  </div>
                  <div
                    className="flex flex-wrap gap-3 p-1"
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
                          }}
                          aria-label={`Set accent ${name}`}
                          aria-pressed={isActive}
                          className="relative grid h-8 w-8 place-items-center rounded-full transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)and(pointer:fine)]:hover:scale-110 active:scale-[0.97]"
                          style={{
                            background: color,
                            boxShadow: isActive
                              ? `0 0 0 2px rgb(var(--color-bg)), 0 0 0 4px rgb(var(--color-text))`
                              : '0 1px 3px rgba(0,0,0,0.18)',
                          }}
                        >
                          {isActive && <Check size={15} strokeWidth={3} aria-hidden className="text-white" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="font-mono-meta capitalize text-text-secondary">{accentName}</p>
                </div>
                <Hairline />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden [@container(min-width:640px)]:block">
          <LivePreview
            mode={mode}
            accentColor={accentColor}
            wallpaper={wallpaper}
            reduced={reduced}
          />
        </div>
      </div>

      {/* Wallpaper - thumbnail grids that add columns as the window grows. */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex items-baseline gap-3">
            <MetaLabel className="text-text">Wallpaper</MetaLabel>
            <AppliedTag show={pinged === 'wallpaper'} reduced={reduced} />
          </div>
          <span className="font-mono-meta text-text-secondary">
            {wallpaper?.name ?? 'None'}
            {wallpaper?.type === 'animated' && <span className="ml-1">/ live</span>}
          </span>
        </div>

        {animated.length > 0 && (
          <div className="flex flex-col gap-2">
            <MetaLabel as="p" className="text-text-secondary">
              Live
            </MetaLabel>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3" data-testid="wallpaper-grid-live">
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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3" data-testid="wallpaper-grid-static">
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
    // Sound has no visual result, so it confirms with a toast as well.
    if (next) {
      setTimeout(() => playSound('notify'), 100);
      toast.success('Sound on.');
    } else {
      toast.success('Sound off.');
    }
  };

  return (
    <div className="flex flex-col">
      <Hairline />
      <SettingRow
        label="Sound effects"
        hint={
          soundOn
            ? 'A soft chime when windows open and close, and on notifications.'
            : 'Off. Turn on for a chime when windows open and close.'
        }
        reduced={reduced}
        pulse={pinged === 'sound'}
        applied={pinged === 'sound'}
        control={
          <MonoToggle
            on={soundOn}
            onChange={toggleSound}
            label="Sound effects"
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
    // No visual result on screen, so a toast confirms it.
    toast.success(
      next
        ? 'Analytics on. Anonymous usage only.'
        : 'Analytics off. PostHog stops recording. Vercel still counts anonymous page views.',
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
              ? 'Anonymous, this session only. Shows me which apps people open.'
              : 'Opted out. PostHog stops recording. Vercel still counts anonymous page views.'
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

// What changed lives in the Changelog app; this section only points there.
function AboutBody() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <p className="font-display text-2xl leading-tight text-text">devOS 2.2</p>
        <p className="max-w-[60ch] text-sm leading-relaxed text-text-secondary">
          Built by Devanshu Chicholikar with {STACK.slice(0, -1).join(', ')} and {STACK[STACK.length - 1]}.
        </p>
      </div>
      <button
        type="button"
        onClick={() => useOSStore.getState().openWindow('changelog')}
        className="inline-flex self-start border border-text px-3.5 py-2 font-mono-meta text-text
                   transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]
                   hover:bg-text hover:text-bg active:scale-[0.97]"
      >
        See what changed
      </button>
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
  label,
  active,
  reduced,
  onClick,
}: {
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
      className="group relative flex w-full items-center gap-3 px-4 py-2 text-left"
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
        className={`font-display min-w-0 flex-1 truncate transition-transform ${
          active ? 'text-text font-medium' : 'text-text-secondary group-hover:text-text'
        } ${reduced ? '' : '[@media(hover:hover)and(pointer:fine)]:group-hover:translate-x-0.5'}`}
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
      {/* Section rail: only from a 600px window, so it never eats half of it. */}
      <nav
        aria-label="Settings sections"
        className="hidden w-44 shrink-0 flex-col overflow-y-auto border-r border-border [@container(min-width:600px)]:flex"
      >
        <div className="px-4 py-5">
          <MetaLabel as="p">Preferences</MetaLabel>
        </div>
        <Hairline />
        <div className="flex flex-col py-2">
          {SECTIONS.map(({ id, label }) => (
            <RailRow
              key={id}
              label={label}
              active={active === id}
              reduced={reduced}
              onClick={() => scrollTo(id)}
            />
          ))}
        </div>
      </nav>

      {/* Scrolled document. Its own query container, so rows and the
          preview respond to the column width, not the whole window. */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto [container-type:inline-size]">
        <motion.div
          className="mx-auto flex max-w-4xl flex-col gap-12 px-5 py-8 [@container(min-width:640px)]:px-10 [@container(min-width:640px)]:py-10"
          variants={reveal.container(reduced)}
          initial="hidden"
          animate="show"
        >
          {SECTIONS.map(({ id, label }) => (
            <motion.section
              key={id}
              id={SECTION_DOM_ID(id)}
              data-section-id={id}
              aria-labelledby={`${SECTION_DOM_ID(id)}-title`}
              variants={reveal.item(reduced)}
              className="flex flex-col"
            >
              <h2
                id={`${SECTION_DOM_ID(id)}-title`}
                className="font-display text-[1.5rem] leading-tight text-text"
              >
                {label}
              </h2>
              <div className="mt-4">
                <SectionBody id={id} reduced={reduced} />
              </div>
            </motion.section>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
