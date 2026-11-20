import { describe, it, expect } from 'vitest';
import { PHYS } from '@/components/apps/games/platformer/sim/physics';
import { DT, FLAT, G40, eventsOf, press, run, runUntil, worldOn } from '../setup/platformerWorld';

/** Lift the hero into the open air above flat ground, still. */
function midAir(w: ReturnType<typeof worldOn>, x = 10, feet = 6) {
  const h = w.hero;
  h.x = x; h.y = feet - h.h; h.vx = 0; h.vy = 0; h.onGround = false; h.coyote = 0;
}

/** Run the world until the hitFreeze is over. */
function thaw(w: ReturnType<typeof worldOn>) {
  runUntil(w, ww => ww.hitFreeze <= 0, {}, 1);
}

describe('Main Character hero: the air dash', () => {
  it('covers dash speed times dash time (about 3.5 tiles) in about 0.16 s of sim time', () => {
    const w = worldOn(FLAT);
    run(w, 0.1);
    const x0 = w.hero.x;
    press(w, { dashPressed: true, move: 1 });
    expect(w.hero.state).toBe('dash');
    thaw(w);
    let dashing = 0;
    run(w, 0.5, { move: 0 }, ww => { if (ww.hero.state === 'dash') dashing += DT; });
    expect(dashing).toBeGreaterThan(0.16 - 2 * DT);
    expect(dashing).toBeLessThan(0.16 + 2 * DT);
    const travelled = w.hero.x - x0;
    // 22 * 0.16 = 3.52 while dashing, plus a little carry before friction stops him.
    expect(travelled).toBeGreaterThan(3.4);
    expect(travelled).toBeLessThan(5);
  });

  it('holds his height during a mid-air dash: gravity is off', () => {
    const w = worldOn(FLAT);
    midAir(w);
    const y0 = w.hero.y;
    press(w, { dashPressed: true, move: 1 });
    thaw(w);
    let maxDrop = 0;
    run(w, 0.15, {}, ww => { maxDrop = Math.max(maxDrop, ww.hero.y - y0); });
    expect(w.hero.state).toBe('dash');
    expect(maxDrop).toBeLessThan(1e-6);
    expect(w.hero.vy).toBe(0);
  });

  it('dashes along the stick, or the way he faces when the stick is centred', () => {
    const a = worldOn(FLAT), b = worldOn(FLAT);
    a.hero.x = b.hero.x = 20;
    press(a, { dashPressed: true, move: -1 });
    b.hero.facing = -1;
    press(b, { dashPressed: true, move: 0 });
    thaw(a); thaw(b);
    run(a, 0.1); run(b, 0.1);
    expect(a.hero.x).toBeLessThan(18);
    expect(b.hero.x).toBeLessThan(18);
    expect(a.hero.facing).toBe(-1);
  });

  it('spends the dash in the air and does not get it back until he lands', () => {
    const w = worldOn(FLAT);
    midAir(w, 10, 3);
    expect(w.hero.dashReady).toBe(true);
    press(w, { dashPressed: true, move: 1 });
    expect(w.hero.dashReady).toBe(false);
    thaw(w);
    run(w, 0.2);
    const x = w.hero.x;
    // A second press in the air does nothing.
    press(w, { dashPressed: true, move: 1 });
    expect(w.hero.state).not.toBe('dash');
    expect(w.hitFreeze).toBe(0);
    run(w, 0.05);
    expect(w.hero.x - x).toBeLessThan(1);
    expect(w.hero.dashReady).toBe(false);
    expect(runUntil(w, ww => ww.hero.onGround)).toBe(true);
    run(w, DT);
    expect(w.hero.dashReady).toBe(true);
  });

  it('emits a dash event with the direction', () => {
    const w = worldOn(FLAT);
    press(w, { dashPressed: true, move: 1 });
    expect(eventsOf(w)).toContain('dash');
  });
});

