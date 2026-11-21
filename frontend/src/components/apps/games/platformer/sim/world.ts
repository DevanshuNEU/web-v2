/**
 * Main Character rules: the world, enemies, blocks, scoring, the flag, lives
 * and the secret level. Pure and deterministic (inject `rand`). This is the
 * sim's external seam: the view builds one InputFrame per fixed step from its
 * input adapter, calls `stepWorld(w, input, dt)`, drains `events` for sound
 * and juice, and draws.
 */

import {
  PHYS, approach, contacts, moveBody, moveX, moveY, overlaps, stompOrHurt,
  type Body, type Contacts, type SolidFn,
} from './physics';
import { ABILITIES, createHero, pressJump, setState, stepHero, stompBounce, tryDash, worldOwned, type Abilities, type Ability, type Hero, type HeroInput } from './hero';

export type { Abilities, Ability, Hero, HeroState } from './hero';
import { consumeEdges, type InputFrame } from '../input/frame';
import { DEFAULT_SEED, deriveSeed, mulberry32 } from './rand';
import { MODIFIERS, gust, type ModifierId } from './modifiers';
import { BLADE, type Aim, SWING_KINDS, hitbox, isActive, isGroundSwing, pogo, startSwing, tickSwing, type Swing } from './blade';
import { POWERS, POWER_KINDS, type PowerKind } from './powers';
import { nextStoryId, storyEntry, storyLevelDef } from './story';
import { createScarf, neckOf, resetScarf, stepScarf, torsoOf, type ScarfPoint } from './scarf';
import { MAIN_LEVELS, MAIN_LEVEL_COUNT, ROWS, mainLevel, SECRET_FALLBACK, TILE, isOneWayTile, isSolidTile, secretLevel, parseLevel, type DecorKind, type Level, type Light } from './level';
import { ENEMY_KINDS, enemyFrom, type Enemy, type EnemyCtx } from './enemies';
import { SIGNAL_LEAD, arrivalIn, createVehicle, placeVehicle, type Vehicle } from './vehicles';

export type { Enemy, EnemyKind, EnemyMode } from './enemies';
export type { Vehicle, VehicleDef, VehicleKind } from './vehicles';
export { shouldTurnAtLedge } from './enemies';

export const LIVES = 3;
export const POINTS = { coin: 10, stomp: 50, brick: 20, clear: 1000, timeMax: 1000, flagTop: 2000, flagMax: 1000, sigma: 500, death: 50 } as const;
/** Time bonus lost per whole second spent in a level. */
export const TIME_DECAY = 5;
/** Points per second the clear tally counts up at. */
export const TALLY_RATE = 1500;
export const DYING_SECONDS = 1.4;
export const FINALE_SECONDS = 7;
export const CARD_SECONDS = 2.4;
export const INVULN_HIT = 1.6;
export const INVULN_RESPAWN = 1.2;
/** Seconds the hero shows the hurt pose after a shielded hit. */
export const HURT_LOOK = 0.35;
/** Index of the third level, whose flag top unlocks the secret one. */
export const SECRET_GATE = 2;
export const SECRET_INDEX = 3;

/**
 * `bonus` holds points outside the counted items: Sigma coins and the Double
 * Aura coin extra. `deaths` counts story deaths (Endless has lives instead).
 */
export interface Stats { coins: number; stomps: number; bricks: number; flag: number; clears: number; time: number; bonus: number; deaths: number }

/** Every item's points, less 50 per story death, never below 0. */
export function scoreOf(s: Stats): number {
  const earned = s.coins * POINTS.coin + s.stomps * POINTS.stomp + s.bricks * POINTS.brick + s.flag + s.clears * POINTS.clear + s.time + s.bonus;
  return Math.max(0, earned - s.deaths * POINTS.death);
}

/** 1000 at the start, 5 points less for each whole second, never below 0. */
export function timeBonus(seconds: number): number {
  return Math.max(0, POINTS.timeMax - TIME_DECAY * Math.floor(Math.max(0, seconds)));
}

type Pole = Level['pole'];

/** The hero's top edge is inside the pole's top tile. */
export function touchesPoleTop(heroTop: number, pole: Pole): boolean {
  return heroTop < pole.top + 1;
}

/** 2000 for the top tile, otherwise 100 to 1000 in steps of 100 by height. */
export function flagBonus(heroTop: number, pole: Pole): number {
  if (touchesPoleTop(heroTop, pole)) return POINTS.flagTop;
  const floor = pole.base + 1;
  const span = floor - (pole.top + 1);
  const frac = Math.min(1, Math.max(0, (floor - heroTop) / span));
  return 100 + Math.floor(frac * 9 + 1e-9) * 100;
}

/** Only the third level's pole top opens the secret level. */
export function unlocksSecret(levelIndex: number, heroTop: number, pole: Pole): boolean {
  return levelIndex === SECRET_GATE && touchesPoleTop(heroTop, pole);
}

// ─────────────────────────────────────────────────────────────────────────────
// World state
// ─────────────────────────────────────────────────────────────────────────────

export interface Platform { x0: number; y0: number; x: number; y: number; w: number; h: number; axis: 'x' | 'y'; px: number; py: number }
/** Something she can stand on that moves: a platform or a vehicle roof. */
export interface Ride { x: number; y: number; px: number; py: number }
/** A signal (s) by a vehicle lane: green for SIGNAL_LEAD seconds before a vehicle reaches it. `watch` indexes `vehicles`. */
export interface Signal { x: number; y: number; green: boolean; watch: readonly number[] }
export interface Crown extends Body { dir: 1 | -1; emerge: number; baseY: number }
export interface Pop { x: number; y: number; t: number }
export interface Bump { tx: number; ty: number; t: number }
export interface Afterimage { x: number; y: number; facing: 1 | -1; t: number }
/** Seconds an afterimage lasts; t counts down from this. */
export const AFTERIMAGE_T = 0.18;
const AFTERIMAGE_POOL = 5;
const AFTERIMAGE_EVERY = 0.04;

/** An elite drone's shot, from a fixed pool: t is seconds of life left, 0 = unused. */
export interface Shot { x: number; y: number; vx: number; vy: number; t: number }
const SHOT_POOL = 8;
const SHOT_LIFE = 4;
const SHOT_R = 0.18;

export interface Camera { x: number; y: number; look: number; px: number; py: number }

export type Phase = 'play' | 'dying' | 'pole' | 'walk' | 'tally' | 'finale' | 'done';
export type Result = 'lost' | 'won' | 'secret';

export type EventType =
  | 'jump' | 'land' | 'skid' | 'coin' | 'stomp' | 'bump' | 'break' | 'crown' | 'power'
  | 'hurt' | 'die' | 'respawn' | 'checkpoint' | 'flag' | 'secret' | 'tick' | 'clear'
  | 'level' | 'over' | 'win' | 'dash' | 'wallJump' | 'doubleJump'
  /** A shrine unlocked an ability: n is its index in ABILITIES (0 wall jump, 1 dash). */
  | 'unlock'
  /** A memory was found: n is its index in world.memories. */
  | 'memory'
  /** A blade swing started (n: index in SWING_KINDS), hit an enemy (n: its hits left, 0 = killed), or bounced her (pogo). */
  | 'swing' | 'hit' | 'pogo'
  /** A drone dived at a decoy (x, y: the decoy), so the renderer can scatter the pigeon or knock the can. */
  | 'decoyDive'
  /** The golden Sigma coin: n is its points. */
  | 'sigma'
  /** An elite drone fired. */
  | 'shot'
  /** A power started or ran out: n is its index in POWER_KINDS. */
  | 'powerOn' | 'powerOff';

export interface GameEvent { type: EventType; x: number; y: number; n: number }

export interface Secret { name: string; message: string }

