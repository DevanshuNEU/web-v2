'use client';

/**
 * GamesApp - Arcade
 *
 * Three working games - Snake, Tetris, Type Racer - wrapped in an editorial
 * monochrome chrome. ONLY the chrome is art-directed; every game loop, reducer,
 * input handler, collision/physics, scoring path and canvas draw routine below
 * is preserved byte-for-byte from the original, including the per-game mono
 * palettes (MONO_TETRIS / MONO_SNAKE_* / MONO_APPLE).
 *
 * Selector (design-taste-frontend, strictly monochrome): a numbered editorial
 * index - serif game names (Newsreader), tiny uppercase mono metadata (genre,
 * controls, best score), hairline dividers, generous space. A faint seeded
 * Plotter line-mark sits on the backdrop, hard-gated on the mono palette and
 * reduced motion by the primitive itself. The index staggers in ONCE on mount.
 *
 * Chrome motion (emil-design-eng): the selector rows press on :active and lift
 * on hover (transform + opacity, ease-out). Start / game-over overlays get a
 * single tasteful entrance (occasional surface). The in-game HUD score VALUE is
 * high-frequency, so it is rendered live but NEVER animated per update - no
 * score-pop during play. Everything collapses to instant under reduced motion.
 *
 * Window-dynamic: the app lives inside `.app-content` (container-type:
 * inline-size); the selector + HUD re-proportion off the window via the
 * cqi-aware editorial/text utilities. The game canvases keep their existing
 * ResizeObserver sizing logic untouched.
 */

import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft, RotateCcw, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pause, Play } from 'lucide-react';
import { useIsMono } from '@/hooks/usePalette';
import { useSwipe } from '@/hooks/useSwipe';
import { Hairline, MetaLabel } from '@/components/editorial';
import { Plotter } from '@/components/signature';
import { strokeSet } from '@/lib/signature/plotter';
import { reveal, withReduced } from '@/lib/motion';

type GameId = 'launcher' | 'snake' | 'tetris' | 'typeracer';

// ─────────────────────────────────────────────────────────────────────────────
// MONO PALETTE - grayscale tones for the arcade.
// Pieces/segments stay distinguishable by LIGHTNESS, not hue (color-not-only).
// Fun mode is gated to keep today's colors byte-for-byte.
// ─────────────────────────────────────────────────────────────────────────────

// Seven graphite tones spaced by lightness - one per tetromino, all distinct
// without relying on hue. Index aligns with TETROMINOES order (I,O,T,S,Z,L,J).
const MONO_TETRIS = ['#f4f4f5', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#e4e4e7', '#8a8a93'];
// Snake head brighter than body so the head reads at a glance.
const MONO_SNAKE_HEAD = '#f4f4f5';
const MONO_SNAKE_BODY = '#a1a1aa';
const MONO_APPLE      = '#e4e4e7';

// ─────────────────────────────────────────────────────────────────────────────
// SELECTOR - editorial numbered index
//
// Three games set as a ruled, numbered list: serif name + tiny uppercase mono
// metadata (genre · controls · best). No gradients, no glow, no colored chrome.
// hsKey / hsLabel feed the live best-score read from localStorage (rendered,
// not animated). controls / genre are the mono caption line.
// ─────────────────────────────────────────────────────────────────────────────

const CARDS = [
  {
    id: 'snake' as GameId,
    title: 'Snake',
    subtitle: 'Nokia 3310 edition',
    genre: 'Arcade',
    controls: 'Arrow keys or WASD. Space pauses.',
    controlsMobile: 'Swipe or tap controls',
    hsKey: 'devos-snake-hs',
    hsLabel: 'pts',
  },
  {
    id: 'tetris' as GameId,
    title: 'Tetris',
    subtitle: "The programmer's meditation",
    genre: 'Puzzle',
    controls: 'Arrows move and rotate. Space drops. P pauses.',
    controlsMobile: 'Tap controls',
    hsKey: 'devos-tetris-hs',
    hsLabel: 'pts',
  },
  {
    id: 'typeracer' as GameId,
    title: 'Type Racer',
    subtitle: 'Code faster than your linter',
    genre: 'Reflex',
    controls: 'Type the snippet. The timer starts on your first key.',
    controlsMobile: 'Tap to type',
    hsKey: 'devos-typeracer-hs',
    hsLabel: 'WPM',
  },
] as const;

function bestScore(key: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    return parseInt(localStorage.getItem(key) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

// Fun palette button fills. White text on each passes 4.5:1 (the lighter
// Tailwind 500 greens measured 2.3:1).
const FUN = {
  snake:  { fill: '#15803d', hover: '#166534' },
  tetris: { fill: '#4f46e5', hover: '#4338ca' },
  typer:  { fill: '#047857', hover: '#065f46' },
} as const;

// Keys a game handles while its root has focus. Space and Enter are left to a
// focused button so they press it, the way they do everywhere else.
function isButtonTarget(e: React.KeyboardEvent) {
  const t = e.target as HTMLElement;
  return t !== e.currentTarget && t.closest('button') !== null;
}

// Pause a game when focus leaves its root (title bar click, another window,
// Tab out), so it never keeps running while its keys go somewhere else.
function leftRoot(e: React.FocusEvent) {
  const next = e.relatedTarget as Node | null;
  return !next || !e.currentTarget.contains(next);
}

// One numbered, ruled index entry. Serif name, mono caption line, mono best on
// the right. Hover is a graphite tint + tiny translate (transform/opacity only,
// ease-out); the row presses to 0.985 on :active. No per-frame motion.
function SelectorEntry({
  card,
  reduced,
  isMobile,
  autoFocus,
  onSelect,
}: {
  card: (typeof CARDS)[number];
  reduced: boolean | null;
  isMobile: boolean;
  /** Focus this row on mount (the game the visitor just left). */
  autoFocus: boolean;
  onSelect: () => void;
}) {
  const best = bestScore(card.hsKey);
  const controls = isMobile ? card.controlsMobile : card.controls;
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus({ preventScroll: true }); }, [autoFocus]);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      data-testid="index-row"
      className={`group relative flex w-full items-baseline gap-4 px-3 py-4 text-left
                  transition-[transform,background-color] duration-150 ease-out
                  hover:bg-black/[0.035] dark:hover:bg-white/[0.05]
                  active:scale-[0.985]`}
    >
      <span className="flex-1 min-w-0">
        <span
          className={`block font-display leading-tight truncate text-text
                      transition-transform duration-150 ease-out text-[clamp(1.25rem,3.4cqi,1.9rem)]
                      ${reduced ? '' : 'group-hover:translate-x-0.5'}`}
        >
          {card.title}
        </span>
        <span className="mt-1 block text-sm leading-snug text-text-secondary">{card.subtitle}</span>
        <MetaLabel as="p" className="mt-1.5 text-text-tertiary">{controls}</MetaLabel>
      </span>

      {best > 0 && (
        <span className="shrink-0 self-center flex flex-col items-end gap-0.5">
          <MetaLabel className="text-text tabular-nums">{best}</MetaLabel>
          <MetaLabel className="text-text-tertiary">{`Best ${card.hsLabel}`}</MetaLabel>
        </span>
      )}
    </button>
  );
}

