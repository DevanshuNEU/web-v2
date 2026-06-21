'use client';

/**
 * BrowserApp - a minimal browser inside devOS, in the monochrome editorial
 * register.
 *
 * Single clean view (no tab strip): back / forward / reload, one hairline-
 * underline address field with a lock glyph, a thin monochrome progress line,
 * and a quiet editorial start page (hairline tiles: serif site name + mono URL)
 * over a very faint seeded Plotter linework backdrop.
 *
 * Hybrid content: allow-listed sites (Devanshu's own) render live in a
 * sandboxed iframe; everything else gets a graceful "open in new tab" card,
 * laid over a faint dithered field, so a frame is never blank. The decision
 * lives in lib/browser.ts and is preserved here verbatim.
 *
 * Register / house rules: strictly monochrome three-tone; the generative
 * signatures (Plotter, Dither) self-gate on useIsMono() + reduced-motion and
 * are additionally only mounted in the mono palette so the color ("Fun") look
 * stays clean. No accent. No scroll-triggered reveals: the start page staggers
 * in ONCE on mount. Back / forward / reload are high-frequency, so they never
 * animate an entrance - only a reduced-motion-gated :active press.
 *
 * Motion (Emil):
 *   - Nav buttons (back/forward/reload) are used constantly -> NO entrance
 *     animation, instant; the only motion is a subtle :active scale(0.97),
 *     gated on reduced motion + a fine pointer.
 *   - Start-page tiles mount-stagger once via the shared reveal container;
 *     hover is a hairline underline that grows (transform-only, GPU).
 *   - The loading line is constant motion -> linear easing, calm, ink/opacity
 *     only (never accent), and collapses to a static indeterminate bar under
 *     reduced motion.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, RotateCw, Lock, Globe, ExternalLink, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMono } from '@/hooks/usePalette';
import { MetaLabel, Hairline } from '@/components/editorial';
import { Plotter, Dither } from '@/components/signature';
import { strokeSet } from '@/lib/signature/plotter';
import { reveal } from '@/lib/motion';
import {
  START_URL,
  START_LINKS,
  normalizeUrl,
  hostOf,
  isEmbeddableUrl,
  isSecure,
} from '@/lib/browser';

/* Strong ease-out (Emil): "starts fast, feels responsive" for press feedback. */
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function BrowserApp() {
  const mono = useIsMono();
  const reduced = useReducedMotion();

  // History stack with a cursor, so back/forward are pure index moves.
  const [history, setHistory] = useState<string[]>([START_URL]);
  const [cursor, setCursor] = useState(0);
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const url = history[cursor];
  const canBack = cursor > 0;
  const canForward = cursor < history.length - 1;
  const onStart = url === START_URL;
  const embeddable = !onStart && isEmbeddableUrl(url);

  // Keep the address bar in sync with the active page (blank on the start page).
  useEffect(() => {
    setInputUrl(onStart ? '' : url);
  }, [url, onStart]);

  const go = useCallback((raw: string) => {
    const next = normalizeUrl(raw);
    setHistory((h) => [...h.slice(0, cursorRef.current + 1), next]);
    setCursor((c) => c + 1);
    setIsLoading(next !== START_URL && isEmbeddableUrl(next));
  }, []);

  // cursor in a ref so `go` can truncate forward history without a stale closure.
  const cursorRef = useRef(cursor);
  useEffect(() => { cursorRef.current = cursor; }, [cursor]);

  const back = useCallback(() => {
    setCursor((c) => {
      const n = Math.max(0, c - 1);
      const target = history[n];
      setIsLoading(target !== START_URL && isEmbeddableUrl(target));
      return n;
    });
  }, [history]);

  const forward = useCallback(() => {
    setCursor((c) => {
      const n = Math.min(history.length - 1, c + 1);
      const target = history[n];
      setIsLoading(target !== START_URL && isEmbeddableUrl(target));
      return n;
    });
  }, [history]);

  const reload = useCallback(() => {
    if (onStart) return;
    setReloadKey((k) => k + 1);
    if (embeddable) setIsLoading(true);
  }, [onStart, embeddable]);

  // Safety net: never let the loading line spin forever if onLoad never fires
  // (some pages, or a cross-origin block, won't report load).
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setIsLoading(false), 3500);
    return () => clearTimeout(t);
  }, [isLoading, url, reloadKey]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) go(inputUrl);
  };

  return (
    <div className="flex h-full w-full flex-col bg-bg">
      {/* ── Toolbar ── hairline-bounded editorial chrome. ── */}
      <div className="flex items-center gap-1 border-b border-border px-2.5 py-2">
        <NavButton label="Back" onClick={back} disabled={!canBack} reduced={reduced}>
          <ArrowLeft size={16} />
        </NavButton>
        <NavButton label="Forward" onClick={forward} disabled={!canForward} reduced={reduced}>
          <ArrowRight size={16} />
        </NavButton>
        <NavButton label="Reload" onClick={reload} disabled={onStart} reduced={reduced}>
          <RotateCw size={15} />
        </NavButton>

        {/* Address bar: a clean field on a single hairline underline, not a pill. */}
        <form onSubmit={submit} className="ml-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 border-b border-border px-1 py-1.5
                          transition-colors focus-within:border-text">
            {onStart ? (
              <Compass size={13} className="shrink-0 text-text-secondary" aria-hidden />
            ) : isSecure(url) ? (
              <Lock size={12} className="shrink-0 text-text-secondary" aria-hidden />
            ) : (
              <Globe size={12} className="shrink-0 text-text-secondary" aria-hidden />
            )}
            <input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              placeholder="Search or enter a site"
              spellCheck={false}
              autoComplete="off"
              aria-label="Address"
              className="min-w-0 flex-1 bg-transparent font-mono text-[12.5px] text-text
                         outline-none placeholder:text-text-secondary/70"
            />
          </div>
        </form>
      </div>

      {/* ── Progress line ── monochrome ink, opacity-only, calm, never accent. ── */}
      <div className="relative h-px w-full overflow-hidden bg-transparent" aria-hidden>
        {isLoading && (
          <motion.div
            className="absolute inset-y-0 left-0 bg-text"
            // Constant motion -> linear (Emil). Travel runs on the GPU: animate a
            // full transform string (translateX in own-width %), never the `left`
            // layout property (which forces layout/paint off the compositor).
            // Reduced motion: a static indeterminate full-width bar at low
            // opacity, no travel.
            style={reduced ? { left: 0, right: 0, opacity: 0.35 } : { width: '32%', opacity: 0.55 }}
            animate={reduced ? undefined : { transform: ['translateX(-100%)', 'translateX(312.5%)'] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>

      {/* ── Content ── */}
      <div className="relative min-h-0 flex-1">
        {onStart ? (
          <StartPage mono={mono} reduced={reduced} onOpen={go} />
        ) : embeddable ? (
          <iframe
            key={`${url}#${reloadKey}`}
            src={url}
            title={hostOf(url) ?? 'Browser'}
            onLoad={() => setIsLoading(false)}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            className="h-full w-full border-0 bg-white"
          />
        ) : (
          <BlockedCard url={url} mono={mono} reduced={reduced} />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Nav button - high-frequency action: instant, press-only feedback     */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Back / forward / reload are pressed constantly, so per Emil's frequency rule
 * they get NO entrance animation. The only motion is a restrained :active press
 * (scale 0.97), gated on reduced motion and a fine pointer via whileTap.
 */
function NavButton({
  children, label, onClick, disabled, reduced,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  reduced: boolean | null;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.1, ease: EASE_OUT }}
      className="grid h-8 w-8 place-items-center text-text-secondary transition-colors
                 hover:text-text disabled:opacity-25 disabled:hover:text-text-secondary
                 focus-visible:outline-none"
    >
      {children}
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Start page - editorial tiles over a faint Plotter navigation texture */
/* ─────────────────────────────────────────────────────────────────── */

function StartPage({
  mono, reduced, onOpen,
}: {
  mono: boolean;
  reduced: boolean | null;
  onOpen: (url: string) => void;
}) {
  // Deterministic seeded linework. strokeSet draws abstract plotter marks in a
  // 0..100 viewBox; kept extremely faint so it reads as quiet navigation
  // texture, never decoration that fights the minimalism. Memoized so the
  // generator runs once.
  const lines = useMemo(() => (seed: number) => strokeSet(seed, 9), []);

  return (
    <div className="relative h-full w-full overflow-auto">
      {/* Backdrop: Plotter self-gates on mono + draws static (animate off by
          default) and renders null in the color palette; we additionally only
          mount it in mono so nothing ships in the Fun look. pointer-events-none
          and very low opacity keep it a whisper behind the content. */}
      {mono && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
        >
          <Plotter generator={lines} seed={7} strokeWidth={0.6} viewBox="0 0 100 100" />
        </div>
      )}

      <div className="relative grid h-full w-full place-items-center p-8">
        <div className="w-full max-w-xl">
          {/* Masthead: serif title + mono sub-line, hairline-anchored. The
              start page is the most landing-like surface; restraint over a
              hero. Staggers in once with the tiles. */}
          <motion.div
            variants={reveal.container(reduced)}
            initial="hidden"
            animate="show"
            className="flex flex-col"
          >
            <motion.h2
              variants={reveal.item(reduced)}
              className="font-display leading-none text-text"
              style={{ fontSize: 30 }}
            >
              Browser
            </motion.h2>

            <motion.div variants={reveal.item(reduced)} className="mt-2">
              <MetaLabel className="text-text-secondary">
                My work, live <span aria-hidden className="mx-1 opacity-40">/</span> anything else opens in a new tab
              </MetaLabel>
            </motion.div>

            <motion.div variants={reveal.item(reduced)} className="mt-6">
              <Hairline />
            </motion.div>

            {/* Tiles: hairline editorial rows, serif site name + mono URL. No
                glass, no card fill. Index marker keeps the editorial register. */}
            <div className="flex flex-col">
              {START_LINKS.map((link, i) => (
                <StartTile
                  key={link.url}
                  index={String(i + 1).padStart(2, '0')}
                  label={link.label}
                  note={link.note}
                  url={link.url}
                  reduced={reduced}
                  onOpen={() => onOpen(link.url)}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/**
 * StartTile - a single hairline navigation row.
 *
 * IndexRow-style read: mono index + serif site name, with the mono host below.
 * Hover is a hairline underline that grows under the name (transform-only, GPU,
 * gated to a fine pointer via the group). Press is a restrained scale(0.99),
 * gated on reduced motion. The trailing hairline rules the column.
 */
function StartTile({
  index, label, note, url, reduced, onOpen,
}: {
  index: string;
  label: string;
  note: string;
  url: string;
  reduced: boolean | null;
  onOpen: () => void;
}) {
  const host = hostOf(url) ?? url;
  return (
    <motion.button
      type="button"
      variants={reveal.item(reduced)}
      onClick={onOpen}
      whileTap={reduced ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.12, ease: EASE_OUT }}
      data-testid="start-tile"
      className="group flex w-full items-baseline gap-4 border-b border-border py-4 text-left
                 focus-visible:outline-none"
    >
      <MetaLabel className="w-8 shrink-0 justify-start text-text-secondary">{index}</MetaLabel>

      <span className="min-w-0 flex-1">
        <span className="relative inline-block max-w-full">
          <span className="block truncate font-display leading-tight text-text" style={{ fontSize: 18 }}>
            {label}
          </span>
          {/* Hairline underline grows on hover (scaleX, transform-only). */}
          <span
            aria-hidden
            className={cn(
              'block h-px origin-left scale-x-0 bg-text/50 transition-transform duration-200',
              // Gate hover motion to a fine pointer + real hover so a touch tap
              // doesn't fire a false hover (Emil a11y rule).
              reduced ? '' : '[@media(hover:hover)and(pointer:fine)]:group-hover:scale-x-100',
            )}
          />
        </span>
        <span className="mt-1 block truncate font-mono text-[11.5px] text-text-secondary">
          {host}
        </span>
      </span>

      <span className="mt-1 hidden shrink-0 text-text-secondary/70 transition-colors group-hover:text-text sm:block">
        <ExternalLink size={13} aria-hidden />
      </span>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Blocked card - "open in new tab" over a faint dithered field         */
/* ─────────────────────────────────────────────────────────────────── */

function BlockedCard({ url, mono, reduced }: { url: string; mono: boolean; reduced: boolean | null }) {
  const host = hostOf(url) ?? url;
  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden p-8">
      {/* Faint dithered field instead of a flat background. Dither self-gates on
          mono (plain img otherwise), so we only mount it in the mono palette to
          keep the color look clean. Decorative, pointer-events-none, very low
          opacity. There is no animation in Dither, so it is reduced-motion
          neutral. */}
      {mono && (
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]">
          <Dither
            src="/wallpapers/dark-abstract.png"
            alt=""
            size={140}
            matrix={4}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: EASE_OUT }}
        className="relative w-full max-w-sm border border-border bg-bg/80 p-7 text-center backdrop-blur-sm"
      >
        <div className="mb-4 inline-grid h-11 w-11 place-items-center border border-border">
          <Globe size={20} className="text-text-secondary" aria-hidden />
        </div>

        <div className="font-display text-text" style={{ fontSize: 17 }}>
          {host} can&apos;t be embedded
        </div>

        <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
          Most sites block being shown inside another page. Open it in a real tab instead.
        </p>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 border border-text px-3.5 py-2 font-mono
                     text-[12px] uppercase tracking-wider text-text transition-colors
                     hover:bg-text hover:text-bg motion-safe:active:scale-[0.98]"
        >
          Open in new tab <ExternalLink size={13} aria-hidden />
        </a>
      </motion.div>
    </div>
  );
}
