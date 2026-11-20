/**
 * Turns level rows (see ./levels.ts for the legend) into a tile grid and
 * spawn lists, and builds the secret fourth level from a name.
 */

import { LEVELS, type LevelDef, type WorldTheme } from './levels';
import { cleanName, textCells, textWidth } from './font';

export const ROWS = 14;

/** Tile codes in the grid. */
export const TILE = {
  EMPTY: 0,
  GROUND: 1,
  BRICK: 2,
  AURA: 3,
  AURA_CROWN: 4,
  USED: 5,
  STONE: 6,
  SPIKE: 7,
  COIN: 8,
} as const;

export function isSolidTile(t: number): boolean {
  return t >= TILE.GROUND && t <= TILE.SPIKE;
}

export type EnemyKind = 'pebble' | 'frog';

export interface PlatformSpawn { x: number; y: number; w: number; axis: 'x' | 'y' }
export interface EnemySpawn { kind: EnemyKind; x: number; y: number }

export interface Level {
  id: number;
  label: string;
  name: string;
  theme: WorldTheme;
  cols: number;
  rows: number;
  /** Row-major tile codes, `cols * rows`. Copy it before mutating. */
  tiles: Uint8Array;
  /** Column of the start tile and the y of its floor (the hero's feet). */
  start: { x: number; y: number };
  checkpoint: { x: number; y: number } | null;
  /** Column, top tile row, and lowest pole row. */
  pole: { x: number; top: number; base: number };
  enemies: EnemySpawn[];
  platforms: PlatformSpawn[];
  /** Coins on the map plus coins inside aura blocks. */
  coinTotal: number;
  bricks: number;
  /** Gravity multiplier: 1, except the calm secret level. */
  gravity: number;
}

const CODES: Record<string, number> = {
  '#': TILE.GROUND, B: TILE.BRICK, S: TILE.AURA, C: TILE.AURA_CROWN, X: TILE.STONE, '^': TILE.SPIKE, o: TILE.COIN,
};

export function parseLevel(def: LevelDef, gravity = 1): Level {
  const rows = def.rows;
  if (rows.length !== ROWS) throw new Error(`${def.name}: expected ${ROWS} rows, got ${rows.length}`);
  const cols = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== cols) throw new Error(`${def.name}: row ${i} is ${r.length} wide, expected ${cols}`);
  });
  const tiles = new Uint8Array(cols * ROWS);
  const starts: { x: number; y: number }[] = [];
  const flags: { x: number; y: number }[] = [];
  let checkpoint: Level['checkpoint'] = null;
  const enemies: EnemySpawn[] = [];
  const platforms: PlatformSpawn[] = [];
  let coinTotal = 0;
  let bricks = 0;
  let crowns = 0;

  for (let y = 0; y < ROWS; y++) {
    const r = rows[y];
    for (let x = 0; x < cols; x++) {
      const ch = r[x];
      const code = CODES[ch];
      if (code !== undefined) {
        tiles[y * cols + x] = code;
        if (code === TILE.COIN || code === TILE.AURA) coinTotal++;
        if (code === TILE.BRICK) bricks++;
        if (code === TILE.AURA_CROWN) crowns++;
        continue;
      }
      switch (ch) {
        case '.': case '|': break;
        case 'P': starts.push({ x, y: y + 1 }); break;
        case 'F': flags.push({ x, y }); break;
        case 'K':
          if (checkpoint) throw new Error(`${def.name}: more than one checkpoint`);
          checkpoint = { x, y: y + 1 };
          break;
        case 'n': enemies.push({ kind: 'pebble', x, y }); break;
        case 'f': enemies.push({ kind: 'frog', x, y }); break;
        case '-': case '!': {
          if (r[x - 1] === ch) break; // part of the run already recorded
          let w = 1;
          while (r[x + w] === ch) w++;
          platforms.push({ x, y, w, axis: ch === '-' ? 'x' : 'y' });
          break;
        }
        default: throw new Error(`${def.name}: unknown tile "${ch}" at ${x},${y}`);
      }
    }
  }
  if (starts.length !== 1) throw new Error(`${def.name}: needs exactly one start, found ${starts.length}`);
  if (flags.length !== 1) throw new Error(`${def.name}: needs exactly one flag, found ${flags.length}`);
  if (crowns > 1) throw new Error(`${def.name}: at most one crown block`);
  const f = flags[0];
  let base = f.y;
  while (base + 1 < ROWS && rows[base + 1][f.x] === '|') base++;

  return {
    id: def.id, label: def.label, name: def.name, theme: def.theme,
    cols, rows: ROWS, tiles, start: starts[0], checkpoint,
    pole: { x: f.x, top: f.y, base },
    enemies, platforms, coinTotal, bricks, gravity,
  };
}

export function tileAt(tiles: Uint8Array, cols: number, x: number, y: number): number {
  if (x < 0 || x >= cols || y < 0 || y >= ROWS) return TILE.EMPTY;
  return tiles[y * cols + x];
}

// ─────────────────────────────────────────────────────────────────────────────
// The secret level
// ─────────────────────────────────────────────────────────────────────────────

export const SECRET_FALLBACK = { name: 'YOU', message: 'Made for you.' } as const;
/** Low gravity: a calm, floaty level where every coin is in reach. */
export const SECRET_GRAVITY = 0.55;
const NAME_TOP = 4;
const NAME_LEFT = 16;

export function secretName(raw: string | null | undefined): string {
  const n = cleanName(raw ?? '');
  return n || SECRET_FALLBACK.name;
}

/** Level rows for the secret level: a long calm meadow with the name in coins. */
export function secretLevelDef(rawName: string): LevelDef {
  const name = secretName(rawName);
  const nameW = textWidth(name);
  const poleX = NAME_LEFT + nameW + 12;
  const cols = Math.max(56, poleX + 14);
  const grid: string[][] = Array.from({ length: ROWS }, () => Array<string>(cols).fill('.'));
  for (let x = 0; x < cols; x++) { grid[12][x] = '#'; grid[13][x] = '#'; }
  grid[11][3] = 'P';
  grid[11][9] = 'K';
  for (const c of textCells(name, NAME_LEFT, NAME_TOP)) grid[c.y][c.x] = 'o';
  grid[2][poleX] = 'F';
  for (let y = 3; y <= 11; y++) grid[y][poleX] = '|';
  return { id: 4, label: 'Secret world', name: 'Starlight', theme: 'stars', rows: grid.map(r => r.join('')) };
}

export function secretLevel(rawName: string): Level {
  return parseLevel(secretLevelDef(rawName), SECRET_GRAVITY);
}

/** The three regular levels, parsed once. */
export const MAIN_LEVELS: readonly Level[] = LEVELS.map(d => parseLevel(d));
export const MAIN_LEVEL_COUNT = MAIN_LEVELS.length;