function Launcher({ onSelect, isMobile, lastGame }: { onSelect: (id: GameId) => void; isMobile: boolean; lastGame: GameId | null }) {
  const reduced = useReducedMotion();

  return (
    <div className="relative h-full flex flex-col overflow-hidden bg-surface/20">
      {/* Faint signature line-mark on the backdrop - hard-gated on the mono
          palette + reduced motion inside Plotter. Decorative, behind content. */}
      <div aria-hidden className="pointer-events-none absolute -right-10 -bottom-16 w-[min(60cqi,28rem)] opacity-[0.06]">
        <Plotter generator={(s) => strokeSet(s, 6)} seed={0xA12C} strokeWidth={1} />
      </div>

      {/* ── Masthead ── serif title + mono spec line ── */}
      <div className="relative z-10 w-full max-w-3xl px-5 pt-6 pb-4 flex flex-col gap-3">
        <MetaLabel as="p">Arcade</MetaLabel>
        <h1 className="editorial-head text-text leading-[1.05] text-[clamp(1.75rem,7cqi,3.25rem)] [overflow-wrap:normal] [text-wrap:balance]">
          {isMobile ? 'Three small games.' : 'Three classics, one window.'}
        </h1>
      </div>

      <Hairline className="relative z-10 mx-5 max-w-[calc(48rem-2.5rem)]" />

      {/* ── Index ── staggers in ONCE on mount (never on scroll) ── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-2 py-1">
        <motion.div
          variants={reveal.container(reduced)}
          initial="hidden"
          animate="show"
          className="flex w-full max-w-3xl flex-col"
        >
          {CARDS.map((card, i) => (
            <motion.div key={card.id} variants={reveal.item(reduced)}>
              <SelectorEntry
                card={card}
                reduced={reduced}
                isMobile={isMobile}
                autoFocus={lastGame === card.id}
                onSelect={() => onSelect(card.id)}
              />
              {i < CARDS.length - 1 && <Hairline className="mx-1" />}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared game header
// ─────────────────────────────────────────────────────────────────────────────

// A single HUD stat: tiny mono uppercase label over a value. The value updates
// live during play and is rendered plainly - NO entrance/score-pop animation,
// because the HUD is a high-frequency surface (emil frequency rule).
function HudStat({ label, value, narrowHidden = false }: { label: string; value: React.ReactNode; narrowHidden?: boolean }) {
  return (
    <div className={`flex-col items-end gap-0.5 text-right ${narrowHidden ? 'hidden [@container(min-width:480px)]:flex' : 'flex'}`}>
      <MetaLabel className="text-text-tertiary">{label}</MetaLabel>
      <span className="font-mono-meta tabular-nums leading-none text-text whitespace-nowrap text-[clamp(0.82rem,2cqi,1rem)]">
        {value}
      </span>
    </div>
  );
}

function GameHeader({
  title, score, best, scoreLabel = 'Score', bestLabel = 'Best', bestNarrowHidden = false,
  onBack, onReset, children,
}: {
  title: string; score?: number | string; best?: number | string;
  scoreLabel?: string; bestLabel?: string; bestNarrowHidden?: boolean;
  onBack: () => void; onReset: () => void; children?: React.ReactNode;
}) {
  // Mono editorial HUD frame: a single hairline rule under a quiet bar.
  const iconBtn =
    'p-1.5 text-text-secondary transition-[color,transform] duration-150 ease-out hover:text-text active:scale-95';
  return (
    <div className="flex-shrink-0">
      <div className="flex items-center gap-4 px-4 py-3 bg-surface/20">
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

const OVERLAY_EASE = [0.23, 1, 0.32, 1] as const;

// Pressable editorial button. Default = the ink primary (filled bg-text/text-bg);
// 'ghost' = hairline outline. Mono palette keeps it monochrome; Fun keeps the
// per-game accent passed in via `accent`/`accentHover`.
function OverlayButton({
  children, onClick, variant = 'primary', mono, accent, accentHover, size = 'lg',
}: {
  children: React.ReactNode; onClick: () => void;
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
        className="inline-flex items-center justify-center gap-2 border border-border px-5 py-2 text-text font-medium
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
      type="button"
      className={`inline-flex items-center justify-center gap-2 font-semibold
                  transition-[transform,opacity,background-color] duration-150 ease-out active:scale-[0.97]
                  font-mono-meta ${size === 'sm' ? 'h-9 px-4' : 'px-6 py-2.5'} ${colorCls}`}
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
function GameOverlay({ reduced, children }: { reduced: boolean | null; children: React.ReactNode }) {
  return (
    <div className="dark absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-[2px]">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={withReduced({ duration: 0.24, ease: OVERLAY_EASE }, reduced)}
        className="flex flex-col items-center gap-4 px-8 text-center"
      >
        {children}
      </motion.div>
    </div>
  );
}

// Editorial controls hint strip - mono uppercase meta, single hairline above.
function ControlsHint({ children }: { children: React.ReactNode }) {
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
function GameStatus({ children }: { children: React.ReactNode }) {
  return <p role="status" aria-live="polite" className="sr-only">{children}</p>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SNAKE - keys are handled on the focused game root only, so arrow keys and
// Space keep working in every other window (they used to be captured globally).
// ─────────────────────────────────────────────────────────────────────────────

const SNAKE_GRID = 20;

function SnakeGameView({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const mono = useIsMono();
  const reduced = useReducedMotion();
  const [cellSize, setCellSize] = useState(18);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => bestScore('devos-snake-hs'));
  const rootRef      = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loopRef      = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const dirRef       = useRef<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('RIGHT');
  const snakeRef     = useRef([{ x: 10, y: 10 }]);
  const foodRef      = useRef({ x: 15, y: 15 });
  const scoreRef     = useRef(0);
  const statusRef    = useRef<'idle' | 'playing' | 'paused' | 'over'>('idle');

  useEffect(() => { statusRef.current = status; }, [status]);

  // Take focus on open so the keys work at once (and only here).
  useEffect(() => { rootRef.current?.focus({ preventScroll: true }); }, []);
  const refocus = useCallback(() => rootRef.current?.focus({ preventScroll: true }), []);

  // Cell size from both dimensions of the board area, so the whole board
  // always fits (it used to overflow short windows) and grows when maximized.
  useEffect(() => {
    const update = () => {
      const el = containerRef.current; if (!el) return;
      const fit = Math.floor(Math.min(el.clientWidth - 32, el.clientHeight - 32) / SNAKE_GRID);
      setCellSize(Math.max(10, Math.min(fit, 32)));
    };
    const obs = new ResizeObserver(update);
    if (containerRef.current) obs.observe(containerRef.current);
    update();
    return () => obs.disconnect();
  }, []);

  const randPos = () => ({ x: Math.floor(Math.random() * SNAKE_GRID), y: Math.floor(Math.random() * SNAKE_GRID) });

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const cs = cellSize; const s = SNAKE_GRID * cs;
    const snake = snakeRef.current; const food = foodRef.current;
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#1a1a1a';
    for (let x = 0; x < SNAKE_GRID; x++)
      for (let y = 0; y < SNAKE_GRID; y++)
        if ((x + y) % 2 === 0) ctx.fillRect(x * cs, y * cs, cs, cs);
    snake.forEach((seg, i) => {
      // Mono: head brighter than body so the head reads without hue.
      ctx.fillStyle = mono
        ? (i === 0 ? MONO_SNAKE_HEAD : MONO_SNAKE_BODY)
        : (i === 0 ? '#4ade80' : '#22c55e');
      ctx.beginPath(); ctx.roundRect(seg.x * cs + 1, seg.y * cs + 1, cs - 2, cs - 2, 3); ctx.fill();
    });
    ctx.fillStyle = mono ? MONO_APPLE : '#f87171';
    ctx.beginPath(); ctx.roundRect(food.x * cs + 2, food.y * cs + 2, cs - 4, cs - 4, cs / 2); ctx.fill();
  }, [cellSize, mono]);

  const loop = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    const snake = snakeRef.current; const food = foodRef.current; const dir = dirRef.current;
    const head = { ...snake[0] };
    if (dir === 'UP') head.y--; if (dir === 'DOWN') head.y++;
    if (dir === 'LEFT') head.x--; if (dir === 'RIGHT') head.x++;
    if (head.x < 0 || head.x >= SNAKE_GRID || head.y < 0 || head.y >= SNAKE_GRID || snake.some(s => s.x === head.x && s.y === head.y)) {
      clearInterval(loopRef.current); setStatus('over');
      const fs = scoreRef.current;
      setBest(b => { const nb = Math.max(b, fs); localStorage.setItem('devos-snake-hs', nb.toString()); return nb; });
      return;
    }
    const next = [head, ...snake];
    if (head.x === food.x && head.y === food.y) {
      const ns = scoreRef.current + 1; scoreRef.current = ns; setScore(ns); foodRef.current = randPos();
    } else { next.pop(); }
    snakeRef.current = next; draw();
  }, [draw]);

  const startGame = useCallback(() => {
    clearInterval(loopRef.current);
    snakeRef.current = [{ x: 10, y: 10 }]; foodRef.current = randPos();
    scoreRef.current = 0; dirRef.current = 'RIGHT';
    setScore(0); setStatus('playing'); draw();
    // The overlay button that started the game unmounts; keep focus in the game.
    refocus();
  }, [draw, refocus]);

  useEffect(() => {
    if (status === 'playing') { loopRef.current = setInterval(loop, 140); return () => clearInterval(loopRef.current); }
  }, [status, loop]);

  useEffect(() => { draw(); }, [draw]);

  // Single source of truth for direction changes (keyboard, swipe, D-pad all
  // funnel through here). Applies the same opposite-direction reversal guard.
  const changeDir = useCallback((d: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    const opp: Record<string, string> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
    if (d !== opp[dirRef.current]) dirRef.current = d;
  }, []);

  // Shared pause toggle (space key + on-screen pause button).
  const togglePause = useCallback(() => {
    setStatus(s => { const next = s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s; statusRef.current = next; return next; });
  }, []);

  const resume = useCallback(() => {
    statusRef.current = 'playing'; setStatus('playing'); refocus();
  }, [refocus]);

  // Space: start from idle / game over, otherwise pause or resume. On a
  // focused button, Space and Enter press that button instead.
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const map: Record<string, 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'> = {
      ArrowUp: 'UP', w: 'UP', W: 'UP', ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
      ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT', ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
    };
    const d = map[e.key];
    if (d) { e.preventDefault(); changeDir(d); return; }
    if (e.key === ' ' && !isButtonTarget(e)) {
      e.preventDefault();
      if (statusRef.current === 'idle' || statusRef.current === 'over') startGame();
      else togglePause();
    }
  }, [changeDir, togglePause, startGame]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (leftRoot(e) && statusRef.current === 'playing') togglePause();
  }, [togglePause]);

  // Swipe input maps to the same guarded direction change.
  const swipe = useSwipe({ onSwipe: (dir) => changeDir(({ left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN' } as const)[dir]) });

  const canvasSize = SNAKE_GRID * cellSize;

  // Shared button style for on-screen controls - mirrors Tetris exactly.
  const ctrlBtn = "w-9 h-9 flex items-center justify-center border border-border text-text-secondary hover:text-text hover:border-text/40 active:scale-95 transition-[color,border-color,transform] duration-150 ease-out cursor-pointer select-none";

  const announce =
    status === 'playing' ? 'Snake started.' :
    status === 'paused' ? 'Paused.' :
    status === 'over' ? `Game over. ${score} ${score === 1 ? 'point' : 'points'}.` : '';

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      aria-label="Snake"
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      data-testid="snake-root"
      className="h-full flex flex-col overflow-hidden focus-visible:[outline-offset:-2px]"
    >
      <GameStatus>{announce}</GameStatus>
      <GameHeader title="Snake" score={score} best={best} onBack={onBack} onReset={startGame} />
      <div ref={containerRef} {...swipe} className="flex-1 flex items-center justify-center p-4 bg-surface/20 overflow-hidden touch-none">
        <div className="relative">
          <canvas ref={canvasRef} width={canvasSize} height={canvasSize} role="img" aria-label="Snake board" className="block border border-border" />
          {status !== 'playing' && (
            <GameOverlay reduced={reduced} key={status}>
              {status === 'idle' && (
                <>
                  <h2 className="font-display text-text leading-none text-[clamp(1.6rem,5cqi,2.5rem)]">Snake</h2>
                  <MetaLabel className="text-text-secondary">{isMobile ? 'Swipe to steer' : 'Press Space to start'}</MetaLabel>
                  <OverlayButton onClick={startGame} mono={mono} accent={FUN.snake.fill} accentHover={FUN.snake.hover}>Start</OverlayButton>
                </>
              )}
              {status === 'paused' && (
                <>
                  <h2 className="font-display text-text leading-none text-[clamp(1.6rem,5cqi,2.5rem)]">Paused</h2>
                  {!isMobile && <MetaLabel className="text-text-secondary">Space to resume</MetaLabel>}
                  <OverlayButton onClick={resume} mono={mono} accent={FUN.snake.fill} accentHover={FUN.snake.hover}>Resume</OverlayButton>
                </>
              )}
              {status === 'over' && (
                <>
                  <h2 className="font-display text-text leading-none text-[clamp(1.6rem,5cqi,2.5rem)]">Game Over</h2>
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono-meta tabular-nums text-text text-[clamp(1.1rem,3cqi,1.5rem)]">{score}</span>
                    <MetaLabel className="text-text-secondary">Points</MetaLabel>
                  </div>
                  {score > 0 && score === best && <MetaLabel className="text-text">New best</MetaLabel>}
                  <OverlayButton onClick={startGame} mono={mono} accent={FUN.snake.fill} accentHover={FUN.snake.hover}>Play again</OverlayButton>
                </>
              )}
            </GameOverlay>
          )}
        </div>
      </div>

      {/* ── On-screen controls - touch & small-window play ── */}
      <div className="flex-shrink-0">
        <Hairline />
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface/10">
          {/* D-pad */}
          <button type="button" className={ctrlBtn} onClick={() => changeDir('UP')} title="Up (↑)" aria-label="Move up">
            <ChevronUp size={16} />
          </button>
          <button type="button" className={ctrlBtn} onClick={() => changeDir('LEFT')} title="Left (←)" aria-label="Move left">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className={ctrlBtn} onClick={() => changeDir('DOWN')} title="Down (↓)" aria-label="Move down">
            <ChevronDown size={16} />
          </button>
          <button type="button" className={ctrlBtn} onClick={() => changeDir('RIGHT')} title="Right (→)" aria-label="Move right">
            <ChevronRight size={16} />
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Action button - Start when idle/over, otherwise pause/resume */}
          <OverlayButton
            size="sm"
            mono={mono}
            accent={FUN.snake.fill}
            accentHover={FUN.snake.hover}
            onClick={() => {
              if (status === 'idle' || status === 'over') startGame();
              else togglePause();
            }}
          >
            {status === 'idle' || status === 'over' ? 'Start' : status === 'paused' ? 'Resume' : 'Pause'}
          </OverlayButton>
        </div>
      </div>

      <ControlsHint>{isMobile ? 'Swipe or tap the controls' : 'Arrow keys or WASD to steer. Space to pause.'}</ControlsHint>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TETRIS - types + helpers
// ─────────────────────────────────────────────────────────────────────────────

const T_COLS = 10;
const T_ROWS = 20;

type TCell  = string | 0;
type TBoard = TCell[][];

interface TPiece { color: string; shapes: number[][][]; }

const TETROMINOES: TPiece[] = [
  { color: '#06b6d4', shapes: [ [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]] ] },
  { color: '#eab308', shapes: [ [[1,1],[1,1]] ] },
  { color: '#a855f7', shapes: [ [[0,1,0],[1,1,1],[0,0,0]], [[0,1,0],[0,1,1],[0,1,0]], [[0,0,0],[1,1,1],[0,1,0]], [[0,1,0],[1,1,0],[0,1,0]] ] },
  { color: '#22c55e', shapes: [ [[0,1,1],[1,1,0],[0,0,0]], [[0,1,0],[0,1,1],[0,0,1]] ] },
  { color: '#ef4444', shapes: [ [[1,1,0],[0,1,1],[0,0,0]], [[0,0,1],[0,1,1],[0,1,0]] ] },
  { color: '#3b82f6', shapes: [ [[1,0,0],[1,1,1],[0,0,0]], [[0,1,1],[0,1,0],[0,1,0]], [[0,0,0],[1,1,1],[0,0,1]], [[0,1,0],[0,1,0],[1,1,0]] ] },
  { color: '#f97316', shapes: [ [[0,0,1],[1,1,1],[0,0,0]], [[0,1,0],[0,1,0],[0,1,1]], [[0,0,0],[1,1,1],[1,0,0]], [[1,1,0],[0,1,0],[0,1,0]] ] },
];

