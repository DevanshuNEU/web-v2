/**
 * The hero's moves: run, variable jump with coyote time and a jump buffer,
 * the double jump, the air dash, wall slide and wall jump. One step function drives a small state machine; the
 * world reads `state` and the timers, and adds the states it owns (hurt,
 * dead, victory) on top. Pure: no DOM, no clock, no randomness.
 */

import { PHYS, approach, moveBody, moveY, type Body, type Contacts, type SolidFn } from './physics';
import type { InputFrame } from '../input/frame';

/** Moves a story unlocks (shrines, the sword); Endless has them all. Run, jump and the double jump are always on. */
export interface Abilities { wallJump: boolean; dash: boolean; blade: boolean }
export type Ability = keyof Abilities;
/** Index of each ability in `unlock` events. */
export const ABILITIES: readonly Ability[] = ['wallJump', 'dash', 'blade'];

export type HeroState = 'ground' | 'air' | 'dash' | 'wallSlide' | 'pound' | 'hurt' | 'dead' | 'victory'
  | 'attack1' | 'attack2' | 'attack3' | 'airSlash' | 'downStrike' | 'upSlash';

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
  /** Air jumps left (the double jump): 1 or 0. Back on landing, wall contact and a wall jump. */
  airJumps: number;
  /** What she may do; the world shares its own object so a shrine unlock applies at once. */
  abilities: Abilities;
  /** Run speed multiplier from a power (1 normally). */
  runMul: number;
  /** Fastest fall while holding jump on the way down (0 = no glide). */
  glideFall: number;
  /**
   * Speed a moving walkway gives her, tiles per second, signed, on top of vx.
   * The world sets it while she stands on one; it stays through a jump until
   * she lands on plain floor or steers against it.
   */
  carry: number;
  /** Rising from an awning bounce (until the top of the rise or a fresh jump). */
  spring: boolean;
}

/** The part of the input frame the hero's body reads each step. */
export type HeroInput = Pick<InputFrame, 'move' | 'jumpHeld'>;

