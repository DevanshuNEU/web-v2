'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pause } from 'lucide-react';
import { useIsMono } from '@/hooks/usePalette';
import { useSwipe } from '@/hooks/useSwipe';
import { Hairline, MetaLabel } from '@/components/editorial';
import { bestScore, FUN, isButtonTarget, leftRoot, GameHeader, OverlayButton, GameOverlay, ControlsHint, GameStatus } from '../shared/chrome';
import { arcadeTheme } from '../shared/theme';
import { drawCreature, creature, type CreatureId } from '../shared/cast';
import { Juice } from '../shared/juice';
import { hype, comboTier } from '../shared/slang';
import { sfx, buzz } from '../shared/sound';
import { SoundToggle } from '../shared/TouchButton';
import { useRun } from '../leaderboard/useRun';
import { RunResult, BoardSheet } from '../leaderboard/Leaderboard';
import { SNAKE_GRID, SNAKE_SPEEDS, createSnake, enqueueTurn, step, tickMs } from './logic';
import type { Dir, SnakeSpeed, SnakeState } from './logic';

// ─────────────────────────────────────────────────────────────────────────────
// SNAKE - keys are handled on the focused game root only, so arrow keys and
// Space keep working in every other window (they used to be captured globally).
// ─────────────────────────────────────────────────────────────────────────────