export interface World {
  levelIndex: number;
  level: Level;
  tiles: Uint8Array;
  solid: SolidFn;
  hero: Hero;
  heroPx: number; heroPy: number;
  hidden: boolean;
  enemies: Enemy[];
  platforms: Platform[];
  crowns: Crown[];
  pops: Pop[];
  bumps: Bump[];
  /** The platform or vehicle roof she stands on, if any. */
  riding: Ride | null;
  phase: Phase;
  phaseT: number;
  pitDeath: boolean;
  t: number;
  levelTime: number;
  lives: number;
  crowned: boolean;
  invuln: number;
  /** True once any checkpoint is passed (the renderers read it). */
  checkpointHit: boolean;
  /** Index into level.checkpoints of the last one passed, -1 for none. */
  checkpointIdx: number;
  /** This level's memories; `taken` ones are found (now, or before on this device). */
  memories: { id: string; x: number; y: number; taken: boolean }[];
  /** Memory ids found before on this device. */
  memoriesTaken: readonly string[];
  combo: number;
  stats: Stats;
  pendingTime: number;
  pendingClear: boolean;
  /** 0 flag at the top, 1 lowered. */
  flagDrop: number;
  secretUnlocked: boolean;
  secret: Secret;
  result: Result | null;
  events: GameEvent[];
  cam: Camera;
  viewCols: number;
  viewRows: number;
  cardT: number;
  landT: number;
  jumpT: number;
  /** Seed of `rand`; same seed plus same input frames gives the same run. */
  seed: number;
  rand: () => number;
  c: Contacts;
  /** The scarf: 10 points in tiles, [0] at the neck, stepped every tick. */
  scarf: ScarfPoint[];
  /** Dash trail, a fixed pool: entries with t <= 0 are unused. x, y is the hero's top left. */
  afterimages: Afterimage[];
  /** Seconds until the next afterimage while dashing. */
  trailT: number;
  /** Seconds of hit stop left: the sim holds still while above 0. */
  hitFreeze: number;
  /**
   * 0..0.9: sim time runs at (1 - slowMo) of the fixed dt the view passes.
   * Applied inside stepWorld; 0 for now (the boss finish uses it later).
   */
  slowMo: number;
  /** Reduced motion: no hit stop. */
  noFreeze: boolean;
  /** Scratch context handed to enemy behaviours. */
  ectx: EnemyCtx;
  /** Story: hand-made levels, no lives, deaths cost points. Endless: the seeded run with lives. */
  mode: GameMode;
  /** The story level being played ('1-1'), null in Endless. */
  levelId: string | null;
  /** After a story level is won: the id to play next (null after the last). */
  next: string | null;
  /** Moves unlocked so far; the hero shares this object. */
  abilities: Abilities;
  /** The sword that gives the blade, if this level has one. */
  sword: { x: number; y: number; taken: boolean } | null;
  /** The blade swing in progress, if any (see ./blade.ts). */
  swing: Swing | null;
  attackBuffer: number;
  comboNext: number;
  comboT: number;
  /** Counts swings, so each swing hits a thing once. */
  serial: number;
  /** Seconds after a pogo during which enemy contact cannot hurt. */
  pogoSafe: number;
  /** Scenery from the level; a neon sign can be broken by the blade. */
  decor: { kind: DecorKind; x: number; y: number; broken: boolean }[];
  /** Light sources now (a broken sign's light goes out). */
  lights: Light[];
  /** Drone decoys from the level (tile x, y). */
  decoys: { x: number; y: number }[];
  shrines: { x: number; y: number; ability: Ability; taken: boolean }[];
  /** The running power, if any: t seconds left of total. */
  power: { kind: PowerKind; t: number; total: number } | null;
  pickups: { kind: PowerKind; x: number; y: number; taken: boolean }[];
  /** Coins flying to her (Taco Rush), a fixed pool: t > 0 is in flight. */
  flyers: { x: number; y: number; t: number }[];
  /** Seconds of the hurt look after a shielded hit. */
  hurtT: number;
  shots: Shot[];
  /** This world's modifier, for the title card and the renderer ('none' has an empty name). */
  modifier: { id: ModifierId; name: string };
  /** Forced modifier for world 1 (tests, a chosen challenge); otherwise the seed picks. */
  forcedModifier: ModifierId | undefined;
  /** Wind drift now, tiles per second, signed (Storm Warning); the renderer slants the rain by it. */
  wind: number;
  windDir: 1 | -1;
  /** Gravity for this world: the level's, times the modifier's. */
  gravityScale: number;
  /** Coin value multiplier (Double Aura). */
  coinMul: number;
  /**
   * One per thin cloud (~) in the level. Solid with t = 0: still. Solid with
   * t > 0: wobbling, t seconds since she first stood on it (gone at
   * PUFF.wobble). Not solid: gone for t seconds (its tile is EMPTY), back
   * after PUFF.gone once she is out of its tile.
   */
  puffs: { x: number; y: number; t: number; solid: boolean }[];
  /**
   * The trolley and trains, one per lane in the level, in its order. Tile
   * units: x the left edge, y the roof top. Placed from world time every step
   * (see ./vehicles.ts); `active` is false while one waits between runs.
   */
  vehicles: Vehicle[];
  /** Signals by the lanes, green for SIGNAL_LEAD seconds before a vehicle reaches them. */
  signals: Signal[];
}

/** Thin clouds: seconds from her first landing to the puff, and seconds gone. */
export const PUFF = { wobble: 0.4, gone: 3 } as const;

/** A moving walkway (> or <) adds this many tiles per second to whatever stands on it. */
export const WALKWAY_SPEED = 4;

/** Moving platforms swing this many tiles each way from where the level puts them. */
export const PLATFORM_AMP = 2.5;
const PLATFORM_PERIOD = 4.2;
const PLATFORM_H = 0.5;

function makeSolid(tiles: Uint8Array, cols: number): SolidFn {
  const solid: SolidFn = (tx, ty) => {
    if (tx < 0 || tx >= cols) return true;
    if (ty < 0 || ty >= ROWS) return false;
    return isSolidTile(tiles[ty * cols + tx]);
  };
  solid.oneWay = (tx, ty) => tx >= 0 && tx < cols && ty >= 0 && ty < ROWS && isOneWayTile(tiles[ty * cols + tx]);
  return solid;
}

export type GameMode = 'story' | 'endless';

export interface WorldOptions {
  /** 'endless' unless set. */
  mode?: GameMode;
  levelIndex?: number;
  /** Seed for the world's generator. The view passes a fresh one per run. */
  seed?: number;
  /** Tests may inject their own generator instead of a seed. */
  rand?: () => number;
  secret?: Secret;
  viewCols?: number;
  viewRows?: number;
  /** Reduced motion: skip hit stops. */
  noFreeze?: boolean;
  /** Force world 1's modifier instead of the seeded pick. */
  modifier?: ModifierId;
  /** Memory ids already found on this device: they start taken. */
  memoriesTaken?: readonly string[];
  /** Moves unlocked at the start (the view stores story unlocks). Story starts with none; Endless has all. */
  abilities?: Partial<Abilities>;
  /** Story level to load ('1-1'); story mode only. */
  levelId?: string;
}

/** Story starts with no unlocks; Endless has every move. Options override either. */
function abilitiesFor(o: WorldOptions): Abilities {
  const all = (o.mode ?? 'endless') === 'endless';
  return { wallJump: o.abilities?.wallJump ?? all, dash: o.abilities?.dash ?? all, blade: o.abilities?.blade ?? all };
}

