/**
 * Main Character physics: bodies and the tile grid. Pure: no DOM, no clock,
 * no randomness. The hero's moves (run, jump, dash, wall slide) live in
 * ./hero.ts on top of these.
 *
 * Units are tiles and seconds, with y pointing down, so the feel is the same
 * at every screen size. A body is an axis-aligned box whose (x, y) is its top
 * left corner. Collisions against the tile grid resolve one axis at a time
 * (x first, then y), in sub-steps shorter than half a tile, so even a body at
 * terminal velocity on a long frame cannot tunnel through a one-tile floor.
 */

export const PHYS = {
  /** Top run speed, tiles per second. */
  runMax: 8.5,
  /** Ground acceleration when pushing in the direction of travel. */
  accelGround: 42,
  /** Ground deceleration when pushing against the direction of travel (a skid). */
  skid: 75,
  accelAir: 30,
  /** Deceleration with no input. */
  frictionGround: 40,
  frictionAir: 9,
  /** Gravity while rising with jump held: a long, floaty rise. */
  gravityHold: 38,
  /** Gravity otherwise (released, or falling): a snappy fall. */
  gravity: 70,
  terminal: 20,
  jumpV: 18,
  /** Releasing jump early caps the upward speed to this. */
  jumpCut: 13,
  /** Seconds after leaving a ledge during which a jump still works. */
  coyote: 0.09,
  /** Seconds a jump press is remembered while airborne. */
  buffer: 0.12,
  stompBounce: 10,
  stompBounceHeld: 16,
  /** Hero hitbox, tiles. */
  heroW: 0.68,
  heroH: 1.3,
  /** Air dash: this fast, this long, gravity off. */
  dashSpeed: 22,
  dashTime: 0.16,
  /** Speed the hero keeps when a dash ends (he runs out of it). */
  dashExit: 8.5,
  /** Hit stop when a dash starts. */
  dashFreeze: 0.06,
  /** Fastest fall while pushing into a wall in the air. */
  wallSlideMax: 4,
  /** Wall jump: up this fast, away this fast. */
  wallJumpY: 16,
  wallJumpX: 10,
  /** Seconds after a wall jump that the stick is ignored. */
  wallJumpLock: 0.12,
  /** A jump this close to a wall (tiles) is a wall jump. */
  wallGrace: 0.35,
} as const;

/**
 * True when the tile at column tx, row ty blocks movement. It may carry
 * `oneWay`: tiles that only stop a body falling onto them from above.
 */
export type SolidFn = ((tx: number, ty: number) => boolean) & { oneWay?: (tx: number, ty: number) => boolean };

export interface Body {
  x: number; y: number; w: number; h: number;
  vx: number; vy: number;
  onGround: boolean;
}

/** What a move touched. Reused between steps to avoid allocations. */
export interface Contacts {
  /** -1 hit a wall on the left, 1 on the right, 0 none. */
  wall: -1 | 0 | 1;
  wallTx: number; wallTy: number;
  landed: boolean;
  groundTx: number; groundTy: number;
  /** Head hit the underside of a tile while moving up. */
  ceiling: boolean;
  ceilTx: number; ceilTy: number;
}

export function contacts(): Contacts {
  return { wall: 0, wallTx: 0, wallTy: 0, landed: false, groundTx: 0, groundTy: 0, ceiling: false, ceilTx: 0, ceilTy: 0 };
}

function resetContacts(c: Contacts) {
  c.wall = 0; c.landed = false; c.ceiling = false;
}

const EPS = 1e-6;
/** Longest sub-step, tiles. Under half a tile, so nothing skips a tile. */
const MAX_STEP = 0.4;
/** Head hits that clip a block corner by less than this slide around it. */
const CORNER = 0.24;

export function approach(v: number, target: number, delta: number): number {
  return v < target ? Math.min(target, v + delta) : Math.max(target, v - delta);
}

function overlapsSolid(b: Body, solid: SolidFn): boolean {
  const x0 = Math.floor(b.x + EPS), x1 = Math.floor(b.x + b.w - EPS);
  const y0 = Math.floor(b.y + EPS), y1 = Math.floor(b.y + b.h - EPS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solid(tx, ty)) return true;
  return false;
}

