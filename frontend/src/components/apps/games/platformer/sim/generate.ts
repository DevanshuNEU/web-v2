/**
 * Procedural levels from hand-made chunks. `generateLevel(theme, seed)` is a
 * pure function of its arguments: the same seed gives a byte-identical
 * LevelDef, so runs replay and the server can rebuild the level a score was
 * made on.
 *
 * The level is the fixed intro (run, jump, dash), then 6 to 8 chunks picked
 * along a difficulty curve rising from 1 to 5 (never the same chunk twice in
 * a row), with stair bridges wherever one roof height does not meet the
 * next, then the fixed finale with the goal beacon. The checkpoint stands at
 * the start of the middle chunk. Slots in the chunks (see
 * ./chunks/rooftops.ts) are filled by the seed: coin trails, the one Aura
 * Mode orb, the rare Sigma coin, a hidden bonus room, optional drones and a
 * rare elite drone. The world's modifier is picked here too, because two of
 * them (mirror, droneSwarm) change the layout.
 */

import { FINALE, INTRO, ROOFTOP_CHUNKS, type Chunk } from './chunks/rooftops';
import { MODIFIERS, pickModifier, type ModifierId } from './modifiers';
import { deriveSeed, mulberry32 } from './rand';
import type { LevelDef, WorldTheme } from './levels';

export interface Placed {
  id: string;
  kind: 'intro' | 'chunk' | 'bridge' | 'finale';
  /** First column in the unmirrored level, and width. */
  x: number; w: number;
  entry: number; exit: number;
  difficulty: number;
}

export interface Surprises { sigma: boolean; bonusRoom: boolean; elite: boolean }

export interface GeneratedLevel extends LevelDef {
  seed: number;
  modifier: ModifierId;
  /** Pieces left to right before any mirroring. */
  layout: Placed[];
  mirrored: boolean;
  surprises: Surprises;
}

export interface GenerateOptions {
  /** Force a modifier instead of the seeded pick. */
  modifier?: ModifierId;
}

/** Chances per run. */
export const CHANCE = { coinTrail: 0.6, sigma: 0.25, bonusRoom: 0.35, drone: 0.2, elite: 0.2 } as const;

const MIN_CHUNKS = 6;
const MAX_CHUNKS = 8;
/** Bridges climb at most this many rows per step. */
const STEP = 2;
const STEP_W = 3;

const NAMES = ['Doomscroll Heights', 'Rooftop Rizz', 'Sigma Skyline', 'No Cap Rooftops', 'Neon Delulu', 'Midnight Main Character'];

function pickChunk(r: () => number, target: number, prev: string | null): Chunk {
  let total = 0;
  const pool: { c: Chunk; wt: number }[] = [];
  for (const c of ROOFTOP_CHUNKS) {
    const gap = Math.abs(c.difficulty - target);
    if (gap > 1 || c.id === prev) continue;
    const wt = 1 / ((1 + gap) * (1 + gap));
    pool.push({ c, wt });
    total += wt;
  }
  let x = r() * total;
  for (const p of pool) {
    x -= p.wt;
    if (x < 0) return p.c;
  }
  return pool[pool.length - 1].c;
}

/** A stair from roof row `a` to roof row `b`: 3 columns per height, up at most 2 rows a step. */
function bridge(a: number, b: number): Chunk {
  const heights = [a];
  let h = a;
  while (h !== b) {
    h = b < h ? Math.max(b, h - STEP) : b;
    heights.push(h);
  }
  const rows: string[] = [];
  for (let y = 0; y < 14; y++) {
    let r = '';
    for (const top of heights) r += (y === top ? '=' : y > top ? '#' : '.').repeat(STEP_W);
    rows.push(r);
  }
  return { id: 'bridge', name: 'Bridge', difficulty: 1, entry: a, exit: b, requires: ['jump'], rows };
}

type Grid = string[][];

/** Every cell with this char, scanned column by column (a stable order for the seed). */
function cells(g: Grid, ch: string): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let x = 0; x < g[0].length; x++) for (let y = 0; y < g.length; y++) if (g[y][x] === ch) out.push({ x, y });
  return out;
}

