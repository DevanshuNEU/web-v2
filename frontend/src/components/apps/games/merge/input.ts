/**
 * Input pacing for Brainrot Evolution, pure so it can be tested.
 *
 * Pacer: while tiles are sliding, a new move is not lost. It waits in a
 * one-slot queue (the latest move wins) and fires the moment the slide ends.
 *
 * Gesture: one move per finger. The move fires as soon as the finger has
 * travelled SWIPE_PX, the rest of that drag is ignored until it lifts. A flick
 * so fast that no move event crossed the threshold still fires on lift.
 */

import type { Dir } from './logic';

export const SWIPE_PX = 24;

export interface Pacer {
  /** Seconds of slide animation left. */
  busy: number;
  pending: Dir | null;
}

export function createPacer(): Pacer {
  return { busy: 0, pending: null };
}

/** A move arrived. `now` is the move to apply right away, if any. */
export function pushMove(p: Pacer, dir: Dir): { pacer: Pacer; now: Dir | null } {
  if (p.busy <= 0) return { pacer: { busy: 0, pending: null }, now: dir };
  return { pacer: { busy: p.busy, pending: dir }, now: null };
}

/** A move was applied: block for `duration` seconds of slide animation. */
export function startSlide(p: Pacer, duration: number): Pacer {
  return { busy: Math.max(0, duration), pending: p.pending };
}

/** Advance time. When the slide ends, the queued move (if any) comes out as `now`. */
export function advancePacer(p: Pacer, dt: number): { pacer: Pacer; now: Dir | null } {
  if (p.busy <= 0 && !p.pending) return { pacer: p, now: null };
  const busy = Math.max(0, p.busy - dt);
  if (busy > 0) return { pacer: { busy, pending: p.pending }, now: null };
  return { pacer: { busy: 0, pending: null }, now: p.pending };
}

/** Direction of a drag of (dx, dy), or null while it is shorter than `threshold`. */
export function swipeDir(dx: number, dy: number, threshold = SWIPE_PX): Dir | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < threshold) return null;
  if (ax > ay) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

export interface Gesture { id: number; x: number; y: number; fired: boolean }

/** Finger down. A second finger while one is down is ignored. */
export function gestureStart(g: Gesture | null, id: number, x: number, y: number): Gesture {
  return g ?? { id, x, y, fired: false };
}

/** Finger moved. Returns the move to fire, at most once per gesture. */
export function gestureMove(g: Gesture | null, id: number, x: number, y: number): { gesture: Gesture | null; fire: Dir | null } {
  if (!g || g.id !== id || g.fired) return { gesture: g, fire: null };
  const fire = swipeDir(x - g.x, y - g.y);
  return { gesture: fire ? { ...g, fired: true } : g, fire };
}

/** Finger lifted. Fires a flick that never crossed the threshold mid-drag. */
export function gestureEnd(g: Gesture | null, id: number, x: number, y: number): { gesture: Gesture | null; fire: Dir | null } {
  if (!g || g.id !== id) return { gesture: g, fire: null };
  const fire = g.fired ? null : swipeDir(x - g.x, y - g.y);
  return { gesture: null, fire };
}
