/**
 * The light pass: a darkness buffer filled with the night's ambient colour,
 * light sprites added on top ('lighter'), and the result multiplied over the
 * scene. Light sprites are radial gradients baked once per colour into small
 * canvases, then stretched; nothing is blurred live.
 *
 * Every candidate (level lights, the scarf, pickups, neon) goes through one
 * LightList a frame, which keeps the 24 that matter: level lights first,
 * then by distance from the hero.
 */

import { makeCanvas, type Canvas } from './canvas';

export const MAX_LIGHTS = 24;

export interface LightSlot {
  x: number; y: number; r: number;
  color: string;
  /** 0..1 brightness multiplier (flicker). */
  k: number;
  /** Higher outranks nearer. */
  priority: number;
  /** 0..1 strength of the additive glow halo drawn over the lit scene. */
  halo: number;
  score: number;
}

export class LightList {
  readonly slots: LightSlot[] = Array.from({ length: MAX_LIGHTS }, () => ({ x: 0, y: 0, r: 0, color: '#fff', k: 1, priority: 0, halo: 0, score: 0 }));
  count = 0;
  private vx = 0; private vy = 0; private vw = 0; private vh = 0;
  private fx = 0; private fy = 0;

  /** Start a frame: the view rect and the focus (the hero), all in buffer pixels. */
  begin(x: number, y: number, w: number, h: number, focusX: number, focusY: number) {
    this.count = 0;
    this.vx = x; this.vy = y; this.vw = w; this.vh = h;
    this.fx = focusX; this.fy = focusY;
  }

  add(x: number, y: number, r: number, color: string, k: number, priority: number, halo = 0) {
    if (k <= 0.01 || r <= 0) return;
    if (x + r < this.vx || x - r > this.vx + this.vw || y + r < this.vy || y - r > this.vy + this.vh) return;
    const dx = x - this.fx, dy = y - this.fy;
    const score = Math.sqrt(dx * dx + dy * dy) - priority * 1e5;
    let s: LightSlot;
    if (this.count < MAX_LIGHTS) {
      s = this.slots[this.count++];
    } else {
      let worst = 0;
      for (let i = 1; i < MAX_LIGHTS; i++) if (this.slots[i].score > this.slots[worst].score) worst = i;
      s = this.slots[worst];
      if (s.score <= score) return;
    }
    s.x = x; s.y = y; s.r = r; s.color = color; s.k = k; s.priority = priority; s.halo = halo; s.score = score;
  }
}

/** Size of a baked light sprite, px. Stretched to the light's diameter. */
const SPRITE = 64;
const sprites = new Map<string, Canvas>();

/**
 * A soft round light of one colour: bright core, long falloff to clear.
 * Baked once per colour string.
 */
export function lightSprite(color: string): Canvas {
  const hit = sprites.get(color);
  if (hit) return hit;
  const { canvas, ctx } = makeCanvas(SPRITE, SPRITE);
  const c = SPRITE / 2;
  const g = ctx.createRadialGradient?.(c, c, 0, c, c, c);
  if (g) {
    g.addColorStop(0, color);
    g.addColorStop(0.25, withAlpha(color, 0.55));
    g.addColorStop(0.6, withAlpha(color, 0.16));
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = color;
  }
  ctx.fillRect(0, 0, SPRITE, SPRITE);
  sprites.set(color, canvas);
  return canvas;
}

/** A hex or rgb() colour with a new alpha, as rgba(). Used only at bake time. */
export function withAlpha(color: string, a: number): string {
  const s = color.trim();
  if (s[0] === '#') {
    const hex = s.length === 4 ? s.slice(1).split('').map(ch => ch + ch).join('') : s.slice(1, 7);
    const n = parseInt(hex, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return s;
  const p = m[1].split(',');
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
}
