/**
 * Rain and sparks, pooled. Every streak, splash and spark lives in a fixed
 * array made once; a frame only rewrites numbers. Rain is in buffer pixels
 * (screen space) and is nudged by the camera's motion so it sits in the
 * world; front streaks that meet a roof top splash on it.
 */

import { makeCanvas, type Canvas, type Ctx } from './canvas';

export const RAIN_CAP = 200;
export const SPLASH_CAP = 24;
export const SPARK_CAP = 40;

/** Horizontal drift per pixel of fall: the wind blows the rain left. */
export const SLANT = -0.22;
/** Buffer pixels of screen per streak (one streak per this many px squared). */
const DENSITY = 850;
const REDUCED_COUNT = 0.4;
const REDUCED_SPEED = 0.55;
const SPLASH_LIFE = 0.2;

export interface Streak { x: number; y: number; speed: number; len: number; front: boolean; splashy: boolean }
export interface Splash { x: number; y: number; t: number }

/** The roof top (buffer y) under a falling point, or -1 when it is in open air. */
export type RoofHit = (x: number, y: number) => number;

/** World modifiers: a storm is denser and more slanted, low gravity slower. */
export interface RainOpts { density: number; speed: number; slant: number }
export const CALM: RainOpts = { density: 1, speed: 1, slant: SLANT };

/** Slants the streak sprites are baked at; the nearest is used. */
const SLANTS = [0, -0.22, -0.45, -0.7, -0.95, 0.22, 0.45, 0.7, 0.95];
export function slantIndex(slant: number): number {
  let best = 0;
  for (let i = 1; i < SLANTS.length; i++) if (Math.abs(SLANTS[i] - slant) < Math.abs(SLANTS[best] - slant)) best = i;
  return best;
}

export class Rain {
  readonly streaks: Streak[] = Array.from({ length: RAIN_CAP }, (_, i) => ({ x: 0, y: 0, speed: 0, len: 0, front: i % 3 === 0, splashy: false }));
  readonly splashes: Splash[] = Array.from({ length: SPLASH_CAP }, () => ({ x: 0, y: 0, t: SPLASH_LIFE }));
  active = 0;
  splashCount = 0;
  private reduced = false;
  private speedMul = 1;
  private slant = SLANT;

  constructor(private readonly rand: () => number) {}

  private spawn(s: Streak, bw: number, bh: number, anywhere: boolean) {
    const r = this.rand;
    s.len = s.front ? 7 + Math.floor(r() * 4) : 4 + Math.floor(r() * 3);
    s.speed = (s.front ? 250 + r() * 60 : 160 + r() * 40) * (this.reduced ? REDUCED_SPEED : 1) * this.speedMul;
    s.splashy = s.front && r() < 0.6;
    // Spawn wider than the view on the upwind side, so the slant never leaves a gap.
    s.x = -8 + r() * (bw + 16 + bh * Math.abs(this.slant)) + (this.slant > 0 ? -bh * this.slant : 0);
    s.y = anywhere ? r() * (bh + s.len) - s.len : -s.len - r() * 30;
  }

