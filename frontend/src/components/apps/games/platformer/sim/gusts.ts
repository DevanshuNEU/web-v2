/**
 * Harbor wind: gust zones over column ranges. Each zone keeps its own
 * timetable from the world clock: calm, then a warning GUST_WARN seconds
 * long (the renderer shows streaks), then the wind blows for `blow` seconds,
 * once every `period` seconds. While it blows, a hero whose centre is over
 * its columns drifts `strength` tiles per second its way in the air, half
 * that on the ground, never in a dash. Deterministic: replays see the same
 * wind.
 */

/** A zone as the level writes it (tile units, seconds). */
export interface GustDef {
  /** First and last column it covers. */
  x0: number; x1: number;
  /** 1 blows right, -1 left. */
  dir: 1 | -1;
  /** Tiles per second of drift in the air. */
  strength: number;
  /** Seconds from one blow's start to the next. */
  period: number;
  /** Seconds each blow lasts. */
  blow: number;
  /** Seconds the whole timetable is shifted (0 when unset). */
  offset?: number;
}

/** A zone now: `warn` in the GUST_WARN seconds before a blow, `on` while it blows. */
export interface Gust { x0: number; x1: number; dir: 1 | -1; strength: number; warn: boolean; on: boolean }

/** Seconds of warning before each blow. */
export const GUST_WARN = 0.6;

export function createGust(d: GustDef): Gust {
  return { x0: d.x0, x1: d.x1, dir: d.dir, strength: d.strength, warn: false, on: false };
}

/** Set a zone's flags for time t. Each period is calm, then the warning, then the blow. */
export function placeGust(g: Gust, d: GustDef, t: number) {
  const u = t - (d.offset ?? 0);
  if (u < 0) { g.warn = false; g.on = false; return; }
  const p = u % d.period;
  g.on = p >= d.period - d.blow;
  g.warn = !g.on && p >= d.period - d.blow - GUST_WARN;
}

/** Drift for a body whose centre is at column cx: tiles per second, signed (0 outside or while calm). */
export function gustPush(g: Gust, cx: number, onGround: boolean): number {
  if (!g.on || cx < g.x0 || cx >= g.x1 + 1) return 0;
  return g.dir * g.strength * (onGround ? 0.5 : 1);
}
