/**
 * Every world modifier is one row of MODIFIERS: its name for the title card,
 * its weight in the seeded pick, and what it changes. The generator reads
 * `mirror` and `droneSwarm` when it builds the level; the world reads
 * `gravity`, `wind` and `coinMul` every step; the renderer reads
 * `world.modifier.id` (`blackout` turns the lights off). Nothing switches on
 * a modifier's id outside this table.
 */

export type ModifierId = 'none' | 'blackout' | 'droneSwarm' | 'lowGravity' | 'storm' | 'doubleAura' | 'mirror';
export const MODIFIER_IDS: readonly ModifierId[] = ['none', 'blackout', 'droneSwarm', 'lowGravity', 'storm', 'doubleAura', 'mirror'];

export interface ModifierDef {
  /** Title card name, '' for none. */
  name: string;
  /** Relative chance in the seeded pick. */
  weight: number;
  /** Gravity multiplier. */
  gravity: number;
  /**
   * Peak drift in a gust, tiles per second (half on the ground, none in a
   * dash). Kept under the reachability check's 15 percent run-speed margin.
   */
  wind: number;
  /** Coin value multiplier. */
  coinMul: number;
  /** The renderer turns the neon off. */
  lightsOff: boolean;
  /** The generator fills every optional drone slot. */
  droneSwarm: boolean;
  /** The generator mirrors the level: start on the right, goal on the left. */
  mirror: boolean;
}

const BASE = { gravity: 1, wind: 0, coinMul: 1, lightsOff: false, droneSwarm: false, mirror: false } as const;

export const MODIFIERS: Readonly<Record<ModifierId, ModifierDef>> = {
  none: { ...BASE, name: '', weight: 34 },
  blackout: { ...BASE, name: 'Neon Blackout', weight: 11, lightsOff: true },
  droneSwarm: { ...BASE, name: 'Drone Swarm', weight: 11, droneSwarm: true },
  lowGravity: { ...BASE, name: 'Low Gravity Night', weight: 11, gravity: 0.8 },
  storm: { ...BASE, name: 'Storm Warning', weight: 11, wind: 1.2 },
  doubleAura: { ...BASE, name: 'Double Aura', weight: 11, coinMul: 2 },
  mirror: { ...BASE, name: 'Mirror City', weight: 11, mirror: true },
};

/** One weighted pick. */
export function pickModifier(rand: () => number): ModifierId {
  let total = 0;
  for (const id of MODIFIER_IDS) total += MODIFIERS[id].weight;
  let x = rand() * total;
  for (const id of MODIFIER_IDS) {
    x -= MODIFIERS[id].weight;
    if (x < 0) return id;
  }
  return 'none';
}

/**
 * Storm gusts: 0 to 1 and back over a few seconds, with calm between, signed
 * by a direction the seed picked. Pure in time, so replays match.
 */
export function gust(t: number, dir: 1 | -1): number {
  const k = Math.sin((t / 6) * Math.PI * 2);
  return k > 0.35 ? dir * Math.min(1, (k - 0.35) / 0.4) : 0;
}
