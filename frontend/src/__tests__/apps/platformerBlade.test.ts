import { describe, it, expect } from 'vitest';
import { BLADE } from '@/components/apps/games/platformer/sim/blade';
import { createWorld, drainEvents, enterLevel, score, stepWorld, type World } from '@/components/apps/games/platformer/sim/world';
import { TILE, tileAt } from '@/components/apps/games/platformer/sim/level';
import { emptyFrame, type InputFrame } from '@/components/apps/games/platformer/input/frame';
import { DT, G40, custom, run, runUntil } from '../setup/platformerWorld';

/** A level with the blade owned (as after the sword in 1-2). */
function bladeOn(rows: string[], blade = true): World {
  const w = createWorld({ seed: 1, abilities: { wallJump: true, dash: true, blade } });
  enterLevel(w, 0, custom(rows, 'rooftops'));
  drainEvents(w);
  return w;
}

const attack = (w: World, extra: Partial<InputFrame> = {}) => stepWorld(w, { ...emptyFrame(), actionPressed: true, ...extra }, DT);
const FLAT = ['.P......................................', G40, G40];

/** Step until the hit stop is over. */
const thaw = (w: World) => { for (let i = 0; i < 30 && w.hitFreeze > 0; i++) stepWorld(w, emptyFrame(), DT); };

describe('Main Character blade: getting it', () => {
  it('without the blade the attack does nothing', () => {
    const w = bladeOn(FLAT, false);
    attack(w);
    expect(w.swing).toBeNull();
    expect(drainEvents(w).map(e => e.type)).not.toContain('swing');
  });

  it('the sword S gives the blade for good, with an unlock event (n = 2)', () => {
    const w = bladeOn(['.P..S...................................', G40, G40], false);
    expect(w.sword).toEqual({ x: 4, y: 11, taken: false });
    const seen: { type: string; n: number }[] = [];
    expect(runUntil(w, ww => { seen.push(...drainEvents(ww)); return ww.abilities.blade; }, { move: 1 }, 2)).toBe(true);
    expect(seen.find(e => e.type === 'unlock')?.n).toBe(2);
    expect(w.sword?.taken).toBe(true);
  });
});

describe('Main Character blade: the ground combo', () => {
  it('three presses make light, light, finisher; each next swing waits for its chain point', () => {
    const w = bladeOn(FLAT);
    const states: string[] = [];
    attack(w);
    expect(w.hero.state).toBe('attack1');
    expect(drainEvents(w).map(e => e.type)).toContain('swing');
    let t = 0;
    // Press again at once: buffered, it starts at attack1's chain point.
    attack(w);
    while (w.hero.state === 'attack1') { stepWorld(w, emptyFrame(), DT); t += DT; }
    expect(w.hero.state).toBe('attack2');
    expect(t + DT).toBeGreaterThanOrEqual(BLADE.swings.attack1.chainAt - 1e-9);
    attack(w);
    while (w.hero.state === 'attack2') stepWorld(w, emptyFrame(), DT);
    states.push(w.hero.state);
    expect(states).toEqual(['attack3']);
  });

  it('after the combo gap the next press starts over at the first swing', () => {
    const w = bladeOn(FLAT);
    attack(w);
    run(w, BLADE.swings.attack1.duration + BLADE.comboGap + 0.05);
    attack(w);
    expect(w.hero.state).toBe('attack1');
  });

  it('a press up to 0.15 s before a swing can follow still swings; an earlier one is dropped', () => {
    const finisher = (w: World) => {
      attack(w); while (w.hero.state === 'attack1') stepWorld(w, emptyFrame(), DT);
      attack(w); while (w.hero.state === 'attack2') stepWorld(w, emptyFrame(), DT);
      attack(w);
    };
    const d = BLADE.swings.attack3.duration;
    const late = bladeOn(FLAT);
    finisher(late);
    expect(late.hero.state).toBe('attack3');
    run(late, d - 0.1);
    attack(late);
    while (late.swing?.kind === 'attack3') stepWorld(late, emptyFrame(), DT);
    expect(late.swing?.kind).toBe('attack1');
    const early = bladeOn(FLAT);
    finisher(early);
    run(early, d - 0.25);
    attack(early);
    run(early, 0.4);
    expect(early.swing).toBeNull();
  });

  it('a swing can be cancelled into a jump or a dash', () => {
    const j = bladeOn(FLAT);
    attack(j);
    run(j, 0.05);
    stepWorld(j, { ...emptyFrame(), jumpPressed: true, jumpHeld: true }, DT);
    expect(j.swing).toBeNull();
    expect(j.hero.vy).toBeLessThan(0);
    const d = bladeOn(FLAT);
    attack(d);
    run(d, 0.05);
    stepWorld(d, { ...emptyFrame(), dashPressed: true, move: 1 }, DT);
    expect(d.swing).toBeNull();
    expect(d.hero.state).toBe('dash');
  });
});

