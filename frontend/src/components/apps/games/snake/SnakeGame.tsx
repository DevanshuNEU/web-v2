'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useIsMono } from '@/hooks/usePalette';
import { useSwipe } from '@/hooks/useSwipe';
import { Hairline, MetaLabel } from '@/components/editorial';
import { bestScore, FUN, isButtonTarget, leftRoot, GameHeader, OverlayButton, GameOverlay, ControlsHint, GameStatus } from '../shared/chrome';
import { MONO_SNAKE_HEAD, MONO_SNAKE_BODY, MONO_APPLE } from '../shared/palette';
import { SNAKE_GRID, SNAKE_SPEEDS, createSnake, enqueueTurn, step, tickMs } from './logic';
import type { Dir, SnakeSpeed, SnakeState } from './logic';

// ─────────────────────────────────────────────────────────────────────────────
// SNAKE - keys are handled on the focused game root only, so arrow keys and
// Space keep working in every other window (they used to be captured globally).
// ─────────────────────────────────────────────────────────────────────────────

// Snake rules live in games/snake/logic.ts (pure, unit tested). This view owns
// the loop, the input and the drawing.
const SPEED_KEY = 'devos-snake-speed';
const SPEED_ORDER: SnakeSpeed[] = ['chill', 'classic', 'fast'];

function readSpeed(isMobile: boolean): SnakeSpeed {
  const fallback: SnakeSpeed = isMobile ? 'chill' : 'classic';
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(SPEED_KEY);
    return v === 'chill' || v === 'classic' || v === 'fast' ? v : fallback;
  } catch {
    return fallback;
  }
}

