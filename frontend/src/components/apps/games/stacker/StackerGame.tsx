'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Pause } from 'lucide-react';
import { useIsMono } from '@/hooks/usePalette';
import { MetaLabel } from '@/components/editorial';
import {
  bestScore, isButtonTarget, leftRoot, GameHeader, HudStat, OverlayButton, GameOverlay, ControlsHint, GameStatus,
} from '../shared/chrome';
import { useCanvas } from '../shared/useCanvas';
import { useGameLoop, FIXED_DT } from '../shared/useGameLoop';
import { Juice } from '../shared/juice';
import { CAST, drawCreature } from '../shared/cast';
import { arcadeTheme, hypeFont } from '../shared/theme';
import { hype, comboTier } from '../shared/slang';
import { sfx, buzz } from '../shared/sound';
import { TouchButton, SoundToggle } from '../shared/TouchButton';
import { useRun } from '../leaderboard/useRun';
import { RunResult, BoardSheet } from '../leaderboard/Leaderboard';
import {
  SLAB_H, WORLD_W, cameraTarget, createStacker, drop, easeCamera, tick, top,
  type DropEvent, type StackerState,
} from './logic';
import { Face, STARS, drawPedestal, drawSlab, skyAt, starAlpha } from './draw';

// ─────────────────────────────────────────────────────────────────────────────
// AURA TOWER - one tap stacker. Rules in ./logic.ts, drawing helpers in
// ./draw.ts. The world lives in refs; React state only holds the HUD numbers
// and the round status.
// ─────────────────────────────────────────────────────────────────────────────

type Status = 'idle' | 'playing' | 'paused' | 'over';

const HS_KEY = 'devos-stacker-hs';
// Pink accent; white text on it passes 4.5:1.
const ACCENT = { fill: '#be185d', hover: '#9d174d' };
/** Rows tall the view always shows, so a wide desktop window does not zoom in. */
const VIEW_ROWS = 15;
/** Seconds the tower wobbles after a miss before the result card. */
const DEATH_T = 1.1;
const DEATH_T_REDUCED = 0.5;
const PULSE_T = 0.5;
const INK = '#120b1f';

interface Frog {
  x: number; y: number;
  fromX: number; fromY: number;
  /** Hop progress 0..1; at 1 the frog rides its target. */
  p: number; dur: number; arc: number;
  squash: number; dizzy: boolean; facing: 1 | -1;
}

interface Pulse { x: number; w: number; row: number; age: number }

function freshFrog(g: StackerState): Frog {
  const m = g.mover!;
  const x = m.x + m.w / 2; const y = (g.stack.length + 1) * SLAB_H;
  return { x, y, fromX: x, fromY: y, p: 1, dur: 0.26, arc: 0, squash: 1, dizzy: false, facing: m.dir };
}