export function createWorld(o: WorldOptions = {}): World {
  const level = MAIN_LEVELS[0];
  const w: World = {
    levelIndex: 0, level, tiles: level.tiles.slice(), solid: () => false,
    hero: createHero(level.start.x, level.start.y), heroPx: 0, heroPy: 0, hidden: false,
    enemies: [], platforms: [], crowns: [], pops: [], bumps: [], riding: null,
    phase: 'play', phaseT: 0, pitDeath: false, t: 0, levelTime: 0,
    lives: LIVES, crowned: false, invuln: 0, checkpointHit: false, checkpointIdx: -1, memories: [], memoriesTaken: o.memoriesTaken ?? [], combo: 0,
    stats: { coins: 0, stomps: 0, bricks: 0, flag: 0, clears: 0, time: 0, bonus: 0, deaths: 0 },
    pendingTime: 0, pendingClear: false, flagDrop: 0,
    secretUnlocked: false, secret: o.secret ?? { ...SECRET_FALLBACK }, result: null,
    events: [], cam: { x: 0, y: 0, look: 0, px: 0, py: 0 },
    viewCols: o.viewCols ?? 17, viewRows: o.viewRows ?? 13,
    cardT: 0, landT: 0, jumpT: 0, seed: o.seed ?? DEFAULT_SEED, rand: o.rand ?? mulberry32(o.seed ?? DEFAULT_SEED), c: contacts(),
    hitFreeze: 0, slowMo: 0, noFreeze: !!o.noFreeze, scarf: [], trailT: 0, ectx: null as unknown as EnemyCtx,
    power: null, pickups: [], hurtT: 0,
    flyers: Array.from({ length: FLYER_POOL }, () => ({ x: 0, y: 0, t: 0 })),
    mode: o.mode ?? 'endless', levelId: null, next: null,
    abilities: abilitiesFor(o), shrines: [], sword: null,
    swing: null, attackBuffer: 0, comboNext: 0, comboT: 99, serial: 0, pogoSafe: 0, decor: [], lights: [], decoys: [],
    shots: Array.from({ length: SHOT_POOL }, () => ({ x: 0, y: 0, vx: 0, vy: 0, t: 0 })),
    modifier: { id: 'none', name: '' }, forcedModifier: o.modifier, wind: 0, windDir: 1, gravityScale: 1, coinMul: 1, puffs: [], vehicles: [], signals: [],
    afterimages: Array.from({ length: AFTERIMAGE_POOL }, () => ({ x: 0, y: 0, facing: 1 as const, t: 0 })),
  };
  w.scarf = createScarf(neckOf(w.hero));
  w.ectx = { solid: w.solid, c: contacts(), rand: w.rand, hero: w.hero, shoot: (x, y, vx, vy) => fire(w, x, y, vx, vy),
    decoys: w.decoys, decoyDive: (x, y) => emit(w, 'decoyDive', x, y) };
  if (w.mode === 'story') loadStory(w, o.levelId ?? '1-1');
  else loadLevel(w, o.levelIndex ?? 0);
  return w;
}

/** Load a story level by id ('1-1'): fixed, no modifier. */
export function loadStory(w: World, id: string) {
  const entry = storyEntry(id);
  w.levelId = id;
  w.next = null;
  w.result = null;
  enterLevel(w, entry.world - 1, parseLevel(storyLevelDef(id)), 'none');
}

/** The level for world `index` of this run (world 1 is built from the seed). */
export function levelFor(w: World, index: number): { level: Level; modifier: ModifierId } {
  if (index < MAIN_LEVEL_COUNT) return mainLevel(w.seed, index, index === 0 ? w.forcedModifier : undefined);
  return { level: secretLevel(w.secret.name), modifier: 'none' };
}

export function loadLevel(w: World, index: number) {
  const { level, modifier } = levelFor(w, index);
  enterLevel(w, index, level, modifier);
}

/** Enter a level at a given index. Tests use it to play hand-made levels. */
export function enterLevel(w: World, index: number, level: Level, modifier: ModifierId = 'none') {
  const mod = MODIFIERS[modifier];
  w.modifier = { id: modifier, name: mod.name };
  w.gravityScale = level.gravity * mod.gravity;
  w.coinMul = mod.coinMul;
  w.wind = 0;
  w.windDir = (deriveSeed(w.seed, 100 + index) & 1) === 0 ? 1 : -1;
  w.levelIndex = index;
  w.level = level;
  w.tiles = level.tiles.slice();
  w.solid = makeSolid(w.tiles, level.cols);
  w.puffs = [];
  for (let i = 0; i < w.tiles.length; i++) {
    if (w.tiles[i] === TILE.PUFF) w.puffs.push({ x: i % level.cols, y: Math.floor(i / level.cols), t: 0, solid: true });
  }
  w.enemies = level.enemies.map(e => enemyFrom(e.kind, e.x, e.y));
  w.vehicles = level.vehicles.map(createVehicle);
  w.signals = level.signals.map(sg => ({ x: sg.x, y: sg.y, green: false, watch: lanesOf(level, sg) }));
  stepVehicles(w);
  w.platforms = level.platforms.map(p => ({ x0: p.x, y0: p.y, x: p.x, y: p.y, w: p.w, h: PLATFORM_H, axis: p.axis, px: p.x, py: p.y }));
  w.crowns = []; w.pops = []; w.bumps = [];
  for (const sh of w.shots) sh.t = 0;
  w.sword = level.sword ? { x: level.sword.x, y: level.sword.y, taken: w.abilities.blade } : null;
  w.swing = null; w.attackBuffer = 0; w.comboNext = 0; w.comboT = 99; w.pogoSafe = 0;
  w.decor = level.decor.map(d => ({ kind: d.kind, x: d.x, y: d.y, broken: false }));
  w.lights = level.lights.slice();
  w.decoys = level.decoys.map(d => ({ x: d.x, y: d.y }));
  if (w.ectx) w.ectx.decoys = w.decoys;
  for (const f of w.flyers) f.t = 0;
  w.power = null;
  w.pickups = level.pickups.map(p => ({ kind: p.kind, x: p.x, y: p.y, taken: false }));
  w.shrines = level.shrines.map(q => ({ x: q.x, y: q.y, ability: q.ability, taken: !!w.abilities[q.ability] }));
  w.checkpointHit = false;
  w.checkpointIdx = -1;
  w.memories = level.memories.map((m, i) => {
    const id = `${w.levelId ?? 'endless'}-${String.fromCharCode(97 + i)}`;
    return { id, x: m.x, y: m.y, taken: w.memoriesTaken.includes(id) };
  });
  w.levelTime = 0;
  w.flagDrop = 0;
  w.pendingTime = 0; w.pendingClear = false;
  w.cardT = CARD_SECONDS;
  placeHero(w, level.start);
  w.invuln = 0;
  w.phase = 'play'; w.phaseT = 0;
  emit(w, 'level', level.start.x, level.start.y, index);
}

function placeHero(w: World, at: { x: number; y: number }) {
  w.hero = createHero(at.x, at.y);
  w.hero.facing = w.level.goalDir;
  w.hero.abilities = w.abilities;
  w.heroPx = w.hero.x; w.heroPy = w.hero.y;
  w.hidden = false;
  w.riding = null;
  w.combo = 0;
  w.landT = 0; w.jumpT = 0;
  if (w.scarf) resetScarf(w.scarf, neckOf(w.hero), w.hero.facing);
  snapCamera(w);
}

function emit(w: World, type: EventType, x: number, y: number, n = 0) {
  w.events.push({ type, x, y, n });
}

/** Hand the queued events to the caller and start a fresh queue. */
export function drainEvents(w: World): GameEvent[] {
  const ev = w.events;
  w.events = [];
  return ev;
}

export function score(w: World): number {
  return scoreOf(w.stats);
}

export function tile(w: World, x: number, y: number): number {
  if (x < 0 || x >= w.level.cols || y < 0 || y >= ROWS) return TILE.EMPTY;
  return w.tiles[y * w.level.cols + x];
}

