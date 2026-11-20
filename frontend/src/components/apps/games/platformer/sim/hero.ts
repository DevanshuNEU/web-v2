/**
 * The hero's moves: run, variable jump with coyote time and a jump buffer,
 * and the air dash. One step function drives a small state machine; the
 * world reads `state` and the timers, and adds the states it owns (hurt,
 * dead, victory) on top. Pure: no DOM, no clock, no randomness.
 */

import { PHYS, approach, moveBody, moveY, type Body, type Contacts, type SolidFn } from './physics';
import type { InputFrame } from '../input/frame';

export type HeroState = 'ground' | 'air' | 'dash' | 'wallSlide' | 'pound' | 'hurt' | 'dead' | 'victory';

export interface Hero extends Body {
  facing: 1 | -1;
  /** Seconds of coyote time left. */
  coyote: number;
  /** Seconds a buffered jump press stays alive. */
  buffer: number;
  /** In a jump whose upward speed can still be cut by releasing. */
  cuttable: boolean;
  state: HeroState;
  /** The dash is charged (the scarf glows). */
  dashReady: boolean;
  /** Seconds left in the current dash, 0 otherwise. */
  dashT: number;
  dashDir: 1 | -1;
  /** Wall the hero slides on: 1 is a wall on his right. */
  wallDir: -1 | 0 | 1;
  /** Seconds since he last landed. */
  landT: number;
  /** Seconds in the current state (the world ticks it once per step). */
  animT: number;
  /** Seconds the stick stays ignored after a wall jump. */
  lockT: number;
}

/** The part of the input frame the hero's body reads each step. */
export type HeroInput = Pick<InputFrame, 'move' | 'jumpHeld'>;

export function createHero(x: number, feetY: number): Hero {
  return {
    x: x + (1 - PHYS.heroW) / 2, y: feetY - PHYS.heroH, w: PHYS.heroW, h: PHYS.heroH,
    vx: 0, vy: 0, onGround: true, facing: 1, coyote: PHYS.coyote, buffer: 0, cuttable: false,
    state: 'ground', dashReady: true, dashT: 0, dashDir: 1, wallDir: 0, landT: 1, animT: 0, lockT: 0,
  };
}

/** Register a jump press (the edge, not the hold). It fires as soon as it can. */
export function pressJump(h: Hero) {
  h.buffer = PHYS.buffer;
}

/**
 * Start a dash if it is charged: along the stick, or the way he faces when
 * the stick is centred. True when a dash started.
 */
export function tryDash(h: Hero, move: number): boolean {
  if (!h.dashReady || h.dashT > 0) return false;
  const dir: 1 | -1 = move > 0.2 ? 1 : move < -0.2 ? -1 : h.facing;
  h.dashReady = false;
  h.dashT = PHYS.dashTime;
  h.dashDir = dir;
  h.facing = dir;
  h.vx = dir * PHYS.dashSpeed;
  h.vy = 0;
  h.cuttable = false;
  h.lockT = 0;
  h.wallDir = 0;
  setState(h, 'dash');
  return true;
}

export function setState(h: Hero, s: HeroState) {
  if (h.state === s) return;
  h.state = s;
  h.animT = 0;
}

/** States the world sets (hurt, dead, victory) stay until the world lets go. */
function worldOwned(s: HeroState): boolean {
  return s === 'hurt' || s === 'dead' || s === 'victory';
}

/** The state the body's motion says, unless the world holds one. */
function bodyState(h: Hero, s: HeroState) {
  if (!worldOwned(h.state)) setState(h, s);
}

export interface StepResult {
  jumped: boolean;
  /** Speed the hero hit the ground at, 0 if he did not land this step. */
  landedAt: number;
  /** Started pushing against his own motion on the ground (dust puff). */
  skidded: boolean;
  /** The dash ran out this step. */
  dashEnded: boolean;
  /** Kicked off a wall this step. */
  wallJumped: boolean;
}

const STEP: StepResult = { jumped: false, landedAt: 0, skidded: false, dashEnded: false, wallJumped: false };

/** Side of the nearest wall within `reach` tiles of the body: 1 right, -1 left, 0 none. `prefer` wins a tie. */
export function wallSide(b: Body, solid: SolidFn, reach: number, prefer: number = 0): -1 | 0 | 1 {
  const y0 = Math.floor(b.y + 0.1), y1 = Math.floor(b.y + b.h - 0.1);
  const rx = Math.floor(b.x + b.w + reach), lx = Math.floor(b.x - reach);
  let right = false, left = false;
  for (let ty = y0; ty <= y1; ty++) {
    if (solid(rx, ty)) right = true;
    if (solid(lx, ty)) left = true;
  }
  if (right && left) return prefer < 0 ? -1 : 1;
  return right ? 1 : left ? -1 : 0;
}

/**
 * Advance the hero one fixed step. `gravityScale` is 1 everywhere except the
 * calm secret level. Returns a shared result object (read it before the next
 * call).
 */
