/**
 * Every power is one row of POWERS: its name, how long it lasts, and what
 * it changes while it runs. Powers are optional by design: a reward or a
 * help before a hard spot, never a gate (tests prove every level and every
 * memory can be reached without one). One runs at a time; taking another
 * replaces it. The world reads the running row's fields every step and never
 * switches on a power's name.
 *
 * Chapter 1 (Austin) places Bat Wings and Taco Rush. The other rows belong
 * to later chapters and stay `live: false` until their effects are built.
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
}

const BASE = { live: true, runMul: 1, magnet: 0, glideFall: 0 } as const;

export const POWERS: Readonly<Record<PowerKind, PowerDef>> = {
  batWings: { ...BASE, name: 'Bat Wings', duration: 10, glideFall: 2.2 },
  tacoRush: { ...BASE, name: 'Taco Rush', duration: 8, runMul: 1.4, magnet: 3 },
  // TODO(chapter 2): enemies bounce off her and are knocked out.
  priorityBoarding: { ...BASE, name: 'Priority Boarding', duration: 8, live: false },
  // TODO(chapter 3): the dash recharges at once, so dashes chain.
  wickedFast: { ...BASE, name: 'Wicked Fast', duration: 8, live: false },
  // TODO(chapter 4): every landing sends a shockwave that stuns enemies nearby.
  encore: { ...BASE, name: 'Encore', duration: 10, live: false },
};

/** The legend char of each placed power. */
export const POWER_CHARS: Readonly<Record<string, PowerKind>> = { w: 'batWings', t: 'tacoRush' };