describe('Main Character hero: hit freeze', () => {
  it('a dash starts with a short hit stop that holds the whole sim still', () => {
    const w = worldOn(['.P........n.............................', G40, G40]);
    run(w, 0.2);
    press(w, { dashPressed: true, move: 1 });
    expect(w.hitFreeze).toBeCloseTo(PHYS.dashFreeze, 6);
    const snap = { hx: w.hero.x, hy: w.hero.y, ex: w.enemies[0].x, t: w.t, lt: w.levelTime };
    let steps = 0;
    while (w.hitFreeze > 0) { press(w, { move: 1 }); steps++; }
    expect(steps).toBeGreaterThanOrEqual(Math.floor(PHYS.dashFreeze / DT) - 1);
    expect(w.hero.x).toBe(snap.hx);
    expect(w.hero.y).toBe(snap.hy);
    expect(w.enemies[0].x).toBe(snap.ex);
    expect(w.t).toBe(snap.t);
    expect(w.levelTime).toBe(snap.lt);
    press(w, { move: 1 });
    expect(w.hero.x).toBeGreaterThan(snap.hx);
  });

  it('a jump pressed during the hit stop is kept for after it', () => {
    const w = worldOn(FLAT);
    press(w, { dashPressed: true, move: 1 });
    press(w, { jumpPressed: true, jumpHeld: true });
    let jumped = false;
    run(w, 0.4, { jumpHeld: true }, ww => { if (ww.events.some(e => e.type === 'jump')) jumped = true; });
    expect(jumped).toBe(true);
  });

  it('reduced motion skips the hit stop', () => {
    const w = worldOn(FLAT);
    w.noFreeze = true;
    press(w, { dashPressed: true, move: 1 });
    expect(w.hitFreeze).toBe(0);
  });
});

/** A tall wall at column 15, rows 2 to 11, on flat ground (rows 12 and 13). */
const WALL = [
  ...Array.from({ length: 9 }, () => '...............#........................'),
  '.P.............#........................',
  G40, G40,
];

/** Put the hero in the air against the wall's left face, falling. */
function onWallLeftFace(w: ReturnType<typeof worldOn>, feet = 6, vy = 6) {
  const h = w.hero;
  h.x = 15 - h.w - 0.01; h.y = feet - h.h; h.vx = 0; h.vy = vy; h.onGround = false; h.coyote = 0;
}

describe('Main Character hero: wall slide and wall jump', () => {
  it('pushing into a wall while falling slides at no more than 4 tiles per second', () => {
    const w = worldOn(WALL);
    onWallLeftFace(w, 4, 12);
    let fastest = 0;
    run(w, 0.5, { move: 1 }, ww => { if (ww.hero.state === 'wallSlide') fastest = Math.max(fastest, ww.hero.vy); });
    expect(w.hero.state).toBe('wallSlide');
    expect(w.hero.wallDir).toBe(1);
    expect(fastest).toBeLessThanOrEqual(PHYS.wallSlideMax + 1e-9);
    expect(PHYS.wallSlideMax).toBe(4);
  });

  it('without pushing into the wall he just falls', () => {
    const w = worldOn(WALL);
    onWallLeftFace(w, 4, 6);
    run(w, 0.2);
    expect(w.hero.state).toBe('air');
    expect(w.hero.vy).toBeGreaterThan(PHYS.wallSlideMax);
    expect(w.hero.wallDir).toBe(0);
  });

  it('touching a wall in the air gives the dash back', () => {
    const w = worldOn(WALL);
    midAir(w, 11, 4);
    press(w, { dashPressed: true, move: 1 });
    expect(w.hero.dashReady).toBe(false);
    thaw(w);
    run(w, 0.3, { move: 1 });
    expect(w.hero.onGround).toBe(false);
    expect(w.hero.dashReady).toBe(true);
  });

  it('a jump on the wall pushes up and away from it', () => {
    const w = worldOn(WALL);
    onWallLeftFace(w, 6, 2);
    run(w, 0.05, { move: 1 });
    press(w, { jumpPressed: true, jumpHeld: true, move: 1 });
    expect(w.hero.vy).toBeLessThan(-PHYS.wallJumpY + 1);
    expect(w.hero.vx).toBeLessThan(-PHYS.wallJumpX + 1);
    expect(w.hero.facing).toBe(-1);
    expect(eventsOf(w)).toContain('wallJump');
  });

  it('ignores the stick for a moment after a wall jump, then steers again', () => {
    const w = worldOn(WALL);
    onWallLeftFace(w, 6, 2);
    run(w, 0.05, { move: 1 });
    press(w, { jumpPressed: true, jumpHeld: true, move: 1 });
    // Still holding toward the wall: for the lock he keeps moving away.
    run(w, PHYS.wallJumpLock - 2 * DT, { move: 1, jumpHeld: true });
    expect(w.hero.vx).toBeLessThan(-PHYS.wallJumpX + 0.01);
    run(w, 0.15, { move: 1, jumpHeld: true });
    expect(w.hero.vx).toBeGreaterThan(-PHYS.wallJumpX + 2);
  });

  it('a jump near a wall in the air is a wall jump, not a ground jump', () => {
    const w = worldOn(WALL);
    onWallLeftFace(w, 6, 2);
    w.hero.x -= 0.2;
    press(w, { jumpPressed: true, jumpHeld: true });
    expect(w.hero.vy).toBeLessThan(0);
    expect(w.hero.vx).toBeLessThan(0);
  });

  it('far from any wall a mid-air jump does nothing', () => {
    const w = worldOn(WALL);
    midAir(w, 6, 6);
    w.hero.vy = 2;
    press(w, { jumpPressed: true, jumpHeld: true });
    expect(w.hero.vy).toBeGreaterThan(0);
  });
});

