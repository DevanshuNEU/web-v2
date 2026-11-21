/**
 * Every power is one row of POWERS: its name, how long it lasts, and what
 * it changes while it runs. Powers are optional by design: a reward or a
 * help before a hard spot, never a gate (tests prove every level and every
 * memory can be reached without one). One runs at a time; taking another
 * replaces it. The world reads the running row's fields every step and never
 * switches on a power's name.
 *
 * Chapter 1 (Austin) places Bat Wings and Taco Rush, chapter 2 (the trip)
 * Priority Boarding, chapter 3 (Northeastern) Wicked Fast. Encore belongs to
 * the concert and stays `live: false` until its effect is built.
 */

export type PowerKind = 'batWings' | 'tacoRush' | 'priorityBoarding' | 'wickedFast' | 'encore';
export const POWER_KINDS: readonly PowerKind[] = ['batWings', 'tacoRush', 'priorityBoarding', 'wickedFast', 'encore'];

export interface PowerDef {
  /** Card and HUD name. */
  name: string;
  /** Seconds it lasts. */
  duration: number;
  /** False until its effect is built (later chapters). */
  live: boolean;
  /** Run speed multiplier. */
  runMul: number;
  /** Coins within this many tiles fly to her (0 = off). */
  magnet: number;
  /** Fastest fall while holding jump on the way down, tiles per second (0 = no glide). */
  glideFall: number;
  /** Touching an enemy knocks it out (stomp points) and never hurts her. */
  knockout: boolean;
  /** The dash recharges the moment one ends, so dashes chain in the air. */
  chainDash: boolean;
}

const BASE = { live: true, runMul: 1, magnet: 0, glideFall: 0, knockout: false, chainDash: false } as const;

export const POWERS: Readonly<Record<PowerKind, PowerDef>> = {
  batWings: { ...BASE, name: 'Bat Wings', duration: 10, glideFall: 2.2 },
  tacoRush: { ...BASE, name: 'Taco Rush', duration: 8, runMul: 1.4, magnet: 3 },
  priorityBoarding: { ...BASE, name: 'Priority Boarding', duration: 8, knockout: true },
  wickedFast: { ...BASE, name: 'Wicked Fast', duration: 8, chainDash: true },
  // TODO(chapter 4): every landing sends a shockwave that stuns enemies nearby.
  encore: { ...BASE, name: 'Encore', duration: 10, live: false },
};

/** The legend char of each placed power. */
export const POWER_CHARS: Readonly<Record<string, PowerKind>> = { w: 'batWings', t: 'tacoRush', b: 'priorityBoarding', k: 'wickedFast' };