  update(dt: number, bw: number, bh: number, camDx: number, camDy: number, reduced: boolean, hit: RoofHit, opts: RainOpts = CALM) {
    const mul = (reduced ? REDUCED_SPEED : 1) * opts.speed;
    const was = (this.reduced ? REDUCED_SPEED : 1) * this.speedMul;
    if (mul !== was) {
      for (let i = 0; i < RAIN_CAP; i++) this.streaks[i].speed *= mul / was;
      this.reduced = reduced;
      this.speedMul = opts.speed;
    }
    this.slant = opts.slant;
    const target = Math.min(RAIN_CAP, Math.round(((bw * bh) / DENSITY) * (reduced ? REDUCED_COUNT : 1) * opts.density));
    for (let i = this.active; i < target; i++) this.spawn(this.streaks[i], bw, bh, true);
    this.active = target;

    for (let i = 0; i < this.active; i++) {
      const s = this.streaks[i];
      const dy = s.speed * dt;
      const par = s.front ? 1 : 0.6;
      s.y += dy - camDy * par;
      s.x += dy * this.slant - camDx * par;
      if (s.splashy && s.y > 0) {
        const top = hit(s.x, s.y);
        if (top >= 0) {
          this.splash(s.x, top);
          this.spawn(s, bw, bh, false);
          continue;
        }
      }
      if (s.y - s.len > bh || s.x < -16 - bh * Math.max(0, this.slant) || s.x > bw + 16 + bh * Math.max(0, -this.slant)) this.spawn(s, bw, bh, false);
    }

    let n = 0;
    for (const p of this.splashes) {
      if (p.t >= SPLASH_LIFE) continue;
      p.t += dt;
      p.x -= camDx; p.y -= camDy;
      if (p.t < SPLASH_LIFE) n++;
    }
    this.splashCount = n;
  }

  private splash(x: number, y: number) {
    for (const p of this.splashes) {
      if (p.t < SPLASH_LIFE) continue;
      p.x = x; p.y = y; p.t = 0;
      this.splashCount++;
      return;
    }
  }

