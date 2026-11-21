import { describe, it, expect } from 'vitest';
import { reach, reachesGoal } from '../setup/platformerReach';
import { DT, G40, custom } from '../setup/platformerWorld';
import { createWorld, drainEvents, enterLevel, stepWorld } from '@/components/apps/games/platformer/sim/world';
import { emptyFrame } from '@/components/apps/games/platformer/input/frame';
import type { Level } from '@/components/apps/games/platformer/sim/level';

/**
 * The real sim on a gap: run from the start, jump when the hero's front is
 * `lead` tiles short of the edge, optionally dash `dashAfter` seconds later.
 * True if he lands past the gap.
 */
function realCross(level: Level, edge: number, gap: number, lead: number, dashAfter: number | null): boolean {
  const w = createWorld({ seed: 1 });
  enterLevel(w, 0, level);
  drainEvents(w);
  const f = emptyFrame();
  f.move = 1;
  let jumpT = -1;
  for (let i = 0; i < 600 && w.phase === 'play'; i++) {
    const front = w.hero.x + w.hero.w;
    if (jumpT < 0 && front >= edge - lead) { f.jumpPressed = true; jumpT = 0; }
    if (jumpT >= 0) {
      f.jumpHeld = true;
      if (dashAfter !== null && Math.abs(jumpT - dashAfter) < DT / 2) f.dashPressed = true;
      jumpT += DT;
    }
    stepWorld(w, f, DT);
    if (w.hero.onGround && w.hero.x > edge + gap) return true;
  }
  return false;
}

/** Rows bottom-aligned: a roof with a gap of `gap` columns at the same height, goal on the far side. */
function gapLevel(gap: number) {
  const w = 40;
  const roof = '='.repeat(8) + '.'.repeat(gap) + '='.repeat(w - 8 - gap);
  const fill = '#'.repeat(8) + '.'.repeat(gap) + '#'.repeat(w - 8 - gap);
  return custom([
    '.'.repeat(w - 3) + 'G..',
    ...Array(6).fill('.'.repeat(w)),
    '.P' + '.'.repeat(w - 2),
    roof, fill, fill,
  ], 'rooftops');
}

describe('Main Character reachability check (the test oracle)', () => {
  it('walks a flat roof to the goal', () => {
    expect(reachesGoal(gapLevel(0), { dash: false, wallJump: false })).toBe(true);
  });

  it('jumps a 4 tile gap without a dash', () => {
    expect(reachesGoal(gapLevel(4), { dash: false, wallJump: false })).toBe(true);
  });

  it('a 9 tile gap needs the dash: impossible without one even with generous numbers, fine with it', () => {
    expect(reachesGoal(gapLevel(9), { dash: false, wallJump: false, generous: true })).toBe(false);
    expect(reachesGoal(gapLevel(9), { dash: true, wallJump: false })).toBe(true);
  });

  it('agrees with the real sim on that gap: no jump timing crosses it without the dash, a plain one does with it', () => {
    const level = gapLevel(9);
    for (const lead of [0.6, 0.3, 0.1, 0]) expect(realCross(level, 8, 9, lead, null)).toBe(false);
    // Any take-off, as long as the dash comes near the top of the jump.
    for (const lead of [0, 0.6, 0.9]) for (const dash of [0.4, 0.5, 0.6]) expect(realCross(level, 8, 9, lead, dash)).toBe(true);
  });

  it('agrees with the real sim that a 5 tile gap is a plain jump', () => {
    expect(realCross(gapLevel(5), 8, 5, 0.6, null)).toBe(true);
  });

  it('a 14 tile gap is impossible even with a dash', () => {
    expect(reachesGoal(gapLevel(14), { dash: true, wallJump: false, generous: true })).toBe(false);
  });

  /** A 9 row wall with a chimney: an overhang on the left, the tall building on the right. */
  const CHIMNEY = custom([
    '.................................G......',
    '................................===.....',
    '.....................#####......###.....',
    '.................#...#####......###.....',
    '.................#...#####......###.....',
    '.................#...#####......###.....',
    '.................#...#####......###.....',
    '.................#...#####......###.....',
    '.....................#####......###.....',
    '.P...................#####......###.....',
    '========================================',
    '########################################',
  ], 'rooftops');

  it('climbs a chimney with wall jumps, and cannot without them', () => {
    expect(reachesGoal(CHIMNEY, { dash: true, wallJump: false, generous: true })).toBe(false);
    expect(reachesGoal(CHIMNEY, { dash: true, wallJump: true })).toBe(true);
  });

  it('a one-way platform stair is climbed from below', () => {
    const level = custom([
      '..............................G.........',
      '.........................==========.....',
      '.....................____...............',
      '........................................',
      '................____....................',
      '........................................',
      '..........____..........................',
      '........................................',
      '.P......................................',
      '========================================',
      '########################################',
    ], 'rooftops');
    expect(reachesGoal(level, { dash: false, wallJump: false })).toBe(true);
  });
});

