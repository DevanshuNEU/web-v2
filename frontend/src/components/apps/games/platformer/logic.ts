/**
 * Baguettino Run rules: the world, enemies, blocks, scoring, the flag, lives
 * and the secret level. Pure and deterministic (inject `rand`); the view only
 * feeds input, calls `stepWorld` at a fixed rate, drains `events` for sound
 * and juice, and draws.
 */

import {
  PHYS, contacts, createHero, moveBody, moveX, moveY, overlaps, pressJump, stepHero, stompBounce, stompOrHurt,
  type Body, type Contacts, type Hero, type HeroInput, type SolidFn,
} from './physics';
import { MAIN_LEVELS, MAIN_LEVEL_COUNT, ROWS, SECRET_FALLBACK, TILE, isSolidTile, secretLevel, type EnemyKind, type Level } from './level';

export const LIVES = 3;
export const POINTS = { coin: 10, stomp: 50, brick: 20, clear: 1000, timeMax: 1000, flagTop: 2000, flagMax: 1000 } as const;
/** Time bonus lost per whole second spent in a level. */
export const TIME_DECAY = 5;
/** Points per second the clear tally counts up at. */
export const TALLY_RATE = 1500;
export const DYING_SECONDS = 1.4;
export const FINALE_SECONDS = 7;
export const CARD_SECONDS = 2.4;
export const INVULN_HIT = 1.6;
export const INVULN_RESPAWN = 1.2;
/** Index of the third level, whose flag top unlocks the secret one. */
export const SECRET_GATE = 2;
export const SECRET_INDEX = 3;

export interface Stats { coins: number; stomps: number; bricks: number; flag: number; clears: number; time: number }

export function scoreOf(s: Stats): number {
  return s.coins * POINTS.coin + s.stomps * POINTS.stomp + s.bricks * POINTS.brick + s.flag + s.clears * POINTS.clear + s.time;
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

export interface Enemy extends Body {
  kind: EnemyKind;
  dir: 1 | -1;
  active: boolean;
  /** Seconds left of the squashed look, then removed. -1 while alive. */
  deadT: number;
  hopT: number;
  px: number; py: number;
  landT: number;
}

export interface Platform { x0: number; y0: number; x: number; y: number; w: number; h: number; axis: 'x' | 'y'; px: number; py: number }
export interface Crown extends Body { dir: 1 | -1; emerge: number; baseY: number }
export interface Pop { x: number; y: number; t: number }
export interface Bump { tx: number; ty: number; t: number }
export interface Camera { x: number; y: number; look: number; px: number; py: number }

export type Phase = 'play' | 'dying' | 'pole' | 'walk' | 'tally' | 'finale' | 'done';
export type Result = 'lost' | 'won' | 'secret';

export type EventType =
  | 'jump' | 'land' | 'skid' | 'coin' | 'stomp' | 'bump' | 'break' | 'crown' | 'power'
  | 'hurt' | 'die' | 'respawn' | 'checkpoint' | 'flag' | 'secret' | 'tick' | 'clear'
  | 'level' | 'over' | 'win';

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
  input: HeroInput;
  enemies: Enemy[];
  platforms: Platform[];
  crowns: Crown[];
  pops: Pop[];
  bumps: Bump[];
  riding: Platform | null;
  phase: Phase;
  phaseT: number;
  pitDeath: boolean;
  t: number;
  levelTime: number;
  lives: number;
  crowned: boolean;
  invuln: number;
  checkpointHit: boolean;
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
  rand: () => number;
  c: Contacts;
}

const PLATFORM_AMP = 2.5;
const PLATFORM_PERIOD = 4.2;
const PLATFORM_H = 0.5;

function makeSolid(tiles: Uint8Array, cols: number): SolidFn {
  return (tx, ty) => {
    if (tx < 0 || tx >= cols) return true;
    if (ty < 0 || ty >= ROWS) return false;
    return isSolidTile(tiles[ty * cols + tx]);
  };
}