/** Move along x by dx, stopping flush against the first solid tile. */
export function moveX(b: Body, dx: number, solid: SolidFn, c: Contacts) {
  if (dx === 0) return;
  const steps = Math.ceil(Math.abs(dx) / MAX_STEP);
  const d = dx / steps;
  for (let i = 0; i < steps; i++) {
    b.x += d;
    const y0 = Math.floor(b.y + EPS), y1 = Math.floor(b.y + b.h - EPS);
    const tx = d > 0 ? Math.floor(b.x + b.w - EPS) : Math.floor(b.x + EPS);
    for (let ty = y0; ty <= y1; ty++) {
      if (!solid(tx, ty)) continue;
      if (d > 0) { b.x = tx - b.w; c.wall = 1; } else { b.x = tx + 1; c.wall = -1; }
      c.wallTx = tx; c.wallTy = ty;
      b.vx = 0;
      return;
    }
  }
}

/**
 * Move along y by dy. Landing sets onGround; a head hit reports the tile
 * under the body's centre (the one a player means to hit). A head hit that
 * only clips a corner nudges the body sideways instead, the classic courtesy.
 */
export function moveY(b: Body, dy: number, solid: SolidFn, c: Contacts) {
  if (dy === 0) return;
  const steps = Math.ceil(Math.abs(dy) / MAX_STEP);
  const d = dy / steps;
  for (let i = 0; i < steps; i++) {
    b.y += d;
    const x0 = Math.floor(b.x + EPS), x1 = Math.floor(b.x + b.w - EPS);
    if (d > 0) {
      const ty = Math.floor(b.y + b.h - EPS);
      const cx = Math.floor(b.x + b.w / 2);
      // A one-way tile counts only if the feet started this sub-step above it.
      const above = b.y + b.h - d <= ty + EPS;
      const oneWay = above ? solid.oneWay : undefined;
      let hit = -1;
      for (let tx = x0; tx <= x1; tx++) {
        if (solid(tx, ty) || oneWay?.(tx, ty)) { if (hit < 0 || tx === cx) hit = tx; }
      }
      if (hit >= 0) {
        b.y = ty - b.h; b.vy = 0; b.onGround = true;
        c.landed = true; c.groundTx = hit; c.groundTy = ty;
        return;
      }
    } else {
      const ty = Math.floor(b.y + EPS);
      const left = solid(x0, ty), right = x1 !== x0 && solid(x1, ty);
      if (!left && !right) continue;
      // Corner courtesy: only one side clipped, and only just.
      if (left !== right) {
        const shift = left ? (x0 + 1) - b.x : x1 - (b.x + b.w);
        if (Math.abs(shift) < CORNER) {
          const ox = b.x;
          b.x += shift + (shift > 0 ? EPS : -EPS);
          if (!overlapsSolid(b, solid)) continue;
          b.x = ox;
        }
      }
      const cx = Math.floor(b.x + b.w / 2);
      const hitTx = solid(cx, ty) ? cx : left ? x0 : x1;
      b.y = ty + 1; b.vy = 0;
      c.ceiling = true; c.ceilTx = hitTx; c.ceilTy = ty;
      return;
    }
  }
}

/** Move a body by its velocity for dt seconds, x then y. */
export function moveBody(b: Body, dt: number, solid: SolidFn, c: Contacts) {
  resetContacts(c);
  b.onGround = false;
  moveX(b, b.vx * dt, solid, c);
  moveY(b, b.vy * dt, solid, c);
}

/** Axis-aligned overlap of two boxes. */
export function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Stomp or side hit. A stomp needs the hero to be falling and his feet to
 * have been above the enemy's upper part on the previous step.
 */
export function stompOrHurt(hero: Body, prevBottom: number, enemy: { x: number; y: number; w: number; h: number }): 'stomp' | 'hurt' | 'none' {
  if (!overlaps(hero, enemy)) return 'none';
  if (hero.vy > 0 && prevBottom <= enemy.y + Math.min(0.45, enemy.h * 0.5)) return 'stomp';
  return 'hurt';
}
