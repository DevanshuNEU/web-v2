/**
 * Turns level rows (see ./levels.ts for the legend) into a tile grid and
 * spawn lists, and builds the secret fourth level from a name.
 */

import { LEVELS, type LevelDef, type SetPiece, type SkyId, type WorldTheme } from './levels';
import { cleanName, textCells, textWidth } from './font';
import { generateLevel } from './generate';
import { DEFAULT_SEED, deriveSeed } from './rand';
import type { ModifierId } from './modifiers';

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
  /** Land on it from above; pass through from below and from the side. */
  ONEWAY: 9,
  /** The golden Sigma coin, worth 500. */
  SIGMA: 10,
  /** Cracked wall: solid until a dash smashes it. */
  CRACK: 11,
  /** Crate: solid until the blade breaks it (it drops coins). */
  CRATE: 12,
  /** Moving walkway carrying right (solid like ground). */
  WALK_R: 13,
  /** Moving walkway carrying left (solid like ground). */
  WALK_L: 14,
  /** Thin cloud: one-way; puffs away a moment after she lands on it, then comes back. */
  PUFF: 15,
  /** Shop awning: one-way; landing on it bounces her up. */
  AWNING: 16,
  /** Water: not solid; touching it is a fall. */
  WATER: 17,
} as const;

export function isSolidTile(t: number): boolean {
  return (t >= TILE.GROUND && t <= TILE.SPIKE) || t === TILE.CRACK || t === TILE.CRATE || t === TILE.WALK_R || t === TILE.WALK_L;
}

/** Tiles that only stop a body falling onto them from above. */
export function isOneWayTile(t: number): boolean {
  return t === TILE.ONEWAY || t === TILE.PUFF || t === TILE.AWNING;
}

import type { EnemyKind } from './enemies';
import type { VehicleDef } from './vehicles';
import type { GustDef } from './gusts';
import type { HookDef } from './hooks';
import type { WaveDef } from './waves';
import type { Ability } from './hero';
import { POWER_CHARS, type PowerKind } from './powers';

export type { EnemyKind };

/** A power pickup at tile (x, y), top left. */
export interface PickupSpawn { kind: PowerKind; x: number; y: number }

/** A shrine at tile (x, y), top left, and the ability it unlocks. */
export interface Shrine { x: number; y: number; ability: Ability }

export interface Goal { x: number; top: number; base: number; kind: 'flag' | 'beacon' }
export type DecorKind = 'waterTower' | 'antenna' | 'acUnit' | 'neonSign' | 'chimney'
  | 'departureBoard' | 'plant' | 'seats' | 'kiosk' | 'cloudTower' | 'wingLight'
  | 'tree' | 'lampPost' | 'bench' | 'bikeRack' | 'ladder' | 'studyLamp' | 'studyTable' | 'cart' | 'gantry' | 'stationLamp'
  | 'gasLamp' | 'treeInPlanter' | 'stoop' | 'mailbox' | 'bridgeLamp' | 'boatDock' | 'lifebuoy'
  | 'bollard' | 'craneLeg' | 'containerStack' | 'fishCrates' | 'boulevardLamp' | 'lifeguardChair' | 'sandCastle' | 'umbrella';
export interface Decor { kind: DecorKind; x: number; y: number }
export interface Light { x: number; y: number; r: number; color: string; flicker: number }

type SceneryChar = 'T' | 'N' | 'U' | 'H';
const ROOFTOP_DECOR: Readonly<Record<SceneryChar, DecorKind>> = { T: 'waterTower', N: 'antenna', U: 'acUnit', H: 'chimney' };
/**
 * Scenery chars by theme: each stands on the floor below it, never solid. A
 * char a theme leaves out is an error in that theme's levels.
 */