interface ActivePiece { pieceIdx: number; rotation: number; x: number; y: number; }

function emptyBoard(): TBoard { return Array.from({ length: T_ROWS }, () => Array(T_COLS).fill(0)); }
function randPieceIdx() { return Math.floor(Math.random() * TETROMINOES.length); }

function getShape(ap: ActivePiece): number[][] {
  const p = TETROMINOES[ap.pieceIdx]; return p.shapes[ap.rotation % p.shapes.length];
}

function getOccupied(ap: ActivePiece): [number, number][] {
  const cells: [number, number][] = [];
  getShape(ap).forEach((row, r) => row.forEach((v, c) => { if (v) cells.push([ap.y + r, ap.x + c]); }));
  return cells;
}

function isValid(board: TBoard, ap: ActivePiece): boolean {
  for (const [r, c] of getOccupied(ap)) {
    if (c < 0 || c >= T_COLS || r >= T_ROWS) return false;
    if (r >= 0 && board[r][c] !== 0) return false;
  }
  return true;
}

function lockPiece(board: TBoard, ap: ActivePiece): TBoard {
  const nb = board.map(row => [...row]);
  const color = TETROMINOES[ap.pieceIdx].color;
  for (const [r, c] of getOccupied(ap)) if (r >= 0 && r < T_ROWS && c >= 0 && c < T_COLS) nb[r][c] = color;
  return nb;
}

