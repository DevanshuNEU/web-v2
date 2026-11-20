import { describe, it, expect } from 'vitest';
import {
  PHYS, contacts, createHero, moveBody, pressJump, stepHero, stompBounce, stompOrHurt,
  type Body, type Hero, type HeroInput, type SolidFn,
} from '@/components/apps/games/platformer/sim/physics';

const DT = 1 / 120;

/** '#' is solid. Outside the strings is open space below and walls at the sides. */
function grid(rows: string[]): SolidFn {
  return (tx, ty) => {
    if (ty < 0 || ty >= rows.length) return false;
    if (tx < 0 || tx >= rows[0].length) return true;
    return rows[ty][tx] === '#';
  };
}

const FLAT = grid([
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '##############################',
]);

const NONE: HeroInput = { move: 0, jumpHeld: false };
const RIGHT: HeroInput = { move: 1, jumpHeld: false };

function heroOnFlat(x = 5): Hero {
  // Feet on the floor at y = 10.
  return createHero(x, 10);
}

function steps(h: Hero, n: number, input: HeroInput, solid = FLAT, g = 1) {
  const c = contacts();
  const out = [];
  for (let i = 0; i < n; i++) out.push({ ...stepHero(h, input, DT, solid, c, g), vy: h.vy });
  return out;
}

/** Peak height (tiles above the floor) of a jump held for `holdSteps`. */
function jumpPeak(holdSteps: number, g = 1): number {
  const h = heroOnFlat();
  const c = contacts();
  stepHero(h, NONE, DT, FLAT, c);
  const floorTop = h.y;
  pressJump(h);
  let top = h.y;
  for (let i = 0; i < 400; i++) {
    stepHero(h, { move: 0, jumpHeld: i < holdSteps }, DT, FLAT, c, g);
    top = Math.min(top, h.y);
    if (i > 5 && h.onGround) break;
  }
  return floorTop - top;
}

describe('platformer physics: standing and running', () => {
  it('stands still on the floor without sinking or jittering', () => {
    const h = heroOnFlat();
    const y0 = h.y;
    steps(h, 240, NONE);
    expect(h.y).toBeCloseTo(y0, 6);
    expect(h.onGround).toBe(true);
  });

  it('accelerates instead of jumping straight to full speed', () => {
    const h = heroOnFlat();
    steps(h, 1, RIGHT);
    expect(h.vx).toBeGreaterThan(0);
    expect(h.vx).toBeLessThan(PHYS.runMax * 0.1);
    steps(h, 60, RIGHT);
    expect(h.vx).toBeCloseTo(PHYS.runMax, 5);
  });

  it('never runs faster than the max run speed', () => {
    const h = heroOnFlat(1);
    let max = 0;
    for (let i = 0; i < 200; i++) { steps(h, 1, RIGHT); max = Math.max(max, h.vx); }
    expect(max).toBeLessThanOrEqual(PHYS.runMax + 1e-9);
  });

  it('slides to a stop with friction when the input is released', () => {
    const h = heroOnFlat();
    steps(h, 60, RIGHT);
    steps(h, 3, NONE);
    expect(h.vx).toBeGreaterThan(0);
    steps(h, 60, NONE);
    expect(h.vx).toBe(0);
  });

  it('skids to a turn faster than plain friction stops', () => {
    const a = heroOnFlat(), b = heroOnFlat();
    steps(a, 60, RIGHT); steps(b, 60, RIGHT);
    steps(a, 6, { move: -1, jumpHeld: false });
    steps(b, 6, NONE);
    expect(a.vx).toBeLessThan(b.vx);
  });

  it('turns the facing with the input', () => {
    const h = heroOnFlat();
    steps(h, 1, { move: -1, jumpHeld: false });
    expect(h.facing).toBe(-1);
    steps(h, 1, RIGHT);
    expect(h.facing).toBe(1);
  });

  it('stops flush against a wall', () => {
    const solid = grid([
      '..........#...',
      '..........#...',
      '..............',
      '##############',
    ]);
    const h = createHero(6, 3);
    const c = contacts();
    for (let i = 0; i < 120; i++) stepHero(h, RIGHT, DT, solid, c);
    expect(h.x + h.w).toBeCloseTo(10, 6);
  });
});

