/**
 * Game feel: particles, floating hype words and screen shake. One Juice per
 * game, updated and drawn from the game loop. Plain data, no React state, so
 * nothing re-renders per frame.
 *
 * Under reduced motion, shake is off and particles are skipped; floating
 * words still appear (they carry the score feedback) but do not drift.
 */

import { hypeFont } from './theme';

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string }
export interface Floater { x: number; y: number; text: string; life: number; max: number; size: number; color: string }

export class Juice {
  particles: Particle[] = [];
  floaters: Floater[] = [];
  shakeTime = 0;
  shakeMag = 0;
  reduced: boolean;
  private rand: () => number;

  constructor(reduced = false, rand: () => number = Math.random) {
    this.reduced = reduced;
    this.rand = rand;
  }

  burst(x: number, y: number, color: string, count = 12, speed = 180, size = 4) {
    if (this.reduced) return;
    for (let i = 0; i < count; i++) {
      const a = this.rand() * Math.PI * 2;
      const v = speed * (0.4 + this.rand() * 0.6);
      const max = 0.35 + this.rand() * 0.35;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, life: max, max, size: size * (0.6 + this.rand() * 0.8), color });
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }

  float(x: number, y: number, text: string, color: string, size = 18, life = 0.9) {
    this.floaters.push({ x, y, text, life, max: life, size, color });
    if (this.floaters.length > 12) this.floaters.shift();
  }

  shake(magnitude = 6, time = 0.18) {
    if (this.reduced) return;
    this.shakeMag = Math.max(this.shakeMag, magnitude);
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  update(dt: number) {
    for (const p of this.particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt; p.vx *= 1 - 1.5 * dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const f of this.floaters) {
      f.life -= dt;
      if (!this.reduced) f.y -= 40 * dt;
    }
    this.floaters = this.floaters.filter(f => f.life > 0);
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) { this.shakeTime = 0; this.shakeMag = 0; }
    }
  }

  /** Current shake offset; apply with ctx.translate before drawing the world. */
  offset(): { x: number; y: number } {
    if (this.shakeTime <= 0) return { x: 0, y: 0 };
    const m = this.shakeMag * Math.min(1, this.shakeTime / 0.18);
    return { x: (this.rand() * 2 - 1) * m, y: (this.rand() * 2 - 1) * m };
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.floaters) {
      const k = f.life / f.max;
      // pop in fast, then hold, then fade
      const pop = this.reduced ? 1 : Math.min(1, (1 - k) * 8) * (1 + 0.15 * Math.max(0, 1 - (1 - k) * 6));
      ctx.globalAlpha = Math.min(1, k * 2.5);
      ctx.font = hypeFont(f.size * pop);
      ctx.lineWidth = Math.max(3, f.size * 0.22);
      ctx.strokeStyle = '#120b1f';
      ctx.lineJoin = 'round';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.particles = []; this.floaters = []; this.shakeTime = 0; this.shakeMag = 0;
  }
}