function clearLines(board: TBoard): { board: TBoard; cleared: number } {
  const kept = board.filter(row => row.some(c => c === 0));
  const cleared = T_ROWS - kept.length;
  return { board: [...Array.from({ length: cleared }, () => Array(T_COLS).fill(0)), ...kept] as TBoard, cleared };
}

function spawnPiece(pieceIdx: number, board: TBoard): ActivePiece | null {
  const shape = TETROMINOES[pieceIdx].shapes[0];
  const x = Math.floor((T_COLS - shape[0].length) / 2);
  const ap: ActivePiece = { pieceIdx, rotation: 0, x, y: 0 };
  return isValid(board, ap) ? ap : null;
}

function ghostOf(board: TBoard, ap: ActivePiece): ActivePiece {
  let g = { ...ap };
  while (isValid(board, { ...g, y: g.y + 1 })) g = { ...g, y: g.y + 1 };
  return g;
}

const LINE_PTS = [0, 100, 300, 500, 800];

interface TetrisState {
  board: TBoard; active: ActivePiece | null; nextIdx: number;
  score: number; level: number; lines: number;
  status: 'idle' | 'playing' | 'paused' | 'over'; best: number;
}

type TetrisAction =
  | { type: 'START' } | { type: 'TICK' } | { type: 'MOVE'; dx: number }
  | { type: 'ROTATE' } | { type: 'SOFT_DROP' } | { type: 'HARD_DROP' }
  | { type: 'TOGGLE_PAUSE' } | { type: 'RESET' };

