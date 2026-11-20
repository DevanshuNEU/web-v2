/**
 * Every enemy kind is one row of ENEMY_KINDS: its hitbox, whether it flies,
 * and one behaviour step. The world runs the shared rules (activation,
 * stomps, touches, death by pit) and calls the row for the rest,
 * so adding a kind never means another switch somewhere else.
 *
 *   pebble       walker for worlds 2 and 3: walks, turns at walls and ledges
 *   frog         hopper for worlds 2 and 3: hops toward the hero, never off a ledge
 *   doomCrawler  world 1 walker: a tangle of cables, turns at walls and ledges
 *   adDrone      world 1 flyer: hovers on a sine path, dives at a hero below
 *                it within 5 tiles, then climbs back to its spot; with the
 *                hero out of reach it dives at a decoy in range instead, so a
 *                player can watch the dive first
 *   eliteDrone   a rare gold drone: flies like adDrone and fires slow shots
 *                at a hero within 8 tiles
 */

import { PHYS, moveBody, type Body, type Contacts, type SolidFn } from './physics';

export type EnemyKind = 'pebble' | 'frog' | 'doomCrawler' | 'adDrone' | 'eliteDrone';
export type EnemyMode = 'walk' | 'hop' | 'hover' | 'dive' | 'climb';

export interface Enemy extends Body {
  kind: EnemyKind;
  dir: 1 | -1;
  active: boolean;
  /** Seconds left of the squashed look, then removed. -1 while alive. */
  deadT: number;
  hopT: number;
  px: number; py: number;
  landT: number;
  /** What it is doing now (the renderer picks the animation from it). */
  mode: EnemyMode;
  /** Its spot: the hover centre for a drone, the spawn for walkers. */
  homeX: number; homeY: number;
  /** Seconds along its hover path. */
  t: number;
  /** Seconds before a drone may dive again; also the dive's elapsed time. */
  cool: number;
  /** Blade hits left (a stomp kills at once). */
  hp: number;
  /** Serial of the last swing that hit it (one hit per swing). */
  lastHit: number;
  /** Seconds left knocked back by a hit; its behaviour waits. */
  stunT: number;
  /** The current (or last) dive was at a decoy, not the hero. */
  decoy: boolean;
}

/** What a behaviour may look at. Reused, never allocated per step. */
export interface EnemyCtx {
  solid: SolidFn;
  c: Contacts;
  rand: () => number;
  hero: Body;
  /** Fire a shot from the world's pool. */
  shoot(x: number, y: number, vx: number, vy: number): void;
  /** Decoys on the level (tile x, y). */
  decoys: readonly { x: number; y: number }[];
  /** A drone started a dive at a decoy. */
  decoyDive(x: number, y: number): void;
}

export interface EnemyKindDef {
  w: number; h: number;
  /** Blade hits it takes. */
  hp: number;
  flies: boolean;
  /** The mode it starts in. */
  mode: EnemyMode;
  step(e: Enemy, k: EnemyCtx, dt: number): void;
}

export const DRONE = {
  /** Hover path: half widths in tiles and angular speeds. */
  ampX: 1.4, ampY: 0.35, wX: 1.1, wY: 2.3,
  /** Dives at a hero below it within this many tiles. */
  reach: 5,
  diveSpeed: 9,
  diveMax: 0.8,
  climbSpeed: 4,
  cooldown: 1.2,
  /** Rest between decoy dives. */
  decoyCooldown: 2.5,
} as const;

export const ELITE = {
  /** Fires at a hero within this many tiles, this often, this fast. */
  range: 8,
  every: 2.4,
  shotSpeed: 3.5,
} as const;

const CRAWLER_SPEED = 2.4;
const PEBBLE_SPEED = 2.0;

function ground(solid: SolidFn, tx: number, ty: number): boolean {
  return solid(tx, ty) || !!solid.oneWay?.(tx, ty);
}

/** A walker on the ground turns around when the tile ahead of its feet is a drop. */
export function shouldTurnAtLedge(e: Body & { dir: 1 | -1 }, solid: SolidFn): boolean {
  const fx = e.dir > 0 ? e.x + e.w + 0.02 : e.x - 0.02;
  const below = Math.floor(e.y + e.h + 0.05);
  return !ground(solid, Math.floor(fx), below);
}

function fall(e: Enemy, k: EnemyCtx, dt: number) {
  e.vy = Math.min(PHYS.terminal, e.vy + PHYS.gravity * dt);
  const wasGround = e.onGround;
  moveBody(e, dt, k.solid, k.c);
  if (k.c.landed && !wasGround) e.landT = 0.12;
}

/** Walk, turn at walls and ledges. */
function walker(speed: number) {
  return (e: Enemy, k: EnemyCtx, dt: number) => {
    e.vx = e.dir * speed;
    fall(e, k, dt);
    if (k.c.wall !== 0) e.dir = (-k.c.wall) as 1 | -1;
    if (e.onGround && shouldTurnAtLedge(e, k.solid)) e.dir = -e.dir as 1 | -1;
  };
}

function frogStep(e: Enemy, k: EnemyCtx, dt: number) {
  const h = k.hero;
  if (e.onGround) {
    e.vx = 0;
    e.hopT -= dt;
    if (e.hopT <= 0) {
      const dx = h.x - e.x;
      let d: number = Math.abs(dx) < 12 ? Math.sign(dx) || e.dir : e.dir;
      // Do not hop off a ledge: look for ground where the hop lands.
      const ax = Math.floor(e.x + e.w / 2 + d * 1.8);
      const fy = Math.floor(e.y + e.h + 0.05);
      if (!k.solid(ax, fy) && !k.solid(ax, fy + 1) && !k.solid(ax, fy - 1)) d = 0;
      if (d !== 0) e.dir = d as 1 | -1;
      e.vx = d * 3.4;
      e.vy = -11;
      e.hopT = 1.1 + k.rand() * 0.7;
    }
  }
  fall(e, k, dt);
  if (k.c.wall !== 0) { e.dir = (-k.c.wall) as 1 | -1; e.vx = 0; }
}

