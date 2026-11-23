/**
 * How hard a level is, as one number from its data alone (no play, no
 * randomness), so tests can hold the story to a rising curve: every chapter
 * harder than the one before, every level adding something.
 *
 * The weights were set from principles before any level was scored:
 *   - enemies, per 100 columns, weighted by how hard each is to get past
 *     (a walker 1, a hopper a little more, a flyer more, a fast flyer and a
 *     shooting flyer most);
 *   - hazard tiles (spikes), per 100 columns;
 *   - pit columns, per 100 columns: columns where a fall leaves the level
 *     (no floor in the bottom row; water is no floor);
 *   - the widest gap she must cross: the longest run of columns with no
 *     floor at any height, counted once by its width (a moving platform,
 *     a vehicle lane or a crane hook's swing counts as floor there);
 *   - timed sections, per 100 columns: anything she must wait for (a
 *     vehicle lane, a moving platform, a run of thin clouds, a gust zone, a
 *     wave, a crane hook);
 *   - a boss, by the hit points he takes (absolute, not per 100 columns):
 *     each one is an opening she must wait for and then win under fire,
 *     weighed a little over a walker on a 100 column stretch;
 *   - minus a little for each checkpoint (absolute, never below zero).
 * The raw sum is divided by NORM, the raw mean of chapter 1, so chapter 1
 * averages about 1.
 *
 * Measured 2026-11-21 (normalised), after chapters 1 to 3 were lifted so
 * every chapter is harder than the last: 1-1 0.00, 1-2 1.55, 1-3 1.64
 * (mean 1.06); 2-1 0.68, 2-2 1.75 (mean 1.22); 3-1 1.05, 3-2 1.07, 3-3 2.05
 * (mean 1.39); 4-1 1.31, 4-2 1.55, 4-3 1.88, 4-4 2.16 (mean 1.73); the
 * gorilla (4-boss, added with the boss weight) 2.51.
 */

import { ROWS, TILE, isOneWayTile, isSolidTile, type Level } from './level';
import type { EnemyKind } from './enemies';
import { PLATFORM_AMP } from './world';
import { HOOK_W } from './hooks';
import { BOSS } from './boss';

export const DIFFICULTY = {
  /** Per enemy, per 100 columns. */
  enemy: { pebble: 1, doomCrawler: 1, frog: 1.2, pigeon: 1.2, adDrone: 1.6, gull: 2, eliteDrone: 2.2 } as Readonly<Record<EnemyKind, number>>,
  /** Per hazard tile, per 100 columns. */
  hazard: 0.25,
  /** Per pit column, per 100 columns. */
  pit: 0.06,
  /** Per tile of the widest gap (absolute). */
  gap: 0.2,
  /** Per timed section, per 100 columns. */
  timed: 0.8,
  /** Taken off per checkpoint (absolute). */
  checkpoint: 0.25,
  /** Per hit point of a boss (absolute). */
  boss: 1.2,
} as const;

/** The raw mean of chapter 1's three levels: dividing by it puts chapter 1 at about 1. */
export const NORM = 5.711;

/** Floor at this tile: a solid or one-way top she could stand on. */
function isFloorTile(t: number): boolean {
  return isSolidTile(t) || isOneWayTile(t);
}

/** The unnormalised score. */
export function rawDifficulty(level: Level): number {
  const { cols, tiles } = level;
  const per100 = 100 / cols;
  const at = (x: number, y: number) => tiles[y * cols + x];

  let enemies = 0;
  for (const e of level.enemies) enemies += DIFFICULTY.enemy[e.kind];

  let hazards = 0, pits = 0;
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < ROWS; y++) if (at(x, y) === TILE.SPIKE) hazards++;
    if (!isFloorTile(at(x, ROWS - 1))) pits++;
  }

  // Floor by column: a tile top with room above it, or a moving floor's reach.
  const floor = new Uint8Array(cols);
  for (let x = 0; x < cols; x++) {
    for (let y = 1; y < ROWS; y++) {
      if (isFloorTile(at(x, y)) && !isSolidTile(at(x, y - 1))) { floor[x] = 1; break; }
    }
  }
  const mark = (x0: number, x1: number) => { for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(cols - 1, Math.ceil(x1)); x++) floor[x] = 1; };
  for (const p of level.platforms) {
    if (p.axis === 'x') mark(p.x - PLATFORM_AMP, p.x + p.w - 1 + PLATFORM_AMP);
    else mark(p.x, p.x + p.w - 1);
  }
  for (const v of level.vehicles) mark(v.x0, v.x1);
  for (const hk of level.hooks) {
    const reach = hk.len * Math.sin(Math.abs(hk.amp));
    mark(hk.x + 0.5 - reach - HOOK_W / 2, hk.x + 0.5 + reach + HOOK_W / 2);
  }
  const lo = Math.min(level.start.x, level.goal.x), hi = Math.max(level.start.x, level.goal.x);
  let gap = 0;
  for (let x = lo, run = 0; x <= hi; x++) {
    run = floor[x] ? 0 : run + 1;
    if (run > gap) gap = run;
  }

  const lanes = new Set(level.vehicles.map(v => `${v.row},${v.x0},${v.x1}`));
  let puffRuns = 0;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < cols; x++) if (at(x, y) === TILE.PUFF && (x === 0 || at(x - 1, y) !== TILE.PUFF)) puffRuns++;
  const timed = lanes.size + level.platforms.length + puffRuns + level.gusts.length + level.waves.length + level.hooks.length;

  const sum = (enemies * 1 + hazards * DIFFICULTY.hazard + pits * DIFFICULTY.pit + timed * DIFFICULTY.timed) * per100
    + gap * DIFFICULTY.gap + (level.boss ? BOSS.maxHp * DIFFICULTY.boss : 0) - level.checkpoints.length * DIFFICULTY.checkpoint;
  return Math.max(0, sum);
}

/** How hard a level is; chapter 1 averages about 1. */
export function difficultyOf(level: Level): number {
  return rawDifficulty(level) / NORM;
}