export default function StackerGame({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const mono = useIsMono();
  const reduced = useReducedMotion();
  const run = useRun('stacker');
  const [status, setStatus] = useState<Status>('idle');
  const [score, setScore] = useState(0);
  const [perfects, setPerfects] = useState(0);
  const [best, setBest] = useState(() => bestScore(HS_KEY));
  const [failLine, setFailLine] = useState('Cooked.');
  const [showBoard, setShowBoard] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<Status>('idle');
  const gameRef = useRef<StackerState>(null!);
  const frogRef = useRef<Frog>(null!);
  // Lazy init: a useRef argument would be rebuilt (and thrown away) every render.
  if (!gameRef.current) { gameRef.current = createStacker(); frogRef.current = freshFrog(gameRef.current); }
  const camRef = useRef<number | null>(null);
  const pulsesRef = useRef<Pulse[]>([]);
  const deathRef = useRef(-1);
  const juiceRef = useRef<Juice>(null!);
  if (!juiceRef.current) juiceRef.current = new Juice(false);
  const skyRef = useRef<{ key: number; h: number; grad: CanvasGradient | string | null }>({ key: -1, h: 0, grad: null });

  const { containerRef, canvasRef, size, getCtx, style } = useCanvas();

  useEffect(() => { juiceRef.current.reduced = !!reduced; gameRef.current.reduced = !!reduced; }, [reduced]);

  const setStat = useCallback((s: Status) => { statusRef.current = s; setStatus(s); }, []);

  // Take focus on open so Space works at once (and only here).
  useEffect(() => { rootRef.current?.focus({ preventScroll: true }); }, []);
  const refocus = useCallback(() => rootRef.current?.focus({ preventScroll: true }), []);

  const scaleFor = useCallback((w: number, h: number) => Math.min(w / WORLD_W, h / (SLAB_H * VIEW_ROWS)), []);

  // ── Drawing ────────────────────────────────────────────────────────────────
  const render = useCallback((alpha = 0) => {
    const ctx = getCtx(); if (!ctx) return;
    const { w, h } = size;
    const g = gameRef.current;
    const k = scaleFor(w, h);
    const ox = (w - WORLD_W * k) / 2;
    const viewH = h / k;
    // Outside play there is no loop to ease the camera, so park it on target
    // (the size changes once the container is measured).
    if (camRef.current === null || statusRef.current === 'idle') camRef.current = cameraTarget(g.stack.length, viewH);
    const cam = camRef.current;
    const level = Math.max(0, cam / SLAB_H);
    const theme = arcadeTheme(mono);
    const hpx = SLAB_H * k;
    const t = g.time;

    // Sky: a vertical gradient that darkens with height, cached per half floor.
    const sky = skyRef.current;
    const key = Math.round(level * 2) * 2 + (mono ? 1 : 0);
    if (sky.key !== key || sky.h !== h || !sky.grad) {
      const grad = ctx.createLinearGradient?.(0, 0, 0, h);
      if (grad) {
        grad.addColorStop(0, skyAt(level + viewH / SLAB_H, mono));
        grad.addColorStop(1, skyAt(level, mono));
        sky.grad = grad;
      } else sky.grad = skyAt(level, mono);
      sky.key = key; sky.h = h;
    }
    ctx.fillStyle = sky.grad!;
    ctx.fillRect(0, 0, w, h);

    // Stars fade in higher up and drift slower than the tower.
    const sa = starAlpha(level);
    if (sa > 0) {
      ctx.fillStyle = mono ? '#ffffff' : '#fff4e0';
      for (let i = 0; i < STARS.length; i += 4) {
        const sz = STARS[i + 2];
        const y = (STARS[i + 1] * h + cam * k * 0.12) % h;
        ctx.globalAlpha = sa * (0.45 + 0.55 * Math.abs(Math.sin(t * 1.3 + STARS[i + 3])));
        ctx.fillRect(STARS[i] * w, y, sz, sz);
      }
      ctx.globalAlpha = 1;
    }

    const juice = juiceRef.current;
    const shake = juice.offset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    // Debris behind the tower: sliced overhangs and the missed slab.
    for (let i = 0; i < g.debris.length; i++) {
      const d = g.debris[i];
      const dw = d.w * k;
      const cx = ox + (d.x + d.w / 2) * k;
      const cy = h - (d.y + SLAB_H / 2 - cam) * k;
      if (cy - dw > h + 40) continue;
      const left = 1 - d.age / d.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, left * 2.5));
      ctx.translate(cx, cy);
      ctx.rotate(d.rot);
      const c = CAST[d.color % CAST.length];
      drawSlab(ctx, -dw / 2, -hpx / 2, dw, hpx, mono ? c.mono : c.fill, d.whole || dw > hpx * 1.6 ? Face.Dizzy : Face.None);
      ctx.restore();
    }

    // The tower wobbles after a miss.
    ctx.save();
    const death = deathRef.current;
    if (death >= 0 && !reduced) {
      const a = 0.06 * Math.sin(death * 16) * Math.exp(-death * 2.4);
      const px = ox + (WORLD_W * k) / 2;
      ctx.translate(px, h); ctx.rotate(a); ctx.translate(-px, -h);
    }

    // Pedestal under the base, running off the bottom of the screen.
    const base = g.stack[0];
    const pedTop = h + cam * k;
    if (pedTop < h) {
      drawPedestal(
        ctx, ox + base.x * k, pedTop, base.w * k, h + 8,
        mono ? '#26262a' : '#2c1f4a', mono ? 'rgba(228,228,231,0.5)' : 'rgba(255,210,63,0.55)', mono ? '#18181b' : '#1f1636', hpx,
      );
    }

    // Visible slabs only.
    const first = Math.max(0, Math.floor(cam / SLAB_H) - 1);
    const last = Math.min(g.stack.length - 1, Math.ceil((cam + viewH) / SLAB_H) + 1);
    for (let i = first; i <= last; i++) {
      const s = g.stack[i];
      const c = CAST[s.color % CAST.length];
      const y = h - ((i + 1) * SLAB_H - cam) * k;
      drawSlab(ctx, ox + s.x * k, y, s.w * k, hpx, mono ? c.mono : c.fill,
        s.perfect ? Face.Happy : Face.Calm, 0, s.color === 5);
    }

    // Perfect ring pulses.
    const pulses = pulsesRef.current;
    if (pulses.length) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = mono ? '#ffffff' : theme.sun;
      for (let i = 0; i < pulses.length; i++) {
        const p = pulses[i];
        const e = p.age / PULSE_T;
        const grow = 4 + e * 26;
        const y = h - ((p.row + 1) * SLAB_H - cam) * k;
        ctx.globalAlpha = Math.max(0, 1 - e);
        ctx.beginPath();
        ctx.roundRect(ox + p.x * k - grow, y - grow, p.w * k + grow * 2, hpx + grow * 2, 10 + grow * 0.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // The sliding slab, nudged by alpha so it glides between fixed steps.
    const m = g.mover;
    let moverX = 0;
    if (m) {
      moverX = m.x + m.dir * m.speed * FIXED_DT * alpha;
      const c = CAST[m.color % CAST.length];
      const y = h - ((g.stack.length + 1) * SLAB_H - cam) * k;
      drawSlab(ctx, ox + moverX * k, y, m.w * k, hpx, mono ? c.mono : c.fill, Face.Look, m.dir, m.color === 5);
    }

    // Frogatti Bossini surfs each new slab and hops to the next.
    const f = frogRef.current;
    const fx = m && f.p >= 1 ? moverX + m.w / 2 : f.x;
    const fsz = hpx * 1.15;
    const feet = h - (f.y - cam) * k;
    drawCreature(ctx, 'frog', ox + fx * k, feet - fsz * 0.42, fsz, {
      mono, t, facing: f.facing, squash: f.squash, dizzy: f.dizzy,
    });
    ctx.restore();

    juice.draw(ctx);
    ctx.restore();

    // Floors, big, at the top. The header has it too; this is the one she sees.
    if (statusRef.current !== 'idle') {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      const fs = Math.min(56, Math.max(36, w * 0.12));
      ctx.font = hypeFont(fs);
      ctx.lineWidth = fs * 0.16; ctx.strokeStyle = INK;
      const label = String(g.floors);
      ctx.strokeText(label, w / 2, fs * 0.85);
      ctx.fillStyle = theme.text;
      ctx.fillText(label, w / 2, fs * 0.85);
      if (g.combo >= 2) {
        const cs = fs * 0.36;
        ctx.font = hypeFont(cs);
        ctx.lineWidth = cs * 0.24;
        const line = `PERFECT x${g.combo}`;
        ctx.strokeText(line, w / 2, fs * 1.6);
        ctx.fillStyle = mono ? '#ffffff' : theme.sun;
        ctx.fillText(line, w / 2, fs * 1.6);
      }
    }
  }, [getCtx, size, mono, reduced, scaleFor]);

  // Redraw on resize and palette change (a resize clears the canvas).
  useEffect(() => { render(); }, [render]);


  // ── Round flow ─────────────────────────────────────────────────────────────
  const finish = useCallback(() => {
    const fs = gameRef.current.floors;
    setBest(b => {
      const nb = Math.max(b, fs);
      try { localStorage.setItem(HS_KEY, String(nb)); } catch { /* private mode */ }
      return nb;
    });
    setStat('over');
  }, [setStat]);

  const startGame = useCallback(() => {
    const g = createStacker({ reduced: !!reduced });
    gameRef.current = g;
    camRef.current = cameraTarget(g.stack.length, size.h / scaleFor(size.w, size.h));
    frogRef.current = freshFrog(g);
    pulsesRef.current = [];
    deathRef.current = -1;
    juiceRef.current.clear();
    setScore(0); setPerfects(0); setShowBoard(false);
    setStat('playing');
    run.begin();
    sfx('tap');
    refocus();
  }, [reduced, size, scaleFor, setStat, run, refocus]);

  const pause = useCallback(() => {
    if (statusRef.current === 'playing') setStat('paused');
  }, [setStat]);

  const resume = useCallback(() => {
    if (statusRef.current === 'paused') setStat('playing');
    refocus();
  }, [setStat, refocus]);

  const onDropEvent = useCallback((e: DropEvent) => {
    const g = gameRef.current;
    const juice = juiceRef.current;
    const { w, h } = size;
    const k = scaleFor(w, h);
    const ox = (w - WORLD_W * k) / 2;
    const cam = camRef.current ?? 0;
    const theme = arcadeTheme(mono);
    const sx = ox + (e.x + e.w / 2) * k;
    const sy = h - ((e.row + 1) * SLAB_H - cam) * k;
    const f = frogRef.current;
    const instant = !!reduced;

    if (e.kind === 'miss') {
      deathRef.current = 0;
      const t = top(g);
      Object.assign(f, {
        fromX: f.x, fromY: f.y, p: instant ? 1 : 0, dur: 0.45, arc: 14, dizzy: true, squash: 0.8,
        x: instant ? t.x + t.w / 2 : f.x, y: instant ? g.stack.length * SLAB_H : f.y,
      });
      const line = hype('fail');
      setFailLine(line.charAt(0).toUpperCase() + line.slice(1) + '.');
      juice.float(w / 2, h * 0.4, line.toUpperCase(), theme.danger, 30, 1.4);
      juice.shake(9, 0.35);
      sfx('over');
      buzz([40, 60, 80]);
      return;
    }

    // Hop onto the next slab.
    const m = g.mover!;
    Object.assign(f, {
      fromX: f.x, fromY: f.y, p: instant ? 1 : 0, dur: 0.26,
      arc: e.kind === 'perfect' ? 30 : 18, squash: e.kind === 'perfect' ? 1.3 : 1.12, facing: m.dir,
    });
    setScore(e.floors);

    if (e.kind === 'perfect') {
      setPerfects(g.perfects);
      if (!reduced) pulsesRef.current.push({ x: e.x, w: e.w, row: e.row, age: 0 });
      juice.burst(sx, sy + (SLAB_H * k) / 2, mono ? '#ffffff' : theme.sun, 14, 200, 4);
      juice.float(sx, sy - 18, hype(comboTier(e.combo)).toUpperCase(), mono ? '#ffffff' : theme.sun, e.combo >= 6 ? 26 : 20);
      sfx('perfect');
      buzz(12);
      if (e.grew) {
        juice.float(sx, sy - 52, 'GLOW UP', mono ? '#d4d4d8' : theme.lime, 16, 1.1);
        sfx('power');
      }
    } else {
      sfx('drop'); sfx('slice');
      buzz(6);
    }
    if (e.milestone) {
      juice.float(w / 2, h * 0.5, `${e.milestone} FLOORS OF AURA`, mono ? '#ffffff' : theme.pink, 26, 1.6);
      juice.burst(w / 2, h * 0.5, mono ? '#ffffff' : theme.pink, 24, 260, 5);
      sfx('win');
      buzz([20, 40, 20]);
    }
  }, [size, scaleFor, mono, reduced]);

  /** One call, one slab. Ignored outside play and while the tower falls. */
  const dropSlab = useCallback(() => {
    if (statusRef.current !== 'playing' || deathRef.current >= 0) return;
    const e = drop(gameRef.current);
    if (e) onDropEvent(e);
  }, [onDropEvent]);

  // ── Loop ───────────────────────────────────────────────────────────────────
  const update = useCallback((dt: number) => {
    const g = gameRef.current;
    tick(g, dt);
    juiceRef.current.update(dt);

    const { w, h } = size;
    const target = cameraTarget(g.stack.length, h / scaleFor(w, h));
    camRef.current = reduced || camRef.current === null ? target : easeCamera(camRef.current, target, dt);

    const f = frogRef.current;
    let tx: number; let ty: number;
    if (g.mover) { tx = g.mover.x + g.mover.w / 2; ty = (g.stack.length + 1) * SLAB_H; }
    else { const t = top(g); tx = t.x + t.w / 2; ty = g.stack.length * SLAB_H; }
    if (f.p < 1) {
      f.p = Math.min(1, f.p + dt / f.dur);
      const e = f.p;
      f.x = f.fromX + (tx - f.fromX) * e;
      f.y = f.fromY + (ty - f.fromY) * e + f.arc * 4 * e * (1 - e);
    } else { f.x = tx; f.y = ty; }
    f.squash += (1 - f.squash) * (1 - Math.exp(-dt * 10));

    const pulses = pulsesRef.current;
    for (let i = pulses.length - 1; i >= 0; i--) {
      pulses[i].age += dt;
      if (pulses[i].age >= PULSE_T) pulses.splice(i, 1);
    }

    if (deathRef.current >= 0) {
      deathRef.current += dt;
      if (deathRef.current >= (reduced ? DEATH_T_REDUCED : DEATH_T)) {
        deathRef.current = -1;
        finish();
      }
    }
  }, [size, scaleFor, reduced, finish]);

  useGameLoop({ running: status === 'playing', update, render, onHidden: pause });

  // A final frame when the round stops, so the board under the card is current.
  useEffect(() => { if (status !== 'playing') render(); }, [status, render]);

  // ── Input ──────────────────────────────────────────────────────────────────
  // The whole play area is the tap target. pointerdown, not click, so the drop
  // lands the instant the finger does; one pointerdown is one drop.
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, a, label, [role="dialog"]')) return;
    const st = statusRef.current;
    if (st === 'over') return;
    e.preventDefault();
    refocus();
    if (st === 'playing') dropSlab();
    // The tap that starts or resumes the round never also drops a slab.
    else if (st === 'idle') startGame();
    else if (st === 'paused') resume();
  }, [dropSlab, startGame, resume, refocus]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT') return;
    const st = statusRef.current;
    if (e.key === ' ' || e.key === 'Enter') {
      if (isButtonTarget(e)) return;
      e.preventDefault();
      if (e.repeat) return;
      if (st === 'playing') dropSlab();
      else if (st === 'paused') resume();
      else if (!showBoard) startGame();
      return;
    }
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (st === 'playing') { e.preventDefault(); pause(); }
      else if (st === 'paused' && e.key !== 'Escape') { e.preventDefault(); resume(); }
    }
  }, [dropSlab, resume, startGame, pause, showBoard]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (leftRoot(e)) pause();
  }, [pause]);

  const announce =
    status === 'playing' ? 'Aura Tower started.' :
    status === 'paused' ? 'Paused.' :
    status === 'over' ? `Game over. ${score} ${score === 1 ? 'floor' : 'floors'}.` : '';

  const h2 = 'font-display text-text leading-none text-[clamp(1.8rem,7cqi,2.75rem)]';

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      aria-label="Aura Tower"
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      data-testid="stacker-root"
      // focus here is for the keys; the accent ring around the whole game read as a glitch
      data-no-focus-ring
      className="h-full flex flex-col overflow-hidden overscroll-contain select-none focus-visible:[outline-offset:-2px]"
    >
      <GameStatus>{announce}</GameStatus>
      <GameHeader title="Aura Tower" score={score} scoreLabel="Floors" best={best} onBack={onBack} onReset={startGame}>
        <HudStat label="Perfect" value={perfects} />
      </GameHeader>

      <div
        ref={containerRef}
        data-testid="stacker-play"
        onPointerDown={onPointerDown}
        onContextMenu={(e) => e.preventDefault()}
        className="relative flex-1 min-h-0 overflow-hidden touch-none select-none overscroll-contain
                   [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent] cursor-pointer"
        style={{ background: mono ? '#161618' : '#1d1430' }}
      >
        <canvas
          ref={canvasRef}
          style={style}
          role="img"
          aria-label={`Aura Tower, ${score} ${score === 1 ? 'floor' : 'floors'} stacked`}
          className="absolute left-0 top-0 block"
        />

        {status === 'playing' && (
          <TouchButton
            label="Pause"
            onPress={pause}
            size={48}
            className="dark absolute right-1 top-1 z-[5] text-text-secondary hover:text-text focus-visible:outline focus-visible:outline-2"
          >
            <Pause size={20} />
          </TouchButton>
        )}

        {status !== 'playing' && (
          <GameOverlay reduced={reduced} key={status}>
            {status === 'idle' && (
              <>
                <h2 className={h2}>Aura Tower</h2>
                <p className="text-[15px] text-text-secondary max-w-[17rem]">
                  Drop each slab on the one below. Whatever hangs over gets sliced off. Land it clean for a perfect.
                </p>
                <MetaLabel className="text-text-secondary">{isMobile ? 'Tap anywhere to start' : 'Press Space to start'}</MetaLabel>
                <OverlayButton onClick={startGame} mono={mono} accent={ACCENT.fill} accentHover={ACCENT.hover}>Start</OverlayButton>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <SoundToggle />
                  <OverlayButton onClick={() => setShowBoard(true)} variant="ghost" mono={mono}>See the board</OverlayButton>
                </div>
              </>
            )}
            {status === 'paused' && (
              <>
                <h2 className="font-display text-text leading-none text-[clamp(1.6rem,5cqi,2.5rem)]">Paused</h2>
                <MetaLabel className="text-text-secondary">{isMobile ? 'Tap anywhere to resume' : 'Space to resume'}</MetaLabel>
                <OverlayButton onClick={resume} mono={mono} accent={ACCENT.fill} accentHover={ACCENT.hover}>Resume</OverlayButton>
                <SoundToggle />
              </>
            )}
            {status === 'over' && (
              <>
                <h2 className={h2}>{failLine}</h2>
                <div className="flex flex-col items-center gap-1">
                  <span className="tabular-nums text-text text-[clamp(1.6rem,6cqi,2.25rem)] font-semibold leading-none">{score}</span>
                  <span className="text-sm text-text-secondary">
                    {score === 1 ? 'floor stacked' : 'floors stacked'}{score > 0 && score === best ? ', a new best' : ''}
                  </span>
                  {perfects > 0 && (
                    <span className="text-sm text-text-secondary">{perfects === 1 ? '1 perfect drop' : `${perfects} perfect drops`}</span>
                  )}
                </div>
                <RunResult
                  game="stacker"
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
        {showBoard && <BoardSheet game="stacker" onClose={() => { setShowBoard(false); refocus(); }} />}
      </div>

      <ControlsHint>{isMobile ? 'Tap anywhere to drop' : 'Space or click to drop. P pauses.'}</ControlsHint>
    </div>
  );
}