function diveAt(e: Enemy, dx: number, dy: number, decoy: boolean) {
  const d = Math.hypot(dx, dy) || 1;
  e.mode = 'dive';
  e.vx = (dx / d) * DRONE.diveSpeed;
  e.vy = (dy / d) * DRONE.diveSpeed;
  e.dir = dx >= 0 ? 1 : -1;
  e.cool = 0;
  e.decoy = decoy;
}

function hoverAt(e: Enemy, t: number) {
  return { x: e.homeX + DRONE.ampX * Math.sin(t * DRONE.wX), y: e.homeY + DRONE.ampY * Math.sin(t * DRONE.wY) };
}

function droneStep(e: Enemy, k: EnemyCtx, dt: number) {
  const h = k.hero;
  e.onGround = false;
  if (e.mode === 'hover') {
    e.t += dt;
    if (e.cool > 0) e.cool -= dt;
    const p = hoverAt(e, e.t);
    e.vx = (p.x - e.x) / dt; e.vy = (p.y - e.y) / dt;
    e.x = p.x; e.y = p.y;
    e.dir = Math.cos(e.t * DRONE.wX) >= 0 ? 1 : -1;
    const dx = h.x + h.w / 2 - (e.x + e.w / 2), dy = h.y + h.h / 2 - (e.y + e.h / 2);
    if (e.cool > 0) return;
    if (h.y > e.y + e.h && Math.hypot(dx, dy) < DRONE.reach) {
      diveAt(e, dx, dy, false);
      return;
    }
    // The hero is out of reach: show the dive on a decoy below, if one is in range.
    for (const dc of k.decoys) {
      const ddx = dc.x + 0.5 - (e.x + e.w / 2), ddy = dc.y + 0.5 - (e.y + e.h / 2);
      if (ddy <= 0 || Math.hypot(ddx, ddy) >= DRONE.reach) continue;
      diveAt(e, ddx, ddy, true);
      k.decoyDive(dc.x + 0.5, dc.y + 0.5);
      return;
    }
    return;
  }
  if (e.mode === 'dive') {
    e.cool += dt;
    moveBody(e, dt, k.solid, k.c);
    if (k.c.landed || k.c.wall !== 0 || k.c.ceiling || e.cool >= DRONE.diveMax) { e.mode = 'climb'; e.cool = 0; }
    return;
  }
  // Climb back to the point on its path it would be at now.
  const p = hoverAt(e, e.t);
  const dx = p.x - e.x, dy = p.y - e.y;
  const d = Math.hypot(dx, dy);
  const stepLen = DRONE.climbSpeed * dt;
  if (d <= stepLen) {
    e.x = p.x; e.y = p.y; e.vx = 0; e.vy = 0;
    e.mode = 'hover';
    e.cool = e.decoy ? DRONE.decoyCooldown : DRONE.cooldown;
    return;
  }
  e.vx = (dx / d) * DRONE.climbSpeed; e.vy = (dy / d) * DRONE.climbSpeed;
  e.x += e.vx * dt; e.y += e.vy * dt;
  e.dir = dx >= 0 ? 1 : -1;
}

/** A drone that also fires. `hopT` is its reload timer. */
function eliteStep(e: Enemy, k: EnemyCtx, dt: number) {
  droneStep(e, k, dt);
  if (e.mode === 'dive') return;
  e.hopT -= dt;
  if (e.hopT > 0) return;
  const h = k.hero;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const dx = h.x + h.w / 2 - cx, dy = h.y + h.h / 2 - cy;
  const d = Math.hypot(dx, dy);
  if (d > ELITE.range || d < 1e-6) return;
  k.shoot(cx, cy, (dx / d) * ELITE.shotSpeed, (dy / d) * ELITE.shotSpeed);
  e.hopT = ELITE.every;
}

export const ENEMY_KINDS: Readonly<Record<EnemyKind, EnemyKindDef>> = {
  pebble: { w: 0.86, h: 0.8, hp: 1, flies: false, mode: 'walk', step: walker(PEBBLE_SPEED) },
  frog: { w: 0.9, h: 0.72, hp: 2, flies: false, mode: 'hop', step: frogStep },
  doomCrawler: { w: 0.9, h: 0.7, hp: 2, flies: false, mode: 'walk', step: walker(CRAWLER_SPEED) },
  adDrone: { w: 0.8, h: 0.7, hp: 1, flies: true, mode: 'hover', step: droneStep },
  eliteDrone: { w: 0.8, h: 0.7, hp: 2, flies: true, mode: 'hover', step: eliteStep },
};

/** A fresh enemy for a spawn at tile (x, y): walkers stand on the tile below, drones float in it. */
export function enemyFrom(kind: EnemyKind, x: number, y: number): Enemy {
  const def = ENEMY_KINDS[kind];
  const ex = x + (1 - def.w) / 2;
  const ey = def.flies ? y + (1 - def.h) / 2 : y + 1 - def.h;
  return {
    kind, x: ex, y: ey, w: def.w, h: def.h, vx: 0, vy: 0, onGround: !def.flies, dir: -1, active: false,
    deadT: -1, hopT: 0.8, px: ex, py: ey, landT: 0, mode: def.mode, homeX: ex, homeY: ey, t: 0, cool: 0,
    hp: def.hp, lastHit: 0, stunT: 0, decoy: false,
  };
}