describe('reachability check: the double jump, moving platforms and targets', () => {
  /** A ledge `up` rows above a flat roof, goal on it. */
  function ledge(up: number) {
    const rows: string[] = [];
    for (let r = 0; r < 14; r++) {
      const floor = 11, top = floor - up;
      let left = r >= floor ? '#'.repeat(20) : '.'.repeat(20);
      if (r === floor - 1) left = '.P' + '.'.repeat(18);
      let right = r >= top ? '#'.repeat(20) : '.'.repeat(20);
      if (r === top - 1) right = '..' + 'G' + '.'.repeat(17);
      if (r === top) right = '='.repeat(20);
      rows.push(left + right);
    }
    return parseLevelRows(rows);
  }
  const parseLevelRows = (rows: string[]) => custom(rows.slice(rows.length - 14), 'rooftops');

  it('a 6 row ledge needs the double jump', () => {
    expect(reachesGoal(ledge(6), { dash: false, wallJump: false, generous: true })).toBe(false);
    expect(reachesGoal(ledge(6), { dash: false, wallJump: false, doubleJump: true })).toBe(true);
  });

  it('agrees with the real sim: a double jump lands her on that ledge', () => {
    const level = ledge(6);
    const w = createWorld({ seed: 1, abilities: { wallJump: false, dash: false, blade: false } });
    enterLevel(w, 0, level);
    drainEvents(w);
    const f = emptyFrame();
    f.move = 1;
    let stage = 0;
    for (let i = 0; i < 400; i++) {
      f.jumpHeld = true;
      // Jump 3.5 tiles before the ledge, jump again near the top of the first jump.
      if (stage === 0 && w.hero.x + w.hero.w >= 16.5) { f.jumpPressed = true; stage = 1; }
      else if (stage === 1 && w.hero.vy > -2) { f.jumpPressed = true; stage = 2; }
      stepWorld(w, f, DT);
      if (stage === 2 && w.hero.onGround) break;
    }
    expect(w.hero.y + w.hero.h).toBeCloseTo(5, 5);
  });

  it('rides a moving platform across a gap too wide to jump', () => {
    const gap = (plat: boolean) => custom([
      '.....................................G..',
      '........................................',
      plat ? '...................---..................' : '........................................',
      '........................................',
      '.P......................................',
      '==========....................==========',
      '##########....................##########',
    ], 'rooftops');
    expect(reachesGoal(gap(false), { dash: false, wallJump: false, doubleJump: true, generous: true })).toBe(false);
    expect(reachesGoal(gap(true), { dash: false, wallJump: false, doubleJump: true })).toBe(true);
  });

  it('reports which targets she can touch', () => {
    const level = custom(['.P......................................', G40, G40], 'rooftops');
    const r = reach(level, { dash: false, wallJump: false, doubleJump: true, targets: [{ x: 10, y: 10, w: 1, h: 1 }, { x: 10, y: 1, w: 1, h: 1 }] });
    expect(r.touched).toEqual([true, false]);
  });
});

describe('reachability check: stomp bounces', () => {
  it('climbs a chain of drones to a ledge no jump reaches, and only with the bounces', () => {
    // Roof top at row 3: a frame-perfect double jump from the street tops out at row 3.5.
    const rows = Array.from({ length: 14 }, () => '.'.repeat(40).split(''));
    for (let x = 0; x < 40; x++) { rows[12][x] = '='; rows[13][x] = '#'; }
    for (let x = 18; x <= 23; x++) rows[3][x] = '=';
    rows[2][20] = 'G'; rows[11][1] = 'P';
    rows[7][11] = 'd'; rows[5][15] = 'd';
    const level = custom(rows.map(r => r.join('')), 'rooftops');
    expect(reachesGoal(level, { dash: false, wallJump: false, doubleJump: true, generous: true })).toBe(false);
    expect(reachesGoal(level, { dash: false, wallJump: false, doubleJump: true, bounces: true })).toBe(true);
  });
});