  /** Draw one depth of rain: back (behind the playfield) or front. */
  draw(ctx: Ctx, front: boolean, mono: boolean) {
    const sheet = streakSheet(mono, slantIndex(this.slant));
    for (let i = 0; i < this.active; i++) {
      const s = this.streaks[i];
      if (s.front !== front) continue;
      const row = front ? 1 : 0;
      ctx.drawImage(sheet, (s.len - 4) * SHEET_CELL, row * SHEET_ROW, SHEET_CELL, SHEET_ROW, Math.round(s.x) - HEAD_X, Math.round(s.y) - SHEET_ROW, SHEET_CELL, SHEET_ROW);
    }
    if (!front) return;
    ctx.fillStyle = mono ? '#d4d4d8' : '#c9d6ff';
    for (const p of this.splashes) {
      if (p.t >= SPLASH_LIFE) continue;
      const x = Math.round(p.x), y = Math.round(p.y);
      const f = p.t / SPLASH_LIFE;
      ctx.globalAlpha = 0.85 * (1 - f);
      if (f < 0.35) {
        ctx.fillRect(x, y - 2, 1, 1);
        ctx.fillRect(x - 1, y - 1, 1, 1); ctx.fillRect(x + 1, y - 1, 1, 1);
      } else if (f < 0.7) {
        ctx.fillRect(x - 2, y - 3, 1, 1); ctx.fillRect(x + 2, y - 3, 1, 1);
        ctx.fillRect(x - 1, y - 1, 3, 1);
      } else {
        ctx.fillRect(x - 3, y - 2, 1, 1); ctx.fillRect(x + 3, y - 2, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }
}

// Streak sprites: one per length (4..10) and slant, back row dim, front row brighter.
const SHEET_CELL = 12;
const SHEET_ROW = 11;
/** Where the head pixel sits in a cell. */
const HEAD_X = 6;
const sheets = new Map<number, Canvas>();

function streakSheet(mono: boolean, slant: number): Canvas {
  const key = slant * 2 + (mono ? 1 : 0);
  const hit = sheets.get(key);
  if (hit) return hit;
  const sl = SLANTS[slant];
  const { canvas, ctx } = makeCanvas(SHEET_CELL * 7, SHEET_ROW * 2);
  for (let row = 0; row < 2; row++) {
    const front = row === 1;
    for (let len = 4; len <= 10; len++) {
      const ox = (len - 4) * SHEET_CELL + HEAD_X;
      for (let j = 0; j < len; j++) {
        // j = 0 is the tail (top), len - 1 the head (bottom, brightest); the tail sits upwind
        const a = (front ? 0.55 : 0.3) * (0.25 + 0.75 * (j / (len - 1)));
        ctx.fillStyle = mono ? `rgba(220,220,225,${a})` : front ? `rgba(196,212,255,${a})` : `rgba(150,160,230,${a})`;
        const px = Math.round(ox + (j - (len - 1)) * sl);
        ctx.fillRect(px, row * SHEET_ROW + (SHEET_ROW - len) + j, 1, 1);
      }
    }
  }
  sheets.set(key, canvas);
  return canvas;
}

export const MOTE_CAP = 36;
export interface Mote { x: number; y: number; vx: number; vy: number; phase: number; size: number }

/** Floating dust (low gravity): drifts up slowly and sways, buffer pixels. */
export class Motes {
  readonly items: Mote[] = Array.from({ length: MOTE_CAP }, () => ({ x: 0, y: 0, vx: 0, vy: 0, phase: 0, size: 1 }));
  active = 0;

  constructor(private readonly rand: () => number) {}

  private spawn(m: Mote, bw: number, bh: number, anywhere: boolean) {
    const r = this.rand;
    m.x = r() * bw;
    m.y = anywhere ? r() * bh : bh + 2 + r() * 10;
    m.vx = (r() - 0.5) * 4;
    m.vy = -(3 + r() * 6);
    m.phase = r() * 6.28;
    m.size = r() < 0.2 ? 2 : 1;
  }

  update(dt: number, bw: number, bh: number, camDx: number, camDy: number, on: boolean, reduced: boolean) {
    const target = on ? Math.min(MOTE_CAP, Math.round((bw * bh) / 2400) * (reduced ? 0.5 : 1)) : 0;
    for (let i = this.active; i < target; i++) this.spawn(this.items[i], bw, bh, true);
    this.active = Math.round(target);
    const k = reduced ? 0.4 : 1;
    for (let i = 0; i < this.active; i++) {
      const m = this.items[i];
      m.phase += dt * 1.3;
      m.x += (m.vx + Math.sin(m.phase) * 3) * dt * k - camDx * 0.8;
      m.y += m.vy * dt * k - camDy * 0.8;
      if (m.y < -4 || m.x < -6 || m.x > bw + 6) this.spawn(m, bw, bh, false);
    }
  }

  draw(ctx: Ctx, mono: boolean) {
    ctx.fillStyle = mono ? '#e4e4e7' : '#ffe9c9';
    for (let i = 0; i < this.active; i++) {
      const m = this.items[i];
      ctx.globalAlpha = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(m.phase * 2));
      ctx.fillRect(Math.round(m.x), Math.round(m.y), m.size, m.size);
    }
    ctx.globalAlpha = 1;
  }
}

export interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number }

/** Hot sparks (wall slides, dashes), in world art pixels. */
export class Sparks {
  readonly items: Spark[] = Array.from({ length: SPARK_CAP }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1 }));
  count = 0;

  constructor(private readonly rand: () => number) {}

  /** Throw n sparks away from a wall on side `dir` (1 = wall on the right). */
  emit(x: number, y: number, dir: number, n: number) {
    for (let k = 0; k < n; k++) {
      let s: Spark | null = null;
      for (const it of this.items) if (it.life <= 0) { s = it; break; }
      if (!s) return;
      const r = this.rand;
      s.x = x; s.y = y;
      s.vx = -dir * (20 + r() * 50);
      s.vy = -20 - r() * 40;
      s.max = s.life = 0.18 + r() * 0.2;
      this.count++;
    }
  }

  update(dt: number) {
    let n = 0;
    for (const s of this.items) {
      if (s.life <= 0) continue;
      s.life -= dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 260 * dt;
      if (s.life > 0) n++;
    }
    this.count = n;
  }

  draw(ctx: Ctx, ox: number, oy: number, mono: boolean) {
    for (const s of this.items) {
      if (s.life <= 0) continue;
      const f = s.life / s.max;
      ctx.globalAlpha = Math.min(1, f * 1.5);
      ctx.fillStyle = mono ? '#ffffff' : f > 0.5 ? '#fff1c2' : '#ffb347';
      ctx.fillRect(Math.round(s.x - ox), Math.round(s.y - oy), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}
