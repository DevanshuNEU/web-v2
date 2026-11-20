/**
 * Baguettino Run physics. Pure: no DOM, no clock, no randomness.
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
} as const;

/** True when the tile at column tx, row ty blocks movement. */
export type SolidFn = (tx: number, ty: number) => boolean;

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
      let hit = -1;
      for (let tx = x0; tx <= x1; tx++) {
        if (solid(tx, ty)) { if (hit < 0 || tx === cx) hit = tx; }
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

// ─────────────────────────────────────────────────────────────────────────────
// The hero
// ─────────────────────────────────────────────────────────────────────────────

export interface Hero extends Body {
  facing: 1 | -1;
  /** Seconds of coyote time left. */
  coyote: number;
  /** Seconds a buffered jump press stays alive. */
  buffer: number;
  /** In a jump whose upward speed can still be cut by releasing. */
  cuttable: boolean;
}

export interface HeroInput { left: boolean; right: boolean; jump: boolean }

export function createHero(x: number, feetY: number): Hero {
  return {
    x: x + (1 - PHYS.heroW) / 2, y: feetY - PHYS.heroH, w: PHYS.heroW, h: PHYS.heroH,
    vx: 0, vy: 0, onGround: true, facing: 1, coyote: PHYS.coyote, buffer: 0, cuttable: false,
  };
}

/** Register a jump press (the edge, not the hold). It fires as soon as it can. */
export function pressJump(h: Hero) {
  h.buffer = PHYS.buffer;
}

export interface StepResult {
  jumped: boolean;
  /** Speed the hero hit the ground at, 0 if he did not land this step. */
  landedAt: number;
  /** Started pushing against his own motion on the ground (dust puff). */
  skidded: boolean;
}

const STEP: StepResult = { jumped: false, landedAt: 0, skidded: false };

/**
 * Advance the hero one fixed step. `gravityScale` is 1 everywhere except the
 * calm secret level. Returns a shared result object (read it before the next
 * call).
 */
export function stepHero(h: Hero, input: HeroInput, dt: number, solid: SolidFn, c: Contacts, gravityScale = 1): StepResult {
  const r = STEP;
  r.jumped = false; r.landedAt = 0; r.skidded = false;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);

  // Run: acceleration and friction, never instant velocity.
  if (dir !== 0) {
    const against = h.vx !== 0 && Math.sign(h.vx) !== dir;
    if (against && h.onGround && Math.abs(h.vx) > PHYS.runMax * 0.5 && h.facing !== dir) r.skidded = true;
    h.facing = dir as 1 | -1;
    const a = h.onGround ? (against ? PHYS.skid : PHYS.accelGround) : PHYS.accelAir;
    h.vx = approach(h.vx, dir * PHYS.runMax, a * dt);
  } else {
    h.vx = approach(h.vx, 0, (h.onGround ? PHYS.frictionGround : PHYS.frictionAir) * dt);
  }

  // Jump: coyote time after a ledge, buffer before a landing.
  if (h.onGround) h.coyote = PHYS.coyote;
  if (h.buffer > 0 && h.coyote > 0) {
    h.vy = -PHYS.jumpV;
    h.coyote = 0; h.buffer = 0;
    h.onGround = false;
    h.cuttable = true;
    r.jumped = true;
  }
  h.coyote = Math.max(0, h.coyote - dt);
  h.buffer = Math.max(0, h.buffer - dt);

  // Variable height: letting go early caps the rise.
  if (h.cuttable && !input.jump) {
    if (h.vy < -PHYS.jumpCut) h.vy = -PHYS.jumpCut;
    h.cuttable = false;
  }
  if (h.vy >= 0) h.cuttable = false;

  const g = (h.vy < 0 && input.jump ? PHYS.gravityHold : PHYS.gravity) * gravityScale;
  h.vy = Math.min(PHYS.terminal, h.vy + g * dt);

  const vyBefore = h.vy;
  moveBody(h, dt, solid, c);
  if (c.landed) r.landedAt = vyBefore;
  return r;
}

/** Bounce off a stomped enemy. Holding jump bounces higher (and can be cut). */
export function stompBounce(h: Hero, holdingJump: boolean) {
  h.vy = -(holdingJump ? PHYS.stompBounceHeld : PHYS.stompBounce);
  h.cuttable = holdingJump;
  h.onGround = false;
  h.coyote = 0;
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