describe('Main Character blade: hits', () => {
  it('a doom crawler takes two hits (knocked back by the first), an ad drone one; a stomp still kills at once', () => {
    const w = bladeOn(['.P..c...................................', G40, G40]);
    const e = w.enemies[0];
    e.active = true; e.dir = -1;
    w.hero.x = e.x - w.hero.w - 0.3;
    attack(w);
    expect(runUntil(w, ww => ww.events.some(ev => ev.type === 'hit'), {}, 0.3)).toBe(true);
    expect(e.hp).toBe(1);
    expect(w.hitFreeze).toBeGreaterThan(0);
    thaw(w);
    run(w, 0.02);
    expect(e.vx).toBeGreaterThan(0);
    expect(e.deadT).toBe(-1);
    run(w, 0.4);
    w.hero.x = e.x - w.hero.w - 0.3; w.hero.facing = 1;
    attack(w);
    run(w, 0.3);
    expect(e.deadT).not.toBe(-1);
    expect(w.stats.stomps).toBe(1);
    expect(score(w)).toBe(100);

    const d = bladeOn(['.P..........................................', '...d........................................', '............................................', G40 + '....', G40 + '....']);
    expect(d.enemies[0].hp).toBe(1);
  });

  it('hit stop grows with the hit: the finisher stops time longer than a light hit', () => {
    const w = bladeOn(['.P..c...................................', G40, G40]);
    const e = w.enemies[0];
    e.active = true; e.hp = 99;
    const stops: Record<string, number> = {};
    for (let n = 0; n < 3; n++) {
      w.hero.x = e.x - w.hero.w - 0.3; w.hero.facing = 1;
      attack(w);
      for (let i = 0; i < 120 && w.swing; i++) {
        stepWorld(w, emptyFrame(), DT);
        if (w.hitFreeze > 0 && w.swing) stops[w.swing.kind] = Math.max(stops[w.swing.kind] ?? 0, w.hitFreeze);
        if (w.swing && w.swing.t >= BLADE.swings[w.swing.kind].chainAt && n < 2) break;
      }
    }
    expect(stops.attack1).toBeGreaterThan(0);
    expect(stops.attack3).toBeGreaterThan(stops.attack1);
  });

  it('a crate R is solid and a swing breaks it for coins; a neon sign breaks too, and its light goes out', () => {
    const w = bladeOn(['.P..R...................................', G40, G40]);
    expect(w.solid(4, 11)).toBe(true);
    w.hero.x = 4 - w.hero.w - 0.2;
    attack(w);
    const seen: string[] = [];
    run(w, 0.3, {}, ww => seen.push(...drainEvents(ww).map(e => e.type)));
    expect(tileAt(w.tiles, w.level.cols, 4, 11)).toBe(TILE.EMPTY);
    expect(seen).toContain('break');
    expect(w.stats.coins).toBe(BLADE.crateCoins);

    const s = bladeOn(['....L...................................', '.P......................................', G40, G40]);
    const lights = s.lights.length;
    s.hero.x = 3; s.hero.facing = 1;
    attack(s);
    run(s, 0.3);
    expect(s.decor.find(d => d.kind === 'neonSign')?.broken).toBe(true);
    expect(s.lights.length).toBe(lights - 1);
    expect(s.stats.coins).toBe(BLADE.signCoins);
  });
});

