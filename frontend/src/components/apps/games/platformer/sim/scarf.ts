/**
 * The hero's scarf: a verlet rope of 10 points from his neck, stepped every
 * sim tick. Pure and allocation free per step. Each step: verlet motion
 * (damping, gravity, a pull behind him that grows with speed, a flutter
 * while running), then distance passes that keep every segment at its
 * length, then a push out of his torso to its back or top, so the scarf
 * swings over him on a turn and never passes through him.
 */

import { PHYS } from './physics';

export const SCARF_POINTS = 10;
/** Segment length, tiles. */
export const SCARF_SEG = 0.18;

export interface ScarfPoint { x: number; y: number; px: number; py: number }
interface Box { x: number; y: number; w: number; h: number }
interface HeroLike extends Box { facing: 1 | -1 }

const GRAVITY = 9;
/** Pull behind him at rest, and extra at full run speed. */
const TRAIL_IDLE = 2;
const TRAIL_RUN = 7;
const FLUTTER = 5;
/** Velocity kept per 1/120 s. */
const DAMP = 0.96;
const PASSES = 8;

/** Half the torso's width, tiles. The neck sits on its back edge. */
const TORSO_HALF = 0.22;

/** Where the scarf ties on: the back of the neck, a little below the top. */
export function neckOf(h: HeroLike, out: { x: number; y: number } = { x: 0, y: 0 }): { x: number; y: number } {
  out.x = h.x + h.w / 2 - h.facing * TORSO_HALF; out.y = h.y + 0.36;
  return out;
}

/** The body the scarf may not enter: the torso below the neck. */
export function torsoOf(h: Box, out: Box = { x: 0, y: 0, w: 0, h: 0 }): Box {
  out.x = h.x + h.w / 2 - TORSO_HALF; out.y = h.y + 0.5; out.w = TORSO_HALF * 2; out.h = h.h - 0.5;
  return out;
}

export function createScarf(neck: { x: number; y: number }, facing: 1 | -1 = 1): ScarfPoint[] {
  const s: ScarfPoint[] = [];
  for (let i = 0; i < SCARF_POINTS; i++) {
    const x = neck.x - facing * i * SCARF_SEG * 0.7, y = neck.y + i * SCARF_SEG * 0.7;
    s.push({ x, y, px: x, py: y });
  }
  return s;
}

/** Put the whole scarf back at rest behind a neck (respawn, level start). */
export function resetScarf(s: ScarfPoint[], neck: { x: number; y: number }, facing: 1 | -1) {
  for (let i = 0; i < s.length; i++) {
    const x = neck.x - facing * i * SCARF_SEG * 0.7, y = neck.y + i * SCARF_SEG * 0.7;
    s[i].x = s[i].px = x; s[i].y = s[i].py = y;
  }
}

export function scarfLength(s: readonly ScarfPoint[]): number {
  let L = 0;
  for (let i = 1; i < s.length; i++) L += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
  return L;
}

/** One tick. `vx`, `vy` are the hero's velocity (tiles per second). */
export function stepScarf(s: ScarfPoint[], neck: { x: number; y: number }, torso: Box, facing: 1 | -1, vx: number, vy: number, dt: number) {
  const speed = Math.min(1, Math.hypot(vx, vy) / PHYS.runMax);
  const damp = Math.pow(DAMP, dt * 120);
  const ax = -facing * (TRAIL_IDLE + TRAIL_RUN * speed);
  const dt2 = dt * dt;
  s[0].px = s[0].x; s[0].py = s[0].y;
  s[0].x = neck.x; s[0].y = neck.y;
  for (let i = 1; i < s.length; i++) {
    const p = s[i];
    const mx = (p.x - p.px) * damp, my = (p.y - p.py) * damp;
    p.px = p.x; p.py = p.y;
    // A flutter that grows down the scarf, only while he moves.
    const flutter = speed * FLUTTER * Math.sin(neck.x * 2.3 + i * 0.9) * (i / s.length);
    p.x += mx + ax * dt2;
    p.y += my + (GRAVITY + flutter) * dt2;
  }
  for (let k = 0; k < PASSES; k++) {
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1], b = s[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1e-9;
      const f = (d - SCARF_SEG) / d;
      // The neck is pinned: its segment moves only the free end.
      if (i === 1) { b.x -= dx * f; b.y -= dy * f; continue; }
      a.x += dx * f * 0.5; a.y += dy * f * 0.5;
      b.x -= dx * f * 0.5; b.y -= dy * f * 0.5;
    }
    for (let i = 1; i < s.length; i++) pushOut(s[i], torso, facing);
  }
  // A fast dash can outrun the passes: clamp any stretched segment, then
  // keep clear of the torso once more.
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1], b = s[i];
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d > SCARF_SEG) { b.x = a.x + (dx / d) * SCARF_SEG; b.y = a.y + (dy / d) * SCARF_SEG; }
    pushOut(b, torso, facing);
  }
}

/** Out of the torso through its back or its top, whichever is nearer. */
function pushOut(p: ScarfPoint, b: Box, facing: 1 | -1) {
  if (p.x <= b.x || p.x >= b.x + b.w || p.y <= b.y || p.y >= b.y + b.h) return;
  const back = facing > 0 ? p.x - b.x : b.x + b.w - p.x;
  const top = p.y - b.y;
  if (back <= top) p.x = facing > 0 ? b.x : b.x + b.w;
  else p.y = b.y;
}