describe('platformer physics: jumping', () => {
  it('variable jump: holding jumps measurably higher than a tap', () => {
    const tap = jumpPeak(1);
    const hold = jumpPeak(400);
    expect(tap).toBeGreaterThan(1);
    expect(hold).toBeGreaterThan(4);
    expect(hold - tap).toBeGreaterThan(2);
  });

  it('a medium hold lands between a tap and a full hold', () => {
    const tap = jumpPeak(1), mid = jumpPeak(18), hold = jumpPeak(400);
    expect(mid).toBeGreaterThan(tap + 0.3);
    expect(mid).toBeLessThan(hold - 0.3);
  });

  it('cannot jump again in mid air', () => {
    const h = heroOnFlat();
    pressJump(h);
    steps(h, 1, { ...NONE, jumpHeld: true });
    steps(h, 30, { ...NONE, jumpHeld: true });
    const vy = h.vy;
    pressJump(h);
    steps(h, 1, { ...NONE, jumpHeld: true });
    expect(h.vy).toBeGreaterThan(vy);
  });

  it('caps the fall at terminal velocity', () => {
    const h = createHero(5, -50);
    h.onGround = false;
    const open: SolidFn = (tx) => tx < 0;
    const c = contacts();
    for (let i = 0; i < 600; i++) stepHero(h, NONE, DT, open, c);
    expect(h.vy).toBe(PHYS.terminal);
  });

  it('lower gravity (the secret level) jumps higher', () => {
    expect(jumpPeak(400, 0.55)).toBeGreaterThan(jumpPeak(400) * 1.5);
  });
});

describe('platformer physics: coyote time and jump buffer', () => {
  // A ledge that ends at x = 6, then a pit.
  const LEDGE = grid([
    '..............',
    '..............',
    '..............',
    '..............',
    '######........',
  ]);

  function walkOff(): { h: Hero; c: ReturnType<typeof contacts> } {
    const h = createHero(3, 4);
    const c = contacts();
    for (let i = 0; i < 600 && h.onGround; i++) stepHero(h, RIGHT, DT, LEDGE, c);
    expect(h.onGround).toBe(false);
    return { h, c };
  }

  it('a jump just after leaving a ledge still works', () => {
    const { h, c } = walkOff();
    for (let i = 0; i < Math.floor(0.05 / DT); i++) stepHero(h, RIGHT, DT, LEDGE, c);
    pressJump(h);
    const r = stepHero(h, { ...RIGHT, jumpHeld: true }, DT, LEDGE, c);
    expect(r.jumped).toBe(true);
    expect(h.vy).toBeLessThan(0);
  });

  it('a jump after the coyote window fails', () => {
    const { h, c } = walkOff();
    for (let i = 0; i < Math.ceil(0.12 / DT); i++) stepHero(h, RIGHT, DT, LEDGE, c);
    pressJump(h);
    const r = stepHero(h, { ...RIGHT, jumpHeld: true }, DT, LEDGE, c);
    expect(r.jumped).toBe(false);
    expect(h.vy).toBeGreaterThan(0);
  });

  function fallFrom(height: number) {
    const h = createHero(5, 10 - height);
    h.onGround = false; h.coyote = 0;
    return h;
  }

  it('a jump pressed just before landing fires on landing', () => {
    const h = fallFrom(3);
    const c = contacts();
    let pressed = false, jumped = false;
    for (let i = 0; i < 300 && !jumped; i++) {
      // press when the feet are a few frames above the floor
      if (!pressed && h.y + h.h > 10 - h.vy * 0.08) { pressJump(h); pressed = true; }
      const r = stepHero(h, { ...NONE, jumpHeld: pressed }, DT, FLAT, c);
      if (r.jumped) jumped = true;
    }
    expect(pressed).toBe(true);
    expect(jumped).toBe(true);
  });

  it('a press long before landing is forgotten', () => {
    const h = fallFrom(6);
    const c = contacts();
    pressJump(h);
    let jumped = false;
    for (let i = 0; i < 300; i++) {
      if (stepHero(h, NONE, DT, FLAT, c).jumped) jumped = true;
    }
    expect(jumped).toBe(false);
    expect(h.onGround).toBe(true);
  });
});

