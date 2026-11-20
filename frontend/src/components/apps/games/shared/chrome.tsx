'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Hairline, MetaLabel } from '@/components/editorial';
import { withReduced } from '@/lib/motion';

export function bestScore(key: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    return parseInt(localStorage.getItem(key) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

// Fun palette button fills. White text on each passes 4.5:1 (the lighter
// Tailwind 500 greens measured 2.3:1).
export const FUN = {
  snake:  { fill: '#15803d', hover: '#166534' },
  tetris: { fill: '#4f46e5', hover: '#4338ca' },
  typer:  { fill: '#047857', hover: '#065f46' },
} as const;

// Keys a game handles while its root has focus. Space and Enter are left to a
// focused button so they press it, the way they do everywhere else.
export function isButtonTarget(e: React.KeyboardEvent) {
  const t = e.target as HTMLElement;
  return t !== e.currentTarget && t.closest('button') !== null;
}

// Pause a game when focus leaves its root (title bar click, another window,
// Tab out), so it never keeps running while its keys go somewhere else.
export function leftRoot(e: React.FocusEvent) {
  const next = e.relatedTarget as Node | null;
  return !next || !e.currentTarget.contains(next);
}

// One numbered, ruled index entry. Serif name, mono caption line, mono best on
// the right. Hover is a graphite tint + tiny translate (transform/opacity only,
// ease-out); the row presses to 0.985 on :active. No per-frame motion.
// ─────────────────────────────────────────────────────────────────────────────
// Shared game header
// ─────────────────────────────────────────────────────────────────────────────

// A single HUD stat: tiny mono uppercase label over a value. The value updates
// live during play and is rendered plainly - NO entrance/score-pop animation,
// because the HUD is a high-frequency surface (emil frequency rule).
export function HudStat({ label, value, narrowHidden = false }: { label: string; value: React.ReactNode; narrowHidden?: boolean }) {
  return (
    <div className={`flex-col items-end gap-0.5 text-right ${narrowHidden ? 'hidden [@container(min-width:480px)]:flex' : 'flex'}`}>
      <MetaLabel className="text-text-tertiary">{label}</MetaLabel>
      <span className="font-mono-meta tabular-nums leading-none text-text whitespace-nowrap text-[clamp(0.82rem,2cqi,1rem)]">
        {value}
      </span>
    </div>
  );
}

export function GameHeader({
  title, score, best, scoreLabel = 'Score', bestLabel = 'Best', bestNarrowHidden = false,
  onBack, onReset, children,
}: {
  title: string; score?: number | string; best?: number | string;
  scoreLabel?: string; bestLabel?: string; bestNarrowHidden?: boolean;
  onBack: () => void; onReset: () => void; children?: React.ReactNode;
}) {
  // Mono editorial HUD frame: a single hairline rule under a quiet bar.
  const iconBtn =
    'inline-flex min-h-11 min-w-11 items-center justify-center text-text-secondary transition-[color,transform] duration-150 ease-out hover:text-text active:scale-95';
  return (
    <div className="flex-shrink-0">
      <div className="flex items-center gap-3 px-2 py-1 bg-surface/20">
        <button onClick={onBack} className={iconBtn} aria-label="Back to arcade">
          <ArrowLeft size={15} />
        </button>
        <span className="font-display text-text leading-none whitespace-nowrap text-[clamp(1rem,2.6cqi,1.3rem)]">{title}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-4 [@container(min-width:640px)]:gap-5">
          {children}
          {score !== undefined && <HudStat label={scoreLabel} value={score} />}
          {best !== undefined && <HudStat label={bestLabel} value={best} narrowHidden={bestNarrowHidden} />}
        </div>
        <button onClick={onReset} className={iconBtn} aria-label="Reset game">
          <RotateCcw size={14} />
        </button>
      </div>
      <Hairline />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared overlay chrome - start / pause / game-over surfaces.
//
// These are OCCASIONAL surfaces (seen between rounds, not during play), so a
// single tasteful entrance is allowed per emil. Enter is transform + opacity,
// ease-out, never from scale(0); it collapses to instant under reduced motion.
// ─────────────────────────────────────────────────────────────────────────────

export const OVERLAY_EASE = [0.23, 1, 0.32, 1] as const;

// Pressable editorial button. Default = the ink primary (filled bg-text/text-bg);
// 'ghost' = hairline outline. Mono palette keeps it monochrome; Fun keeps the
// per-game accent passed in via `accent`/`accentHover`.
export function OverlayButton({
  children, onClick, variant = 'primary', mono, accent, accentHover, size = 'lg', type = 'button',
}: {
  children: React.ReactNode; onClick: () => void; type?: 'button' | 'submit';
  variant?: 'primary' | 'ghost'; mono: boolean;
  accent?: string; accentHover?: string;
  /** 'lg' for overlays, 'sm' for the 36px control bar. */
  size?: 'lg' | 'sm';
}) {
  if (variant === 'ghost') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center justify-center gap-2 min-h-11 border border-border px-5 py-2 text-text font-medium
                   transition-[transform,border-color] duration-150 ease-out hover:border-text/45 active:scale-[0.97]
                   font-mono-meta"
      >
        {children}
      </button>
    );
  }
  const colorCls = mono
    ? 'bg-text text-bg hover:opacity-90'
    : 'text-white';
  return (
    <button
      onClick={onClick}
      type={type}
      className={`inline-flex items-center justify-center gap-2 font-semibold
                  transition-[transform,opacity,background-color] duration-150 ease-out active:scale-[0.97]
                  font-mono-meta ${size === 'sm' ? 'min-h-11 px-4' : 'min-h-11 px-6 py-2.5'} ${colorCls}`}
      style={mono ? undefined : { background: accent }}
      onMouseEnter={mono || !accentHover ? undefined : (e) => { (e.currentTarget as HTMLButtonElement).style.background = accentHover; }}
      onMouseLeave={mono || !accent ? undefined : (e) => { (e.currentTarget as HTMLButtonElement).style.background = accent; }}
    >
      {children}
    </button>
  );
}

// Scrim + centered card that animates in once on (re)mount of the status.
// The boards are always drawn black, so the overlay always uses the dark
// tokens (the .dark class re-scopes the color variables), in light mode too.
// Without it, light mode washed the board to a muddy gray.
export function GameOverlay({ reduced, children }: { reduced: boolean | null; children: React.ReactNode }) {
  return (
    // m-auto on the card (not justify-center on the scrim) so a card taller
    // than a short phone screen scrolls instead of clipping its top.
    <div className="dark absolute inset-0 z-10 flex overflow-y-auto overscroll-contain bg-black/70 backdrop-blur-[2px]">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={withReduced({ duration: 0.24, ease: OVERLAY_EASE }, reduced)}
        className="m-auto flex flex-col items-center gap-4 px-6 py-6 text-center"
      >
        {children}
      </motion.div>
    </div>
  );
}

// Editorial controls hint strip - mono uppercase meta, single hairline above.
export function ControlsHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-shrink-0">
      <Hairline />
      <div className="flex items-center justify-center px-4 py-2.5 bg-surface/10 text-center">
        <MetaLabel className="text-text-secondary">{children}</MetaLabel>
      </div>
    </div>
  );
}

// Announces game state changes (start, pause, game over) to screen readers.
export function GameStatus({ children }: { children: React.ReactNode }) {
  return <p role="status" aria-live="polite" className="sr-only">{children}</p>;
}
