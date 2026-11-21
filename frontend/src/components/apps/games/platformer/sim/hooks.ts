/**
 * Crane hooks at the harbor: a hook block hanging on a rope from a boom tip,
 * swinging as a pendulum on a fixed timetable (the angle is amp times a sine
 * of the world clock), so replays see the same swing. The block's top is a
 * one-way floor that carries whatever stands on it.
 *
 * Units: tiles. The pivot is the bottom centre of the boom tile the level
 * names: (x + 0.5, y + 1). The rope runs `len` tiles from the pivot to the
 * top centre of the block, at `angle` radians from straight down (positive
 * swings right). The block is HOOK_W wide and HOOK_H tall.
 */

import type { Ride } from './world';

/** A hook as the level writes it. */
export interface HookDef {
  /** The boom tile the rope hangs from. */
  x: number; y: number;
  /** Rope length, tiles. */
  len: number;
  /** Widest swing each way, radians. */
  amp: number;
  /** Seconds per full swing (out, back, out the other way, back). */
  period: number;
  /** Seconds the swing is shifted (0 when unset). */
  offset?: number;
}

/**
 * A hook now. x, y the pivot; angle from straight down; px, py the top
 * centre of the block (the rope end); w its width. `deck` is the block's top
 * as a moving floor (top left now and a step ago) for riding.
 */
export interface Hook { x: number; y: number; angle: number; len: number; px: number; py: number; w: number; deck: Ride }

export const HOOK_W = 2;
export const HOOK_H = 0.5;

export function createHook(d: HookDef): Hook {
  const hk: Hook = { x: d.x + 0.5, y: d.y + 1, angle: 0, len: d.len, px: 0, py: 0, w: HOOK_W, deck: { x: 0, y: 0, px: 0, py: 0 } };
  placeHook(hk, d, 0);
  hk.deck.px = hk.deck.x; hk.deck.py = hk.deck.y;
  return hk;
}

/** Swing a hook to time t; the deck keeps where it was a step ago. */
export function placeHook(hk: Hook, d: HookDef, t: number) {
  hk.angle = d.amp * Math.sin(((t + (d.offset ?? 0)) / d.period) * Math.PI * 2);
  hk.px = hk.x + hk.len * Math.sin(hk.angle);
  hk.py = hk.y + hk.len * Math.cos(hk.angle);
  hk.deck.px = hk.deck.x; hk.deck.py = hk.deck.y;
  hk.deck.x = hk.px - hk.w / 2;
  hk.deck.y = hk.py;
}