export const DECOR_BY_THEME: Readonly<Record<WorldTheme, Readonly<Partial<Record<SceneryChar, DecorKind>>>>> = {
  austin: ROOFTOP_DECOR, rooftops: ROOFTOP_DECOR, grass: ROOFTOP_DECOR, cave: ROOFTOP_DECOR, sky: ROOFTOP_DECOR, stars: ROOFTOP_DECOR,
  airport: { T: 'departureBoard', N: 'plant', U: 'seats', H: 'kiosk' },
  clouds: { T: 'cloudTower', N: 'wingLight' },
  campus: { T: 'tree', N: 'lampPost', U: 'bench', H: 'bikeRack' },
  library: { T: 'ladder', N: 'studyLamp', U: 'studyTable', H: 'cart' },
  tracks: { T: 'gantry', N: 'stationLamp', U: 'bench' },
  newbury: { T: 'gasLamp', N: 'treeInPlanter', U: 'stoop', H: 'mailbox' },
  river: { T: 'bridgeLamp', N: 'bench', U: 'boatDock', H: 'lifebuoy' },
  harbor: { T: 'bollard', N: 'craneLeg', U: 'containerStack', H: 'fishCrates' },
  beach: { T: 'boulevardLamp', N: 'lifeguardChair', U: 'sandCastle', H: 'umbrella' },
};

type SignLight = { color: string; flicker: number; r: number };
/** Neon magenta, neon cyan, sodium: colour and how much each flickers. */
const NEON: readonly SignLight[] = [
  { color: '#ff3d9a', flicker: 0.35, r: 4.5 },
  { color: '#3df2ff', flicker: 0.2, r: 4.5 },
  { color: '#ffb347', flicker: 0.06, r: 5 },
];
/**
 * The light of a sign (L) by theme: neon on the roofs, fluorescent and amber
 * gate signs in the terminal, moonlight in the clouds, warm lamps on the
 * campus, green and warm study lamps in the library, amber and cold at the
 * tracks; gas lamps and shop windows on Newbury Street, cool bridge lights and
 * warm lamps in the river fog, sunrise gold and red crane beacons at the
 * harbor, a soft lamp in the low morning sun at the beach.
 */
const SIGN_LIGHTS: Readonly<Partial<Record<WorldTheme, readonly SignLight[]>>> = {
  airport: [{ color: '#bfe6ff', flicker: 0.04, r: 5 }, { color: '#ffb347', flicker: 0.02, r: 4.5 }, { color: '#7ad0ff', flicker: 0.06, r: 4.5 }],
  clouds: [{ color: '#cfd8ff', flicker: 0, r: 6 }],
  campus: [{ color: '#ffcf8a', flicker: 0.03, r: 5 }, { color: '#fff1c2', flicker: 0.02, r: 4.5 }],
  library: [{ color: '#9fe0a0', flicker: 0, r: 4.5 }, { color: '#ffd59a', flicker: 0.02, r: 5 }],
  tracks: [{ color: '#ffb347', flicker: 0.05, r: 5 }, { color: '#bfe6ff', flicker: 0.04, r: 5 }],
  newbury: [{ color: '#ffd38a', flicker: 0.03, r: 5 }, { color: '#ffe3b0', flicker: 0.02, r: 4.5 }],
  river: [{ color: '#e6ecff', flicker: 0.02, r: 6 }, { color: '#ffd38a', flicker: 0.03, r: 6 }],
  harbor: [{ color: '#ffc58a', flicker: 0.02, r: 5 }, { color: '#ff3b3b', flicker: 0.3, r: 4 }],
  beach: [{ color: '#ffe6b0', flicker: 0, r: 3.5 }],
};
const BEACON_LIGHT = { color: '#3df2ff', flicker: 0.1, r: 5 };

export interface PlatformSpawn { x: number; y: number; w: number; axis: 'x' | 'y' }
export interface EnemySpawn { kind: EnemyKind; x: number; y: number }