// Chill / Classic / Fast. Real radios, so arrow keys move between them and a
// screen reader hears "Speed, Chill, selected".
function SpeedPicker({ value, onChange }: { value: SnakeSpeed; onChange: (s: SnakeSpeed) => void }) {
  return (
    <fieldset className="flex flex-col items-center gap-2">
      <legend className="sr-only">Speed</legend>
      <div className="flex border border-border">
        {SPEED_ORDER.map((s) => (
          <label
            key={s}
            className={`relative flex min-h-11 min-w-[4.5rem] cursor-pointer items-center justify-center px-3 text-sm
                        transition-colors duration-150 ease-out has-[:focus-visible]:outline has-[:focus-visible]:outline-2
                        has-[:focus-visible]:outline-offset-[-2px]
                        ${value === s ? 'bg-text text-bg' : 'text-text-secondary hover:text-text'}`}
          >
            <input
              type="radio"
              name="snake-speed"
              value={s}
              checked={value === s}
              onChange={() => onChange(s)}
              className="sr-only"
            />
            {SNAKE_SPEEDS[s].label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function SnakeGame({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const mono = useIsMono();
  const reduced = useReducedMotion();
  const [cellSize, setCellSize] = useState(18);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => bestScore('devos-snake-hs'));
  const [speed, setSpeedState] = useState<SnakeSpeed>(() => readSpeed(isMobile));
  const rootRef      = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef      = useRef<SnakeState>(createSnake());
  const speedRef     = useRef(speed);
  const statusRef    = useRef<'idle' | 'playing' | 'paused' | 'over'>('idle');

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const setSpeed = useCallback((s: SnakeSpeed) => {
    setSpeedState(s);
    try { localStorage.setItem(SPEED_KEY, s); } catch { /* private mode */ }
  }, []);

  // Take focus on open so the keys work at once (and only here).
  useEffect(() => { rootRef.current?.focus({ preventScroll: true }); }, []);
  const refocus = useCallback(() => rootRef.current?.focus({ preventScroll: true }), []);

  // Cell size from both dimensions of the board area, so the whole board
  // always fits (it used to overflow short windows) and grows when maximized.
  useEffect(() => {
    const update = () => {
      const el = containerRef.current; if (!el) return;
      const fit = Math.floor(Math.min(el.clientWidth - 24, el.clientHeight - 24) / SNAKE_GRID);
      setCellSize(Math.max(10, Math.min(fit, 32)));
    };
    const obs = new ResizeObserver(update);
    if (containerRef.current) obs.observe(containerRef.current);
    update();
    return () => obs.disconnect();
  }, []);

  // Draw at device pixel density, with every segment placed `alpha` of the
  // way from where it was to where it is, so the snake glides between moves.
  const draw = useCallback((alpha = 1) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const cs = cellSize; const s = SNAKE_GRID * cs;
    const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 3);
    if (canvas.width !== Math.round(s * dpr)) { canvas.width = Math.round(s * dpr); canvas.height = Math.round(s * dpr); }
    ctx.setTransform?.(dpr, 0, 0, dpr, 0, 0);
    const { body, prev, food } = gameRef.current;
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#1a1a1a';
    for (let x = 0; x < SNAKE_GRID; x++)
      for (let y = 0; y < SNAKE_GRID; y++)
        if ((x + y) % 2 === 0) ctx.fillRect(x * cs, y * cs, cs, cs);
    const a = Math.max(0, Math.min(1, alpha));
    for (let i = body.length - 1; i >= 0; i--) {
      const cur = body[i]; const from = prev[i] ?? cur;
      const x = from.x + (cur.x - from.x) * a;
      const y = from.y + (cur.y - from.y) * a;
      // Mono: head brighter than body so the head reads without hue.
      ctx.fillStyle = mono
        ? (i === 0 ? MONO_SNAKE_HEAD : MONO_SNAKE_BODY)
        : (i === 0 ? '#4ade80' : '#22c55e');
      ctx.beginPath(); ctx.roundRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2, 3); ctx.fill();
    }
    ctx.fillStyle = mono ? MONO_APPLE : '#f87171';
    ctx.beginPath(); ctx.roundRect(food.x * cs + 2, food.y * cs + 2, cs - 4, cs - 4, cs / 2); ctx.fill();
  }, [cellSize, mono]);

  const endGame = useCallback(() => {
    setStatus('over'); statusRef.current = 'over';
    const fs = gameRef.current.score;
    setBest(b => { const nb = Math.max(b, fs); try { localStorage.setItem('devos-snake-hs', nb.toString()); } catch { /* */ } return nb; });
  }, []);

  // requestAnimationFrame with an accumulator: the rules advance in whole
  // ticks at the chosen speed, the drawing runs every frame in between.
  useEffect(() => {
    if (status !== 'playing' || typeof window === 'undefined' || !window.requestAnimationFrame) return;
    let raf = 0; let last = performance.now(); let acc = 0;
    const frame = (now: number) => {
      acc += Math.min(250, now - last); last = now;
      let tick = tickMs(speedRef.current, gameRef.current.score);
      while (acc >= tick) {
        acc -= tick;
        const next = step(gameRef.current);
        gameRef.current = next;
        if (next.ate) setScore(next.score);
        if (next.over) { draw(1); endGame(); return; }
        tick = tickMs(speedRef.current, next.score);
      }
      draw(reduced ? 1 : acc / tick);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [status, draw, endGame, reduced]);

  useEffect(() => { draw(); }, [draw]);

  const startGame = useCallback(() => {
    gameRef.current = createSnake();
    setScore(0); setStatus('playing'); statusRef.current = 'playing'; draw();
    // The overlay button that started the game unmounts; keep focus in the game.
    refocus();
  }, [draw, refocus]);

  // Single source of truth for direction changes (keyboard, swipe, D-pad all
  // funnel through here). The queue checks each turn against the last queued one.
  const changeDir = useCallback((d: Dir) => {
    gameRef.current = enqueueTurn(gameRef.current, d);
  }, []);

  // Shared pause toggle (space key + on-screen pause button).
  const togglePause = useCallback(() => {
    setStatus(s => { const next = s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s; statusRef.current = next; return next; });
  }, []);

  const resume = useCallback(() => {
    statusRef.current = 'playing'; setStatus('playing'); refocus();
  }, [refocus]);

  // Switching apps or locking the phone pauses the round.
  useEffect(() => {
    const onHide = () => { if (document.hidden && statusRef.current === 'playing') togglePause(); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [togglePause]);

  // Space: start from idle / game over, otherwise pause or resume. On a
  // focused button, Space and Enter press that button instead.
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const map: Record<string, Dir> = {
      ArrowUp: 'UP', w: 'UP', W: 'UP', ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
      ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT', ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
    };
    const d = map[e.key];
    if (d && (e.target as HTMLElement).tagName !== 'INPUT') { e.preventDefault(); changeDir(d); return; }
    if (e.key === ' ' && !isButtonTarget(e) && (e.target as HTMLElement).tagName !== 'INPUT') {
      e.preventDefault();
      if (statusRef.current === 'idle' || statusRef.current === 'over') startGame();
      else togglePause();
    }
  }, [changeDir, togglePause, startGame]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (leftRoot(e) && statusRef.current === 'playing') togglePause();
  }, [togglePause]);

  // Swipes turn the moment the finger has travelled far enough, without
  // waiting for it to lift, and one drag can chain several turns.
  const swipe = useSwipe({
    fireOnMove: true,
    threshold: 24,
    onSwipe: (dir) => changeDir(({ left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN' } as const)[dir]),
  });

  const canvasSize = SNAKE_GRID * cellSize;

  // D-pad buttons turn on pointerdown (no wait for the click after the finger
  // lifts). Keyboard presses arrive as a click with detail 0 and still work.
  const ctrlBtn = "flex items-center justify-center border border-border text-text-secondary hover:text-text hover:border-text/40 active:scale-95 active:bg-text/10 transition-[color,border-color,transform,background-color] duration-100 ease-out cursor-pointer select-none touch-none [-webkit-touch-callout:none]";
  const dpadSize = isMobile ? 'w-14 h-14' : 'w-11 h-11';
  const dpad = (d: Dir, label: string, title: string, icon: React.ReactNode, extra = '') => (
    <button
      type="button"
      className={`${ctrlBtn} ${dpadSize} ${extra}`}
      onPointerDown={(e) => { e.preventDefault(); changeDir(d); }}
      onClick={(e) => { if (e.detail === 0) changeDir(d); }}
      title={title}
      aria-label={label}
    >
      {icon}
    </button>
  );

  const actionButton = (
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
  );

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
      className="h-full flex flex-col overflow-hidden overscroll-contain select-none focus-visible:[outline-offset:-2px]"
    >
      <GameStatus>{announce}</GameStatus>
      <GameHeader title="Snake" score={score} best={best} onBack={onBack} onReset={startGame} />
      <div ref={containerRef} {...swipe} className="flex-1 min-h-0 flex items-center justify-center p-3 bg-surface/20 overflow-hidden touch-none">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            style={{ width: canvasSize, height: canvasSize }}
            role="img"
            aria-label="Snake board"
            className="block border border-border"
          />
          {status !== 'playing' && (
            <GameOverlay reduced={reduced} key={status}>
              {status === 'idle' && (
                <>
                  <h2 className="font-display text-text leading-none text-[clamp(1.6rem,5cqi,2.5rem)]">Snake</h2>
                  <SpeedPicker value={speed} onChange={setSpeed} />
                  <MetaLabel className="text-text-secondary">{isMobile ? 'Swipe anywhere to steer' : 'Press Space to start'}</MetaLabel>
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
                  <SpeedPicker value={speed} onChange={setSpeed} />
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
        {isMobile ? (
          // Phone: a thumb-sized cross pad, with the action button beside it.
          <div className="flex items-center justify-center gap-6 px-4 py-3 bg-surface/10">
            <div className="grid grid-cols-3 grid-rows-3 gap-1">
              {dpad('UP', 'Move up', 'Up (↑)', <ChevronUp size={22} />, 'col-start-2 row-start-1')}
              {dpad('LEFT', 'Move left', 'Left (←)', <ChevronLeft size={22} />, 'col-start-1 row-start-2')}
              {dpad('RIGHT', 'Move right', 'Right (→)', <ChevronRight size={22} />, 'col-start-3 row-start-2')}
              {dpad('DOWN', 'Move down', 'Down (↓)', <ChevronDown size={22} />, 'col-start-2 row-start-3')}
            </div>
            {actionButton}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface/10">
            {dpad('UP', 'Move up', 'Up (↑)', <ChevronUp size={16} />)}
            {dpad('LEFT', 'Move left', 'Left (←)', <ChevronLeft size={16} />)}
            {dpad('DOWN', 'Move down', 'Down (↓)', <ChevronDown size={16} />)}
            {dpad('RIGHT', 'Move right', 'Right (→)', <ChevronRight size={16} />)}
            <div className="w-px h-5 bg-border mx-1" />
            {actionButton}
          </div>
        )}
      </div>

      <ControlsHint>{isMobile ? 'Swipe or tap the controls' : 'Arrow keys or WASD to steer. Space to pause.'}</ControlsHint>
    </div>
  );
}