export function stepHero(h: Hero, input: HeroInput, dt: number, solid: SolidFn, c: Contacts, gravityScale = 1): StepResult {
  const r = STEP;
  r.jumped = false; r.landedAt = 0; r.skidded = false; r.dashEnded = false; r.wallJumped = false;
  h.landT += dt;

  if (h.dashT > 0) {
    stepDash(h, dt, solid, c, r);
    return r;
  }

  // Analog: a thumb part way across its zone runs part speed.
  const move = Math.max(-1, Math.min(1, input.move));
  const dir = move > 0 ? 1 : move < 0 ? -1 : 0;

  // Run: acceleration and friction, never instant velocity. Right after a
  // wall jump the stick is ignored, so the kick always clears the wall.
  if (h.lockT > 0) {
    h.lockT = Math.max(0, h.lockT - dt);
  } else if (dir !== 0) {
    const against = h.vx !== 0 && Math.sign(h.vx) !== dir;
    if (against && h.onGround && Math.abs(h.vx) > PHYS.runMax * 0.5 && h.facing !== dir) r.skidded = true;
    h.facing = dir;
    const a = h.onGround ? (against ? PHYS.skid : PHYS.accelGround) : PHYS.accelAir;
    h.vx = approach(h.vx, move * PHYS.runMax, a * dt);
  } else {
    h.vx = approach(h.vx, 0, (h.onGround ? PHYS.frictionGround : PHYS.frictionAir) * dt);
  }

  // Jump: coyote time after a ledge, buffer before a landing.
  if (h.onGround) { h.coyote = PHYS.coyote; h.dashReady = true; }
  if (h.buffer > 0 && h.coyote > 0) {
    h.vy = -PHYS.jumpV;
    h.coyote = 0; h.buffer = 0;
    h.onGround = false;
    h.cuttable = true;
    r.jumped = true;
  }
  // In the air: a wall touch recharges the dash, a jump near a wall kicks off it.
  const touch = h.onGround ? 0 : wallSide(h, solid, 0.05, dir);
  if (touch !== 0) h.dashReady = true;
  if (h.buffer > 0 && !h.onGround && h.coyote <= 0) {
    const side = wallSide(h, solid, PHYS.wallGrace, dir);
    if (side !== 0) {
      h.vy = -PHYS.wallJumpY;
      h.vx = -side * PHYS.wallJumpX;
      h.facing = side > 0 ? -1 : 1;
      h.lockT = PHYS.wallJumpLock;
      h.buffer = 0;
      h.cuttable = true;
      h.dashReady = true;
      r.wallJumped = true;
    }
  }
  h.coyote = Math.max(0, h.coyote - dt);
  h.buffer = Math.max(0, h.buffer - dt);

  // Variable height: letting go early caps the rise.
  if (h.cuttable && !input.jumpHeld) {
    if (h.vy < -PHYS.jumpCut) h.vy = -PHYS.jumpCut;
    h.cuttable = false;
  }
  if (h.vy >= 0) h.cuttable = false;

  const g = (h.vy < 0 && input.jumpHeld ? PHYS.gravityHold : PHYS.gravity) * gravityScale;
  h.vy = Math.min(PHYS.terminal, h.vy + g * dt);

  // Wall slide: falling while pushing into a wall caps the fall.
  const sliding = touch !== 0 && dir === touch && h.vy > 0 && h.lockT <= 0;
  if (sliding) h.vy = Math.min(h.vy, PHYS.wallSlideMax);
  h.wallDir = sliding ? touch : 0;

  const vyBefore = h.vy;
  moveBody(h, dt, solid, c);
  if (c.landed) { r.landedAt = vyBefore; h.landT = 0; h.dashReady = true; h.wallDir = 0; }
  bodyState(h, h.onGround ? 'ground' : h.wallDir !== 0 ? 'wallSlide' : 'air');
  return r;
}

/** A dash step: straight line, no gravity, no steering. A wall ends it early. */
function stepDash(h: Hero, dt: number, solid: SolidFn, c: Contacts, r: StepResult) {
  const t = Math.min(dt, h.dashT);
  h.dashT -= t;
  h.vx = h.dashDir * PHYS.dashSpeed;
  h.vy = 0;
  const wasGround = h.onGround;
  moveBody(h, t, solid, c);
  // Gliding along a floor keeps him on it; off a ledge he floats on.
  if (wasGround) {
    const y = h.y;
    moveY(h, 0.02, solid, c);
    if (!c.landed) h.y = y;
    h.vy = 0;
  }
  if (c.wall !== 0 || h.dashT <= 1e-9) {
    h.dashT = 0;
    h.vx = c.wall !== 0 ? 0 : h.dashDir * PHYS.dashExit;
    r.dashEnded = true;
    bodyState(h, h.onGround ? 'ground' : 'air');
  }
  if (h.onGround) h.coyote = PHYS.coyote;
}

/** Bounce off a stomped enemy. Holding jump bounces higher (and can be cut). */
export function stompBounce(h: Hero, holdingJump: boolean) {
  h.vy = -(holdingJump ? PHYS.stompBounceHeld : PHYS.stompBounce);
  h.cuttable = holdingJump;
  h.onGround = false;
  h.coyote = 0;
}