describe('Main Character hero: coyote time and the jump buffer still work in the world', () => {
  const LEDGE = ['.P......................................', '########................................', '########................................'];

  it('a jump just after running off a ledge still fires', () => {
    const w = worldOn(LEDGE);
    expect(runUntil(w, ww => !ww.hero.onGround, { move: 1 })).toBe(true);
    run(w, 0.04, { move: 1 });
    press(w, { jumpPressed: true, jumpHeld: true, move: 1 });
    expect(w.hero.vy).toBeLessThan(-PHYS.jumpV + 1);
  });

  it('a jump pressed just before landing fires on landing', () => {
    const w = worldOn(FLAT);
    midAir(w, 10, 11.6);
    w.hero.vy = 4;
    press(w, { jumpPressed: true, jumpHeld: true });
    let jumped = false;
    run(w, 0.2, { jumpHeld: true }, ww => { if (ww.events.some(e => e.type === 'jump')) jumped = true; });
    expect(jumped).toBe(true);
  });
});

describe('Main Character hero: dash afterimages', () => {
  it('a dash leaves a short trail of afterimages that fade from 0.18 s, from a fixed pool', () => {
    const w = worldOn(FLAT);
    const pool = w.afterimages;
    const objects = [...pool];
    expect(pool.every(a => a.t <= 0)).toBe(true);
    press(w, { dashPressed: true, move: 1 });
    thaw(w);
    let most = 0;
    run(w, 0.14, { move: 1 }, ww => { most = Math.max(most, ww.afterimages.filter(a => a.t > 0).length); });
    const live = w.afterimages.filter(a => a.t > 0);
    expect(most).toBeGreaterThanOrEqual(3);
    for (const a of live) {
      expect(a.t).toBeLessThanOrEqual(0.18);
      expect(a.facing).toBe(1);
      expect(a.x).toBeLessThan(w.hero.x);
    }
    run(w, 0.4);
    expect(w.afterimages.every(a => a.t <= 0)).toBe(true);
    expect(w.afterimages).toBe(pool);
    expect(w.afterimages.every((a, i) => a === objects[i])).toBe(true);
  });
});

describe('Main Character hero: states the world owns', () => {
  it('is dead while dying, hurt for a moment after a shielded hit, and in victory after the goal', () => {
    const a = worldOn(['.P....n.................................', G40, G40]);
    a.crowned = true;
    expect(runUntil(a, ww => ww.hero.state === 'hurt', { move: 1 }, 2)).toBe(true);
    run(a, 0.5);
    expect(a.hero.state).not.toBe('hurt');
    const b = worldOn(FLAT);
    b.hero.y = 30;
    run(b, 0.1);
    expect(b.hero.state).toBe('dead');
    const c = worldOn(FLAT);
    const p = c.level.pole;
    c.hero.x = p.x - 0.1; c.hero.y = 7;
    run(c, 0.1);
    expect(c.phase).toBe('pole');
    expect(c.hero.state).toBe('victory');
    run(c, 1);
    expect(c.hero.state).toBe('victory');
    expect(c.hero.animT).toBeGreaterThan(0.9);
  });

  it('counts time in each state and since landing', () => {
    const w = worldOn(FLAT);
    run(w, 0.5);
    expect(w.hero.state).toBe('ground');
    expect(w.hero.animT).toBeGreaterThan(0.4);
    run(w, 0.1, { jumpPressed: true, jumpHeld: true });
    expect(w.hero.state).toBe('air');
    expect(w.hero.animT).toBeLessThan(0.11);
    expect(runUntil(w, ww => ww.hero.onGround, {}, 3)).toBe(true);
    expect(w.hero.landT).toBeLessThan(0.02);
  });

  it('landT counts up from the last landing while he stays on the ground, and the world countdown matches it', () => {
    const w = worldOn(FLAT);
    run(w, 1);
    expect(w.hero.landT).toBeGreaterThan(0.9);
    run(w, 0.1, { jumpPressed: true, jumpHeld: true });
    expect(runUntil(w, ww => ww.hero.onGround, {}, 3)).toBe(true);
    const at = w.hero.landT;
    expect(at).toBeLessThan(0.02);
    expect(w.landT + w.hero.landT).toBeCloseTo(0.14, 6);
    run(w, 0.05);
    expect(w.landT + w.hero.landT).toBeCloseTo(0.14, 6);
    run(w, 0.5);
    expect(w.hero.landT).toBeCloseTo(at + 0.55, 6);
    expect(w.landT).toBe(0);
  });
});