function enemyFrom(kind: EnemyKind, x: number, y: number): Enemy {
  const w = kind === 'pebble' ? 0.86 : 0.9;
  const h = kind === 'pebble' ? 0.8 : 0.72;
  const ex = x + (1 - w) / 2, ey = y + 1 - h;
  return { kind, x: ex, y: ey, w, h, vx: 0, vy: 0, onGround: true, dir: -1, active: false, deadT: -1, hopT: 0.8, px: ex, py: ey, landT: 0 };
}

export interface WorldOptions {
  levelIndex?: number;
  rand?: () => number;
  secret?: Secret;
  viewCols?: number;
  viewRows?: number;
}

export function createWorld(o: WorldOptions = {}): World {
  const level = MAIN_LEVELS[0];
  const w: World = {
    levelIndex: 0, level, tiles: level.tiles.slice(), solid: () => false,
    hero: createHero(level.start.x, level.start.y), heroPx: 0, heroPy: 0, hidden: false,
    input: { left: false, right: false, jump: false },
    enemies: [], platforms: [], crowns: [], pops: [], bumps: [], riding: null,
    phase: 'play', phaseT: 0, pitDeath: false, t: 0, levelTime: 0,
    lives: LIVES, crowned: false, invuln: 0, checkpointHit: false, combo: 0,
    stats: { coins: 0, stomps: 0, bricks: 0, flag: 0, clears: 0, time: 0 },
    pendingTime: 0, pendingClear: false, flagDrop: 0,
    secretUnlocked: false, secret: o.secret ?? { ...SECRET_FALLBACK }, result: null,
    events: [], cam: { x: 0, y: 0, look: 0, px: 0, py: 0 },
    viewCols: o.viewCols ?? 17, viewRows: o.viewRows ?? 13,
    cardT: 0, landT: 0, jumpT: 0, rand: o.rand ?? Math.random, c: contacts(),
  };
  loadLevel(w, o.levelIndex ?? 0);
  return w;
}

export function levelFor(w: World, index: number): Level {
  return index < MAIN_LEVEL_COUNT ? MAIN_LEVELS[index] : secretLevel(w.secret.name);
}

export function loadLevel(w: World, index: number) {
  enterLevel(w, index, levelFor(w, index));
}