// Snake rules live in games/snake/logic.ts (pure, unit tested). This view owns
// the loop, the input and the drawing.
//
// Sigma Snake: the food is a rotating cast of meme snacks, eating two within
// COMBO_WINDOW keeps a combo going (the hype words get louder), and at a
// combo of 3 the snake puts its sunglasses on.
const FOOD_CAST: CreatureId[] = ['croissant', 'mango', 'toaster', 'bean', 'pebble', 'frog', 'capy'];
const COMBO_WINDOW = 2.4;
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
  const juiceRef     = useRef(new Juice(false));
  const comboRef     = useRef({ n: 0, lastAt: -10, clock: 0 });
  const [failLine, setFailLine] = useState('Cooked.');
  const [showBoard, setShowBoard] = useState(false);
  const run = useRun('snake');
  useEffect(() => { juiceRef.current.reduced = !!reduced; }, [reduced]);

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
    const th = arcadeTheme(mono);
    const { body, prev, food, dir, score: sc } = gameRef.current;
    const juice = juiceRef.current;
    const t = comboRef.current.clock;
    const shake = juice.offset();
    ctx.save?.();
    ctx.translate?.(shake.x, shake.y);
    ctx.fillStyle = th.board; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = th.boardAlt;
    for (let x = 0; x < SNAKE_GRID; x++)
      for (let y = 0; y < SNAKE_GRID; y++)
        if ((x + y) % 2 === 0) ctx.fillRect(x * cs, y * cs, cs, cs);

    // Food: a meme snack that bobs gently.
    if (food.x >= 0) {
      const kind = FOOD_CAST[sc % FOOD_CAST.length];
      const bob = reduced ? 0 : Math.sin(t * 5) * cs * 0.06;
      drawCreature(ctx, kind, food.x * cs + cs / 2, food.y * cs + cs / 2 + bob, cs * 1.35, { mono, t });
    }

    const a = Math.max(0, Math.min(1, alpha));
    const pos = (i: number) => {
      const cur = body[i]; const from = prev[i] ?? cur;
      return { x: from.x + (cur.x - from.x) * a, y: from.y + (cur.y - from.y) * a };
    };
    // Body: chunky sticker segments, outline first so they read as one tube.
    const bodyFill = mono ? '#d4d4d8' : th.lime;
    const stripe = mono ? '#a1a1aa' : th.pink;
    for (const pass of [0, 1]) {
      for (let i = body.length - 1; i >= 1; i--) {
        const p = pos(i);
        const r = cs * (pass === 0 ? 0.5 : 0.4) * (1 - Math.min(0.3, i / (body.length + 6) * 0.3));
        ctx.beginPath(); ctx.arc(p.x * cs + cs / 2, p.y * cs + cs / 2, r, 0, Math.PI * 2);
        ctx.fillStyle = pass === 0 ? th.outline : (i % 4 === 2 ? stripe : bodyFill);
        ctx.fill();
      }
    }
    // Head, with eyes that look where it is going.
    const h = pos(0);
    const hx = h.x * cs + cs / 2; const hy = h.y * cs + cs / 2;
    ctx.beginPath(); ctx.arc(hx, hy, cs * 0.6, 0, Math.PI * 2); ctx.fillStyle = th.outline; ctx.fill();
    ctx.beginPath(); ctx.arc(hx, hy, cs * 0.5, 0, Math.PI * 2); ctx.fillStyle = mono ? '#f4f4f5' : th.lime; ctx.fill();
    const dx = dir === 'LEFT' ? -1 : dir === 'RIGHT' ? 1 : 0;
    const dy = dir === 'UP' ? -1 : dir === 'DOWN' ? 1 : 0;
    const px = -dy; const py = dx; // perpendicular
    const sigma = comboRef.current.n >= 3;
    for (const side of [-1, 1]) {
      const ex = hx + dx * cs * 0.12 + px * side * cs * 0.22;
      const ey = hy + dy * cs * 0.12 + py * side * cs * 0.22;
      if (sigma) {
        ctx.fillStyle = th.outline;
        ctx.beginPath(); ctx.arc(ex, ey, cs * 0.17, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(ex, ey, cs * 0.15, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.beginPath(); ctx.arc(ex + dx * cs * 0.05, ey + dy * cs * 0.05, cs * 0.08, 0, Math.PI * 2); ctx.fillStyle = th.outline; ctx.fill();
      }
    }
    if (sigma) {
      // sunglasses bridge
      const bx = hx + dx * cs * 0.12; const by = hy + dy * cs * 0.12;
      ctx.strokeStyle = th.outline; ctx.lineWidth = Math.max(1.5, cs * 0.08);
      ctx.beginPath(); ctx.moveTo(bx - px * cs * 0.22, by - py * cs * 0.22); ctx.lineTo(bx + px * cs * 0.22, by + py * cs * 0.22); ctx.stroke();
    }
    juice.draw(ctx);
    ctx.restore?.();
  }, [cellSize, mono, reduced]);

  const endGame = useCallback(() => {
    setStatus('over'); statusRef.current = 'over';
    const line = hype('fail');
    setFailLine(line.charAt(0).toUpperCase() + line.slice(1) + '.');
    const head = gameRef.current.body[0]; const cs = cellSize; const side = SNAKE_GRID * cs;
    // Keep the word on the board even when the crash is at an edge.
    const fx = Math.min(side - cs * 4, Math.max(cs * 4, head.x * cs + cs / 2));
    const fy = Math.min(side - cs * 2, Math.max(cs * 2, head.y * cs));
    juiceRef.current.float(fx, fy, hype('fail'), arcadeTheme(mono).danger, Math.max(16, cs * 1.1), 1.2);
    juiceRef.current.shake(8, 0.3);
    sfx('boom'); buzz(40);
    const fs = gameRef.current.score;
    setBest(b => { const nb = Math.max(b, fs); try { localStorage.setItem('devos-snake-hs', nb.toString()); } catch { /* */ } return nb; });
  }, [cellSize, mono]);

  // A meal: burst in the snack's colour, a hype word that gets louder with
  // the combo, a blip.
  const onAte = useCallback((st: SnakeState) => {
    const c = comboRef.current;
    c.n = c.clock - c.lastAt <= COMBO_WINDOW ? c.n + 1 : 1;
    c.lastAt = c.clock;
    const cs = cellSize; const head = st.body[0];
    const kind = FOOD_CAST[(st.score - 1 + FOOD_CAST.length) % FOOD_CAST.length];
    const th = arcadeTheme(mono);
    const color = mono ? creature(kind).mono : creature(kind).fill;
    juiceRef.current.burst(head.x * cs + cs / 2, head.y * cs + cs / 2, color, 10 + c.n * 2, 120 + c.n * 20, Math.max(3, cs * 0.22));
    const tier = comboTier(c.n);
    const text = c.n >= 2 ? `${hype(tier)} x${c.n}` : hype('small');
    juiceRef.current.float(head.x * cs + cs / 2, head.y * cs - cs * 0.4, text, tier === 'huge' ? th.sun : tier === 'big' ? th.pink : th.text, Math.max(13, cs * (0.8 + Math.min(c.n, 6) * 0.08)));
    if (c.n >= 6) juiceRef.current.shake(4, 0.12);
    sfx(c.n >= 2 ? 'combo' : 'eat', c.n); buzz(8);
  }, [cellSize, mono]);

  // requestAnimationFrame with an accumulator: the rules advance in whole
  // ticks at the chosen speed, the drawing runs every frame in between.
  // The loop reads draw / onAte / endGame through a ref, so a resize (new
  // cellSize, new callbacks) never restarts it and the snake keeps moving
  // while the window is dragged.
  const fx = useRef({ draw, onAte, endGame });
  fx.current = { draw, onAte, endGame };

  useEffect(() => {
    if (status !== 'playing' || typeof window === 'undefined' || !window.requestAnimationFrame) return;
    const cb = fx;
    let raf = 0; let last = performance.now(); let acc = 0;
    const frame = (now: number) => {
      const dtMs = Math.min(250, now - last);
      acc += dtMs; last = now;
      comboRef.current.clock += dtMs / 1000;
      juiceRef.current.update(dtMs / 1000);
      let tick = tickMs(speedRef.current, gameRef.current.score);
      while (acc >= tick) {
        acc -= tick;
        const next = step(gameRef.current);
        gameRef.current = next;
        if (next.ate) { setScore(next.score); cb.current.onAte(next); }
        if (next.over) { cb.current.endGame(); return; }
        tick = tickMs(speedRef.current, next.score);
      }
      cb.current.draw(reduced ? 1 : acc / tick);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [status, reduced]);

  // After a crash, keep drawing for a moment so the shake and the fail word
  // play out under the game-over card.
  useEffect(() => {
    if (status !== 'over' || typeof window === 'undefined' || !window.requestAnimationFrame) return;
    let raf = 0; let last = performance.now(); const until = last + 1300;
    const frame = (now: number) => {
      juiceRef.current.update(Math.min(0.05, (now - last) / 1000)); last = now;
      draw(1);
      if (now < until) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [status, draw]);

  useEffect(() => { draw(); }, [draw]);

  const startGame = useCallback(() => {
    gameRef.current = createSnake();
    juiceRef.current.clear();
    comboRef.current = { n: 0, lastAt: -10, clock: 0 };
    setShowBoard(false);
    run.begin();
    setScore(0); setStatus('playing'); statusRef.current = 'playing'; draw();
    // The overlay button that started the game unmounts; keep focus in the game.
    refocus();
  }, [draw, refocus, run]);

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
      aria-label="Sigma Snake"
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      data-testid="snake-root"
      className="h-full flex flex-col overflow-hidden overscroll-contain select-none focus-visible:[outline-offset:-2px]"
    >
      <GameStatus>{announce}</GameStatus>
      <GameHeader title="Sigma Snake" score={score} best={best} onBack={onBack} onReset={startGame}>
        {isMobile && status === 'playing' && (
          <button
            type="button"
            onClick={togglePause}
            onPointerDown={(e) => e.preventDefault()}
            aria-label="Pause"
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-text-secondary hover:text-text"
          >
            <Pause size={18} />
          </button>
        )}
      </GameHeader>
      <div ref={containerRef} {...swipe} className="relative flex-1 min-h-0 flex items-center justify-center p-3 bg-surface/20 overflow-hidden touch-none">
        <div>
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            style={{ width: canvasSize, height: canvasSize }}
            role="img"
            aria-label="Sigma Snake board"
            className="block border border-border"
          />
          {status !== 'playing' && (
            <GameOverlay reduced={reduced} key={status}>
              {status === 'idle' && (
                <>
                  <h2 className="font-display text-text leading-none text-[clamp(1.8rem,7cqi,2.75rem)]">Sigma Snake</h2>
                  <p className="text-[15px] text-text-secondary max-w-[17rem]">Eat the snacks back to back to keep a combo. At three, the shades come out.</p>
                  <SpeedPicker value={speed} onChange={setSpeed} />
                  <MetaLabel className="text-text-secondary">{isMobile ? 'Swipe anywhere to steer' : 'Press Space to start'}</MetaLabel>
                  <OverlayButton onClick={startGame} mono={mono} accent={FUN.snake.fill} accentHover={FUN.snake.hover}>Start</OverlayButton>
                  <SoundToggle />
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
                  <h2 className="font-display text-text leading-none text-[clamp(1.8rem,7cqi,2.75rem)]">{failLine}</h2>
                  <div className="flex flex-col items-center gap-1">
                    <span className="tabular-nums text-text text-[clamp(1.6rem,6cqi,2.25rem)] font-semibold leading-none">{score}</span>
                    <span className="text-sm text-text-secondary">{score === 1 ? 'snack eaten' : 'snacks eaten'}{score > 0 && score === best ? ', a new best' : ''}</span>
                  </div>
                  <RunResult
                    game="snake"
                    score={score}
                    getToken={run.token}
                    onPlayAgain={startGame}
                    onShowBoard={() => setShowBoard(true)}
                    mono={mono}
                    accent={FUN.snake.fill}
                    accentHover={FUN.snake.hover}
                  />
                  <SpeedPicker value={speed} onChange={setSpeed} />
                </>
              )}
            </GameOverlay>
          )}
          {showBoard && <BoardSheet game="snake" onClose={() => { setShowBoard(false); refocus(); }} />}
        </div>
      </div>

      {/* On a phone the whole board is the swipe surface: no D-pad. The
          desktop keeps the on-screen pad for small windows and mice. */}
      {!isMobile && (
        <div className="flex-shrink-0">
          <Hairline />
          <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface/10">
            {dpad('UP', 'Move up', 'Up (↑)', <ChevronUp size={16} />)}
            {dpad('LEFT', 'Move left', 'Left (←)', <ChevronLeft size={16} />)}
            {dpad('DOWN', 'Move down', 'Down (↓)', <ChevronDown size={16} />)}
            {dpad('RIGHT', 'Move right', 'Right (→)', <ChevronRight size={16} />)}
            <div className="w-px h-5 bg-border mx-1" />
            {actionButton}
          </div>
        </div>
      )}

      {/* On a phone the start card already says to swipe; the strip would only cost board space. */}
      {!isMobile && <ControlsHint>Arrow keys or WASD to steer. Space to pause.</ControlsHint>}
    </div>
  );
}