function fillSlots(g: Grid, layout: Placed[], r: () => number, swarm: boolean): Surprises {
  // Coin trails: each horizontal run of * is on or off as one.
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[y].length; x++) {
      if (g[y][x] !== '*') continue;
      const on = r() < CHANCE.coinTrail;
      while (x < g[y].length && g[y][x] === '*') g[y][x++] = on ? 'o' : '.';
    }
  }
  // One Aura Mode orb.
  const orbs = cells(g, '?');
  const orb = orbs.length ? Math.floor(r() * orbs.length) : -1;
  orbs.forEach((c, i) => { g[c.y][c.x] = i === orb ? 'a' : '.'; });
  // The Sigma coin: a marked spot, or any coin if no chunk here has one.
  const sigma = r() < CHANCE.sigma;
  const spots = cells(g, '$');
  for (const c of spots) g[c.y][c.x] = '.';
  if (sigma) {
    const pool = spots.length ? spots : cells(g, 'o');
    if (pool.length) { const c = pool[Math.floor(r() * pool.length)]; g[c.y][c.x] = '$'; }
  }
  // At most one bonus room opens; the others stay solid and empty.
  const rooms = layout.filter(p => p.kind === 'chunk' && ROOM_CHUNKS.has(p.id));
  const open = r() < CHANCE.bonusRoom && rooms.length ? rooms[Math.floor(r() * rooms.length)] : null;
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[y].length; x++) {
      const ch = g[y][x];
      if (ch !== '%' && ch !== '&') continue;
      const inOpen = !!open && x >= open.x && x < open.x + open.w;
      g[y][x] = ch === '%' ? (inOpen ? '%' : '#') : inOpen ? 'o' : '.';
    }
  }
  // Optional drones: all of them in a swarm, a few otherwise.
  for (const c of cells(g, 'D')) g[c.y][c.x] = swarm || r() < CHANCE.drone ? 'd' : '.';
  // Now and then one drone is an elite.
  const elite = r() < CHANCE.elite;
  const drones = cells(g, 'd');
  if (elite && drones.length) { const c = drones[Math.floor(r() * drones.length)]; g[c.y][c.x] = 'e'; }
  return { sigma: sigma && cells(g, '$').length > 0, bonusRoom: !!open, elite: elite && drones.length > 0 };
}

const ROOM_CHUNKS = new Set(ROOFTOP_CHUNKS.filter(c => c.rows.some(r => r.includes('%'))).map(c => c.id));

export function generateLevel(theme: WorldTheme, seed: number, opts: GenerateOptions = {}): GeneratedLevel {
  if (theme !== 'rooftops') throw new Error(`no chunk library for ${theme} yet`);
  const r = mulberry32(deriveSeed(seed, 1));
  const modifier = opts.modifier ?? pickModifier(mulberry32(deriveSeed(seed, 2)));
  const mod = MODIFIERS[modifier];
  const n = MIN_CHUNKS + Math.floor(r() * (MAX_CHUNKS - MIN_CHUNKS + 1));

  const pieces: { c: Chunk; kind: Placed['kind'] }[] = [{ c: INTRO, kind: 'intro' }];
  let prev: string | null = null;
  const join = (c: Chunk, kind: Placed['kind']) => {
    const last = pieces[pieces.length - 1].c;
    if (last.exit !== c.entry) pieces.push({ c: bridge(last.exit, c.entry), kind: 'bridge' });
    pieces.push({ c, kind });
  };
  for (let i = 0; i < n; i++) {
    const target = 1 + (4 * i) / (n - 1);
    const c = pickChunk(r, target, prev);
    prev = c.id;
    join(c, 'chunk');
  }
  join(FINALE, 'finale');

  const layout: Placed[] = [];
  const g: Grid = Array.from({ length: 14 }, () => [] as string[]);
  let x = 0;
  for (const p of pieces) {
    const w = p.c.rows[0].length;
    layout.push({ id: p.c.id, kind: p.kind, x, w, entry: p.c.entry, exit: p.c.exit, difficulty: p.c.difficulty });
    for (let y = 0; y < 14; y++) for (const ch of p.c.rows[y]) g[y].push(ch);
    x += w;
  }

  // The checkpoint: on the entry roof of the middle chunk.
  const chunks = layout.filter(p => p.kind === 'chunk');
  const mid = chunks[Math.floor(chunks.length / 2)];
  g[mid.entry - 1][mid.x + 1] = 'K';

  const surprises = fillSlots(g, layout, r, mod.droneSwarm);
  let rows = g.map(row => row.join(''));
  if (mod.mirror) rows = rows.map(row => [...row].reverse().join(''));

  return {
    id: 1, label: 'World 1', name: NAMES[Math.floor(r() * NAMES.length)], theme,
    rows, seed, modifier, layout, mirrored: mod.mirror, surprises,
  };
}
