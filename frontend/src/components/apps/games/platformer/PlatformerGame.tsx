'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowLeft, Pause } from 'lucide-react';
import { useIsMono } from '@/hooks/usePalette';
import { Hairline, MetaLabel } from '@/components/editorial';
import { bestScore, isButtonTarget, leftRoot, GameHeader, HudStat, OverlayButton, GameOverlay, ControlsHint, GameStatus } from '../shared/chrome';
import { SoundToggle } from '../shared/TouchButton';
import { useCanvas } from '../shared/useCanvas';
import { useGameLoop } from '../shared/useGameLoop';
import { Juice } from '../shared/juice';
import { arcadeTheme } from '../shared/theme';
import { hype, comboTier, auraText } from '../shared/slang';
import { sfx, buzz } from '../shared/sound';
import { useOrientation } from '../shared/useOrientation';
import { useMobileStore } from '@/store/mobileStore';
import { useRun } from '../leaderboard/useRun';
import { RunResult, BoardSheet } from '../leaderboard/Leaderboard';
import { fetchSecret, isError } from '../leaderboard/api';
import { createWorld, drainEvents, score as worldScore, setSecret, stepWorld, type GameEvent, type Result, type Secret, type World } from './sim/world';
import { SECRET_FALLBACK } from './sim/level';
import { drawFrame, tileFor } from './render/pipeline';
import { emptyFrame, readInto, releaseAll } from './input/frame';
import { createKeyboard } from './input/keyboard';
import { TouchDeck } from './input/TouchDeck';
import { TouchOverlay } from './input/TouchOverlay';

const HS_KEY = 'devos-platformer-hs';
const TITLE = 'Main Character';
// Pink 700 / 800: white text on them passes 4.5:1.
const ACCENT = { fill: '#be185d', hover: '#9d174d' };

type Status = 'idle' | 'playing' | 'paused' | 'over';
interface Hud { score: number; coins: number; lives: number; level: number; time: number }

/**
 * How the game is laid out. Desktop: a window with keyboard hints. Portrait
 * phone: the view on top, the control deck under it. Landscape phone: the
 * view full bleed, thumb overlay on top, the shell's chrome hidden.
 */
type Layout = 'desktop' | 'portrait' | 'landscape';

function hudOf(w: World): Hud {
  return { score: worldScore(w), coins: w.stats.coins, lives: Math.max(0, w.lives), level: w.levelIndex, time: Math.floor(w.levelTime) };
}

