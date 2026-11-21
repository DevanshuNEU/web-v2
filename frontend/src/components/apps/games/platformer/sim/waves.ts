/**
 * Waves on the beach: each rolls up a stretch of sand on a rhythm and pushes
 * her back while it covers her. One cycle every `period` seconds, from the
 * world clock (replays see the same sea):
 *   calm   the front rests at the sea edge;
 *   warn   WAVE.warn seconds: the water draws back first (the telegraph);
 *   rise   WAVE.rise seconds: the front rolls from the sea edge to the land edge;
 *   hold   WAVE.hold seconds: it covers the whole stretch;
 *   fall   WAVE.fall seconds: it slides back to the sea edge.
 * While it rises or holds, a hero whose box overlaps the covered sand (from
 * the front to the sea edge) with her feet within WAVE.height of the sand
 * line is pushed WAVE.push tiles per second the way the wave rolls. It never
 * hurts. Falling back it covers but no longer pushes.
 *
 * `dir` is the way the wave rolls: -1 rolls left (the sea edge is past x1,
 * the land edge at x0), 1 rolls right (sea edge at x0, land edge past x1).
 */

export interface WaveDef {
  /** First and last column of the sand it runs over. */
  x0: number; x1: number;
  /** The sand line: the tile row her feet stand on (the top of the sand). */
  row: number;
  dir: 1 | -1;
  /** Seconds per cycle; at least the sum of WAVE's phases. */
  period: number;
  /** Seconds the timetable is shifted (0 when unset). */
  offset?: number;
}

/**
 * A wave now: front is the column the water reaches, `warn` while it draws
 * back, `on` while it covers any sand, `pushing` while it rises or holds.
 */
export interface Wave { x0: number; x1: number; row: number; dir: 1 | -1; front: number; on: boolean; warn: boolean; pushing: boolean }

export const WAVE = { warn: 0.8, rise: 1.2, hold: 0.8, fall: 1.0, push: 5, height: 1.5 } as const;
const BUSY = WAVE.warn + WAVE.rise + WAVE.hold + WAVE.fall;

const seaEdge = (d: { x0: number; x1: number; dir: 1 | -1 }) => (d.dir < 0 ? d.x1 + 1 : d.x0);
const landEdge = (d: { x0: number; x1: number; dir: 1 | -1 }) => (d.dir < 0 ? d.x0 : d.x1 + 1);

export function createWave(d: WaveDef): Wave {
  return { x0: d.x0, x1: d.x1, row: d.row, dir: d.dir, front: seaEdge(d), on: false, warn: false, pushing: false };
}

/** The front and flags at time t. */
export function placeWave(wv: Wave, d: WaveDef, t: number) {
  const s = seaEdge(d), l = landEdge(d);
  const u = t - (d.offset ?? 0);
  let p = u < 0 ? -1 : (u % d.period) - (d.period - BUSY);
  wv.front = s; wv.on = false; wv.warn = false; wv.pushing = false;
  if (p < 0) return;
  if (p < WAVE.warn) { wv.warn = true; return; }
  p -= WAVE.warn;
  wv.on = true;
  wv.pushing = true;
  if (p < WAVE.rise) { wv.front = s + (l - s) * (p / WAVE.rise); return; }
  p -= WAVE.rise;
  if (p < WAVE.hold) { wv.front = l; return; }
  p -= WAVE.hold;
  wv.pushing = false;
  wv.front = l + (s - l) * (p / WAVE.fall);
}

/** Push on a body (box x0 to x1, feet at `feet`): tiles per second, signed, 0 when it is not covered. */
export function wavePush(wv: Wave, x0: number, x1: number, feet: number): number {
  if (!wv.pushing || feet < wv.row - WAVE.height) return 0;
  const s = seaEdge(wv);
  const lo = Math.min(wv.front, s), hi = Math.max(wv.front, s);
  if (x1 <= lo || x0 >= hi) return 0;
  return wv.dir * WAVE.push;
}
