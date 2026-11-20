import { describe, it, expect } from 'vitest';
import {
  POWERS, POWER_KINDS, createPowers, grantPower, modifiers, noModifiers, stepPowers, type PowerKind,
} from '@/components/apps/games/platformer/sim/powers';
import { LIVES, drainEvents, score } from '@/components/apps/games/platformer/sim/world';
import { G40, run, runUntil, worldOn } from '../setup/platformerWorld';

describe('Main Character powers: one table', () => {
  it('has the five powers, and only Aura Mode is live in phase 2', () => {
    expect([...POWER_KINDS].sort()).toEqual(['aura', 'boots', 'magnet', 'pound', 'spark']);
    expect(POWER_KINDS.filter(k => POWERS[k].live)).toEqual(['aura']);
  });

  it('Aura Mode lasts 8 s, kills on touch, blocks damage, scatters enemies within 6 tiles and speeds the music up', () => {
    const a = POWERS.aura;
    expect(a.duration).toBe(8);
    expect(a.killsOnTouch).toBe(true);
    expect(a.blocksDamage).toBe(true);
    expect(a.fleeRadius).toBe(6);
    expect(a.tempo).toBe(1.25);
  });

  it('grant, tick down, expire, and fold the active rows into modifiers', () => {
    const p = createPowers();
    const m = noModifiers();
    expect(modifiers(p, m)).toEqual({ killsOnTouch: false, blocksDamage: false, fleeRadius: 0, tempo: 1 });
    grantPower(p, 'aura');
    expect(p.aura).toBe(8);
    expect(modifiers(p, m).killsOnTouch).toBe(true);
    const ended: PowerKind[] = [];
    stepPowers(p, 7.9, ended);
    expect(ended).toEqual([]);
    stepPowers(p, 0.2, ended);
    expect(ended).toEqual(['aura']);
    expect(p.aura).toBe(0);
    expect(modifiers(p, m)).toEqual({ killsOnTouch: false, blocksDamage: false, fleeRadius: 0, tempo: 1 });
  });
});

describe('Main Character powers: Aura Mode in the world', () => {
  const PICKUP = ['.P..a.....c.............................', G40, G40];

  it('running into the orb takes it: 8 s of aura, a power-on event and the faster tempo', () => {
    const w = worldOn(PICKUP);
    expect(w.pickups).toEqual([{ kind: 'aura', x: 4, y: 11, taken: false }]);
    const seen: { type: string; n: number }[] = [];
    expect(runUntil(w, ww => { seen.push(...drainEvents(ww)); return ww.power.aura > 0; }, { move: 1 }, 2)).toBe(true);
    expect(w.power.aura).toBeGreaterThan(7.9);
    expect(w.pickups[0].taken).toBe(true);
    expect(seen.find(e => e.type === 'powerOn')?.n).toBe(POWER_KINDS.indexOf('aura'));
    expect(seen.find(e => e.type === 'tempo')?.n).toBe(1.25);
  });

  it('touching an enemy with aura kills it for 50 (a stomp) and costs nothing', () => {
    const w = worldOn(['.P........c.............................', G40, G40]);
    grantPower(w.power, 'aura');
    run(w, 2, { move: 1 });
    expect(w.stats.stomps).toBe(1);
    expect(score(w)).toBe(50);
    expect(w.lives).toBe(LIVES);
    expect(w.phase).toBe('play');
    expect(w.enemies.every(e => e.deadT !== -1)).toBe(true);
  });

  it('blocks damage from spikes while it lasts', () => {
    const w = worldOn(['.P.....^^...............................', G40, G40]);
    grantPower(w.power, 'aura');
    let died = false;
    run(w, 2, { move: 1 }, ww => { if (ww.phase !== 'play') died = true; });
    expect(died).toBe(false);
  });

  it('expires after 8 s with a power-off event and the normal tempo, then enemies hurt again', () => {
    const w = worldOn(['.P..............................c.......', G40, G40]);
    grantPower(w.power, 'aura');
    w.enemies = [];
    const seen: { type: string; n: number }[] = [];
    run(w, 8.1, {}, ww => seen.push(...drainEvents(ww)));
    expect(w.power.aura).toBe(0);
    expect(seen.some(e => e.type === 'powerOff')).toBe(true);
    expect(seen.filter(e => e.type === 'tempo').map(e => e.n)).toEqual([1.25, 1]);
    const v = worldOn(['.P....c.................................', G40, G40]);
    grantPower(v.power, 'aura');
    v.power.aura = 0.01;
    expect(runUntil(v, ww => ww.phase === 'dying', { move: 1 })).toBe(true);
  });

  it('walkers within 6 tiles run away from an aura hero; farther ones carry on', () => {
    const w = worldOn(['.P....c..............c..................', G40, G40]);
    const [near, far] = w.enemies;
    w.hero.x = 3;
    near.dir = -1; far.dir = -1;
    grantPower(w.power, 'aura');
    run(w, 0.3);
    expect(near.dir).toBe(1);
    expect(near.vx).toBeGreaterThan(0);
    expect(far.dir).toBe(-1);
  });

  it('drones within 6 tiles scatter away and do not dive', () => {
    const w = worldOn([
      '..........d.............................',
      '........................................',
      '........................................',
      '........................................',
      '.P......................................',
      G40, G40,
    ]);
    const e = w.enemies[0];
    run(w, 0.2);
    w.hero.x = e.x - 1;
    grantPower(w.power, 'aura');
    const x0 = e.x;
    run(w, 0.5);
    expect(e.mode).not.toBe('dive');
    expect(e.x).toBeGreaterThan(x0 + 1);
  });
});
