/**
 * Defensive reads of the World for the pixel renderer. Contract section D
 * lists the phase 2 fields the sim exposes; until a field exists this reads
 * it as empty (arrays) or 0 (numbers) and derives what it can from the
 * phase 1 body, so the renderer works on any world. The renderer never
 * writes the world.
 */

import type { World } from '../../sim/world';

/** Hero states; the blade adds attack1 to attack3, airSlash and downStrike. */
export type HeroState = 'ground' | 'air' | 'dash' | 'wallSlide' | 'pound' | 'hurt' | 'dead' | 'victory'
  | 'attack1' | 'attack2' | 'attack3' | 'airSlash' | 'downStrike' | 'upSlash';
/** Power kinds: chapter 1 places Bat Wings and Taco Rush; the rest come later. */
export type PickupKind = 'batWings' | 'tacoRush' | 'priorityBoarding' | 'wickedFast' | 'encore';

export interface Pt { x: number; y: number }
export interface Afterimage { x: number; y: number; facing: 1 | -1; t: number }
export interface Pickup { kind: PickupKind; x: number; y: number; taken: boolean }
export interface Decor { kind: string; x: number; y: number }
export interface Light { x: number; y: number; r: number; color: string; flicker: number }
/** The running power: which, seconds left, and its full length. */
export interface Power { kind: PickupKind; t: number; total: number }

/** The section D fields, all optional here. */
interface HeroD {
  state?: HeroState; dashReady?: boolean; dashT?: number; wallDir?: -1 | 0 | 1; landT?: number; animT?: number;
}
interface WorldD {
  scarf?: readonly Pt[];
  afterimages?: readonly Afterimage[];
  power?: Partial<Power> | null;
  pickups?: readonly Pickup[];
  decor?: readonly Decor[];
  lights?: readonly Light[];
  hitFreeze?: number;
  slowMo?: number;
  modifier?: { id?: string; name?: string } | null;
  wind?: number;
  seed?: number;
}

export type ModifierId = 'blackout' | 'droneSwarm' | 'lowGravity' | 'storm' | 'doubleAura' | 'mirror';

const NONE: readonly never[] = [];

function d(w: World): WorldD { return w as unknown as WorldD; }
function num(v: unknown): number { return typeof v === 'number' && Number.isFinite(v) ? v : 0; }
function arr<T>(v: readonly T[] | undefined): readonly T[] { return Array.isArray(v) ? v : NONE; }

export const scarfOf = (w: World): readonly Pt[] => arr(d(w).scarf);
export const afterimagesOf = (w: World): readonly Afterimage[] => arr(d(w).afterimages);
export const pickupsOf = (w: World): readonly Pickup[] => arr(d(w).pickups);
/** Scenery and light sources: on the world per section D, or on its level (where the sim keeps them). */
export const decorOf = (w: World): readonly Decor[] => arr(d(w).decor ?? (w.level as { decor?: readonly Decor[] }).decor);
export const lightsOf = (w: World): readonly Light[] => arr(d(w).lights ?? (w.level as { lights?: readonly Light[] }).lights);
export const hitFreezeOf = (w: World): number => num(d(w).hitFreeze);
/** The running power, or null. */
export function powerOf(w: World): Power | null {
  const p = d(w).power;
  if (!p || typeof p.kind !== 'string' || !(num(p.t) > 0)) return null;
  return { kind: p.kind, t: num(p.t), total: Math.max(num(p.total), num(p.t), 0.001) };
}
export const seedOf = (w: World): number => num(d(w).seed);
export const windOf = (w: World): number => num(d(w).wind);
/** The run's world modifier id, or '' for none. */
export const modifierOf = (w: World): string => {
  const m = d(w).modifier;
  return m && typeof m.id === 'string' ? m.id : '';
};
/** The modifier's display name for the world card, or ''. */
export const modifierNameOf = (w: World): string => {
  const m = d(w).modifier;
  return m && typeof m.name === 'string' ? m.name : '';
};

/** What the renderer needs to pose the hero. */
export interface HeroPose {
  state: HeroState;
  facing: 1 | -1;
  vx: number; vy: number;
  /** Seconds in the current state. */
  animT: number;
  /** Seconds since landing. */
  landT: number;
  wallDir: -1 | 0 | 1;
  dashT: number;
}

/** Old worlds count down from this after a landing (world.landT). */
const OLD_LAND = 0.14;

function fallbackState(w: World): HeroState {
  switch (w.phase) {
    case 'dying': return 'dead';
    case 'tally': case 'finale': case 'done': return 'victory';
    case 'pole': return 'air';
    default: return w.hero.onGround ? 'ground' : 'air';
  }
}

export function readHero(out: HeroPose, w: World): HeroPose {
  const h = w.hero as World['hero'] & HeroD;
  out.state = typeof h.state === 'string' ? h.state : fallbackState(w);
  out.facing = h.facing < 0 ? -1 : 1;
  out.vx = num(h.vx); out.vy = num(h.vy);
  out.animT = typeof h.animT === 'number' ? h.animT : w.t;
  // The world's landing countdown is set only on a real landing; prefer it
  // (the hero's own landT is also reset by every grounded tick).
  out.landT = typeof w.landT === 'number' ? (w.landT > 0 ? OLD_LAND - w.landT : 1) : typeof h.landT === 'number' ? h.landT : 1;
  out.wallDir = h.wallDir === 1 || h.wallDir === -1 ? h.wallDir : 0;
  out.dashT = num(h.dashT);
  return out;
}

/** Scarf glow: dash ready. A world without dashes always shows it ready. */
export function dashReadyOf(w: World): boolean {
  const v = (w.hero as World['hero'] & HeroD).dashReady;
  return typeof v === 'boolean' ? v : true;
}