/** Enter a level at a given index. Tests use it to play hand-made levels. */
export function enterLevel(w: World, index: number, level: Level) {
  w.levelIndex = index;
  w.level = level;
  w.tiles = level.tiles.slice();
  w.solid = makeSolid(w.tiles, level.cols);
  w.enemies = level.enemies.map(e => enemyFrom(e.kind, e.x, e.y));
  w.platforms = level.platforms.map(p => ({ x0: p.x, y0: p.y, x: p.x, y: p.y, w: p.w, h: PLATFORM_H, axis: p.axis, px: p.x, py: p.y }));
  w.crowns = []; w.pops = []; w.bumps = [];
  w.checkpointHit = false;
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
  w.heroPx = w.hero.x; w.heroPy = w.hero.y;
  w.hidden = false;
  w.riding = null;
  w.combo = 0;
  w.landT = 0; w.jumpT = 0;
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

/** Register a jump press (keyboard down or thumb down). */
export function jumpPressed(w: World) {
  if (w.phase === 'play') pressJump(w.hero);
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

export function stepWorld(w: World, dt: number) {
  if (w.phase === 'done') return;
  w.t += dt;
  if (w.cardT > 0) w.cardT = Math.max(0, w.cardT - dt);
  if (w.landT > 0) w.landT = Math.max(0, w.landT - dt);
  if (w.jumpT > 0) w.jumpT = Math.max(0, w.jumpT - dt);
  w.heroPx = w.hero.x; w.heroPy = w.hero.y;

  stepPlatforms(w);
  for (const b of w.bumps) b.t += dt;
  if (w.bumps.length && w.bumps[0].t > 0.18) w.bumps = w.bumps.filter(b => b.t <= 0.18);
  for (const p of w.pops) p.t += dt;
  if (w.pops.length && w.pops[0].t > 0.55) w.pops = w.pops.filter(p => p.t <= 0.55);

  switch (w.phase) {
    case 'play': stepPlay(w, dt); break;
    case 'dying': stepDying(w, dt); break;
    case 'pole': stepPole(w, dt); break;
    case 'walk': stepWalk(w, dt); break;
    case 'tally': stepTally(w, dt); break;
    case 'finale': stepFinale(w, dt); break;
  }
  for (const e of w.enemies) if (e.deadT >= 0) e.deadT -= dt;
  if (w.enemies.some(e => e.deadT < 0 && e.deadT !== -1)) w.enemies = w.enemies.filter(e => e.deadT === -1 || e.deadT >= 0);
  stepCamera(w, dt);
}

function stepPlatforms(w: World) {
  const k = Math.sin((w.t / PLATFORM_PERIOD) * Math.PI * 2);
  for (const p of w.platforms) {
    p.px = p.x; p.py = p.y;
    if (p.axis === 'x') p.x = p.x0 + PLATFORM_AMP * k;
    else p.y = p.y0 + PLATFORM_AMP * k;
  }
}

function stepPlay(w: World, dt: number) {
  const h = w.hero;
  const c = w.c;
  w.levelTime += dt;
  if (w.invuln > 0) w.invuln = Math.max(0, w.invuln - dt);

  // Ride a moving platform: carry the hero by its motion first.
  if (w.riding) {
    const p = w.riding;
    c.wall = 0; c.landed = false; c.ceiling = false;
    moveX(h, p.x - p.px, w.solid, c);
    moveY(h, p.y - p.py, w.solid, c);
  }

  const wasGround = h.onGround;
  const prevBottom = h.y + h.h;
  const r = stepHero(h, w.input, dt, w.solid, c, w.level.gravity);
  if (r.jumped) { emit(w, 'jump', h.x + h.w / 2, prevBottom); w.jumpT = 0.16; }
  if (r.skidded) emit(w, 'skid', h.x + h.w / 2, h.y + h.h, -h.facing);

  // One-way landing on moving platforms.
  w.riding = null;
  if (h.vy >= 0) {
    for (const p of w.platforms) {
      if (h.x + h.w <= p.x || h.x >= p.x + p.w) continue;
      if (prevBottom <= p.y + 0.12 && h.y + h.h >= p.y) {
        h.y = p.y - h.h; h.vy = 0; h.onGround = true;
        w.riding = p;
        if (!wasGround) landed(w, r.landedAt || 8);
        break;
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

  if (h.y > ROWS + 0.5) { die(w, true); return; }

  const cp = w.level.checkpoint;
  if (cp && !w.checkpointHit && h.x + h.w / 2 >= cp.x) {
    w.checkpointHit = true;
    emit(w, 'checkpoint', cp.x + 0.5, cp.y - 1);
  }

  stepEnemies(w, dt, prevBottom);
  if (w.phase !== 'play') return;
  stepCrowns(w, dt);

  const pole = w.level.pole;
  const zone = { x: pole.x + 0.4, y: pole.top, w: 0.2, h: pole.base + 1 - pole.top };
  if (overlaps(h, zone)) grabPole(w);
}

function landed(w: World, speed: number) {
  w.landT = 0.14;
  emit(w, 'land', w.hero.x + w.hero.w / 2, w.hero.y + w.hero.h, speed);
}

function collectCoins(w: World, b: Body) {
  const x0 = Math.floor(b.x), x1 = Math.floor(b.x + b.w - 1e-6);
  const y0 = Math.floor(b.y), y1 = Math.floor(b.y + b.h - 1e-6);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tile(w, tx, ty) !== TILE.COIN) continue;
      setTile(w, tx, ty, TILE.EMPTY);
      w.stats.coins++;
      emit(w, 'coin', tx + 0.5, ty + 0.5);
    }
  }
}

function hitBlock(w: World, tx: number, ty: number) {
  const t = tile(w, tx, ty);
  if (t === TILE.AURA) {
    setTile(w, tx, ty, TILE.USED);
    w.stats.coins++;
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
    w.stats.coins++;
    emit(w, 'coin', tx + 0.5, ty - 0.5);
  }
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
    emit(w, 'hurt', w.hero.x + w.hero.w / 2, w.hero.y);
    return;
  }
  die(w, false);
}

function die(w: World, pit: boolean) {
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
  w.lives--;
  if (w.lives <= 0) {
    w.phase = 'done';
    w.result = 'lost';
    emit(w, 'over', h.x, h.y);
    return;
  }
  const cp = w.level.checkpoint;
  placeHero(w, w.checkpointHit && cp ? cp : w.level.start);
  w.invuln = INVULN_RESPAWN;
  w.phase = 'play';
  w.phaseT = 0;
  emit(w, 'respawn', w.hero.x, w.hero.y);
}

function stepEnemies(w: World, dt: number, prevBottom: number) {
  const h = w.hero;
  const c = w.c;
  let stomped = false;
  for (const e of w.enemies) {
    if (e.deadT !== -1) continue;
    if (!e.active) {
      if (Math.abs(e.x - h.x) > Math.max(14, w.viewCols * 0.5 + 3)) continue;
      e.active = true;
    }
    e.px = e.x; e.py = e.y;
    if (e.landT > 0) e.landT -= dt;
    if (e.kind === 'pebble') {
      e.vx = e.dir * 2.0;
    } else if (e.onGround) {
      e.vx = 0;
      e.hopT -= dt;
      if (e.hopT <= 0) {
        const dx = h.x - e.x;
        let d: number = Math.abs(dx) < 12 ? Math.sign(dx) || e.dir : e.dir;
        // Do not hop off a ledge: look for ground where the hop lands.
        const ax = Math.floor(e.x + e.w / 2 + d * 1.8);
        const fy = Math.floor(e.y + e.h + 0.05);
        if (!w.solid(ax, fy) && !w.solid(ax, fy + 1) && !w.solid(ax, fy - 1)) d = 0;
        if (d !== 0) e.dir = d as 1 | -1;
        e.vx = d * 3.4;
        e.vy = -11;
        e.hopT = 1.1 + w.rand() * 0.7;
      }
    }
    e.vy = Math.min(PHYS.terminal, e.vy + PHYS.gravity * dt);
    const wasGround = e.onGround;
    moveBody(e, dt, w.solid, c);
    if (c.wall !== 0) { e.dir = (-c.wall) as 1 | -1; if (e.kind === 'frog') e.vx = 0; }
    if (c.landed && !wasGround) e.landT = 0.12;
    if (e.kind === 'pebble' && e.onGround && shouldTurnAtLedge(e, w.solid)) e.dir = -e.dir as 1 | -1;
    if (e.y > ROWS + 2) { e.deadT = 0; continue; }

    if (w.phase !== 'play') continue;
    const hit = stompOrHurt(h, prevBottom, e);
    if (hit === 'stomp' && !stomped) {
      stomped = true;
      killEnemy(w, e);
      stompBounce(h, w.input.jump);
      w.combo++;
      emit(w, 'stomp', e.x + e.w / 2, e.y, w.combo);
    } else if (hit === 'hurt' && !stomped) {
      hurt(w);
    }
  }
}

/** A walker on the ground turns around when the tile ahead of its feet is a drop. */
export function shouldTurnAtLedge(e: Body & { dir: 1 | -1 }, solid: SolidFn): boolean {
  const fx = e.dir > 0 ? e.x + e.w + 0.02 : e.x - 0.02;
  const below = Math.floor(e.y + e.h + 0.05);
  return !solid(Math.floor(fx), below);
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
  h.x = pole.x + 0.5 - h.w;
  h.facing = 1;
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
    h.x = w.level.pole.x + 0.55;
    h.onGround = true;
    w.phase = 'walk';
  }
}

function stepWalk(w: World, dt: number) {
  w.phaseT += dt;
  const h = w.hero;
  stepHero(h, { left: false, right: true, jump: false }, dt, w.solid, w.c, w.level.gravity);
  if (h.x > w.level.pole.x + 6.6 || w.phaseT > 3) {
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
