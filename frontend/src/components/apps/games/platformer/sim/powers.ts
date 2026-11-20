/**
 * Every power is one row of POWERS: how long it lasts and what it changes
 * while active. The world never switches on a power's name: it grants a
 * row when the hero takes its pickup, ticks them all down, and reads the
 * folded `modifiers` (kill on touch, block damage, scare radius, music
 * tempo). `w.power[kind]` is seconds left (0 = off).
 *
 * Phase 2 wires Aura Mode only. The other four rows are here so the table
 * is the one place they will live; `live: false` until phase 3 gives them
 * their effects, and no level places their pickups yet.
 */

export type PowerKind = 'aura' | 'magnet' | 'boots' | 'pound' | 'spark';
export const POWER_KINDS: readonly PowerKind[] = ['aura', 'magnet', 'boots', 'pound', 'spark'];

export type Powers = Record<PowerKind, number>;

export interface PowerDef {
  label: string;
  /** Seconds it lasts once taken. */
  duration: number;
  /** Touching an enemy kills it (scored as a stomp). */
  killsOnTouch: boolean;
  /** Enemies and spikes cannot hurt the hero (pits still can). */
  blocksDamage: boolean;
  /** Enemies within this many tiles run from the hero. */
  fleeRadius: number;
  /** Music tempo multiplier while it runs. */
  tempo: number;
  /** False until its effect is wired (phase 3). */
  live: boolean;
}

const NONE = { killsOnTouch: false, blocksDamage: false, fleeRadius: 0, tempo: 1 } as const;

export const POWERS: Readonly<Record<PowerKind, PowerDef>> = {
  aura: { label: 'AURA MODE', duration: 8, killsOnTouch: true, blocksDamage: true, fleeRadius: 6, tempo: 1.25, live: true },
  // TODO(phase 3): pull coins within a radius toward the hero.
  magnet: { label: 'RIZZ MAGNET', duration: 10, ...NONE, live: false },
  // TODO(phase 3): one extra jump in the air, recharged on landing.
  boots: { label: 'SKY BOOTS', duration: 12, ...NONE, live: false },
  // TODO(phase 3): action in the air slams down, breaks bricks below, stuns nearby enemies.
  pound: { label: 'GROUND POUND', duration: 12, ...NONE, live: false },
  // TODO(phase 3): action fires a pooled energy orb that kills what it hits.
  spark: { label: 'SPARK SHOT', duration: 12, ...NONE, live: false },
};

export function createPowers(): Powers {
  return { aura: 0, magnet: 0, boots: 0, pound: 0, spark: 0 };
}

/** Start (or refill) a power for its full duration. */
export function grantPower(p: Powers, kind: PowerKind) {
  p[kind] = POWERS[kind].duration;
}

/** Tick every running power down; push the ones that ran out into `ended` (cleared first). */
export function stepPowers(p: Powers, dt: number, ended: PowerKind[]) {
  ended.length = 0;
  for (const k of POWER_KINDS) {
    if (p[k] <= 0) continue;
    p[k] = Math.max(0, p[k] - dt);
    if (p[k] === 0) ended.push(k);
  }
}

export interface Modifiers { killsOnTouch: boolean; blocksDamage: boolean; fleeRadius: number; tempo: number }

export function noModifiers(): Modifiers {
  return { ...NONE };
}

/** Fold the running rows into one set of modifiers, written into `out`. */
export function modifiers(p: Powers, out: Modifiers): Modifiers {
  out.killsOnTouch = false; out.blocksDamage = false; out.fleeRadius = 0; out.tempo = 1;
  for (const k of POWER_KINDS) {
    if (p[k] <= 0) continue;
    const d = POWERS[k];
    if (d.killsOnTouch) out.killsOnTouch = true;
    if (d.blocksDamage) out.blocksDamage = true;
    out.fleeRadius = Math.max(out.fleeRadius, d.fleeRadius);
    out.tempo = Math.max(out.tempo, d.tempo);
  }
  return out;
}
