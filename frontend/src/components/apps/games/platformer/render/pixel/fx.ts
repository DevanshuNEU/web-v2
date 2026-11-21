/**
 * Action effects in the pixel buffer, all pooled: blade swing smears, hit
 * sparks, knockback dust, debris from crates and signs, pogo rings, the
 * power ring timer, Bat Wings' cloak and slow dust, Taco Rush's speed lines
 * and coins flying in on the magnet, and the bat swarm set piece. Until the
 * sprite agent's art lands, these are drawn as simple pixel shapes.
 */

import { toMono } from '../bake';
import { AUSTIN, BREAKABLES, FX, HERO, type SpriteSet } from '../sprites';
import type { Ctx } from './canvas';
import { hash2 } from './skyline';
import { atlas, drawFrame, type Atlas } from './sprites';

const ANIM_CAP = 10;
const PIECE_CAP = 16;

/** A one-shot sprite animation (hit spark, pogo ring, dust) at a world position. */
interface Shot { set: SpriteSet<string> | null; x: number; y: number; t0: number; facing: number; pending: boolean }
/** A tumbling sprite piece (crate splinters, sign shards). */
interface Piece { set: SpriteSet<string> | null; frame: number; x: number; y: number; vx: number; vy: number; life: number }

const DEBRIS_CAP = 24;
const SPARK_CAP = 24;
const COIN_CAP = 8;
const BAT_CAP = 140;

interface Bit { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }

const mk = (n: number): Bit[] => Array.from({ length: n }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, color: '#fff', size: 1 }));

function spawn(pool: Bit[], x: number, y: number, vx: number, vy: number, life: number, color: string, size: number) {
  let b = pool[0];
  for (const p of pool) { if (p.life <= 0) { b = p; break; } if (p.life < b.life) b = p; }
  b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.life = b.max = life; b.color = color; b.size = size;
}

function step(pool: Bit[], dt: number, g: number) {
  for (const b of pool) {
    if (b.life <= 0) continue;
    b.life -= dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.vy += g * dt;
  }
}

function paint(c: Ctx, pool: Bit[], ox: number, oy: number, mono: boolean) {
  for (const b of pool) {
    if (b.life <= 0) continue;
    c.globalAlpha = Math.min(1, (b.life / b.max) * 1.8);
    c.fillStyle = mono ? toMono(b.color) : b.color;
    c.fillRect(Math.round(b.x - ox), Math.round(b.y - oy), b.size, b.size);
  }
}

export class ActionFx {
  readonly debris = mk(DEBRIS_CAP);
  readonly sparks = mk(SPARK_CAP);
  readonly coins = Array.from({ length: COIN_CAP }, () => ({ x: 0, y: 0, t0: -1, pending: false }));
  readonly bats = Array.from({ length: BAT_CAP }, () => ({ x: 0, y: 0, vx: 0, vy: 0, ph: 0 }));
  readonly anims: Shot[] = Array.from({ length: ANIM_CAP }, () => ({ set: null, x: 0, y: 0, t0: -1, facing: 1, pending: false }));
  readonly pieces: Piece[] = Array.from({ length: PIECE_CAP }, () => ({ set: null, frame: 0, x: 0, y: 0, vx: 0, vy: 0, life: 0 }));

  private play(set: SpriteSet<string>, x: number, y: number, facing = 1) {
    let a = this.anims[0];
    for (const q of this.anims) { if (q.t0 < 0 && !q.pending) { a = q; break; } if (q.t0 < a.t0) a = q; }
    a.set = set; a.x = x; a.y = y; a.facing = facing; a.pending = true; a.t0 = 0;
  }

