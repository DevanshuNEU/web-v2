'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Pause } from 'lucide-react';
import { useIsMono } from '@/hooks/usePalette';
import { Hairline, MetaLabel } from '@/components/editorial';
import { bestScore, isButtonTarget, leftRoot, GameHeader, OverlayButton, GameOverlay, GameStatus } from '../shared/chrome';
import { useCanvas } from '../shared/useCanvas';
import { useGameLoop } from '../shared/useGameLoop';
import { Juice } from '../shared/juice';
import { CAST, drawCreature } from '../shared/cast';
import { arcadeTheme } from '../shared/theme';
import { hype, auraText } from '../shared/slang';
import { sfx, buzz } from '../shared/sound';
import { SoundToggle } from '../shared/TouchButton';
import { useRun } from '../leaderboard/useRun';
import { RunResult, BoardSheet } from '../leaderboard/Leaderboard';
import { MAX_LEVEL, LEVELS, countLevels, createGame, highestLevel, step, type Dir, type MergeState } from './logic';
import {
  createPacer, pushMove, startSlide, advancePacer, gestureStart, gestureMove, gestureEnd,
  type Pacer, type Gesture,
} from './input';
import {
  CARD, NOPE, SETTLED, SLIDE, cellCenter, drawBoard, drawStrip, geometry, spritesForBoard, spritesForMove,
  type Sprite,
} from './draw';

// ─────────────────────────────────────────────────────────────────────────────
// BRAINROT EVOLUTION - swipe to slide, two of a kind become the next creature
// in the cast chain, all the way up to Moon Gigachad.
//
// Rules live in merge/logic.ts, input pacing in merge/input.ts, drawing in
// merge/draw.ts. This view wires them to the loop, the keys and the finger.
// ─────────────────────────────────────────────────────────────────────────────

const HS_KEY = 'devos-merge-hs';
const TITLE = 'Brainrot Evolution';
// Local button accent (shared FUN has no entry for this game). White text on
// #6d28d9 measures 7.1:1 with white text.
const ACCENT = { fill: '#6d28d9', hover: '#5b21b6' };

type Status = 'idle' | 'playing' | 'paused' | 'won' | 'over';

const KEYS: Record<string, Dir> = {
  ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
};

interface World {
  game: MergeState;
  sprites: Sprite[];
  /** Seconds since the last move began. */
  animT: number;
  t: number;
  pacer: Pacer;
  nope: number;
  /** New evolutions waiting for their name card. */
  cards: number[];
  card: { level: number; age: number } | null;
  /** A short beat before the win or game-over card, so the last move lands first. */
  after: { kind: 'won' | 'over'; left: number } | null;
  /** No input: the round is ending or the win card is up. */
  locked: boolean;
  gesture: Gesture | null;
  juice: Juice;
}

function freshWorld(juice: Juice): World {
  const game = createGame();
  return {
    game, sprites: spritesForBoard(game.board), animT: SETTLED, t: 0, pacer: createPacer(), nope: 0,
    cards: [], card: null, after: null, locked: false, gesture: null, juice,
  };
}

/** The moon, drawn once for the win card. */
function MoonBadge({ mono }: { mono: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; const ctx = c?.getContext('2d'); if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    c.width = 96 * dpr; c.height = 96 * dpr;
    ctx.setTransform?.(dpr, 0, 0, dpr, 0, 0);
    drawCreature(ctx, 'moon', 48, 48, 84, { mono });
  }, [mono]);
  return <canvas ref={ref} width={96} height={96} style={{ width: 96, height: 96 }} aria-hidden />;
}

