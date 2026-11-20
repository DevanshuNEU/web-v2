/**
 * The blade: one attack button, no meter. On the ground a 3-hit combo
 * (light, light, a lunging finisher); in the air a forward slash; and when
 * an enemy, spikes or a breakable is below within reach, the air swing aims
 * down by itself and a hit bounces her up (the pogo), refilling the double
 * jump and the dash, so pogos chain. Presses buffer for 0.15 s; a jump or a
 * dash cancels a swing. Every number lives in BLADE.
 *
 * The world owns the state (`world.swing`) and calls `startSwings` and
 * `stepSwing` once per step, before the hero moves, so a down-strike meets
 * spikes before she lands on them.
 */

import { PHYS } from './physics';
import type { Hero } from './hero';

export type SwingKind = 'attack1' | 'attack2' | 'attack3' | 'airSlash' | 'downStrike';
export const SWING_KINDS: readonly SwingKind[] = ['attack1', 'attack2', 'attack3', 'airSlash', 'downStrike'];

export interface SwingDef {
  /** Seconds the swing lasts. */
  duration: number;
  /** Seconds into the swing it can hit, from and to. */
  active: readonly [number, number];
  /** Earliest second the next combo swing may start (the duration for the last). */
  chainAt: number;
  /** Hitbox: reach beyond her front edge (down for the down-strike) and height. */
  reach: number;
  height: number;
  damage: number;
  /** Hit stop, seconds. */
  stop: number;
  /** Knockback speed given to what it hits, tiles per second. */
  knock: number;
  /** Forward speed during the active window (the finisher's lunge). */
  lunge: number;
}

export const BLADE = {
  /** A press is remembered this long. */
  buffer: 0.15,
  /** A ground press within this long after a combo swing ends continues the combo. */
  comboGap: 0.3,
  /** The air swing aims down when a target is this far below her feet or less. */
  downReach: 2.5,
  /** Upward speed of a pogo bounce. */
  pogo: 15,
  /** After a pogo, enemy contact cannot hurt her for this long. */
  pogoSafe: 0.15,
  /** Coins a crate and a neon sign drop. */
  crateCoins: 3,
  signCoins: 2,
  /** Seconds an enemy is knocked back and stunned. */
  stun: 0.25,
  swings: {
    attack1: { duration: 0.26, active: [0.04, 0.12], chainAt: 0.14, reach: 1.2, height: 1.1, damage: 1, stop: 0.04, knock: 5, lunge: 0 },
    attack2: { duration: 0.26, active: [0.04, 0.12], chainAt: 0.14, reach: 1.2, height: 1.1, damage: 1, stop: 0.045, knock: 5, lunge: 0 },
    attack3: { duration: 0.4, active: [0.08, 0.2], chainAt: 0.4, reach: 1.5, height: 1.2, damage: 2, stop: 0.07, knock: 9, lunge: 5 },
    airSlash: { duration: 0.26, active: [0.03, 0.13], chainAt: 0.13, reach: 1.3, height: 1.2, damage: 1, stop: 0.045, knock: 5, lunge: 0 },
    downStrike: { duration: 0.24, active: [0, 0.2], chainAt: 0.24, reach: 1.4, height: 0, damage: 1, stop: 0.05, knock: 3, lunge: 0 },
  } as Readonly<Record<SwingKind, SwingDef>>,
} as const;

const COMBO: readonly SwingKind[] = ['attack1', 'attack2', 'attack3'];

export interface Swing { kind: SwingKind; t: number; dir: 1 | -1; serial: number }

export function isGroundSwing(k: SwingKind): boolean {
  return k === 'attack1' || k === 'attack2' || k === 'attack3';
}

/** The swing's hitbox now, written into `out`. */
export function hitbox(h: Hero, s: Swing, out: { x: number; y: number; w: number; h: number }) {
  const d = BLADE.swings[s.kind];
  if (s.kind === 'downStrike') {
    out.x = h.x - 0.2; out.w = h.w + 0.4; out.y = h.y + h.h - 0.2; out.h = d.reach;
    return out;
  }
  out.w = d.reach; out.h = d.height; out.y = h.y + 0.1;
  out.x = s.dir > 0 ? h.x + h.w : h.x - d.reach;
  return out;
}

/** Is the swing in its active window? */
export function isActive(s: Swing): boolean {
  const a = BLADE.swings[s.kind].active;
  return s.t >= a[0] && s.t <= a[1];
}

/** The combo state the world keeps between swings. */
export interface BladeState {
  swing: Swing | null;
  attackBuffer: number;
  /** Index of the next ground combo swing. */
  comboNext: number;
  /** Seconds since the last ground swing ended. */
  comboT: number;
  serial: number;
}

/**
 * Start a swing from a buffered press if one can start now. `below` says
 * whether a target sits under her (the air swing aims down then). Returns
 * the swing started, or null.
 */
export function startSwing(b: BladeState, h: Hero, below: boolean): Swing | null {
  if (b.attackBuffer <= 0 || h.dashT > 0) return null;
  const cur = b.swing;
  let kind: SwingKind;
  if (h.onGround) {
    if (cur) {
      // Only a light combo swing past its chain point can be followed; the finisher must end first.
      if (cur.kind !== 'attack1' && cur.kind !== 'attack2') return null;
      if (cur.t < BLADE.swings[cur.kind].chainAt) return null;
    } else if (b.comboT > BLADE.comboGap) {
      b.comboNext = 0;
    }
    kind = COMBO[b.comboNext];
    b.comboNext = (b.comboNext + 1) % COMBO.length;
  } else {
    // In the air a target coming into reach turns a forward slash into a down-strike.
    if (cur && !(cur.kind === 'airSlash' && (below || cur.t >= BLADE.swings.airSlash.chainAt))) return null;
    kind = below ? 'downStrike' : 'airSlash';
  }
  b.attackBuffer = 0;
  b.serial++;
  b.swing = { kind, t: 0, dir: h.facing, serial: b.serial };
  return b.swing;
}

/** Advance the swing clock; true if it ended this step. */
export function tickSwing(b: BladeState, h: Hero, dt: number): boolean {
  b.attackBuffer = Math.max(0, b.attackBuffer - dt);
  const s = b.swing;
  if (!s) { b.comboT += dt; return false; }
  s.t += dt;
  const d = BLADE.swings[s.kind];
  if (d.lunge > 0 && isActive(s) && h.onGround) h.vx = s.dir * d.lunge;
  const landed = !isGroundSwing(s.kind) && h.onGround;
  if (s.t >= d.duration || landed) {
    if (isGroundSwing(s.kind)) b.comboT = 0;
    b.swing = null;
    return true;
  }
  return false;
}

/** The pogo: bounce up, refill the double jump and the dash. */
export function pogo(h: Hero) {
  h.vy = -BLADE.pogo;
  h.onGround = false;
  h.coyote = 0;
  h.cuttable = false;
  h.airJumps = PHYS.airJumps;
  h.dashReady = true;
}