describe('Main Character blade: in the air', () => {
  it('with nothing below, an air press is a forward slash', () => {
    const w = bladeOn(FLAT);
    w.hero.y = 4; w.hero.onGround = false; w.hero.vy = 0;
    attack(w);
    expect(w.hero.state).toBe('airSlash');
  });

  it('with an enemy below within reach, the swing aims down and a hit pogos her up, refilling the double jump and the dash', () => {
    const w = bladeOn(['.P..c...................................', G40, G40]);
    const e = w.enemies[0];
    e.active = true;
    // Two tiles above it: inside the auto-aim reach, beyond the strike's own reach, so the strike shows first.
    w.hero.x = e.x; w.hero.y = e.y - w.hero.h - 2; w.hero.vy = 0; w.hero.onGround = false; w.hero.coyote = 0;
    w.hero.airJumps = 0; w.hero.dashReady = false;
    attack(w);
    expect(w.hero.state).toBe('downStrike');
    const seen: string[] = [];
    expect(runUntil(w, ww => { seen.push(...drainEvents(ww).map(ev => ev.type)); return seen.includes('pogo'); }, {}, 0.5)).toBe(true);
    thaw(w);
    expect(w.hero.vy).toBeLessThan(0);
    expect(w.hero.airJumps).toBe(1);
    expect(w.hero.dashReady).toBe(true);
    expect(w.phase).toBe('play');
  });

  it('down-strikes chain on spikes: she keeps bouncing and never gets hurt', () => {
    const w = bladeOn(['.P......................................', '..^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^..', G40]);
    w.hero.x = 15; w.hero.y = 5; w.hero.vy = 0; w.hero.onGround = false; w.hero.coyote = 0;
    let pogos = 0, lowestFeet = 0, peaks: number[] = [], prevVy = 0;
    for (let i = 0; i < Math.round(4 / DT); i++) {
      stepWorld(w, { ...emptyFrame(), actionPressed: i % 6 === 0 }, DT);
      for (const ev of drainEvents(w)) if (ev.type === 'pogo') pogos++;
      lowestFeet = Math.max(lowestFeet, w.hero.y + w.hero.h);
      if (prevVy < 0 && w.hero.vy >= 0) peaks.push(w.hero.y + w.hero.h);
      prevVy = w.hero.vy;
    }
    expect(w.phase).toBe('play');
    expect(pogos).toBeGreaterThanOrEqual(4);
    // The spikes are on row 12: her feet never reach them.
    expect(lowestFeet).toBeLessThan(12);
    peaks = peaks.slice(1);
    // Each bounce climbs back to at least 2 tiles above the spikes.
    expect(peaks.length).toBeGreaterThanOrEqual(3);
    for (const p of peaks) expect(p).toBeLessThan(12 - 2);
  });
});

/**
 * Play-test feedback: jumping and slashing at the same moment to hit a
 * hovering drone was too hard on a phone. The blade now aims itself: up
 * when a target is above, down when one is below in the air, forward
 * otherwise, and she turns to face a target close behind her.
 */
describe('Main Character blade: it aims itself', () => {
  const pad = (s: string) => s.padEnd(40, '.');
  const DRONE_ABOVE = [pad('.........d'), pad(''), pad('.........P'), G40, G40];

  const swingFor = (w: World, seconds: number) => {
    for (let t = 0; t < seconds; t += DT) stepWorld(w, emptyFrame(), DT);
  };
  const droneAlive = (w: World) => w.enemies.some(e => e.kind === 'adDrone' && e.deadT === -1);

  it('standing under a hovering drone, one tap swings up and takes it out', () => {
    const w = bladeOn(DRONE_ABOVE);
    expect(droneAlive(w)).toBe(true);
    attack(w);
    expect(w.hero.state).toBe('upSlash');
    swingFor(w, 0.3);
    expect(droneAlive(w)).toBe(false);
    expect(w.hero.onGround).toBe(true);
  });

  it('in the air, a target above gets the up slash too', () => {
    const w = bladeOn([pad('.........d'), pad(''), pad(''), pad(''), pad('.........P'), G40, G40]);
    stepWorld(w, { ...emptyFrame(), jumpPressed: true, jumpHeld: true }, DT);
    for (let i = 0; i < 6; i++) stepWorld(w, { ...emptyFrame(), jumpHeld: true }, DT);
    expect(w.hero.onGround).toBe(false);
    attack(w, { jumpHeld: true });
    expect(w.hero.state).toBe('upSlash');
  });

  it('with nothing above, the swing stays the forward combo', () => {
    const w = bladeOn(FLAT);
    attack(w);
    expect(w.hero.state).toBe('attack1');
  });

  it('turns to face an enemy close behind her before swinging', () => {
    const w = bladeOn([pad(''), pad('........c.P'), G40, G40]);
    w.hero.facing = 1;
    attack(w);
    expect(w.hero.facing).toBe(-1);
    swingFor(w, 0.3);
    const crawler = w.enemies.find(e => e.kind === 'doomCrawler')!;
    expect(crawler.hp).toBeLessThan(2);
  });

  it('the forward slash still reaches a target a little above her head', () => {
    expect(BLADE.swings.attack1.height).toBeGreaterThanOrEqual(1.4);
    expect(BLADE.swings.airSlash.height).toBeGreaterThanOrEqual(1.6);
  });
});