export default function MergeGame({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const mono = useIsMono();
  const reduced = useReducedMotion();
  const [status, setStatus] = useState<Status>('idle');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => bestScore(HS_KEY));
  const [seen, setSeen] = useState(1);
  const [announce, setAnnounce] = useState('');
  const [overLine, setOverLine] = useState('');
  const [topLevel, setTopLevel] = useState(0);
  const [showBoard, setShowBoard] = useState(false);
  const run = useRun('merge');

  const rootRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<Status>('idle');
  const { containerRef, canvasRef, size, getCtx, style } = useCanvas({ aspect: 1, maxW: 480 });
  const sizeRef = useRef(size.w);
  sizeRef.current = size.w;
  const reducedRef = useRef(!!reduced);
  reducedRef.current = !!reduced;
  const world = useRef<World | null>(null);
  if (!world.current) world.current = freshWorld(new Juice(!!reduced));
  useEffect(() => { if (world.current) world.current.juice.reduced = !!reduced; }, [reduced]);

  const setStat = useCallback((s: Status) => { statusRef.current = s; setStatus(s); }, []);

  // Take focus on open so the keys work at once (and only here).
  useEffect(() => { rootRef.current?.focus({ preventScroll: true }); }, []);
  const refocus = useCallback(() => rootRef.current?.focus({ preventScroll: true }), []);

  const render = useCallback(() => {
    const ctx = getCtx(); const w = world.current; if (!ctx || !w) return;
    drawBoard(ctx, {
      size: size.w, mono, reduced: !!reduced, t: w.t, animT: w.animT, sprites: w.sprites,
      nope: w.nope, card: w.card, juice: w.juice,
    });
  }, [getCtx, size.w, mono, reduced]);

  // Static frame whenever the loop is not running (idle, paused, cards up) or the canvas resized.
  useEffect(() => { render(); }, [render, status]);

  const stripH = Math.round(Math.max(36, Math.min(60, size.w * 0.135)));
  useEffect(() => {
    const c = stripRef.current; const ctx = c?.getContext('2d'); if (!c || !ctx) return;
    const dpr = size.dpr;
    c.width = Math.round(size.w * dpr); c.height = Math.round(stripH * dpr);
    ctx.setTransform?.(dpr, 0, 0, dpr, 0, 0);
    drawStrip(ctx, size.w, stripH, dpr, seen, mono);
  }, [seen, size.w, size.dpr, stripH, mono]);

  const endRound = useCallback((line: string) => {
    const w = world.current; if (!w) return;
    w.locked = true; w.after = null;
    // The fail word moves from the board to the card heading; do not show it twice.
    w.juice.clear(); w.card = null; w.cards = [];
    const final = w.game.score;
    setScore(final);
    setTopLevel(Math.max(0, highestLevel(w.game.board)));
    setOverLine(line);
    setBest(b => {
      const nb = Math.max(b, final);
      try { localStorage.setItem(HS_KEY, String(nb)); } catch { /* private mode */ }
      return nb;
    });
    setAnnounce(`Game over. ${final} ${final === 1 ? 'point' : 'points'}.`);
    setStat('over');
  }, [setStat]);

  const failLine = useRef('');

  const applyMove = useCallback((dir: Dir) => {
    const w = world.current;
    if (!w || statusRef.current !== 'playing' || w.locked) return;
    const res = step(w.game, dir);
    const red = reducedRef.current;
    if (!res.changed) {
      if (!red) w.nope = NOPE;
      return;
    }
    w.game = res.state;
    w.sprites = spritesForMove(res);
    w.animT = red ? SETTLED : 0;
    w.pacer = startSlide(w.pacer, red ? 0 : SLIDE);

    const S = sizeRef.current;
    const g = geometry(S);
    const theme = arcadeTheme(mono);
    let top = -1;
    for (const m of res.merges) {
      const c = cellCenter(g, m.at);
      const fill = mono ? theme.text : CAST[m.level].fill;
      w.juice.burst(c.x, c.y, fill, 14, 170, 4);
      w.juice.float(c.x, c.y - g.cell * 0.22, auraText(m.points), fill, Math.max(14, S * 0.048), 0.85);
      top = Math.max(top, m.level);
    }
    if (top >= 0) { sfx('merge', top); buzz(8); } else sfx('slide');
    if (res.merges.length >= 3) w.juice.float(S / 2, S * 0.16, hype(res.merges.length >= 4 ? 'huge' : 'big'), theme.sun, S * 0.08, 1);

    for (const l of res.newEvolutions) if (l !== MAX_LEVEL) w.cards.push(l);
    if (res.newEvolutions.length) setAnnounce(`New evolution: ${CAST[res.newEvolutions[res.newEvolutions.length - 1]].name}.`);
    if (res.gained) setScore(res.state.score);
    setSeen(res.state.seen);

    if (res.justWon) {
      w.locked = true;
      w.after = { kind: 'won', left: 0.5 };
      w.juice.shake(8, 0.3);
      sfx('win'); buzz([20, 40, 20, 40, 60]);
    } else if (res.state.over) {
      w.locked = true;
      w.after = { kind: 'over', left: 1 };
      failLine.current = hype('fail');
      w.juice.float(S / 2, S / 2, failLine.current, theme.danger, S * 0.12, 1.4);
      sfx('over'); buzz(40);
    }
  }, [mono]);

  const requestMove = useCallback((dir: Dir) => {
    const w = world.current;
    if (!w || statusRef.current !== 'playing' || w.locked) return;
    const r = pushMove(w.pacer, dir);
    w.pacer = r.pacer;
    if (r.now) applyMove(r.now);
  }, [applyMove]);

  const update = useCallback((dt: number) => {
    const w = world.current; if (!w) return;
    w.t += dt;
    w.animT += dt;
    w.juice.update(dt);
    if (w.nope > 0) w.nope = Math.max(0, w.nope - dt);
    if (w.card) { w.card.age += dt; if (w.card.age >= CARD) w.card = null; }
    if (!w.card && w.cards.length) w.card = { level: w.cards.shift()!, age: 0 };
    const r = advancePacer(w.pacer, dt);
    w.pacer = r.pacer;
    if (r.now) applyMove(r.now);
    if (w.after) {
      w.after.left -= dt;
      if (w.after.left <= 0) {
        const kind = w.after.kind;
        w.after = null;
        if (kind === 'won') { setAnnounce('Moon Gigachad unlocked.'); setStat('won'); }
        else endRound(failLine.current || hype('fail'));
      }
    }
  }, [applyMove, endRound, setStat]);

  const togglePause = useCallback(() => {
    if (statusRef.current === 'playing') { setStat('paused'); setAnnounce('Paused.'); }
    else if (statusRef.current === 'paused') { setStat('playing'); setAnnounce('Resumed.'); }
  }, [setStat]);

  useGameLoop({
    running: status === 'playing',
    update,
    render,
    onHidden: () => { if (statusRef.current === 'playing') togglePause(); },
  });

  const startGame = useCallback(() => {
    const w = world.current; if (!w) return;
    w.juice.clear();
    const next = freshWorld(w.juice);
    next.sprites = spritesForBoard(next.game.board, !reducedRef.current);
    next.animT = reducedRef.current ? SETTLED : 0;
    world.current = next;
    failLine.current = '';
    setScore(0);
    setSeen(next.game.seen);
    setShowBoard(false);
    setAnnounce('Brainrot Evolution started.');
    setStat('playing');
    run.begin();
    refocus();
  }, [refocus, run, setStat]);

  const resume = useCallback(() => { setStat('playing'); setAnnounce('Resumed.'); refocus(); }, [refocus, setStat]);

  const keepGoing = useCallback(() => {
    const w = world.current; if (!w) return;
    w.locked = false;
    setStat('playing');
    refocus();
    if (w.game.over) {
      w.locked = true;
      failLine.current = hype('fail');
      w.after = { kind: 'over', left: 0.6 };
      sfx('over');
    }
  }, [refocus, setStat]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const d = KEYS[e.key];
    if (d) {
      e.preventDefault();
      if (!e.repeat) requestMove(d);
      return;
    }
    if (e.key === ' ' && !isButtonTarget(e)) {
      e.preventDefault();
      if (statusRef.current === 'idle' || statusRef.current === 'over') startGame();
      else togglePause();
    }
  }, [requestMove, startGame, togglePause]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (leftRoot(e) && statusRef.current === 'playing') togglePause();
  }, [togglePause]);

  // One move per finger: fires once the drag passes 24px, the rest of that drag is ignored.
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const w = world.current;
    if (!w || statusRef.current !== 'playing') return;
    if ((e.target as HTMLElement).closest('button')) return;
    w.gesture = gestureStart(w.gesture, e.pointerId, e.clientX, e.clientY);
    try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* not capturable */ }
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const w = world.current; if (!w || !w.gesture) return;
    const r = gestureMove(w.gesture, e.pointerId, e.clientX, e.clientY);
    w.gesture = r.gesture;
    if (r.fire) requestMove(r.fire);
  }, [requestMove]);
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const w = world.current; if (!w || !w.gesture) return;
    const r = gestureEnd(w.gesture, e.pointerId, e.clientX, e.clientY);
    w.gesture = r.gesture;
    if (r.fire) requestMove(r.fire);
  }, [requestMove]);
  const onPointerCancel = useCallback(() => { if (world.current) world.current.gesture = null; }, []);

  const reached = countLevels(seen);
  const howTo = isMobile ? 'Swipe to slide. Two of a kind evolve.' : 'Arrow keys or WASD to slide. Two of a kind evolve.';

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      aria-label={TITLE}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      data-testid="merge-root"
      className="h-full flex flex-col overflow-hidden overscroll-contain select-none focus-visible:[outline-offset:-2px]"
    >
      <GameStatus>{announce}</GameStatus>
      <GameHeader title={TITLE} score={score} best={best} onBack={onBack} onReset={startGame} />

      <div
        data-testid="merge-play"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        className="relative flex-1 min-h-0 flex flex-col items-center justify-center gap-3 px-4 py-4 bg-surface/20 overflow-hidden
                   touch-none select-none overscroll-contain [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent]"
      >
        {/* Invisible box the board is sized from: the play area minus room for the
            chain strip, so the board and the strip sit together as one centred group. */}
        <div ref={containerRef} aria-hidden className="pointer-events-none absolute inset-x-4 top-4 bottom-[5.5rem]" />
        <canvas ref={canvasRef} style={style} role="img" aria-label={`${TITLE} board`} className="block flex-shrink-0" />
        <canvas
          ref={stripRef}
          style={{ width: size.w, height: stripH }}
          role="img"
          aria-label={`Evolution chain, ${reached} of ${LEVELS} reached`}
          className="block flex-shrink-0"
        />

        {status !== 'playing' && (
          <GameOverlay reduced={reduced} key={status}>
            {status === 'idle' && (
              <>
                <h2 className="font-display text-text leading-none text-[clamp(1.8rem,7cqi,2.75rem)]">{TITLE}</h2>
                <p className="text-[15px] text-text-secondary max-w-[17rem]">{howTo} Start with a Bean Pookie, end with a Moon Gigachad.</p>
                <OverlayButton onClick={startGame} mono={mono} accent={ACCENT.fill} accentHover={ACCENT.hover}>Start</OverlayButton>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <SoundToggle />
                  <OverlayButton variant="ghost" mono={mono} onClick={() => setShowBoard(true)}>See the board</OverlayButton>
                </div>
              </>
            )}
            {status === 'paused' && (
              <>
                <h2 className="font-display text-text leading-none text-[clamp(1.6rem,5cqi,2.5rem)]">Paused</h2>
                {!isMobile && <MetaLabel className="text-text-secondary">Space to resume</MetaLabel>}
                <OverlayButton onClick={resume} mono={mono} accent={ACCENT.fill} accentHover={ACCENT.hover}>Resume</OverlayButton>
              </>
            )}
            {status === 'won' && (
              <>
                <MoonBadge mono={mono} />
                <h2 className="font-display text-text leading-tight text-[clamp(1.6rem,6cqi,2.5rem)]">Moon Gigachad unlocked</h2>
                <p className="text-[15px] text-text-secondary max-w-[17rem]">{`${score} points so far. Two moons still merge, for 10,000 points each.`}</p>
                <OverlayButton onClick={keepGoing} mono={mono} accent={ACCENT.fill} accentHover={ACCENT.hover}>Keep going</OverlayButton>
                <OverlayButton variant="ghost" mono={mono} onClick={() => endRound(hype('huge'))}>End round</OverlayButton>
              </>
            )}
            {status === 'over' && (
              <>
                <h2 className="font-display text-text leading-none text-[clamp(1.8rem,7cqi,2.75rem)]">{overLine}</h2>
                <div className="flex flex-col items-center gap-1">
                  <span className="tabular-nums text-text text-[clamp(1.6rem,6cqi,2.25rem)] font-semibold leading-none">{score}</span>
                  <span className="text-sm text-text-secondary">
                    {`points${score > 0 && score === best ? ', a new best' : ''}. Top evolution: ${CAST[topLevel].name}.`}
                  </span>
                </div>
                <RunResult
                  game="merge"
                  score={score}
                  getToken={run.token}
                  onPlayAgain={startGame}
                  onShowBoard={() => setShowBoard(true)}
                  mono={mono}
                  accent={ACCENT.fill}
                  accentHover={ACCENT.hover}
                />
              </>
            )}
          </GameOverlay>
        )}
        {showBoard && <BoardSheet game="merge" onClose={() => { setShowBoard(false); refocus(); }} />}
      </div>

      <div className="flex-shrink-0">
        <Hairline />
        <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center px-2 bg-surface/10">
          <span aria-hidden />
          <MetaLabel className="text-text-secondary text-center py-3">{isMobile ? 'Swipe to slide' : 'Arrow keys or WASD. Space pauses.'}</MetaLabel>
          {status === 'playing' ? (
            <button
              type="button"
              onClick={togglePause}
              aria-label="Pause"
              className="min-h-11 min-w-11 flex items-center justify-center text-text-secondary hover:text-text active:scale-95 transition-[color,transform] duration-150 ease-out"
            >
              <Pause size={16} />
            </button>
          ) : <span aria-hidden />}
        </div>
      </div>
    </div>
  );
}
