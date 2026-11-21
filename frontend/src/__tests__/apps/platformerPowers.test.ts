import { describe, it, expect } from 'vitest';
import { POWERS, POWER_KINDS } from '@/components/apps/games/platformer/sim/powers';
import { PHYS } from '@/components/apps/games/platformer/sim/physics';
import { drainEvents } from '@/components/apps/games/platformer/sim/world';
import { FLAT, G40, run, runUntil, worldOn } from '../setup/platformerWorld';

describe('Main Character powers: one table, optional, one at a time', () => {
  it('has Bat Wings, Taco Rush, Priority Boarding and Wicked Fast live, the concert\'s row marked later', () => {
    expect([...POWER_KINDS]).toEqual(['batWings', 'tacoRush', 'priorityBoarding', 'wickedFast', 'encore']);
    expect(POWER_KINDS.filter(k => POWERS[k].live)).toEqual(['batWings', 'tacoRush', 'priorityBoarding', 'wickedFast']);
    expect(POWERS.batWings.duration).toBe(10);
    expect(POWERS.tacoRush.duration).toBe(8);
    expect(POWERS.tacoRush.runMul).toBeCloseTo(1.4, 9);
    expect(POWERS.tacoRush.magnet).toBe(3);
  });

  it('w is Bat Wings, t is Taco Rush: running into one starts it with a powerOn event, and it runs out with powerOff', () => {
    const w = worldOn(['.P..w...................................', G40, G40]);
    expect(w.power).toBeNull();
    expect(w.pickups).toEqual([{ kind: 'batWings', x: 4, y: 11, taken: false }]);
    const seen: { type: string; n: number }[] = [];
    expect(runUntil(w, ww => { seen.push(...drainEvents(ww)); return ww.power !== null; }, { move: 1 }, 2)).toBe(true);
    expect(w.power).toEqual({ kind: 'batWings', t: expect.any(Number), total: 10 });
    expect(seen.find(e => e.type === 'powerOn')?.n).toBe(POWER_KINDS.indexOf('batWings'));
    run(w, 10.1, {}, ww => seen.push(...drainEvents(ww)));
    expect(w.power).toBeNull();
    expect(seen.filter(e => e.type === 'powerOff').map(e => e.n)).toEqual([0]);
  });

  it('a new power replaces the running one', () => {
    const w = worldOn(['.P..w..t................................', G40, G40]);
    run(w, 1.5, { move: 1 });
    expect(w.power?.kind).toBe('tacoRush');
    expect(w.pickups.every(p => p.taken)).toBe(true);
  });

  it('Bat Wings: holding jump while falling glides at a slow capped fall', () => {
    const fall = (wings: boolean, hold: boolean) => {
      const w = worldOn(FLAT);
      if (wings) w.power = { kind: 'batWings', t: 10, total: 10 };
      w.hero.y = 1; w.hero.vy = 0; w.hero.onGround = false; w.hero.coyote = 0; w.hero.airJumps = 0;
      let fastest = 0;
      run(w, 0.6, { jumpHeld: hold }, ww => { fastest = Math.max(fastest, ww.hero.vy); });
      return fastest;
    };
    expect(fall(true, true)).toBeLessThanOrEqual(POWERS.batWings.glideFall + 1e-9);
    expect(fall(true, false)).toBeGreaterThan(POWERS.batWings.glideFall * 2);
    expect(fall(false, true)).toBeGreaterThan(POWERS.batWings.glideFall * 2);
  });

  it('Taco Rush: runs 40 percent faster, and coins within 3 tiles fly to her', () => {
    const w = worldOn(['.P......................................', G40, G40]);
    w.power = { kind: 'tacoRush', t: 8, total: 8 };
    run(w, 1, { move: 1 });
    expect(w.hero.vx).toBeCloseTo(PHYS.runMax * 1.4, 5);
    const m = worldOn(['.P.......................o..............', G40, G40]);
    m.power = { kind: 'tacoRush', t: 8, total: 8 };
    // The coin (25, 11) is 2.8 tiles from her centre; she hovers above, never touching it.
    for (let i = 0; i < 60; i++) { m.hero.x = 23; m.hero.y = 9; m.hero.vy = 0; m.hero.onGround = false; run(m, 1 / 120); }
    expect(m.stats.coins).toBe(1);
    const far = worldOn(['.P..........................o...........', G40, G40]);
    far.power = { kind: 'tacoRush', t: 8, total: 8 };
    for (let i = 0; i < 60; i++) { far.hero.x = 23; far.hero.y = 9; far.hero.vy = 0; far.hero.onGround = false; run(far, 1 / 120); }
    expect(far.stats.coins).toBe(0);
  });
});