function setTile(w: World, x: number, y: number, t: number) {
  if (x < 0 || x >= w.level.cols || y < 0 || y >= ROWS) return;
  w.tiles[y * w.level.cols + x] = t;
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera
// ─────────────────────────────────────────────────────────────────────────────

function cameraTarget(w: World) {
  const h = w.hero;
  const maxX = Math.max(0, w.level.cols - w.viewCols);
  const maxY = w.level.rows - w.viewRows;
  const x = Math.min(maxX, Math.max(0, h.x + h.w / 2 + w.cam.look - w.viewCols / 2));
  // A view taller than the level (portrait phone) keeps the ground at the
  // bottom and shows sky above, so the camera sits above row 0.
  const y = maxY < 0 ? maxY : Math.min(maxY, Math.max(0, h.y + h.h / 2 - w.viewRows * 0.55));
  return { x, y };
}

export function snapCamera(w: World) {
  w.cam.look = w.hero.facing * lookahead(w);
  const t = cameraTarget(w);
  w.cam.x = w.cam.px = t.x;
  w.cam.y = w.cam.py = t.y;
}

function lookahead(w: World) {
  return Math.min(2.5, w.viewCols * 0.15);
}

/** Smooth follow with lookahead in the facing direction, clamped to the level. */
export function stepCamera(w: World, dt: number) {
  const cam = w.cam;
  cam.px = cam.x; cam.py = cam.y;
  if (w.phase === 'dying') return;
  cam.look += (w.hero.facing * lookahead(w) - cam.look) * (1 - Math.exp(-3 * dt));
  const t = cameraTarget(w);
  cam.x += (t.x - cam.x) * (1 - Math.exp(-7 * dt));
  cam.y += (t.y - cam.y) * (1 - Math.exp(-3 * dt));
}

// ─────────────────────────────────────────────────────────────────────────────
// The step
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Advance the world one fixed step with this step's input. The frame's edges
 * are consumed here whatever the phase, so a press made while dying or during
 * the tally never fires later.
 */
export function stepWorld(w: World, input: InputFrame, fixedDt: number) {
  const dt = fixedDt * (1 - Math.min(0.9, Math.max(0, w.slowMo)));
  const jump = input.jumpPressed;
  const dash = input.dashPressed;
  // The Action button is the attack.
  const attack = input.actionPressed;
  consumeEdges(input);
  if (w.phase === 'done') return;
  if (jump && w.phase === 'play') {
    pressJump(w.hero);
    if (w.swing && w.hero.coyote > 0) w.swing = null; // a jump cancels a swing
  }
  if (attack && w.phase === 'play' && w.abilities.blade) w.attackBuffer = BLADE.buffer;
  if (w.hitFreeze > 0) { holdStill(w, dt); return; }
  if (dash && w.phase === 'play' && tryDash(w.hero, input.move)) {
    w.swing = null; // a dash cancels a swing
    emit(w, 'dash', w.hero.x + w.hero.w / 2, w.hero.y + w.hero.h / 2, w.hero.dashDir);
    spawnAfterimage(w);
    freeze(w, PHYS.dashFreeze);
    w.heroPx = w.hero.x; w.heroPy = w.hero.y;
    return;
  }
  w.t += dt;
  if (w.cardT > 0) w.cardT = Math.max(0, w.cardT - dt);
  if (w.landT > 0) w.landT = Math.max(0, w.landT - dt);
  if (w.jumpT > 0) w.jumpT = Math.max(0, w.jumpT - dt);
  w.heroPx = w.hero.x; w.heroPy = w.hero.y;

  stepPlatforms(w);
  stepVehicles(w);
  stepPuffs(w, dt);
  for (const b of w.bumps) b.t += dt;
  if (w.bumps.length && w.bumps[0].t > 0.18) w.bumps = w.bumps.filter(b => b.t <= 0.18);
  for (const p of w.pops) p.t += dt;
  if (w.pops.length && w.pops[0].t > 0.55) w.pops = w.pops.filter(p => p.t <= 0.55);

  switch (w.phase) {
    case 'play': stepPlay(w, input, dt); break;
    case 'dying': stepDying(w, dt); break;
    case 'pole': stepPole(w, dt); break;
    case 'walk': stepWalk(w, dt); break;
    case 'tally': stepTally(w, dt); break;
    case 'finale': stepFinale(w, dt); break;
  }
  if (w.hurtT > 0) w.hurtT = Math.max(0, w.hurtT - dt);
  syncHeroState(w);
  w.hero.animT += dt;
  stepAfterimages(w, dt);
  stepScarf(w.scarf, neckOf(w.hero, NECK), torsoOf(w.hero, TORSO), w.hero.facing, w.hero.vx, w.hero.vy, dt, w.solid);
  for (const e of w.enemies) if (e.deadT >= 0) e.deadT -= dt;
  if (w.enemies.some(e => e.deadT < 0 && e.deadT !== -1)) w.enemies = w.enemies.filter(e => e.deadT === -1 || e.deadT >= 0);
  stepCamera(w, dt);
}

/** The hero's own state machine covers moving; the world adds hurt, dead and victory. */
function syncHeroState(w: World) {
  const h = w.hero;
  if (w.phase === 'dying' || (w.phase === 'done' && w.result === 'lost')) setState(h, 'dead');
  else if (w.phase !== 'play') setState(h, 'victory');
  else if (w.hurtT > 0) setState(h, 'hurt');
  else if (w.swing) setState(h, w.swing.kind);
  else if (worldOwned(h.state)) setState(h, h.dashT > 0 ? 'dash' : h.onGround ? 'ground' : 'air');
}

/** Reuse the oldest pool entry for an afterimage at the hero. */
function spawnAfterimage(w: World) {
  let a = w.afterimages[0];
  for (const b of w.afterimages) if (b.t < a.t) a = b;
  a.x = w.hero.x; a.y = w.hero.y; a.facing = w.hero.facing; a.t = AFTERIMAGE_T;
  w.trailT = AFTERIMAGE_EVERY;
}

function stepAfterimages(w: World, dt: number) {
  for (const a of w.afterimages) if (a.t > 0) a.t = Math.max(0, a.t - dt);
  if (w.hero.state !== 'dash') return;
  w.trailT -= dt;
  if (w.trailT <= 0) spawnAfterimage(w);
}

/** Start a hit stop (none with reduced motion). */
function freeze(w: World, seconds: number) {
  if (!w.noFreeze) w.hitFreeze = Math.max(w.hitFreeze, seconds);
}

/** A hit-stop step: nothing moves, so the view's interpolation holds too. */
function holdStill(w: World, dt: number) {
  w.hitFreeze = Math.max(0, w.hitFreeze - dt);
  w.heroPx = w.hero.x; w.heroPy = w.hero.y;
  w.cam.px = w.cam.x; w.cam.py = w.cam.y;
  for (const e of w.enemies) { e.px = e.x; e.py = e.y; }
  for (const p of w.platforms) { p.px = p.x; p.py = p.y; }
  for (const v of w.vehicles) { v.px = v.x; v.py = v.y; }
}

function stepPlatforms(w: World) {
  const k = Math.sin((w.t / PLATFORM_PERIOD) * Math.PI * 2);
  for (const p of w.platforms) {
    p.px = p.x; p.py = p.y;
    if (p.axis === 'x') p.x = p.x0 + PLATFORM_AMP * k;
    else p.y = p.y0 + PLATFORM_AMP * k;
  }
}

/**
 * The vehicles a signal watches: those on the lane nearest its row among the
 * lanes that run over its column.
 */
function lanesOf(level: Level, sg: { x: number; y: number }): number[] {
  let best = Infinity;
  const out: number[] = [];
  level.vehicles.forEach((d, i) => {
    if (sg.x < d.x0 || sg.x > d.x1) return;
    const k = Math.abs(d.row - sg.y);
    if (k < best) { best = k; out.length = 0; }
    if (k === best) out.push(i);
  });
  return out;
}

/** Place every vehicle by the world clock, let go of one that left its lane, and set the signals. */
function stepVehicles(w: World) {
  const defs = w.level.vehicles;
  for (let i = 0; i < w.vehicles.length; i++) {
    const v = w.vehicles[i];
    placeVehicle(v, defs[i], w.t);
    if (!v.active && w.riding === v) w.riding = null;
  }
  for (const sg of w.signals) {
    let green = false;
    for (const i of sg.watch) {
      const a = arrivalIn(defs[i], w.t, sg.x);
      if (a > 0 && a <= SIGNAL_LEAD) { green = true; break; }
    }
    sg.green = green;
  }
}

const PUFF_BOX = { x: 0, y: 0, w: 1, h: 1 };

/** Thin clouds: one she stands on wobbles, then puffs away; a gone one comes back when she is clear of it. */
function stepPuffs(w: World, dt: number) {
  if (w.puffs.length === 0) return;
  const h = w.hero;
  const feet = w.phase === 'play' && h.onGround && !w.riding ? Math.floor(h.y + h.h + 0.05) : -1;
  const x0 = Math.floor(h.x + 1e-6), x1 = Math.floor(h.x + h.w - 1e-6);
  for (const p of w.puffs) {
    if (p.solid) {
      if (p.t > 0) {
        p.t += dt;
        if (p.t >= PUFF.wobble) { p.solid = false; p.t = 0; setTile(w, p.x, p.y, TILE.EMPTY); }
      } else if (p.y === feet && p.x >= x0 && p.x <= x1) {
        p.t = dt;
      }
      continue;
    }
    p.t += dt;
    if (p.t < PUFF.gone) continue;
    PUFF_BOX.x = p.x; PUFF_BOX.y = p.y;
    if (overlaps(h, PUFF_BOX)) continue;
    p.solid = true; p.t = 0;
    setTile(w, p.x, p.y, TILE.PUFF);
  }
}

function stepPlay(w: World, input: HeroInput, dt: number) {
  const h = w.hero;
  const c = w.c;
  w.levelTime += dt;
  if (w.invuln > 0) w.invuln = Math.max(0, w.invuln - dt);
  stepPower(w, dt);

  // Ride a moving platform: carry the hero by its motion first.
  if (w.riding) {
    const p = w.riding;
    c.wall = 0; c.landed = false; c.ceiling = false;
    moveX(h, p.x - p.px, w.solid, c);
    moveY(h, p.y - p.py, w.solid, c);
  }

  stepBlade(w, dt);
  const wasGround = h.onGround;
  const prevBottom = h.y + h.h;
  const rooted = w.swing !== null && isGroundSwing(w.swing.kind);
  if (rooted) { ROOTED.jumpHeld = input.jumpHeld; }
  const r = stepHero(h, rooted ? ROOTED : input, dt, w.solid, c, w.gravityScale);
  if (r.dashEnded) rechargeDash(w);
  carryHero(w, input.move, dt);
  // Storm gusts drift the hero (half on a roof, never in a dash).
  const k = MODIFIERS[w.modifier.id].wind;
  w.wind = k > 0 ? k * gust(w.levelTime, w.windDir) : 0;
  if (w.wind !== 0 && h.dashT <= 0) {
    const vx = h.vx;
    moveX(h, w.wind * (h.onGround ? 0.5 : 1) * dt, w.solid, c);
    h.vx = vx;
  }
  if (r.jumped) { emit(w, 'jump', h.x + h.w / 2, prevBottom); w.jumpT = 0.16; }
  if (r.dashEnded && c.wall !== 0 && tile(w, c.wallTx, c.wallTy) === TILE.CRACK) smash(w, c.wallTx, c.wallTy);
  if (r.doubleJumped) emit(w, 'doubleJump', h.x + h.w / 2, h.y + h.h, h.facing);
  if (r.wallJumped) emit(w, 'wallJump', h.x + (h.facing > 0 ? 0 : h.w), h.y + h.h / 2, h.facing);
  if (r.skidded) emit(w, 'skid', h.x + h.w / 2, h.y + h.h, -h.facing);

  // One-way landing on moving platforms and vehicle roofs.
  w.riding = null;
  if (h.vy >= 0) {
    for (const p of w.platforms) {
      if (rideOn(w, p, p.w, prevBottom, wasGround, r.landedAt)) break;
    }
    if (!w.riding) {
      for (const v of w.vehicles) {
        if (v.active && rideOn(w, v, v.w, prevBottom, wasGround, r.landedAt)) break;
      }
    }
  }
  if (c.landed && !wasGround) landed(w, r.landedAt);
  if (h.onGround) w.combo = 0;

  if (c.ceiling) hitBlock(w, c.ceilTx, c.ceilTy);

  if ((c.landed && tile(w, c.groundTx, c.groundTy) === TILE.SPIKE) || (c.wall !== 0 && tile(w, c.wallTx, c.wallTy) === TILE.SPIKE)) {
    hurt(w);
    if (w.phase !== 'play') return;
  }

  collectCoins(w, h);
  touchShrines(w);
  takeSword(w);
  collectPickups(w);
  pullCoins(w, dt);

  if (h.y > ROWS + 0.5) { die(w, true); return; }

  passCheckpoints(w);
  touchMemories(w);

  stepEnemies(w, dt, prevBottom, input.jumpHeld);
  if (w.phase !== 'play') return;
  stepShots(w, dt);
  if (w.phase !== 'play') return;
  stepCrowns(w, dt);

  const pole = w.level.pole;
  const zone = { x: pole.x + 0.4, y: pole.top, w: 0.2, h: pole.base + 1 - pole.top };
  if (overlaps(h, zone)) grabPole(w);
}

/** Land on (or keep standing on) a moving floor `width` tiles wide if her feet crossed its top this step. */
function rideOn(w: World, p: Ride, width: number, prevBottom: number, wasGround: boolean, landedAt: number): boolean {
  const h = w.hero;
  if (h.x + h.w <= p.x || h.x >= p.x + width) return false;
  if (prevBottom > p.y + 0.12 || h.y + h.h < p.y) return false;
  h.y = p.y - h.h; h.vy = 0; h.onGround = true;
  w.riding = p;
  if (!wasGround) landed(w, landedAt || 8);
  return true;
}

/**
 * The way the walkway under a body's feet runs: 1 right, -1 left, 0 none.
 * The tile under its centre decides; over a gap, the edge still on a tile.
 */
function walkwayUnder(w: World, b: Body): -1 | 0 | 1 {
  const ty = Math.floor(b.y + b.h + 0.05);
  let t = tile(w, Math.floor(b.x + b.w / 2), ty);
  if (!isSolidTile(t)) t = tile(w, Math.floor(b.x + 0.02), ty);
  if (!isSolidTile(t)) t = tile(w, Math.floor(b.x + b.w - 0.02), ty);
  return t === TILE.WALK_R ? 1 : t === TILE.WALK_L ? -1 : 0;
}

/**
 * Walkways: standing on one sets her carry; on plain floor it fades out
 * fast; in the air it stays unless she steers against it. A wall stops it.
 */
function carryHero(w: World, move: number, dt: number) {
  const h = w.hero;
  if (h.dashT > 0) return;
  if (h.onGround) {
    const d = walkwayUnder(w, h);
    h.carry = d !== 0 ? d * WALKWAY_SPEED : approach(h.carry, 0, PHYS.frictionGround * dt);
  } else if (h.carry !== 0 && move !== 0 && Math.sign(move) !== Math.sign(h.carry)) {
    h.carry = approach(h.carry, 0, PHYS.accelAir * dt);
  }
  if (h.carry === 0) return;
  const c = w.c;
  const wall = c.wall;
  c.wall = 0;
  const vx = h.vx;
  moveX(h, h.carry * dt, w.solid, c);
  if (c.wall !== 0) { h.carry = 0; h.vx = Math.sign(vx) === c.wall ? 0 : vx; }
  else { c.wall = wall; h.vx = vx; }
}

/** A dash into a cracked wall smashes its whole column of cracked tiles. */
function smash(w: World, tx: number, ty: number) {
  let y0 = ty, y1 = ty;
  while (tile(w, tx, y0 - 1) === TILE.CRACK) y0--;
  while (tile(w, tx, y1 + 1) === TILE.CRACK) y1++;
  for (let y = y0; y <= y1; y++) {
    setTile(w, tx, y, TILE.EMPTY);
    w.stats.bricks++;
    emit(w, 'break', tx + 0.5, y + 0.5);
  }
}

function fire(w: World, x: number, y: number, vx: number, vy: number) {
  let s = w.shots[0];
  for (const b of w.shots) if (b.t < s.t) s = b;
  s.x = x; s.y = y; s.vx = vx; s.vy = vy; s.t = SHOT_LIFE;
  emit(w, 'shot', x, y);
}

/** Shots fly straight, die on walls, and hurt the hero. */
function stepShots(w: World, dt: number) {
  const h = w.hero;
  for (const s of w.shots) {
    if (s.t <= 0) continue;
    s.t = Math.max(0, s.t - dt);
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (w.solid(Math.floor(s.x), Math.floor(s.y))) { s.t = 0; continue; }
    if (w.phase !== 'play') continue;
    if (s.x + SHOT_R > h.x && s.x - SHOT_R < h.x + h.w && s.y + SHOT_R > h.y && s.y - SHOT_R < h.y + h.h) {
      s.t = 0;
      hurt(w);
    }
  }
}

/** Scratch boxes reused every step (no allocation in the step). */
const NECK = { x: 0, y: 0 };
const TORSO = { x: 0, y: 0, w: 0, h: 0 };

/** A ground swing plants her feet: the stick is ignored. */
const ROOTED: HeroInput = { move: 0, jumpHeld: false };
const HITBOX = { x: 0, y: 0, w: 0, h: 0 };
const SIGN_BOX = { x: 0, y: 0, w: 3, h: 1 };

/** Start buffered swings, advance the current one, and land its hits. */
function stepBlade(w: World, dt: number) {
  const h = w.hero;
  if (w.pogoSafe > 0) w.pogoSafe = Math.max(0, w.pogoSafe - dt);
  tickSwing(w, h, dt);
  if (w.attackBuffer > 0 && w.abilities.blade) {
    const aim: Aim = !h.onGround && targetBelow(w) ? 'down' : targetAbove(w) ? 'up' : 'forward';
    if (aim === 'forward' && !w.swing) faceNearbyTarget(w);
    const s = startSwing(w, h, aim);
    if (s) emit(w, 'swing', h.x + h.w / 2, h.y + h.h / 2, SWING_KINDS.indexOf(s.kind));
  }
  const s = w.swing;
  if (!s || !isActive(s)) return;
  const box = hitbox(h, s, HITBOX);
  const d = BLADE.swings[s.kind];
  const down = s.kind === 'downStrike';
  let hit = false, bounce = false;
  for (const e of w.enemies) {
    if (e.deadT !== -1 || e.lastHit === s.serial || !overlaps(box, e)) continue;
    e.lastHit = s.serial;
    e.hp -= d.damage;
    hit = true; if (down) bounce = true;
    if (e.hp <= 0) {
      killEnemy(w, e);
      emit(w, 'hit', e.x + e.w / 2, e.y + e.h / 2, 0);
      continue;
    }
    const dir = down ? (e.x + e.w / 2 >= h.x + h.w / 2 ? 1 : -1) : s.dir;
    e.vx = dir * d.knock;
    e.vy = ENEMY_KINDS[e.kind].flies ? 0 : -3;
    e.stunT = BLADE.stun;
    emit(w, 'hit', e.x + e.w / 2, e.y + e.h / 2, e.hp);
  }
  // Crates and spikes in the box.
  for (let ty = Math.floor(box.y); ty <= Math.floor(box.y + box.h - 1e-6); ty++) {
    for (let tx = Math.floor(box.x); tx <= Math.floor(box.x + box.w - 1e-6); tx++) {
      const t = tile(w, tx, ty);
      if (t === TILE.CRATE) {
        setTile(w, tx, ty, TILE.EMPTY);
        for (let i = 0; i < BLADE.crateCoins; i++) { gainCoin(w); emit(w, 'coin', tx + 0.5, ty + 0.5); }
        emit(w, 'break', tx + 0.5, ty + 0.5, 1);
        hit = true; if (down) bounce = true;
      } else if (t === TILE.SPIKE && down) {
        bounce = true;
      }
    }
  }
  // Neon signs: scenery 3 tiles wide, one tall, standing on y.
  for (const dc of w.decor) {
    if (dc.kind !== 'neonSign' || dc.broken) continue;
    SIGN_BOX.x = dc.x; SIGN_BOX.y = dc.y - 1;
    if (!overlaps(box, SIGN_BOX)) continue;
    dc.broken = true;
    const li = w.lights.findIndex(l => l.x === dc.x + 0.5 && l.y === dc.y - 0.5);
    if (li >= 0) w.lights.splice(li, 1);
    for (let i = 0; i < BLADE.signCoins; i++) { gainCoin(w); emit(w, 'coin', dc.x + 1.5, dc.y - 0.5); }
    emit(w, 'break', dc.x + 1.5, dc.y - 0.5, 2);
    hit = true; if (down) bounce = true;
  }
  if (hit) freeze(w, d.stop);
  if (bounce) {
    pogo(h);
    w.swing = null;
    w.pogoSafe = BLADE.pogoSafe;
    emit(w, 'pogo', h.x + h.w / 2, h.y + h.h);
  }
}

/** Is a live enemy above her head, within reach of an up swing? */
function targetAbove(w: World): boolean {
  const h = w.hero;
  const cx = h.x + h.w / 2;
  const top = h.y + 0.3;
  for (const e of w.enemies) {
    if (e.deadT !== -1) continue;
    const ex = e.x + e.w / 2;
    if (Math.abs(ex - cx) > BLADE.upHalfWidth + e.w / 2) continue;
    if (e.y + e.h <= top && e.y + e.h >= top - BLADE.upReach) return true;
  }
  return false;
}

/**
 * Before a forward swing, turn to face a live enemy close behind her when
 * none is in front, so a beginner never swings at empty air.
 */
function faceNearbyTarget(w: World) {
  const h = w.hero;
  const cx = h.x + h.w / 2;
  let front = false, behind = false;
  for (const e of w.enemies) {
    if (e.deadT !== -1) continue;
    if (e.y > h.y + h.h || e.y + e.h < h.y - 0.3) continue;
    const dx = e.x + e.w / 2 - cx;
    // The gap between her edge and theirs, the way the swing's reach is measured.
    const gap = dx > 0 ? e.x - (h.x + h.w) : h.x - (e.x + e.w);
    if (gap > BLADE.turnReach) continue;
    if (Math.sign(dx) === h.facing || dx === 0) front = true; else behind = true;
  }
  if (behind && !front) h.facing = h.facing === 1 ? -1 : 1;
}

/** Is an enemy, spikes, a crate or a sign right below her, within reach of a down-strike? */
function targetBelow(w: World): boolean {
  const h = w.hero;
  const feet = h.y + h.h;
  const x0 = h.x - 0.2, x1 = h.x + h.w + 0.2;
  for (const e of w.enemies) {
    if (e.deadT !== -1) continue;
    if (e.x < x1 && e.x + e.w > x0 && e.y + e.h > feet - 0.2 && e.y <= feet + BLADE.downReach) return true;
  }
  for (let tx = Math.floor(x0); tx <= Math.floor(x1 - 1e-6); tx++) {
    for (let ty = Math.floor(feet); ty <= Math.floor(feet + BLADE.downReach); ty++) {
      const t = tile(w, tx, ty);
      if (t === TILE.SPIKE || t === TILE.CRATE) return true;
      if (isSolidTile(t) || isOneWayTile(t)) break;
    }
  }
  for (const dc of w.decor) {
    if (dc.kind !== 'neonSign' || dc.broken) continue;
    if (dc.x < x1 && dc.x + 3 > x0 && dc.y - 1 >= feet - 0.2 && dc.y - 1 <= feet + BLADE.downReach) return true;
  }
  return false;
}

const FLYER_POOL = 16;
const FLYER_SPEED = 14;
const PICKUP_BOX = { x: 0, y: 0, w: 0.7, h: 0.7 };

/** Tick the running power down and hand the hero its effects. */
function stepPower(w: World, dt: number) {
  const p = w.power;
  if (p) {
    p.t -= dt;
    if (p.t <= 0) {
      emit(w, 'powerOff', w.hero.x + w.hero.w / 2, w.hero.y, POWER_KINDS.indexOf(p.kind));
      w.power = null;
    }
  }
  const def = w.power ? POWERS[w.power.kind] : null;
  w.hero.runMul = def ? def.runMul : 1;
  w.hero.glideFall = def ? def.glideFall : 0;
  rechargeDash(w);
}

/** Wicked Fast: the dash is charged again the moment the last one is over. */
function rechargeDash(w: World) {
  if (w.power && POWERS[w.power.kind].chainDash && w.hero.dashT <= 0) w.hero.dashReady = true;
}

function collectPickups(w: World) {
  for (const p of w.pickups) {
    if (p.taken) continue;
    PICKUP_BOX.x = p.x + 0.15; PICKUP_BOX.y = p.y + 0.15;
    if (!overlaps(w.hero, PICKUP_BOX)) continue;
    p.taken = true;
    if (w.power) emit(w, 'powerOff', p.x + 0.5, p.y + 0.5, POWER_KINDS.indexOf(w.power.kind));
    const total = POWERS[p.kind].duration;
    w.power = { kind: p.kind, t: total, total };
    emit(w, 'powerOn', p.x + 0.5, p.y + 0.5, POWER_KINDS.indexOf(p.kind));
  }
}

/** Taco Rush: coins within reach leave their tiles and fly to her; they count on arrival. */
function pullCoins(w: World, dt: number) {
  const h = w.hero;
  const cx = h.x + h.w / 2, cy = h.y + h.h / 2;
  const reach = w.power ? POWERS[w.power.kind].magnet : 0;
  if (reach > 0) {
    for (let ty = Math.floor(cy - reach); ty <= Math.floor(cy + reach); ty++) {
      for (let tx = Math.floor(cx - reach); tx <= Math.floor(cx + reach); tx++) {
        if (tile(w, tx, ty) !== TILE.COIN || Math.hypot(tx + 0.5 - cx, ty + 0.5 - cy) > reach) continue;
        setTile(w, tx, ty, TILE.EMPTY);
        let f = w.flyers[0];
        for (const g of w.flyers) if (g.t <= 0) { f = g; break; }
        if (f.t > 0) { gainCoin(w); emit(w, 'coin', tx + 0.5, ty + 0.5); continue; }
        f.x = tx + 0.5; f.y = ty + 0.5; f.t = 1;
      }
    }
  }
  for (const f of w.flyers) {
    if (f.t <= 0) continue;
    const dx = cx - f.x, dy = cy - f.y, d = Math.hypot(dx, dy);
    const stepLen = FLYER_SPEED * dt;
    if (d <= Math.max(0.4, stepLen)) {
      f.t = 0;
      gainCoin(w);
      emit(w, 'coin', cx, cy);
      continue;
    }
    f.x += (dx / d) * stepLen; f.y += (dy / d) * stepLen;
  }
}

/** Checkpoints count in goal order, once he is past one toward the goal. */
function passCheckpoints(w: World) {
  const cps = w.level.checkpoints;
  const cx = w.hero.x + w.hero.w / 2;
  while (w.checkpointIdx + 1 < cps.length) {
    const cp = cps[w.checkpointIdx + 1];
    if (w.level.goalDir > 0 ? cx < cp.x : cx > cp.x + 1) break;
    w.checkpointIdx++;
    w.checkpointHit = true;
    emit(w, 'checkpoint', cp.x + 0.5, cp.y - 1, w.checkpointIdx);
  }
}

const MEMORY_BOX = { x: 0, y: 0, w: 0.8, h: 0.8 };

function touchMemories(w: World) {
  for (let i = 0; i < w.memories.length; i++) {
    const m = w.memories[i];
    if (m.taken) continue;
    MEMORY_BOX.x = m.x + 0.1; MEMORY_BOX.y = m.y + 0.1;
    if (!overlaps(w.hero, MEMORY_BOX)) continue;
    m.taken = true;
    emit(w, 'memory', m.x + 0.5, m.y + 0.5, i);
  }
}

const SHRINE_BOX = { x: 0, y: 0, w: 0.8, h: 2 };
const SWORD_BOX = { x: 0, y: 0, w: 0.8, h: 1 };

/** The sword: the blade for good. */
function takeSword(w: World) {
  const sw = w.sword;
  if (!sw || sw.taken) return;
  SWORD_BOX.x = sw.x + 0.1; SWORD_BOX.y = sw.y;
  if (!overlaps(w.hero, SWORD_BOX)) return;
  sw.taken = true;
  if (w.abilities.blade) return;
  w.abilities.blade = true;
  emit(w, 'unlock', sw.x + 0.5, sw.y, ABILITIES.indexOf('blade'));
}

/** A shrine gives its ability for good the first time he touches it. */
function touchShrines(w: World) {
  for (const q of w.shrines) {
    if (q.taken) continue;
    SHRINE_BOX.x = q.x + 0.1; SHRINE_BOX.y = q.y - 1;
    if (!overlaps(w.hero, SHRINE_BOX)) continue;
    q.taken = true;
    if (w.abilities[q.ability]) continue;
    w.abilities[q.ability] = true;
    emit(w, 'unlock', q.x + 0.5, q.y, ABILITIES.indexOf(q.ability));
  }
}

function landed(w: World, speed: number) {
  // world.landT counts down from 0.14 as hero.landT counts up from 0 (the old renderer reads it).
  w.landT = 0.14;
  w.hero.landT = 0;
  emit(w, 'land', w.hero.x + w.hero.w / 2, w.hero.y + w.hero.h, speed);
}

function collectCoins(w: World, b: Body) {
  const x0 = Math.floor(b.x), x1 = Math.floor(b.x + b.w - 1e-6);
  const y0 = Math.floor(b.y), y1 = Math.floor(b.y + b.h - 1e-6);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const t = tile(w, tx, ty);
      if (t === TILE.SIGMA) {
        setTile(w, tx, ty, TILE.EMPTY);
        w.stats.bonus += POINTS.sigma;
        emit(w, 'sigma', tx + 0.5, ty + 0.5, POINTS.sigma);
        continue;
      }
      if (t !== TILE.COIN) continue;
      setTile(w, tx, ty, TILE.EMPTY);
      gainCoin(w);
      emit(w, 'coin', tx + 0.5, ty + 0.5);
    }
  }
}