  private shatter(set: SpriteSet<string>, x: number, y: number, n: number) {
    const r = this.rand;
    const frames = Object.values(set.anims)[0].frames.length;
    for (let i = 0; i < n; i++) {
      let p = this.pieces[0];
      for (const q of this.pieces) { if (q.life <= 0) { p = q; break; } if (q.life < p.life) p = q; }
      p.set = set; p.frame = i % frames; p.x = x + (r() - 0.5) * 10; p.y = y - 6 + (r() - 0.5) * 8;
      p.vx = (r() - 0.5) * 150; p.vy = -70 - r() * 90; p.life = 0.7 + r() * 0.3;
    }
  }
  /** Swing whip and hit flash start times (world seconds), and pending flags set by events. */
  whipAt = -9; flashAt = -9;
  private pending = { whip: false, flash: false };
  private rand = (() => { let s = 99; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  batsLive = 0;
  private batT = 0;
  /** Decoy dives waiting to be matched to a decoy (world art px), and when each decoy was last struck. */
  private dives = Array.from({ length: 4 }, () => ({ x: 0, y: 0, live: false }));
  private struck = new Float64Array(16).fill(-99);

  /** Game events (positions in tiles), forwarded by the view. */
  event(type: string, x: number, y: number, n: number) {
    const ax = x * 16, ay = y * 16, r = this.rand;
    if (type === 'swing') this.pending.whip = true;
    else if (type === 'hit') {
      this.pending.flash = true;
      this.play(FX.hitSpark as SpriteSet<string>, ax, ay);
      // knockback dust where the enemy was struck
      this.play(FX.dust as SpriteSet<string>, ax + (n < 0 ? -6 : 6), ay + 8, n < 0 ? -1 : 1);
      for (let i = 0; i < 6; i++) spawn(this.sparks, ax, ay, (r() - 0.5) * 140, (r() - 0.8) * 120, 0.18 + r() * 0.15, i % 2 ? '#fff6c8' : '#ffb347', 1);
    } else if (type === 'pogo') {
      this.play(FX.pogoRing as SpriteSet<string>, ax, ay);
    } else if (type === 'break') {
      // n: 1 a neon sign, otherwise a crate
      if (n === 1) this.shatter(BREAKABLES.signShards as SpriteSet<string>, ax, ay, 6);
      else this.shatter(BREAKABLES.crateDebris as SpriteSet<string>, ax, ay, 7);
      for (let i = 0; i < 4; i++) spawn(this.debris, ax, ay, (r() - 0.5) * 120, -40 - r() * 60, 0.5, n === 1 ? '#ff3d9a' : '#8f633f', 1);
    } else if (type === 'decoyDive') {
      const d = this.dives.find(q => !q.live) ?? this.dives[0];
      d.x = ax; d.y = ay; d.live = true;
    } else if (type === 'coinPull') {
      const c = this.coins.find(q => q.t0 < 0 && !q.pending) ?? this.coins[0];
      c.x = ax; c.y = ay; c.pending = true; c.t0 = 0;
    }
  }

  /** Seconds since the last swing (scarf whip), or -1 once it has played out. */
  whipAge(t: number): number {
    if (this.pending.whip) { this.whipAt = t; this.pending.whip = false; }
    const a = t - this.whipAt;
    return a >= 0 && a < 0.2 ? a : -1;
  }

  flashAge(t: number): number {
    if (this.pending.flash) { this.flashAt = t; this.pending.flash = false; }
    const a = t - this.flashAt;
    return a >= 0 && a < 0.08 ? a : -1;
  }

  update(dt: number) {
    step(this.debris, dt, 380);
    step(this.sparks, dt, 200);
    for (const p of this.pieces) {
      if (p.life <= 0) continue;
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt;
    }
  }

  draw(c: Ctx, ox: number, oy: number, t: number, mono: boolean) {
    for (const p of this.pieces) {
      if (p.life <= 0 || !p.set) continue;
      c.globalAlpha = Math.min(1, p.life * 2.5);
      const a = atlas(p.set, mono);
      drawFrame(c, a, Object.keys(a.rects)[0], p.frame, Math.round(p.x - ox), Math.round(p.y - oy), 1);
    }
    c.globalAlpha = 1;
    for (const q of this.anims) {
      if (q.pending) { q.t0 = t; q.pending = false; }
      if (q.t0 < 0 || !q.set) continue;
      const play = q.set.anims.play;
      const f = Math.floor((t - q.t0) * play.fps);
      if (f >= play.frames.length || f < 0) { q.t0 = -1; continue; }
      drawFrame(c, atlas(q.set, mono), 'play', f, Math.round(q.x - ox), Math.round(q.y - oy), q.facing);
    }
    paint(c, this.debris, ox, oy, mono);
    paint(c, this.sparks, ox, oy, mono);
    c.globalAlpha = 1;
  }

  /**
   * Decoys a drone dives at to show its dive (story 1-2): a pigeon (even ones)
   * pecking on the roof that scatters when struck, or a trash can (odd) that
   * tips over and loses its lid. Both are back a few seconds later.
   */
  drawDecoys(c: Ctx, list: readonly { x: number; y: number }[], ox: number, oy: number, bw: number, t: number, mono: boolean) {
    const r = this.rand;
    for (const d of this.dives) {
      if (!d.live) continue;
      d.live = false;
      let best = -1, bd = 1e9;
      for (let i = 0; i < list.length && i < 16; i++) {
        const dd = Math.abs(list[i].x * 16 + 8 - d.x) + Math.abs(list[i].y * 16 + 8 - d.y);
        if (dd < bd) { bd = dd; best = i; }
      }
      if (best < 0 || bd > 48) continue;
      this.struck[best] = t;
      const px = list[best].x * 16 + 8, py = list[best].y * 16 + 14;
      if (best % 2 === 0) for (let k = 0; k < 4; k++) spawn(this.debris, px, py - 3, -40 - r() * 60, -80 - r() * 50, 0.9, k % 2 ? '#8a8a9a' : '#c8c8d4', 2);
      else for (let k = 0; k < 3; k++) spawn(this.debris, px, py - 8, (r() - 0.3) * 120, -90 - r() * 60, 0.8, '#7d9bb6', 2);
    }
    const col = (s: string) => (mono ? toMono(s) : s);
    for (let i = 0; i < list.length && i < 16; i++) {
      const x = Math.round(list[i].x * 16) - ox, y = Math.round(list[i].y * 16 + 16) - oy;
      if (x < -16 || x > bw + 16) continue;
      const hit = t - this.struck[i] < 5;
      if (i % 2 === 0) {
        if (hit) continue; // flown off
        const peck = Math.floor(t * 3 + i) % 3 === 0 ? 1 : 0;
        c.fillStyle = col('#5a5a6a'); c.fillRect(x + 5, y - 4, 6, 3);
        c.fillStyle = col('#8a8a9a'); c.fillRect(x + 6, y - 5, 4, 1);
        c.fillStyle = col('#4a6a5a'); c.fillRect(x + 10, y - 6 + peck, 2, 2);
        c.fillStyle = col('#ffb347'); c.fillRect(x + 12, y - 5 + peck, 1, 1);
        c.fillStyle = col('#c87a5a'); c.fillRect(x + 7, y - 1, 1, 1); c.fillRect(x + 9, y - 1, 1, 1);
      } else if (!hit) {
        c.fillStyle = col('#2f445e'); c.fillRect(x + 4, y - 10, 8, 10);
        c.fillStyle = col('#4a6684'); c.fillRect(x + 4, y - 10, 1, 10); c.fillRect(x + 7, y - 9, 1, 8);
        c.fillStyle = col('#7d9bb6'); c.fillRect(x + 3, y - 12, 10, 2);
      } else {
        c.fillStyle = col('#2f445e'); c.fillRect(x + 2, y - 7, 10, 7);
        c.fillStyle = col('#4a6684'); c.fillRect(x + 2, y - 7, 10, 1);
        c.fillStyle = col('#1c2a40'); c.fillRect(x + 12, y - 6, 1, 5);
      }
    }
  }

  /** Coins pulled in by Taco Rush: a quick arc from where they were to her. */
  drawCoinArcs(c: Ctx, hx: number, hy: number, ox: number, oy: number, t: number, mono: boolean) {
    c.fillStyle = mono ? '#ffffff' : '#ffd23f';
    for (const q of this.coins) {
      if (q.pending) { q.t0 = t; q.pending = false; }
      if (q.t0 < 0) continue;
      const k = (t - q.t0) / 0.25;
      if (k > 1 || k < 0) { q.t0 = -1; continue; }
      const x = q.x + (hx - q.x) * k, y = q.y + (hy - q.y) * k - Math.sin(k * Math.PI) * 10;
      c.fillRect(Math.round(x - ox) - 1, Math.round(y - oy) - 1, 3, 3);
      c.globalAlpha = 0.5;
      c.fillRect(Math.round(q.x + (hx - q.x) * (k - 0.12) - ox), Math.round(q.y + (hy - q.y) * (k - 0.12) - oy), 1, 1);
      c.globalAlpha = 1;
    }
  }

  /**
   * The bat swarm: a dark river of bats sweeping across the view while
   * `active` (a 'bats' set piece is on screen). Pooled; each bat is two to
   * three pixels flapping.
   */
  drawBats(c: Ctx, active: boolean, bw: number, bh: number, dt: number, t: number, reduced: boolean, mono: boolean) {
    const target = active ? (reduced ? 50 : BAT_CAP) : 0;
    const r = this.rand;
    this.batT += dt;
    if (this.batsLive < target && this.batT > 0.01) {
      this.batT = 0;
      for (let k = 0; k < 6 && this.batsLive < target; k++) {
        const b = this.bats[this.batsLive++];
        b.x = -10 - r() * 40; b.y = bh * (0.15 + r() * 0.45);
        b.vx = 90 + r() * 60; b.vy = (r() - 0.6) * 20; b.ph = r() * 6;
      }
    }
    let live = 0;
    const bat = atlas(AUSTIN.bat, mono);
    for (let i = 0; i < this.batsLive; i++) {
      const b = this.bats[i];
      b.x += b.vx * dt * (reduced ? 0.6 : 1);
      b.y += (b.vy + Math.sin(t * 3 + b.ph) * 12) * dt;
      if (b.x > bw + 10) {
        if (!active) continue;
        b.x = -10 - r() * 30; b.y = bh * (0.15 + r() * 0.45);
      }
      live++;
      drawFrame(c, bat, 'flap', t * 12 + b.ph, Math.round(b.x), Math.round(b.y), 1);
    }
    if (!active && live === 0) this.batsLive = 0;
    return live;
  }
}

const SMEAR: Readonly<Record<string, { set: SpriteSet<string>; from: number }>> = {
  attack1: { set: FX.smear1 as SpriteSet<string>, from: 1 },
  attack2: { set: FX.smear2 as SpriteSet<string>, from: 1 },
  attack3: { set: FX.smear3 as SpriteSet<string>, from: 2 },
  airSlash: { set: FX.smearAir as SpriteSet<string>, from: 1 },
  downStrike: { set: FX.smearDown as SpriteSet<string>, from: 0 },
};

/**
 * The blade's swing smear, from the attack's swing frame on, drawn at her
 * anchor with her facing (the smear's anchor matches the hero's). Returns
 * true while one is showing.
 */
export function drawSmear(c: Ctx, state: string, animT: number, x: number, y: number, facing: number, mono: boolean): boolean {
  // The up swing: the down-strike's smear mirrored about her middle, so the
  // arc sweeps over her head.
  if (state === 'upSlash') {
    c.save();
    c.translate(0, 2 * (y - 12));
    c.scale(1, -1);
    const shown = drawSmear(c, 'downStrike', animT, x, y, facing, mono);
    c.restore();
    return shown;
  }
  const sm = SMEAR[state];
  if (!sm) return false;
  const heroAnim = (HERO.anims as Record<string, { fps: number }>)[state];
  const start = heroAnim ? sm.from / heroAnim.fps : 0;
  const play = sm.set.anims.play;
  const f = Math.floor((animT - start) * play.fps);
  if (f < 0 || f >= play.frames.length) return false;
  const a: Atlas = atlas(sm.set, mono);
  drawFrame(c, a, 'play', f, x, y, facing);
  return true;
}

/** The power ring timer: an arc of pixels around her chest, shrinking as time runs out. */
export function drawPowerRing(c: Ctx, x: number, y: number, left: number, color: string, t: number, reduced: boolean) {
  const n = 20;
  const lit = Math.ceil(n * Math.max(0, Math.min(1, left)));
  const warn = left < 0.25 && !reduced && Math.floor(t * 8) % 2 === 0;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    c.globalAlpha = i < lit ? (warn ? 0.4 : 0.9) : 0.15;
    c.fillStyle = color;
    c.fillRect(Math.round(x + Math.cos(a) * 13), Math.round(y + Math.sin(a) * 13), 1, 1);
  }
  c.globalAlpha = 1;
}

/** Bat Wings' cloak spread wide while she glides. */
export function drawGlideCloak(c: Ctx, x: number, y: number, facing: number, t: number, mono: boolean) {
  const flap = Math.floor(t * 6) % 2;
  c.fillStyle = mono ? '#3f3f46' : '#2a1b48';
  for (let i = 0; i < 9; i++) {
    const h = Math.max(1, 5 - Math.floor(i / 2)) - flap;
    c.fillRect(x - facing * (3 + i), y - 14 + Math.floor(i / 3), 1, Math.max(1, h));
    c.fillRect(x + facing * (3 + i) - (facing > 0 ? 0 : 0), y - 14 + Math.floor(i / 3), 1, Math.max(1, h - 1));
  }
  c.fillStyle = mono ? '#a1a1aa' : '#9d62ff';
  c.fillRect(x - facing * 11, y - 12, 1, 1);
  c.fillRect(x + facing * 11, y - 12, 1, 1);
}

/** Taco Rush's speed lines trailing behind her. */
export function drawSpeedLines(c: Ctx, x: number, y: number, facing: number, t: number, mono: boolean) {
  c.fillStyle = mono ? '#d4d4d8' : '#ffcf7a';
  for (let i = 0; i < 4; i++) {
    const len = 5 + Math.floor(hash2(Math.floor(t * 20), i) * 6);
    const ly = y - 4 - i * 5 - Math.floor(hash2(i, Math.floor(t * 20)) * 2);
    c.globalAlpha = 0.5 - i * 0.08;
    c.fillRect(facing > 0 ? x - 8 - len : x + 8, ly, len, 1);
  }
  c.globalAlpha = 1;
}