function freshTetris(best: number): TetrisState {
  return { board: emptyBoard(), active: null, nextIdx: randPieceIdx(), score: 0, level: 1, lines: 0, status: 'idle', best };
}

function afterLock(state: TetrisState, board: TBoard): TetrisState {
  const { board: cleared, cleared: n } = clearLines(board);
  const newLines = state.lines + n, newLevel = Math.floor(newLines / 10) + 1;
  const newScore = state.score + LINE_PTS[n] * state.level;
  const newBest  = Math.max(state.best, newScore);
  if (newBest > state.best) localStorage.setItem('devos-tetris-hs', newBest.toString());
  const next = spawnPiece(state.nextIdx, cleared);
  if (!next) return { ...state, board: cleared, active: null, score: newScore, lines: newLines, level: newLevel, best: newBest, status: 'over' };
  return { ...state, board: cleared, active: next, nextIdx: randPieceIdx(), score: newScore, lines: newLines, level: newLevel, best: newBest };
}

function tetrisReducer(state: TetrisState, action: TetrisAction): TetrisState {
  if (action.type === 'RESET') return freshTetris(state.best);
  if (action.type === 'START') {
    const b = emptyBoard(), ni = randPieceIdx();
    return { ...freshTetris(state.best), board: b, active: spawnPiece(ni, b), nextIdx: randPieceIdx(), status: 'playing' };
  }
  if (action.type === 'TOGGLE_PAUSE') {
    if (state.status === 'playing') return { ...state, status: 'paused' };
    if (state.status === 'paused')  return { ...state, status: 'playing' };
    return state;
  }
  if (state.status !== 'playing' || !state.active) return state;
  if (action.type === 'MOVE') {
    const moved = { ...state.active, x: state.active.x + action.dx };
    return isValid(state.board, moved) ? { ...state, active: moved } : state;
  }
  if (action.type === 'ROTATE') {
    const p = TETROMINOES[state.active.pieceIdx];
    const rot = (state.active.rotation + 1) % p.shapes.length;
    for (const dx of [0, -1, 1, -2, 2]) {
      const kicked = { ...state.active, rotation: rot, x: state.active.x + dx };
      if (isValid(state.board, kicked)) return { ...state, active: kicked };
    }
    return state;
  }
  if (action.type === 'TICK' || action.type === 'SOFT_DROP') {
    const down = { ...state.active, y: state.active.y + 1 };
    if (isValid(state.board, down)) return { ...state, active: down };
    return afterLock(state, lockPiece(state.board, state.active));
  }
  if (action.type === 'HARD_DROP') {
    const ghost = ghostOf(state.board, state.active);
    const bonus = (ghost.y - state.active.y) * 2;
    const next  = afterLock(state, lockPiece(state.board, ghost));
    return { ...next, score: next.score + bonus };
  }
  return state;
}

function gravityDelay(level: number) { return Math.max(80, 800 - (level - 1) * 80); }

// Map a stored piece color (the Fun hue) to its grayscale tone in mono.
// Built from TETROMINOES order so each of the 7 pieces keeps a distinct lightness.
const TETRIS_MONO_BY_HUE: Record<string, string> = Object.fromEntries(
  TETROMINOES.map((p, i) => [p.color, MONO_TETRIS[i]])
);
function tetrisCellColor(stored: string, mono: boolean): string {
  return mono ? (TETRIS_MONO_BY_HUE[stored] ?? '#a1a1aa') : stored;
}