function hitBlock(w: World, tx: number, ty: number) {
  const t = tile(w, tx, ty);
  if (t === TILE.AURA) {
    setTile(w, tx, ty, TILE.USED);
    gainCoin(w);
    w.pops.push({ x: tx, y: ty, t: 0 });
    w.bumps.push({ tx, ty, t: 0 });
    emit(w, 'coin', tx + 0.5, ty - 0.5, 1);
  } else if (t === TILE.AURA_CROWN) {
    setTile(w, tx, ty, TILE.USED);
    w.bumps.push({ tx, ty, t: 0 });
    w.crowns.push({ x: tx + 0.1, y: ty, w: 0.8, h: 0.7, vx: 0, vy: 0, onGround: false, dir: 1, emerge: 0.6, baseY: ty });
    emit(w, 'crown', tx + 0.5, ty);
  } else if (t === TILE.BRICK && w.crowned) {
    setTile(w, tx, ty, TILE.EMPTY);
    w.stats.bricks++;
    emit(w, 'break', tx + 0.5, ty + 0.5);
  } else {
    if (t === TILE.BRICK) w.bumps.push({ tx, ty, t: 0 });
    emit(w, 'bump', tx + 0.5, ty + 1);
  }
  // Whatever stood on the block gets knocked: enemies die, coins are taken.
  const above = { x: tx, y: ty - 1, w: 1, h: 1 };
  for (const e of w.enemies) {
    if (e.deadT !== -1 || !overlaps(e, above)) continue;
    killEnemy(w, e);
    emit(w, 'stomp', e.x + e.w / 2, e.y, 1);
  }
  if (tile(w, tx, ty - 1) === TILE.COIN) {
    setTile(w, tx, ty - 1, TILE.EMPTY);
    gainCoin(w);
    emit(w, 'coin', tx + 0.5, ty - 0.5);
  }
}