export interface Level {
  id: number;
  label: string;
  name: string;
  theme: WorldTheme;
  /** The level's sky preset, if it sets one (the renderer defaults to night). */
  sky?: SkyId;
  cols: number;
  rows: number;
  /** Row-major tile codes, `cols * rows`. Copy it before mutating. */
  tiles: Uint8Array;
  /** Column of the start tile and the y of its floor (the hero's feet). */
  start: { x: number; y: number };
  /** Checkpoints in goal order: column and the y of their floor. */
  checkpoints: { x: number; y: number }[];
  /** The first checkpoint, kept for the cartoon renderer. */
  checkpoint: { x: number; y: number } | null;
  /** Memories in goal order, tile (x, y) top left. */
  memories: { x: number; y: number }[];
  /** The goal: column, top tile row, lowest row. A flagpole or the rooftop beacon. */
  goal: Goal;
  /** The goal's column and rows, kept under its old name for the cartoon renderer. */
  pole: { x: number; top: number; base: number };
  /** 1 when the goal is right of the start, -1 when left (a mirrored level). */
  goalDir: 1 | -1;
  /** Scenery: sprite name and position (x the column, y the top of the roof row it stands on). */
  decor: Decor[];
  /** Light sources in tiles; flicker is an amplitude 0..1. */
  lights: Light[];
  shrines: Shrine[];
  pickups: PickupSpawn[];
  /** The sword (S) that gives the blade, tile top left. */
  sword: { x: number; y: number } | null;
  setPieces: SetPiece[];
  /** Drone decoys, tile x, y (see LevelDef). */
  decoys: { x: number; y: number }[];
  /** Breakables: crate tiles and neon signs (each drops coins to the blade). */
  crates: number;
  signs: number;
  enemies: EnemySpawn[];
  platforms: PlatformSpawn[];
  /** Coins on the map plus coins inside aura blocks. */
  coinTotal: number;
  /** Bricks and cracked wall tiles. */
  bricks: number;
  /** Golden Sigma coins (0 or 1). */
  sigmas: number;
  /** Gravity multiplier: 1, except the calm secret level. */
  gravity: number;
  /** Vehicle lanes and timetables (the trolley, the trains), copied from the level. */
  vehicles: VehicleDef[];
  /** Signals (s) in goal order: tile x, y top left. Each watches the nearest lane over its column. */
  signals: { x: number; y: number }[];
  /** Wind zones, crane hooks and waves, copied from the level. */
  gusts: GustDef[];
  hooks: HookDef[];
  waves: WaveDef[];
}