export function createHero(x: number, feetY: number): Hero {
  return {
    x: x + (1 - PHYS.heroW) / 2, y: feetY - PHYS.heroH, w: PHYS.heroW, h: PHYS.heroH,
    vx: 0, vy: 0, onGround: true, facing: 1, coyote: PHYS.coyote, buffer: 0, cuttable: false,
    state: 'ground', dashReady: true, dashT: 0, dashDir: 1, wallDir: 0, landT: 1, animT: 0, lockT: 0, airJumps: PHYS.airJumps,
    abilities: { wallJump: true, dash: true, blade: true }, runMul: 1, glideFall: 0, carry: 0, spring: false,
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
  if (!h.abilities.dash || !h.dashReady || h.dashT > 0) return false;
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

/** States the world sets (hurt, dead, victory, the blade swings) stay until the world lets go. */
export function worldOwned(s: HeroState): boolean {
  return s === 'hurt' || s === 'dead' || s === 'victory'
    || s === 'attack1' || s === 'attack2' || s === 'attack3' || s === 'airSlash' || s === 'downStrike' || s === 'upSlash';
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
  /** Used the air jump this step. */
  doubleJumped: boolean;
}

const STEP: StepResult = { jumped: false, landedAt: 0, skidded: false, dashEnded: false, wallJumped: false, doubleJumped: false };

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
  r.jumped = false; r.landedAt = 0; r.skidded = false; r.dashEnded = false; r.wallJumped = false; r.doubleJumped = false;
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
    h.vx = approach(h.vx, move * PHYS.runMax * h.runMul, a * dt);
  } else {
    h.vx = approach(h.vx, 0, (h.onGround ? PHYS.frictionGround : PHYS.frictionAir) * dt);
  }

  // Jump: coyote time after a ledge, buffer before a landing.
  if (h.onGround) { h.coyote = PHYS.coyote; h.dashReady = true; h.airJumps = PHYS.airJumps; }
  if (h.buffer > 0 && h.coyote > 0) {
    h.vy = -PHYS.jumpV;
    h.coyote = 0; h.buffer = 0;
    h.onGround = false;
    h.cuttable = true;
    r.jumped = true;
  }
  // In the air: a wall touch recharges the dash, a jump near a wall kicks off it.
  // Walls do nothing for him until the wall jump is unlocked.
  const walls = h.abilities.wallJump;
  const touch = h.onGround || !walls ? 0 : wallSide(h, solid, 0.05, dir);
  if (touch !== 0) { h.dashReady = true; h.airJumps = PHYS.airJumps; }
  if (walls && h.buffer > 0 && !h.onGround && h.coyote <= 0) {
    const side = wallSide(h, solid, PHYS.wallGrace, dir);
    if (side !== 0) {
      h.vy = -PHYS.wallJumpY;
      h.vx = -side * PHYS.wallJumpX;
      h.facing = side > 0 ? -1 : 1;
      h.lockT = PHYS.wallJumpLock;
      h.buffer = 0;
      h.cuttable = true;
      h.dashReady = true;
      h.airJumps = PHYS.airJumps;
      r.wallJumped = true;
    }
  }
  // The double jump: a fresh full jump in the air, after the ground and wall jumps had their chance.
  // A press just before landing waits for the ground jump instead (same
  // height, and he keeps the double jump for later).
  if (h.buffer > 0 && !h.onGround && h.coyote <= 0 && !r.wallJumped && h.airJumps > 0
    && !landsWithin(h, h.buffer, solid, PHYS.gravity * gravityScale)) {
    h.vy = -PHYS.jumpV;
    h.spring = false;
    h.airJumps--;
    h.buffer = 0;
    h.cuttable = true;
    r.doubleJumped = true;
  }
  h.coyote = Math.max(0, h.coyote - dt);
  h.buffer = Math.max(0, h.buffer - dt);

  // Variable height: letting go early caps the rise.
  if (h.cuttable && !input.jumpHeld) {
    if (h.vy < -PHYS.jumpCut) h.vy = -PHYS.jumpCut;
    h.cuttable = false;
  }
  if (h.vy >= 0) h.cuttable = false;

  if (h.spring && (h.vy >= 0 || r.jumped || r.wallJumped)) h.spring = false;
  const g = (h.spring ? PHYS.gravityHold * (input.jumpHeld ? PHYS.springHoldK : 1)
    : h.vy < 0 && input.jumpHeld ? PHYS.gravityHold : PHYS.gravity) * gravityScale;
  h.vy = Math.min(PHYS.terminal, h.vy + g * dt);

  // A glide (Bat Wings): holding jump on the way down caps the fall.
  if (h.glideFall > 0 && input.jumpHeld && h.vy > h.glideFall) h.vy = h.glideFall;

  // Wall slide: falling while pushing into a wall caps the fall.
  const sliding = touch !== 0 && dir === touch && h.vy > 0 && h.lockT <= 0;
  if (sliding) h.vy = Math.min(h.vy, PHYS.wallSlideMax);
  h.wallDir = sliding ? touch : 0;

  const vyBefore = h.vy;
  const wasGround = h.onGround;
  moveBody(h, dt, solid, c);
  if (c.landed) {
    r.landedAt = vyBefore; h.dashReady = true; h.wallDir = 0;
    // Standing still lands every tick; only a real landing restarts the count.
    if (!wasGround) h.landT = 0;
  }
  bodyState(h, h.onGround ? 'ground' : h.wallDir !== 0 ? 'wallSlide' : 'air');
  return r;
}

/** Falling, will he reach a floor within `t` seconds? Scans a few tiles under his feet. */
function landsWithin(h: Hero, t: number, solid: SolidFn, g: number): boolean {
  if (h.vy <= 0) return false;
  const feet = h.y + h.h;
  const reach = h.vy * t + 0.5 * g * t * t;
  const x0 = Math.floor(h.x + 1e-6), x1 = Math.floor(h.x + h.w - 1e-6);
  // Rows whose top is at or below his feet, down to how far he can fall in time.
  for (let ty = Math.ceil(feet - 1e-6); ty <= Math.floor(feet + reach); ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (solid(tx, ty) || solid.oneWay?.(tx, ty)) return ty - feet <= reach;
    }
  }
  return false;
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
  h.spring = false;
  h.onGround = false;
  h.coyote = 0;
}

/** An awning's bounce: up at PHYS.springV, the double jump and the dash charged again. */
export function springBounce(h: Hero) {
  h.vy = -PHYS.springV;
  h.spring = true;
  h.cuttable = false;
  h.onGround = false;
  h.coyote = 0;
  h.buffer = 0;
  h.airJumps = PHYS.airJumps;
  h.dashReady = true;
}