/** A coin: counted once, the Double Aura extra goes to the bonus. */
function gainCoin(w: World) {
  w.stats.coins++;
  w.stats.bonus += POINTS.coin * (w.coinMul - 1);
}

function killEnemy(w: World, e: Enemy) {
  e.deadT = 0.45;
  e.vx = 0; e.vy = 0;
  w.stats.stomps++;
}

export function hurt(w: World) {
  if (w.invuln > 0 || w.phase !== 'play') return;
  if (w.crowned) {
    w.crowned = false;
    w.invuln = INVULN_HIT;
    w.hurtT = HURT_LOOK;
    emit(w, 'hurt', w.hero.x + w.hero.w / 2, w.hero.y);
    return;
  }
  die(w, false);
}

function die(w: World, pit: boolean) {
  if (w.mode === 'story') w.stats.deaths++;
  w.phase = 'dying';
  w.phaseT = 0;
  w.pitDeath = pit;
  w.crowned = false;
  w.riding = null;
  w.hero.vx = 0;
  w.hero.vy = pit ? 0 : -13;
  emit(w, 'die', w.hero.x + w.hero.w / 2, Math.min(w.hero.y, ROWS - 2), pit ? 1 : 0);
}

function stepDying(w: World, dt: number) {
  w.phaseT += dt;
  w.levelTime += dt;
  const h = w.hero;
  if (!w.pitDeath && w.phaseT > 0.25) {
    h.vy = Math.min(PHYS.terminal, h.vy + PHYS.gravity * dt);
    h.y += h.vy * dt;
  }
  if (w.phaseT < DYING_SECONDS) return;
  // Story has no lives: every death respawns.
  if (w.mode === 'endless') w.lives--;
  if (w.mode === 'endless' && w.lives <= 0) {
    w.phase = 'done';
    w.result = 'lost';
    emit(w, 'over', h.x, h.y);
    return;
  }
  placeHero(w, w.checkpointIdx >= 0 ? w.level.checkpoints[w.checkpointIdx] : w.level.start);
  w.invuln = INVULN_RESPAWN;
  w.phase = 'play';
  w.phaseT = 0;
  emit(w, 'respawn', w.hero.x, w.hero.y);
}