function drawTetCell(ctx: CanvasRenderingContext2D, c: number, r: number, color: string, cs: number, alpha: number) {
  const x = c * cs, y = r * cs, pad = 1, rad = 3;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2, rad);
  else ctx.rect(x + pad, y + pad, cs - pad * 2, cs - pad * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.fillRect(x + pad + 1, y + pad + 1, cs - pad * 2 - 2, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(x + pad + 1, y + cs - pad - 4, cs - pad * 2 - 2, 3);
  ctx.globalAlpha = 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// TETRIS GAME - responsive canvas + focus-based keyboard + button controls
// ─────────────────────────────────────────────────────────────────────────────

function TetrisGame({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const mono = useIsMono();
  const reduced = useReducedMotion();
  const [state, dispatch] = useReducer(
    tetrisReducer,
    freshTetris(bestScore('devos-tetris-hs'))
  );

  // Responsive cell size - recalculates whenever the game area resizes
  const [cs, setCs] = useState(20);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // for focus
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const previewRef   = useRef<HTMLCanvasElement>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Auto-focus container so keyboard events are captured
  useEffect(() => { containerRef.current?.focus({ preventScroll: true }); }, []);
  const refocus = useCallback(() => containerRef.current?.focus({ preventScroll: true }), []);
  const start = useCallback(() => { dispatch({ type: 'START' }); refocus(); }, [refocus]);
  const resume = useCallback(() => { dispatch({ type: 'TOGGLE_PAUSE' }); refocus(); }, [refocus]);

  // Responsive cell size
  useEffect(() => {
    const update = () => {
      if (!gameAreaRef.current) return;
      const h = gameAreaRef.current.clientHeight;
      const w = gameAreaRef.current.clientWidth;
      // Reserve ~96px for side panel + gap; 8px padding
      const boardMaxW = w - 104;
      const csH = Math.floor((h - 8) / T_ROWS);
      const csW = Math.floor(boardMaxW / T_COLS);
      setCs(Math.max(14, Math.min(csH, csW, 28)));
    };
    const obs = new ResizeObserver(update);
    if (gameAreaRef.current) obs.observe(gameAreaRef.current);
    update();
    return () => obs.disconnect();
  }, []);

  // Gravity loop
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (state.status === 'playing') {
      intervalRef.current = setInterval(() => dispatch({ type: 'TICK' }), gravityDelay(state.level));
    }
    return () => clearInterval(intervalRef.current);
  }, [state.status, state.level]);

  // Keyboard handler on the focused container div - fixes arrow key issue in small windows
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // On a focused button, Space and Enter press that button.
    if ((e.key === ' ' || e.key === 'Enter') && isButtonTarget(e)) return;
    switch (e.key) {
      case 'ArrowLeft':  case 'a': case 'A': e.preventDefault(); dispatch({ type: 'MOVE', dx: -1 }); break;
      case 'ArrowRight': case 'd': case 'D': e.preventDefault(); dispatch({ type: 'MOVE', dx: 1 }); break;
      case 'ArrowUp':    case 'w': case 'W': case 'z': case 'Z': e.preventDefault(); dispatch({ type: 'ROTATE' }); break;
      case 'ArrowDown':  case 's': case 'S': e.preventDefault(); dispatch({ type: 'SOFT_DROP' }); break;
      case ' ':
        e.preventDefault();
        if (state.status === 'idle') dispatch({ type: 'START' });
        else if (state.status === 'playing') dispatch({ type: 'HARD_DROP' });
        else if (state.status === 'paused')  dispatch({ type: 'TOGGLE_PAUSE' });
        break;
      case 'p': case 'P': e.preventDefault(); dispatch({ type: 'TOGGLE_PAUSE' }); break;
    }
  }, [state.status]);

  // Leaving the game (title bar click, another window) pauses it, so the
  // piece never keeps falling while the keys go somewhere else.
  const statusRef = useRef(state.status);
  useEffect(() => { statusRef.current = state.status; }, [state.status]);
  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (leftRoot(e) && statusRef.current === 'playing') dispatch({ type: 'TOGGLE_PAUSE' });
  }, []);

  // Draw main board
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const W = T_COLS * cs, H = T_ROWS * cs;
    ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 0.5;
    for (let c = 0; c <= T_COLS; c++) { ctx.beginPath(); ctx.moveTo(c * cs, 0); ctx.lineTo(c * cs, H); ctx.stroke(); }
    for (let r = 0; r <= T_ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * cs); ctx.lineTo(W, r * cs); ctx.stroke(); }
    state.board.forEach((row, r) => row.forEach((cell, c) => { if (cell) drawTetCell(ctx, c, r, tetrisCellColor(cell as string, mono), cs, 1); }));
    if (state.active && state.status === 'playing') {
      const ghost = ghostOf(state.board, state.active);
      if (ghost.y !== state.active.y) {
        const col = tetrisCellColor(TETROMINOES[state.active.pieceIdx].color, mono);
        for (const [r, c] of getOccupied(ghost)) if (r >= 0) drawTetCell(ctx, c, r, col, cs, 0.18);
      }
    }
    if (state.active) {
      const col = tetrisCellColor(TETROMINOES[state.active.pieceIdx].color, mono);
      for (const [r, c] of getOccupied(state.active)) if (r >= 0) drawTetCell(ctx, c, r, col, cs, 1);
    }
  }, [state, cs, mono]);

  // Draw next piece preview
  useEffect(() => {
    const canvas = previewRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const PC = Math.max(10, Math.round(cs * 0.75));
    const W = 4 * PC, H = 4 * PC;
    ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, W, H);
    const piece = TETROMINOES[state.nextIdx];
    const shape = piece.shapes[0];
    const ox = Math.floor((4 - shape[0].length) / 2);
    const oy = Math.floor((4 - shape.length) / 2);
    shape.forEach((row, r) => row.forEach((v, c) => { if (v) drawTetCell(ctx, c + ox, r + oy, tetrisCellColor(piece.color, mono), PC, 1); }));
  }, [state.nextIdx, cs, mono]);

  const previewSize = Math.max(40, Math.round(cs * 0.75) * 4);

  // Shared button style for on-screen controls - editorial mono, pressable.
  const ctrlBtn = "w-9 h-9 flex items-center justify-center border border-border text-text-secondary hover:text-text hover:border-text/40 active:scale-95 transition-[color,border-color,transform] duration-150 ease-out cursor-pointer select-none";

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      aria-label="Tetris"
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      data-testid="tetris-root"
      className="h-full flex flex-col overflow-hidden focus-visible:[outline-offset:-2px]"
    >
      <GameStatus>
        {state.status === 'playing' ? 'Tetris started.' : state.status === 'paused' ? 'Paused.' : state.status === 'over' ? `Game over. ${state.score} points.` : ''}
      </GameStatus>
      <GameHeader title="Tetris" score={state.score} best={state.best} bestNarrowHidden onBack={onBack} onReset={() => dispatch({ type: 'RESET' })}>
        <HudStat label="Lines" value={state.lines} narrowHidden />
        <HudStat label="Level" value={state.level} />
      </GameHeader>

      <div ref={gameAreaRef} className="flex-1 flex items-center justify-center gap-3 p-3 bg-surface/20 overflow-hidden">
        {/* Board */}
        <div className="relative flex-shrink-0">
          <canvas
            ref={canvasRef}
            width={T_COLS * cs}
            height={T_ROWS * cs}
            role="img"
            aria-label="Tetris board"
            className="border border-border block"
          />
          {state.status !== 'playing' && (
            <GameOverlay reduced={reduced} key={state.status}>
              {state.status === 'idle' ? (
                <>
                  <h2 className="font-display text-text leading-none text-[clamp(1.5rem,4.5cqi,2.25rem)]">Tetris</h2>
                  <MetaLabel className="text-text-secondary">{isMobile ? 'Tap Start to begin' : 'Press Space to start'}</MetaLabel>
                  <OverlayButton onClick={start} mono={mono} accent={FUN.tetris.fill} accentHover={FUN.tetris.hover}>Start</OverlayButton>
                </>
              ) : state.status === 'paused' ? (
                <>
                  <h2 className="font-display text-text leading-none text-[clamp(1.5rem,4.5cqi,2.25rem)]">Paused</h2>
                  {!isMobile && <MetaLabel className="text-text-secondary">P or Space to resume</MetaLabel>}
                  <OverlayButton onClick={resume} mono={mono} accent={FUN.tetris.fill} accentHover={FUN.tetris.hover}>Resume</OverlayButton>
                </>
              ) : (
                <>
                  <h2 className="font-display text-text leading-none text-[clamp(1.5rem,4.5cqi,2.25rem)]">Game Over</h2>
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono-meta tabular-nums text-text text-[clamp(1.1rem,3cqi,1.5rem)]">{state.score.toLocaleString()}</span>
                    <MetaLabel className="text-text-secondary">Points</MetaLabel>
                  </div>
                  {state.score >= state.best && state.score > 0 && <MetaLabel className="text-text">New best</MetaLabel>}
                  <OverlayButton onClick={start} mono={mono} accent={FUN.tetris.fill} accentHover={FUN.tetris.hover}>Play again</OverlayButton>
                </>
              )}
            </GameOverlay>
          )}
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-3 flex-shrink-0">
          <div className="border border-border p-2 text-center">
            <MetaLabel as="p" className="text-text-secondary justify-center mb-1.5">Next</MetaLabel>
            <canvas ref={previewRef} width={previewSize} height={previewSize} style={{ width: previewSize, height: previewSize }} />
          </div>
        </div>
      </div>

      {/* ── On-screen controls - fix for small windows & touch ── */}
      <div className="flex-shrink-0">
        <Hairline />
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface/10">
          {/* D-pad */}
          <button type="button" className={ctrlBtn} onClick={() => dispatch({ type: 'ROTATE' })} title="Rotate (↑)" aria-label="Rotate">
            <ChevronUp size={16} />
          </button>
          <button type="button" className={ctrlBtn} onClick={() => dispatch({ type: 'MOVE', dx: -1 })} title="Left (←)" aria-label="Move left">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className={ctrlBtn} onClick={() => dispatch({ type: 'SOFT_DROP' })} title="Soft drop (↓)" aria-label="Soft drop">
            <ChevronDown size={16} />
          </button>
          <button type="button" className={ctrlBtn} onClick={() => dispatch({ type: 'MOVE', dx: 1 })} title="Right (→)" aria-label="Move right">
            <ChevronRight size={16} />
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Action buttons */}
          <OverlayButton
            size="sm"
            mono={mono}
            accent={FUN.tetris.fill}
            accentHover={FUN.tetris.hover}
            onClick={() => {
              if (state.status === 'idle' || state.status === 'over') start();
              else dispatch({ type: 'HARD_DROP' });
            }}
          >
            {state.status === 'idle' || state.status === 'over' ? 'Start' : 'Drop'}
          </OverlayButton>
          <button
            type="button"
            className={ctrlBtn}
            onClick={() => (state.status === 'paused' ? resume() : dispatch({ type: 'TOGGLE_PAUSE' }))}
            title={state.status === 'paused' ? 'Resume (P)' : 'Pause (P)'}
            aria-label={state.status === 'paused' ? 'Resume' : 'Pause'}
            aria-pressed={state.status === 'paused'}
          >
            {state.status === 'paused' ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />}
          </button>
        </div>
      </div>

      <ControlsHint>
        {isMobile ? 'Tap the controls below' : 'Arrows move, ↑ rotates, ↓ drops faster. Space drops. P pauses.'}
      </ControlsHint>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE RACER