describe('platformer physics: collisions', () => {
  const THIN = grid([
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '##########',
    '..........',
    '..........',
  ]);

  it('does not tunnel through a 1 tile floor at terminal velocity, even on a long frame', () => {
    for (const dt of [1 / 120, 1 / 30, 0.1, 0.25]) {
      const b: Body = { x: 3, y: 0, w: 0.68, h: 1.3, vx: 0, vy: PHYS.terminal, onGround: false };
      const c = contacts();
      for (let i = 0; i < 200; i++) { b.vy = PHYS.terminal; moveBody(b, dt, THIN, c); }
      expect(b.y + b.h).toBeCloseTo(5, 6);
      expect(b.onGround).toBe(true);
    }
  });

  it('does not tunnel through a 1 tile wall at high speed', () => {
    const wall = grid(['.....#....', '.....#....', '##########']);
    const b: Body = { x: 1, y: 0.5, w: 0.68, h: 1.3, vx: 60, vy: 0, onGround: false };
    const c = contacts();
    moveBody(b, 0.2, wall, c);
    expect(b.x + b.w).toBeCloseTo(5, 6);
    expect(c.wall).toBe(1);
  });

  it('reports the block under the head centre when hitting a ceiling', () => {
    const ceil = grid(['..........', '...##.....', '..........', '..........', '..........', '##########']);
    const h = createHero(3, 5);
    h.x = 3.7; // straddles columns 3 and 4, centre in column 4
    const c = contacts();
    pressJump(h);
    let hit = false;
    for (let i = 0; i < 120 && !hit; i++) { stepHero(h, { ...NONE, jumpHeld: true }, DT, ceil, c); if (c.ceiling) hit = true; }
    expect(hit).toBe(true);
    expect(c.ceilTx).toBe(4);
    expect(c.ceilTy).toBe(1);
    expect(h.vy).toBeGreaterThanOrEqual(0);
  });

  it('slides around a block corner the head only just clips', () => {
    const ceil = grid(['..........', '...#......', '..........', '..........', '..........', '##########']);
    const h = createHero(4, 5);
    h.x = 3.9; // head overlaps column 3 by 0.1
    const c = contacts();
    pressJump(h);
    let minY = h.y;
    for (let i = 0; i < 60; i++) { stepHero(h, { ...NONE, jumpHeld: true }, DT, ceil, c); minY = Math.min(minY, h.y); }
    expect(minY).toBeLessThan(1);
    expect(h.x).toBeGreaterThanOrEqual(4 - 1e-6);
  });
});

describe('platformer physics: stomps', () => {
  const enemy = { x: 5, y: 9.2, w: 0.86, h: 0.8 };

  it('landing on an enemy from above is a stomp', () => {
    const hero: Body = { x: 5, y: 9.2 - 1.3 + 0.1, w: 0.68, h: 1.3, vx: 0, vy: 6, onGround: false };
    expect(stompOrHurt(hero, 9.2 - 0.05, enemy)).toBe('stomp');
  });

  it('touching an enemy from the side hurts', () => {
    const hero: Body = { x: 4.4, y: 8.7, w: 0.68, h: 1.3, vx: 5, vy: 0, onGround: true };
    expect(stompOrHurt(hero, 10, enemy)).toBe('hurt');
  });

  it('jumping up into an enemy from below hurts', () => {
    const hero: Body = { x: 5, y: 9.5, w: 0.68, h: 1.3, vx: 0, vy: -8, onGround: false };
    expect(stompOrHurt(hero, 10.9, enemy)).toBe('hurt');
  });

  it('no contact is neither', () => {
    const hero: Body = { x: 1, y: 8.7, w: 0.68, h: 1.3, vx: 0, vy: 0, onGround: true };
    expect(stompOrHurt(hero, 10, enemy)).toBe('none');
  });

  it('holding jump bounces higher off a stomp', () => {
    const a = heroOnFlat(), b = heroOnFlat();
    stompBounce(a, true); stompBounce(b, false);
    expect(a.vy).toBeLessThan(b.vy);
    expect(b.vy).toBeLessThan(0);
  });
});