function stepEnemies(w: World, dt: number, prevBottom: number, jumpHeld: boolean) {
  const h = w.hero;
  const k = w.ectx;
  k.solid = w.solid; k.hero = h; k.rand = w.rand;
  let stomped = false;
  for (const e of w.enemies) {
    if (e.deadT !== -1) continue;
    if (!e.active) {
      if (Math.abs(e.x - h.x) > Math.max(14, w.viewCols * 0.5 + 3)) continue;
      e.active = true;
    }
    e.px = e.x; e.py = e.y;
    if (e.landT > 0) e.landT -= dt;
    if (e.stunT > 0) {
      // Knocked back by the blade: its behaviour waits.
      e.stunT -= dt;
      e.vx *= Math.pow(0.02, dt);
      if (!ENEMY_KINDS[e.kind].flies) e.vy = Math.min(PHYS.terminal, e.vy + PHYS.gravity * dt);
      else e.vy *= Math.pow(0.02, dt);
      moveBody(e, dt, w.solid, k.c);
    } else {
      ENEMY_KINDS[e.kind].step(e, k, dt);
    }
    // A walker on a walkway rides it.
    if (!ENEMY_KINDS[e.kind].flies && e.onGround) {
      const d = walkwayUnder(w, e);
      if (d !== 0) moveX(e, d * WALKWAY_SPEED * dt, w.solid, k.c);
    }
    if (e.y > ROWS + 2) { e.deadT = 0; continue; }

    if (w.phase !== 'play') continue;
    const hit = stompOrHurt(h, prevBottom, e);
    if (hit === 'stomp' && !stomped) {
      stomped = true;
      killEnemy(w, e);
      stompBounce(h, jumpHeld);
      w.combo++;
      emit(w, 'stomp', e.x + e.w / 2, e.y, w.combo);
    } else if (hit === 'hurt' && w.power && POWERS[w.power.kind].knockout) {
      // Priority Boarding: it bounces off her and is out.
      killEnemy(w, e);
      emit(w, 'stomp', e.x + e.w / 2, e.y, 1);
    } else if (hit === 'hurt' && !stomped && w.pogoSafe <= 0) {
      hurt(w);
    }
  }
}