export default function PlatformerGame({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const mono = useIsMono();
  const reduced = useReducedMotion();
  const run = useRun('platformer');
  const [status, setStatusState] = useState<Status>('idle');
  const [hud, setHud] = useState<Hud>({ score: 0, coins: 0, lives: 3, level: 0, time: 0 });
  const [best, setBest] = useState(() => bestScore(HS_KEY));
  const [result, setResult] = useState<{ kind: Result; score: number; message: string } | null>(null);
  const [showBoard, setShowBoard] = useState(false);
  const [announce, setAnnounce] = useState('');

  const rootRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<Status>('idle');
  const worldRef = useRef<World>(createWorld());
  const juiceRef = useRef(new Juice(!!reduced));
  const hudRef = useRef<Hud>(hud);
  // The input seam: each adapter writes its own latch, and every fixed step
  // reads one InputFrame from all of them (see input/frame.ts).
  const keyboard = useRef(createKeyboard());
  const touchInput = useRef(emptyFrame());
  const stepInput = useRef(emptyFrame());
  const sources = useRef([keyboard.current.frame, touchInput.current]);
  const secretRef = useRef<Secret>({ ...SECRET_FALLBACK });
  const tickCount = useRef(0);
  const tileRef = useRef(24);
  const { containerRef, canvasRef, size, getCtx, style } = useCanvas();
  const orientation = useOrientation(rootRef);
  const layout: Layout = !isMobile ? 'desktop' : orientation;

  // Immersive landscape on the phone: the shell hides its bar while this is
  // set. Leaving landscape or unmounting the game drops it; the store also
  // drops it if the app closes, so the shell can never be left without Done.
  const setImmersive = useMobileStore((s) => s.setImmersive);
  useEffect(() => {
    if (layout !== 'landscape') return;
    setImmersive(true);
    return () => setImmersive(false);
  }, [layout, setImmersive]);

  useEffect(() => { juiceRef.current.reduced = !!reduced; }, [reduced]);

  const setStatus = useCallback((s: Status) => { statusRef.current = s; setStatusState(s); }, []);
  const refocus = useCallback(() => rootRef.current?.focus({ preventScroll: true }), []);
  useEffect(() => { refocus(); }, [refocus]);

  // View metrics: about 13 rows on a wide view; on a tall phone view, tiles
  // come from the width and the extra rows are sky (see tileFor).
  useEffect(() => {
    const T = tileFor(size.w, size.h);
    tileRef.current = T;
    worldRef.current.viewCols = size.w / T;
    worldRef.current.viewRows = size.h / T;
  }, [size]);

  const clearInput = useCallback(() => {
    keyboard.current.reset();
    releaseAll(touchInput.current);
    releaseAll(stepInput.current);
  }, []);

  // ── Events from the rules: sound, haptics and juice ──
  const onEvent = useCallback((e: GameEvent, w: World) => {
    const j = juiceRef.current;
    const T = tileRef.current;
    const th = arcadeTheme(mono);
    const x = e.x * T, y = e.y * T;
    switch (e.type) {
      case 'jump': sfx('jump'); j.burst(x, y, '#fff4e0', 5, 70, 3); break;
      case 'land': if (e.n > 10) j.burst(x, y, '#fff4e0', 6, 70, 3); break;
      case 'skid': j.burst(x, y, '#fff4e0', 5, 60, 3); break;
      case 'coin':
        sfx('coin');
        j.burst(x, y, th.sun, 5, 90, 3);
        j.float(x, y - T * 0.4, '+10', th.sun, Math.max(13, T * 0.6), 0.6);
        break;
      case 'stomp':
        sfx('stomp'); buzz(12);
        j.burst(x, y, th.pink, 14, 200, 4);
        j.float(x, y - T * 0.3, auraText(50), th.lime, Math.max(15, T * 0.7));
        if (e.n >= 2) j.float(x, y - T * 1.3, hype(comboTier(e.n)), th.sun, Math.max(17, T * 0.85), 1.1);
        break;
      case 'bump': sfx('bump'); break;
      case 'break':
        sfx('bump'); sfx('slice');
        j.burst(x, y, '#e2735a', 16, 220, 5);
        j.float(x, y - T * 0.5, '+20', th.text, Math.max(13, T * 0.6), 0.6);
        break;
      case 'crown': sfx('perfect'); break;
      case 'power':
        sfx('power'); buzz(20);
        j.burst(w.hero.x * T, w.hero.y * T, th.sun, 18, 220, 4);
        j.float(w.hero.x * T, w.hero.y * T - T * 0.5, 'AURA CROWN', th.sun, Math.max(17, T * 0.85), 1.2);
        break;
      case 'hurt':
        sfx('hurt'); buzz(30); j.shake(7);
        j.float(x, y - T * 0.5, 'crown lost', th.danger, Math.max(15, T * 0.7), 1);
        break;
      case 'die':
        sfx('hurt'); buzz([40, 30, 40]); j.shake(9, 0.25);
        j.float(x, y - T, hype('fail'), th.danger, Math.max(19, T * 0.95), 1.3);
        break;
      case 'checkpoint':
        sfx('perfect');
        j.float(x, y - T * 0.8, 'wifi connected', th.lime, Math.max(14, T * 0.65), 1.2);
        break;
      case 'flag':
        sfx('combo', 10);
        j.burst(x, y, th.sun, 16, 200, 4);
        j.float(x, y - T * 0.6, `+${e.n}`, th.sun, Math.max(19, T * 0.95), 1.4);
        if (e.n >= 2000) j.float(x, y + T * 0.7, hype('huge'), th.pink, Math.max(17, T * 0.8), 1.6);
        break;
      case 'secret':
        sfx('boom'); buzz([30, 40, 30]);
        j.float(x, y + T * 1.6, 'SECRET UNLOCKED', th.pink, Math.max(18, T * 0.85), 2);
        // Ask the server for the name and message now, during the tally.
        void fetchSecret().then(r => {
          const s = isError(r) ? null : r;
          setSecret(w, s);
          secretRef.current = w.secret;
        });
        break;
      case 'tick': if (++tickCount.current % 3 === 0) sfx('tap'); break;
      case 'clear': sfx('win'); break;
      case 'level':
        if (e.n > 0) setAnnounce(`World ${Math.min(e.n + 1, 4)}, ${w.level.name}.`);
        j.clear();
        break;
      case 'over': sfx('over'); break;
      case 'win': sfx('win'); break;
    }
  }, [mono]);

  const finish = useCallback(() => {
    const w = worldRef.current;
    const final = worldScore(w);
    const kind = w.result ?? 'lost';
    setResult({ kind, score: final, message: w.secret.message });
    setBest(b => {
      const nb = Math.max(b, final);
      try { localStorage.setItem(HS_KEY, String(nb)); } catch { /* private mode */ }
      return nb;
    });
    setAnnounce(kind === 'lost' ? `Out of lives. ${final} points.` : `You finished. ${final} points.`);
    clearInput();
    setStatus('over');
  }, [clearInput, setStatus]);

  const update = useCallback((dt: number) => {
    const w = worldRef.current;
    stepWorld(w, readInto(stepInput.current, sources.current), dt);
    if (w.events.length) for (const e of drainEvents(w)) onEvent(e, w);
    juiceRef.current.update(dt);
  }, [onEvent]);

  const render = useCallback((alpha: number) => {
    const ctx = getCtx();
    const w = worldRef.current;
    if (ctx) drawFrame(ctx, w, { w: size.w, h: size.h, mono, reduced: !!reduced, alpha }, juiceRef.current);
    const next = hudOf(w);
    const prev = hudRef.current;
    if (next.score !== prev.score || next.coins !== prev.coins || next.lives !== prev.lives || next.level !== prev.level || next.time !== prev.time) {
      hudRef.current = next;
      setHud(next);
    }
    if (w.phase === 'done' && statusRef.current === 'playing') finish();
  }, [getCtx, size, mono, reduced, finish]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    clearInput();
    setStatus('paused');
    setAnnounce('Paused.');
  }, [clearInput, setStatus]);

  useGameLoop({ running: status === 'playing', update, render, onHidden: pause });

  // Draw a still frame whenever the loop is not running (idle, paused, over, resize).
  useEffect(() => { if (status !== 'playing') render(1); }, [status, render]);

  const startGame = useCallback((levelIndex = 0) => {
    const w = createWorld({ levelIndex, secret: secretRef.current });
    const T = tileFor(size.w, size.h);
    w.viewCols = size.w / T;
    w.viewRows = size.h / T;
    worldRef.current = w;
    juiceRef.current.clear();
    drainEvents(w);
    hudRef.current = hudOf(w);
    setHud(hudRef.current);
    setResult(null);
    setShowBoard(false);
    clearInput();
    run.begin();
    setAnnounce(`World ${levelIndex + 1}, ${w.level.name}. Run to the flag.`);
    setStatus('playing');
    refocus();
  }, [size, clearInput, run, setStatus, refocus]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    setStatus('playing');
    setAnnounce('Playing.');
    refocus();
  }, [setStatus, refocus]);

  const togglePause = useCallback(() => {
    if (statusRef.current === 'playing') pause();
    else if (statusRef.current === 'paused') resume();
  }, [pause, resume]);

  // Dev only: start at any level for screenshots and scripted play.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return;
    const g = window as unknown as { __baguettino?: unknown };
    g.__baguettino = { world: () => worldRef.current, start: (i: number) => startGame(i), layout };
    return () => { delete g.__baguettino; };
  }, [startGame, layout]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const s = statusRef.current;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (s === 'playing' || s === 'paused') { e.preventDefault(); togglePause(); }
      return;
    }
    if (s === 'playing') {
      if (keyboard.current.down(e.key, e.repeat)) e.preventDefault();
      return;
    }
    if ((e.key === ' ' || e.key === 'Enter') && !isButtonTarget(e)) {
      e.preventDefault();
      if (s === 'idle' || s === 'over') startGame();
      else if (s === 'paused') resume();
    }
  }, [togglePause, startGame, resume]);

  const onKeyUp = useCallback((e: React.KeyboardEvent) => { keyboard.current.up(e.key); }, []);

  const onBlur = useCallback((e: React.FocusEvent) => {
    if (leftRoot(e)) pause();
  }, [pause]);

  const w = worldRef.current;
  const worldNo = Math.min(hud.level + 1, 4);
  const lvlName = w.level.name;

  const pauseButton = status === 'playing' && (
    <button
      type="button"
      onClick={pause}
      onPointerDown={(e) => e.preventDefault()}
      aria-label="Pause"
      className="flex h-11 w-11 flex-shrink-0 items-center justify-center border border-border text-text-secondary transition-[color,transform] duration-100 ease-out hover:text-text active:scale-95"
    >
      <Pause size={18} aria-hidden />
    </button>
  );

  const stats = (
    <>
      <HudStat label="World" value={hud.level >= 3 ? 'Secret' : `${worldNo} of 3`} />
      <HudStat label="Coins" value={hud.coins} />
      <HudStat label="Lives" value={hud.lives} />
      <HudStat label="Time" value={hud.time} />
    </>
  );

  const statStrip = (
    <div className="flex flex-shrink-0 items-center gap-5 px-4 py-2">
      {stats}
      <div className="flex-1" />
      {pauseButton}
    </div>
  );

  // Landscape: one thin translucent strip over the view. It carries the
  // game's own way out (the shell's Done is hidden) and sits above the
  // start, pause and game over cards so Back is always reachable.
  const hudStrip = (
    <div className="dark absolute inset-x-0 top-0 z-20 flex h-11 items-center gap-4 bg-[#120b1f]/55 pl-[max(0.25rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to arcade"
        className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center text-text-secondary transition-[color,transform] duration-150 ease-out hover:text-text active:scale-95"
      >
        <ArrowLeft size={16} aria-hidden />
      </button>
      {stats}
      <HudStat label="Score" value={hud.score} />
      <div className="flex-1" />
      {pauseButton}
    </div>
  );

  const heading = 'font-display text-text leading-none text-[clamp(1.8rem,7cqi,2.75rem)]';

  const overlay = status !== 'playing' && (
    <GameOverlay reduced={reduced} key={status}>
      {status === 'idle' && (
        <>
          <h2 className={heading}>{TITLE}</h2>
          <p className="max-w-[18rem] text-[15px] text-text-secondary">
            Run through three worlds to the flag. Stomp the NPCs and hit the aura blocks from below.
          </p>
          <MetaLabel className="text-text-secondary">{isMobile ? 'Left thumb runs, right thumb jumps' : 'Arrows to run, Space to jump'}</MetaLabel>
          <OverlayButton onClick={() => startGame()} mono={mono} accent={ACCENT.fill} accentHover={ACCENT.hover}>Start</OverlayButton>
          <div className="flex items-center gap-2">
            <OverlayButton variant="ghost" onClick={() => setShowBoard(true)} mono={mono}>Leaderboard</OverlayButton>
            <SoundToggle />
          </div>
        </>
      )}
      {status === 'paused' && (
        <>
          <h2 className={heading}>Paused</h2>
          {!isMobile && <MetaLabel className="text-text-secondary">P to resume</MetaLabel>}
          <OverlayButton onClick={resume} mono={mono} accent={ACCENT.fill} accentHover={ACCENT.hover}>Resume</OverlayButton>
          <SoundToggle />
        </>
      )}
      {status === 'over' && result && (
        <>
          <h2 className={`${heading} max-w-[20rem]`}>
            {result.kind === 'lost' ? 'Out of lives' : result.kind === 'won' ? 'Three worlds cleared' : result.message}
          </h2>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[clamp(1.6rem,6cqi,2.25rem)] font-semibold leading-none tabular-nums text-text">{result.score}</span>
            <span className="text-sm text-text-secondary">points{result.score > 0 && result.score >= best ? ', a new best' : ''}</span>
          </div>
          {result.kind === 'won' && <p className="max-w-[17rem] text-sm text-text-secondary">Some flagpoles hide more at the very top.</p>}
          <RunResult
            game="platformer"
            score={result.score}
            getToken={run.token}
            onPlayAgain={() => startGame()}
            onShowBoard={() => setShowBoard(true)}
            mono={mono}
            accent={ACCENT.fill}
            accentHover={ACCENT.hover}
          />
        </>
      )}
    </GameOverlay>
  );

  const canvas = (
    <canvas
      ref={canvasRef}
      style={style}
      role="img"
      aria-label={`${TITLE}, world ${worldNo}, ${lvlName}`}
      className="block"
    />
  );

  const viewClass = {
    // The view takes every pixel above the controls: on a portrait phone
    // that is a tall window with sky above the level.
    portrait: 'relative min-h-[45%] w-full flex-1',
    landscape: 'absolute inset-0',
    desktop: 'relative min-h-0 flex-1',
  }[layout];

  // One tree for every layout, so the view's element (which useCanvas
  // measures) survives a rotation instead of remounting.
  return (
    <div
      ref={rootRef}
      tabIndex={0}
      aria-label={TITLE}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={onBlur}
      data-testid="platformer-root"
      data-layout={layout}
      className="h-full flex flex-col overflow-hidden overscroll-contain select-none [-webkit-touch-callout:none] focus-visible:[outline-offset:-2px]"
    >
      <GameStatus>{announce}</GameStatus>
      {layout !== 'landscape' && <GameHeader title={TITLE} score={hud.score} best={best} onBack={onBack} onReset={() => startGame()} />}

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={containerRef} data-testid="platformer-view" className={`${viewClass} overflow-hidden bg-[#1d1430] touch-none`}>
          {canvas}
        </div>
        {layout === 'landscape' ? (
          <>
            <TouchOverlay input={touchInput.current} mono={mono} />
            {hudStrip}
          </>
        ) : (
          <>
            <Hairline />
            {statStrip}
            {layout === 'portrait' && (
              <div className="flex flex-shrink-0 flex-col touch-none">
                <p className="px-8 pb-1 text-center text-sm text-text-tertiary">
                  Hold Jump longer to jump higher. Land on enemies to stomp them.
                </p>
                <TouchDeck input={touchInput.current} mono={mono} />
              </div>
            )}
          </>
        )}
        {overlay}
        {showBoard && <BoardSheet game="platformer" onClose={() => { setShowBoard(false); refocus(); }} />}
      </div>

      {layout === 'desktop' && <ControlsHint>Arrows or A and D to run. Space, W or Up to jump. P pauses.</ControlsHint>}
    </div>
  );
}
