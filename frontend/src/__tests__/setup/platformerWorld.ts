/**
 * Shared helpers for the Main Character sim tests: hand-made levels and
 * stepping the world with input frames, the way the game does.
 */

import { createWorld, drainEvents, enterLevel, stepWorld, type EventType, type World } from '@/components/apps/games/platformer/sim/world';
import { ROWS, parseLevel, type Level } from '@/components/apps/games/platformer/sim/level';
import type { LevelDef, WorldTheme } from '@/components/apps/games/platformer/sim/levels';
import { emptyFrame, type InputFrame } from '@/components/apps/games/platformer/input/frame';

export const DT = 1 / 120;

/** A hand-made level: bottom-aligned rows, padded to 14 rows, a pole added at the right unless it has a goal. */
export function custom(rows: string[], theme: WorldTheme = 'grass', extra: Partial<LevelDef> = {}): Level {
  const w = rows[0].length;
  const full = [...Array(ROWS - rows.length).fill('.'.repeat(w)), ...rows];
  if (!full.some(r => r.includes('F') || r.includes('G'))) {
    const x = w - 2;
    for (let y = 2; y <= 11; y++) full[y] = full[y].slice(0, x) + (y === 2 ? 'F' : '|') + full[y].slice(x + 1);
  }
  return parseLevel({ id: 1, label: 'Test', name: 'Test', theme, ...extra, rows: full });
}

export function worldOn(rows: string[], index = 0, theme: WorldTheme = 'grass'): World {
  const w = createWorld({ rand: () => 0.5 });
  enterLevel(w, index, custom(rows, theme));
  drainEvents(w);
  return w;
}

/**
 * Step with one input frame held for `seconds`. Edges in it (jumpPressed and
 * friends) are consumed by the first step, the way a real press is.
 */
export function run(w: World, seconds: number, input: Partial<InputFrame> = {}, onStep?: (w: World) => void) {
  const f: InputFrame = { ...emptyFrame(), ...input };
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) { stepWorld(w, f, DT); onStep?.(w); }
}

/** Step until `done` is true (or `max` seconds pass). Returns whether it happened. */
export function runUntil(w: World, done: (w: World) => boolean, input: Partial<InputFrame> = {}, max = 10): boolean {
  const f: InputFrame = { ...emptyFrame(), ...input };
  for (let i = 0; i < max / DT; i++) { stepWorld(w, f, DT); if (done(w)) return true; }
  return false;
}

/** One step with a fresh frame (so its edges fire). */
export function press(w: World, input: Partial<InputFrame>) {
  stepWorld(w, { ...emptyFrame(), ...input }, DT);
}

export function eventsOf(w: World): EventType[] {
  return drainEvents(w).map(e => e.type);
}

export const G40 = '#'.repeat(40);
export const FLAT = ['.P......................................', G40, G40];
