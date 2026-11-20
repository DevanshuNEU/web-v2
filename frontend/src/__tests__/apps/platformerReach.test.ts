import { describe, it, expect } from 'vitest';
import { reachesGoal } from '../setup/platformerReach';
import { DT, custom } from '../setup/platformerWorld';
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