// ─────────────────────────────────────────────────────────────────────────────

const CODE_SNIPPETS = [
  {
    label: 'React Hook',
    code: `const [count, setCount] = useState(0);\n\nuseEffect(() => {\n  document.title = \`Count: \${count}\`;\n}, [count]);`,
  },
  {
    label: 'Async Fetch',
    code: `async function fetchUser(id: string) {\n  const res = await fetch(\`/api/users/\${id}\`);\n  if (!res.ok) throw new Error('Not found');\n  return res.json();\n}`,
  },
  {
    label: 'Array Magic',
    code: `const result = users\n  .filter(u => u.active)\n  .map(u => ({ ...u, name: u.name.trim() }))\n  .sort((a, b) => a.name.localeCompare(b.name));`,
  },
  {
    label: 'Binary Search',
    code: `function binarySearch(arr: number[], target: number) {\n  let lo = 0, hi = arr.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (arr[mid] === target) return mid;\n    arr[mid] < target ? lo = mid + 1 : hi = mid - 1;\n  }\n  return -1;\n}`,
  },
  {
    label: 'Debounce',
    code: `function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {\n  let timer: ReturnType<typeof setTimeout>;\n  return (...args: Parameters<T>) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n}`,
  },
];

function TypeRacerGame({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const mono = useIsMono();
  const reduced = useReducedMotion();
  const [snippetIdx, setSnippetIdx] = useState(0);
  const [typed,      setTyped]      = useState('');
  const [status,     setStatus]     = useState<'idle' | 'typing' | 'done'>('idle');
  const [startTime,  setStartTime]  = useState<number | null>(null);
  const [elapsed,    setElapsed]    = useState(0);
  const [finalWpm,   setFinalWpm]   = useState(0);
  const [accuracy,   setAccuracy]   = useState(100);
  const [best,       setBest]       = useState(() => bestScore('devos-typeracer-hs'));
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const startRef = useRef<number | null>(null);

  const snippet = CODE_SNIPPETS[snippetIdx].code;

  const reset = useCallback(() => {
    clearInterval(timerRef.current);
    setTyped(''); setStatus('idle'); setStartTime(null); setElapsed(0); setFinalWpm(0); setAccuracy(100);
    startRef.current = null;
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);
  useEffect(() => { reset(); }, [snippetIdx, reset]);

  useEffect(() => {
    if (status === 'typing' && startTime !== null) {
      timerRef.current = setInterval(() => setElapsed((Date.now() - startTime) / 1000), 100);
      return () => clearInterval(timerRef.current);
    }
  }, [status, startTime]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (status === 'done') return;
    if (status === 'idle') { const now = Date.now(); setStatus('typing'); setStartTime(now); startRef.current = now; }
    setTyped(value);
    let correct = 0;
    for (let i = 0; i < value.length; i++) if (value[i] === snippet[i]) correct++;
    setAccuracy(value.length > 0 ? Math.round((correct / value.length) * 100) : 100);
    if (value === snippet) {
      clearInterval(timerRef.current);
      const secs = (Date.now() - (startRef.current ?? Date.now())) / 1000;
      const wpm = Math.round((snippet.length / 5) / (secs / 60));
      setFinalWpm(wpm); setStatus('done');
      setBest(b => { const nb = Math.max(b, wpm); localStorage.setItem('devos-typeracer-hs', nb.toString()); return nb; });
    }
  };

  const currentWpm = status === 'typing' && elapsed > 0 ? Math.round((typed.length / 5) / (elapsed / 60)) : finalWpm;
  const progress = (typed.length / snippet.length) * 100;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <GameHeader
        title="Type Racer"
        score={currentWpm > 0 ? `${currentWpm} WPM` : '--'}
        best={best > 0 ? `${best} WPM` : '--'}
        scoreLabel="Current" bestLabel="Best" bestNarrowHidden
        onBack={onBack} onReset={reset}
      >
        {/* Accuracy keeps its color-not-only quality tiering (mono: opacity). */}
        <HudStat
          label="Accuracy"
          value={
            <span className={
              mono
                ? (accuracy >= 95 ? 'text-text' : accuracy >= 80 ? 'text-text/80' : 'text-text/55')
                : (accuracy >= 95 ? 'text-green-400' : accuracy >= 80 ? 'text-yellow-400' : 'text-red-400')
            }>{accuracy}%</span>
          }
        />
        <HudStat label="Time" value={`${elapsed.toFixed(1)}s`} narrowHidden />
      </GameHeader>

      <div className="flex-1 flex flex-col gap-4 p-5 bg-surface/20 overflow-auto">
        {/* Snippet selector - mono uppercase tabs with a hairline underline marker. */}
        <div className="flex items-center gap-x-5 gap-y-3 flex-wrap" role="group" aria-label="Snippet">
          {CODE_SNIPPETS.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSnippetIdx(i)}
              aria-pressed={snippetIdx === i}
              className="group relative font-mono-meta transition-[opacity,transform] duration-150 ease-out active:scale-[0.97]"
            >
              <span className={snippetIdx === i ? 'text-text font-semibold' : 'text-text-secondary group-hover:text-text'}>
                {s.label}
              </span>
              <span
                aria-hidden
                className={`absolute -bottom-1 left-0 right-0 h-px bg-text origin-left transition-transform duration-200 ease-out motion-reduce:transition-none
                            ${snippetIdx === i ? 'scale-x-100' : reduced ? 'scale-x-0' : 'scale-x-0 group-hover:scale-x-50'}`}
              />
            </button>
          ))}
        </div>

        {/* Progress bar - flat hairline track + ink fill (no per-frame easing pop). */}
        <div className="w-full h-px bg-border overflow-hidden">
          <div className={`h-full transition-[width] duration-100 ${mono ? 'bg-text' : 'bg-emerald-500'}`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>

        {/* Snippet display */}
        <div className="border border-border p-4 font-mono text-sm leading-loose select-none overflow-auto max-h-48 bg-bg/40 whitespace-pre-wrap">
          {snippet.split('').map((char, i) => {
            const typedChar = typed[i];
            const isCursor = i === typed.length;
            let cls = 'text-text-secondary';
            if (typedChar !== undefined) {
              if (typedChar === char) {
                // Correct: bright foreground in mono, emerald in Fun.
                cls = mono ? 'text-text' : 'text-emerald-400';
              } else {
                // Wrong: in mono the underline + box + dim tone flag the error
                // without hue (color-not-only); Fun keeps the red box.
                cls = mono
                  ? 'text-text bg-text/15 rounded-sm underline decoration-2 underline-offset-2'
                  : 'text-red-400 bg-red-500/25 rounded-sm';
              }
            }
            // Typing cursor is chrome: ink in mono, the single accent only in Fun.
            if (isCursor && status !== 'done') cls += mono ? ' border-l-2 border-text' : ' border-l-2 border-accent';
            if (char === '\n') return <span key={i}><span className={cls}>↵</span>{'\n'}</span>;
            return <span key={i} className={cls}>{char === ' ' ? '\u00A0' : char}</span>;
          })}
        </div>

        {/* Input */}
        <textarea
          ref={inputRef}
          value={typed}
          onChange={handleChange}
          disabled={status === 'done'}
          placeholder={status === 'idle' ? 'Type the code above. The timer starts on your first key.' : ''}
          aria-label="Type the snippet here"
          className="w-full h-24 font-mono text-sm p-3 bg-bg/40 border border-border focus:border-text/40 focus:outline-none text-text resize-none placeholder:text-text-tertiary disabled:opacity-60 transition-colors"
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        />

        {/* Completion - occasional surface: a single ease-out entrance, mono. */}
        <AnimatePresence>
          {status === 'done' && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={withReduced({ duration: 0.24, ease: OVERLAY_EASE }, reduced)}
              className={`border p-4 ${mono ? 'border-border bg-white/[0.03]' : 'border-emerald-500/30 bg-emerald-500/5'}`}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={20} className={`flex-shrink-0 ${mono ? 'text-text' : 'text-emerald-400'}`} />
                  <div className="flex flex-col gap-1">
                    <span className="font-display text-text text-base leading-none">
                      {finalWpm >= best && finalWpm > 0 ? 'New personal best' : 'Snippet complete'}
                    </span>
                    <MetaLabel className="text-text-secondary">
                      {elapsed.toFixed(1)}s · {accuracy}% accuracy · <span className={mono ? 'text-text' : 'text-emerald-400'}>{finalWpm} WPM</span>
                    </MetaLabel>
                  </div>
                </div>
                <div className="flex gap-2">
                  <OverlayButton onClick={reset} variant="ghost" mono={mono}>Retry</OverlayButton>
                  <OverlayButton onClick={() => setSnippetIdx(i => (i + 1) % CODE_SNIPPETS.length)} mono={mono} accent={FUN.typer.fill} accentHover={FUN.typer.hover}>Next snippet</OverlayButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ControlsHint>{isMobile ? 'Tap the field and type' : 'Type it exactly. Enter for ↵, spaces for indents.'}</ControlsHint>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export default function GamesApp({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const [game, setGame] = useState<GameId>('launcher');
  // The game the visitor just left, so Back returns focus to its row.
  const [lastGame, setLastGame] = useState<GameId | null>(null);
  const back = useCallback(() => { setLastGame(game); setGame('launcher'); }, [game]);
  const reduced = useReducedMotion();
  const isMobile = variant === 'mobile';

  // Selector <-> game transition: an occasional surface, so a single ease-out
  // slide (transform + opacity) is allowed; it collapses to instant under
  // reduced motion. Coming from the selector, a game enters from the right;
  // returning, the selector fades.
  const slideIn  = reduced ? { opacity: 0 } : { opacity: 0, x: 20 };
  const slideOut = reduced ? { opacity: 0 } : { opacity: 0, x: -20 };
  const tx = withReduced({ duration: 0.26, ease: OVERLAY_EASE }, reduced);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {game === 'launcher'  && <motion.div key="launcher"  className="h-full"               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tx}><Launcher onSelect={setGame} isMobile={isMobile} lastGame={lastGame} /></motion.div>}
        {game === 'snake'     && <motion.div key="snake"     className="h-full flex flex-col" initial={slideIn} animate={{ opacity: 1, x: 0 }} exit={slideOut} transition={tx}><SnakeGameView  onBack={back} isMobile={isMobile} /></motion.div>}
        {game === 'tetris'    && <motion.div key="tetris"    className="h-full flex flex-col" initial={slideIn} animate={{ opacity: 1, x: 0 }} exit={slideOut} transition={tx}><TetrisGame     onBack={back} isMobile={isMobile} /></motion.div>}
        {game === 'typeracer' && <motion.div key="typeracer" className="h-full flex flex-col" initial={slideIn} animate={{ opacity: 1, x: 0 }} exit={slideOut} transition={tx}><TypeRacerGame  onBack={back} isMobile={isMobile} /></motion.div>}
      </AnimatePresence>
    </div>
  );
}