function stepCrowns(w: World, dt: number) {
  const h = w.hero;
  const c = w.c;
  for (const cr of w.crowns) {
    if (cr.emerge > 0) {
      cr.emerge = Math.max(0, cr.emerge - dt);
      cr.y = cr.baseY - (1 - cr.emerge / 0.6) * cr.h;
      if (cr.emerge === 0) { cr.y = cr.baseY - cr.h - 0.01; cr.vx = 2.6 * cr.dir; }
    } else {
      cr.vx = 2.6 * cr.dir;
      cr.vy = Math.min(PHYS.terminal, cr.vy + PHYS.gravity * dt);
      moveBody(cr, dt, w.solid, c);
      if (c.wall !== 0) cr.dir = (-c.wall) as 1 | -1;
    }
    if (overlaps(h, cr)) {
      cr.y = ROWS + 10;
      w.crowned = true;
      emit(w, 'power', cr.x + cr.w / 2, cr.y);
    }
  }
  if (w.crowns.length) w.crowns = w.crowns.filter(cr => cr.y < ROWS + 2);
}

function grabPole(w: World) {
  const h = w.hero;
  const pole = w.level.pole;
  const bonus = flagBonus(h.y, pole);
  if (unlocksSecret(w.levelIndex, h.y, pole)) {
    w.secretUnlocked = true;
    emit(w, 'secret', pole.x + 0.5, pole.top);
  }
  w.stats.flag += bonus;
  emit(w, 'flag', pole.x + 0.5, h.y, bonus);
  w.pendingTime = timeBonus(w.levelTime);
  w.pendingClear = true;
  w.phase = 'pole';
  w.phaseT = 0;
  w.riding = null;
  h.vx = 0; h.vy = 0;
  const dir = w.level.goalDir;
  h.x = dir > 0 ? pole.x + 0.5 - h.w : pole.x + 0.5;
  h.facing = dir;
}

function stepPole(w: World, dt: number) {
  w.phaseT += dt;
  const h = w.hero;
  const floor = w.level.pole.base + 1;
  h.y = Math.min(floor - h.h, h.y + 9 * dt);
  w.flagDrop = Math.min(1, w.flagDrop + dt * 1.2);
  if (h.y + h.h >= floor - 1e-6 && w.phaseT > 0.5) {
    w.phaseT = 0;
    if (w.levelIndex === SECRET_INDEX) { w.phase = 'finale'; return; }
    h.x = w.level.goalDir > 0 ? w.level.pole.x + 0.55 : w.level.pole.x + 0.45 - h.w;
    h.onGround = true;
    w.phase = 'walk';
  }
}

/** The walk off stage after the flag: the hero runs right on his own. */
const WALK_OFF: HeroInput = { move: 1, jumpHeld: false };
const WALK_OFF_LEFT: HeroInput = { move: -1, jumpHeld: false };

function stepWalk(w: World, dt: number) {
  w.phaseT += dt;
  const h = w.hero;
  stepHero(h, w.level.goalDir > 0 ? WALK_OFF : WALK_OFF_LEFT, dt, w.solid, w.c, w.gravityScale);
  if (Math.abs(h.x - w.level.pole.x) > 6.6 || w.phaseT > 3) {
    w.hidden = true;
    w.phase = 'tally';
    w.phaseT = 0;
  }
}

/** Count the time bonus into the score, then the clear bonus. True when done. */
function tallyStep(w: World, dt: number): boolean {
  if (w.pendingTime > 0) {
    const before = Math.floor(w.pendingTime / 50);
    const take = Math.min(w.pendingTime, TALLY_RATE * dt);
    w.pendingTime -= take;
    w.stats.time += take;
    if (w.pendingTime < 1e-6) { w.stats.time = Math.round(w.stats.time); w.pendingTime = 0; }
    if (Math.floor(w.pendingTime / 50) !== before) emit(w, 'tick', 0, 0);
    return false;
  }
  if (w.pendingClear) {
    w.pendingClear = false;
    w.stats.clears++;
    emit(w, 'clear', 0, 0, w.levelIndex);
    return false;
  }
  return true;
}

function stepTally(w: World, dt: number) {
  if (!tallyStep(w, dt)) return;
  w.phaseT += dt;
  if (w.phaseT < 1.2) return;
  if (w.mode === 'story') {
    // The view shows the story card, then starts `next`.
    w.phase = 'done';
    w.result = 'won';
    w.next = w.levelId ? nextStoryId(w.levelId) : null;
    emit(w, 'win', 0, 0);
    return;
  }
  if (w.levelIndex === SECRET_GATE) {
    if (w.secretUnlocked) { loadLevel(w, SECRET_INDEX); return; }
    w.phase = 'done';
    w.result = 'won';
    emit(w, 'win', 0, 0);
    return;
  }
  loadLevel(w, w.levelIndex + 1);
}

function stepFinale(w: World, dt: number) {
  tallyStep(w, dt);
  w.phaseT += dt;
  if (w.phaseT < FINALE_SECONDS) return;
  while (!tallyStep(w, 1)) { /* settle any bonus left */ }
  w.phase = 'done';
  w.result = 'secret';
  emit(w, 'win', 0, 0, 1);
}

/** Set the secret used for the fourth level (from the server, or the fallback). */
export function setSecret(w: World, s: Partial<Secret> | null) {
  w.secret = {
    name: s?.name?.trim() || SECRET_FALLBACK.name,
    message: s?.message?.trim() || SECRET_FALLBACK.message,
  };
}