const CODES: Record<string, number> = {
  '#': TILE.GROUND, '=': TILE.GROUND, _: TILE.ONEWAY, B: TILE.BRICK, '?': TILE.AURA, C: TILE.AURA_CROWN, X: TILE.STONE, '^': TILE.SPIKE, o: TILE.COIN,
  $: TILE.SIGMA, '%': TILE.CRACK, R: TILE.CRATE, '>': TILE.WALK_R, '<': TILE.WALK_L, '~': TILE.PUFF,
  A: TILE.AWNING, W: TILE.WATER,
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
  const goals: { x: number; y: number; kind: Goal['kind'] }[] = [];
  const decor: Decor[] = [];
  const lights: Light[] = [];
  const shrines: Shrine[] = [];
  const pickups: PickupSpawn[] = [];
  let sword: { x: number; y: number } | null = null;
  let crates = 0;
  const checkpoints: { x: number; y: number }[] = [];
  const memories: { x: number; y: number }[] = [];
  const enemies: EnemySpawn[] = [];
  const platforms: PlatformSpawn[] = [];
  const signals: { x: number; y: number }[] = [];
  let coinTotal = 0;
  let bricks = 0;
  let sigmas = 0;
  let crowns = 0;
  const sceneryKinds = DECOR_BY_THEME[def.theme];
  const signLights = SIGN_LIGHTS[def.theme] ?? NEON;

  for (let y = 0; y < ROWS; y++) {
    const r = rows[y];
    for (let x = 0; x < cols; x++) {
      const ch = r[x];
      const code = CODES[ch];
      if (code !== undefined) {
        tiles[y * cols + x] = code;
        if (code === TILE.COIN || code === TILE.AURA) coinTotal++;
        if (code === TILE.BRICK || code === TILE.CRACK) bricks++;
        if (code === TILE.SIGMA) sigmas++;
        if (code === TILE.CRATE) crates++;
        if (code === TILE.AURA_CROWN) crowns++;
        continue;
      }
      switch (ch) {
        case '.': case '|': break;
        case 'P': starts.push({ x, y: y + 1 }); break;
        case 'F': goals.push({ x, y, kind: 'flag' }); break;
        case 'G': goals.push({ x, y, kind: 'beacon' }); break;
        case 'L': {
          const n = signLights[(x * 7 + y * 3) % signLights.length];
          decor.push({ kind: 'neonSign', x, y: y + 1 });
          lights.push({ x: x + 0.5, y: y + 0.5, r: n.r, color: n.color, flicker: n.flicker });
          break;
        }
        case 'T': case 'N': case 'U': case 'H': {
          const kind = sceneryKinds[ch];
          if (!kind) throw new Error(`${def.name}: scenery "${ch}" has no prop in the ${def.theme} theme`);
          decor.push({ kind, x, y: y + 1 });
          break;
        }
        case 'S':
          if (sword) throw new Error(`${def.name}: more than one sword`);
          sword = { x, y };
          break;
        case 'K':
          checkpoints.push({ x, y: y + 1 });
          break;
        case 'n': enemies.push({ kind: 'pebble', x, y }); break;
        case 'f': enemies.push({ kind: 'frog', x, y }); break;
        case 'c': enemies.push({ kind: 'doomCrawler', x, y }); break;
        case 'd': enemies.push({ kind: 'adDrone', x, y }); break;
        case 'e': enemies.push({ kind: 'eliteDrone', x, y }); break;
        case 'p': enemies.push({ kind: 'pigeon', x, y }); break;
        case 'g': enemies.push({ kind: 'gull', x, y }); break;
        case 'M': memories.push({ x, y }); break;
        case 's': signals.push({ x, y }); break;
        case 'w': case 't': case 'b': case 'k': case 'v': pickups.push({ kind: POWER_CHARS[ch], x, y }); break;
        case 'Q':
          if (!def.shrine) throw new Error(`${def.name}: a shrine (Q) needs the level's shrine ability`);
          shrines.push({ x, y, ability: def.shrine });
          break;
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
  if (goals.length !== 1) throw new Error(`${def.name}: needs exactly one goal (flag F or beacon G), found ${goals.length}`);
  if (crowns > 1) throw new Error(`${def.name}: at most one crown block`);
  const f = goals[0];
  let base = f.y;
  if (f.kind === 'flag') {
    while (base + 1 < ROWS && rows[base + 1][f.x] === '|') base++;
  } else {
    // The beacon's mast runs down to the roof under it.
    while (base + 1 < ROWS && !isSolidTile(tiles[(base + 1) * cols + f.x])) base++;
    lights.push({ x: f.x + 0.5, y: f.y + 0.5, ...BEACON_LIGHT });
  }
  decor.sort((a, b) => a.x - b.x || a.y - b.y);
  const goalDir: 1 | -1 = f.x >= starts[0].x ? 1 : -1;
  const along = (a: { x: number }, b: { x: number }) => (a.x - b.x) * goalDir;
  checkpoints.sort(along);
  memories.sort(along);
  signals.sort((a, b) => along(a, b) || a.y - b.y);

  return {
    id: def.id, label: def.label, name: def.name, theme: def.theme, ...(def.sky ? { sky: def.sky } : {}),
    cols, rows: ROWS, tiles, start: starts[0], checkpoints, checkpoint: checkpoints[0] ?? null, memories,
    goal: { x: f.x, top: f.y, base, kind: f.kind }, pole: { x: f.x, top: f.y, base },
    goalDir, decor, lights, shrines, pickups, sword, setPieces: def.setPieces ? [...def.setPieces] : [], decoys: (def.decoys ?? []).map(d => ({ x: d.x, y: d.y })), crates, signs: decor.filter(d => d.kind === 'neonSign').length,
    enemies, platforms, coinTotal, bricks, sigmas, gravity,
    vehicles: (def.vehicles ?? []).map(v => ({ ...v })), signals,
    gusts: (def.gusts ?? []).map(g => ({ ...g })), hooks: (def.hooks ?? []).map(k => ({ ...k })), waves: (def.waves ?? []).map(v => ({ ...v })),
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

const STATIC_LEVELS: readonly Level[] = LEVELS.map(d => parseLevel(d));

/** The level for world `index` (0 to 2) of a run, and its modifier. World 1 is generated from the run's seed. */
export function mainLevel(seed: number, index: number, modifier?: ModifierId): { level: Level; modifier: ModifierId } {
  if (index === 0) {
    const def = generateLevel('rooftops', deriveSeed(seed, 0), { modifier });
    return { level: parseLevel(def), modifier: def.modifier };
  }
  return { level: STATIC_LEVELS[index - 1], modifier: 'none' };
}

/** The three regular levels of the default seed, parsed once. */
export const MAIN_LEVELS: readonly Level[] = [mainLevel(DEFAULT_SEED, 0).level, ...STATIC_LEVELS];
export const MAIN_LEVEL_COUNT = MAIN_LEVELS.length;
