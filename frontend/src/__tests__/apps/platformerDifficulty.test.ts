import { describe, it, expect } from 'vitest';
import { difficultyOf, rawDifficulty, DIFFICULTY } from '@/components/apps/games/platformer/sim/difficulty';
import { parseLevel } from '@/components/apps/games/platformer/sim/level';
import { STORY, storyLevelDef } from '@/components/apps/games/platformer/sim/story';
import { custom } from '../setup/platformerWorld';

/** A flat 100 column floor with these chars dropped on the walking row (row 11). */
function flat(extra: Record<number, string> = {}) {
  const top = Array.from({ length: 100 }, (_, x) => extra[x] ?? (x === 2 ? 'P' : x === 97 ? 'G' : '.')).join('');
  return custom([top, '#'.repeat(100), '#'.repeat(100)]);
}

describe('difficultyOf: a score from the level data only', () => {
  it('an empty flat level scores nothing', () => {
    expect(rawDifficulty(flat())).toBe(0);
    expect(difficultyOf(flat())).toBe(0);
  });

  it('enemies count per 100 columns, and a flyer weighs more than a walker', () => {
    const walker = rawDifficulty(flat({ 40: 'c' }));
    const flyer = rawDifficulty(flat({ 40: 'd' }));
    expect(walker).toBeCloseTo(DIFFICULTY.enemy.doomCrawler, 6);
    expect(flyer).toBeCloseTo(DIFFICULTY.enemy.adDrone, 6);
    expect(flyer).toBeGreaterThan(walker);
    expect(rawDifficulty(flat({ 40: 'c', 50: 'c' }))).toBeCloseTo(2 * walker, 6);
  });

  it('spikes count per tile', () => {
    expect(rawDifficulty(flat({ 40: '^', 41: '^' }))).toBeCloseTo(2 * DIFFICULTY.hazard, 6);
  });

  it('a pit counts per column, and the widest gap with no floor at any height counts once by its width', () => {
    // A 4 wide hole through the floor: 4 pit columns and a 4 wide gap.
    const top = Array.from({ length: 100 }, (_, x) => (x === 2 ? 'P' : x === 97 ? 'G' : '.')).join('');
    const ground = Array.from({ length: 100 }, (_, x) => (x >= 40 && x <= 43 ? '.' : '#')).join('');
    const l = custom([top, ground, ground]);
    expect(rawDifficulty(l)).toBeCloseTo(4 * DIFFICULTY.pit + 4 * DIFFICULTY.gap, 6);
  });

  it('a ledge over a pit makes the gap narrower, not the pit', () => {
    const top = Array.from({ length: 100 }, (_, x) => (x === 2 ? 'P' : x === 97 ? 'G' : '.')).join('');
    const ledge = Array.from({ length: 100 }, (_, x) => (x === 41 || x === 42 ? '_' : '.')).join('');
    const ground = Array.from({ length: 100 }, (_, x) => (x >= 40 && x <= 43 ? '.' : '#')).join('');
    const l = custom([ledge, '.'.repeat(100), top, ground, ground]);
    expect(rawDifficulty(l)).toBeCloseTo(4 * DIFFICULTY.pit + 1 * DIFFICULTY.gap, 6);
  });

  it('a timed section (a vehicle lane, a moving platform) counts, and a checkpoint takes a little off', () => {
    const plat = rawDifficulty(flat({ 40: '-', 41: '-' }));
    expect(plat).toBeCloseTo(DIFFICULTY.timed, 6);
    const lane = custom(
      [Array.from({ length: 100 }, (_, x) => (x === 2 ? 'P' : x === 97 ? 'G' : '.')).join(''), '#'.repeat(100), '#'.repeat(100)],
      'tracks', { vehicles: [{ kind: 'trolley', row: 10, x0: 10, x1: 60, speed: 5, dir: 1, gap: 1 }, { kind: 'trolley', row: 10, x0: 10, x1: 60, speed: 5, dir: 1, gap: 1, offset: 5 }] },
    );
    // Two trolleys on one lane are one timed section.
    expect(rawDifficulty(lane)).toBeCloseTo(DIFFICULTY.timed, 6);
    expect(rawDifficulty(flat({ 40: 'c', 60: 'K' }))).toBeCloseTo(DIFFICULTY.enemy.doomCrawler - DIFFICULTY.checkpoint, 6);
    expect(rawDifficulty(flat({ 60: 'K' }))).toBe(0);
  });

  it('a gust zone, a wave and a crane hook are timed sections; a hook\'s swing is floor for the gap', () => {
    const top = Array.from({ length: 100 }, (_, x) => (x === 2 ? 'P' : x === 97 ? 'G' : '.')).join('');
    const holed = Array.from({ length: 100 }, (_, x) => (x >= 40 && x <= 59 ? '.' : '#')).join('');
    const pits = 20 * DIFFICULTY.pit;
    const bare = custom([top, holed, holed]);
    expect(rawDifficulty(bare)).toBeCloseTo(pits + 20 * DIFFICULTY.gap, 6);
    // A hook over the middle of the hole: its swing (plus the deck's width) is floor, leaving two 5 wide gaps.
    const hooked = custom([top, holed, holed], 'harbor', { hooks: [{ x: 49, y: 1, len: 6, amp: 0.5857, period: 4 }] });
    expect(rawDifficulty(hooked)).toBeCloseTo(pits + 5 * DIFFICULTY.gap + DIFFICULTY.timed, 6);
    const flatRows = [top, '#'.repeat(100), '#'.repeat(100)];
    expect(rawDifficulty(custom(flatRows, 'harbor', { gusts: [{ x0: 10, x1: 20, dir: -1, strength: 5, period: 4, blow: 1 }] }))).toBeCloseTo(DIFFICULTY.timed, 6);
    expect(rawDifficulty(custom(flatRows, 'beach', { waves: [{ x0: 10, x1: 20, row: 12, dir: -1, period: 6 }] }))).toBeCloseTo(DIFFICULTY.timed, 6);
  });

  it('scales per 100 columns: the same enemies over twice the length score half', () => {
    const short = custom(['.P' + '.'.repeat(38) + 'c' + '.'.repeat(56) + 'G..', '#'.repeat(100), '#'.repeat(100)]);
    const long = custom(['.P' + '.'.repeat(38) + 'c' + '.'.repeat(156) + 'G..', '#'.repeat(200), '#'.repeat(200)]);
    expect(rawDifficulty(long)).toBeCloseTo(rawDifficulty(short) / 2, 6);
  });
});

/** Built story levels by chapter, in play order (bosses aside). */
const byChapter = new Map<number, { id: string; d: number }[]>();
for (const s of STORY) {
  if (!s.built || s.id.includes('boss')) continue;
  const list = byChapter.get(s.world) ?? [];
  list.push({ id: s.id, d: difficultyOf(parseLevel(storyLevelDef(s.id))) });
  byChapter.set(s.world, list);
}
const chapters = [...byChapter.keys()].sort((a, b) => a - b);
const mean = (c: number) => byChapter.get(c)!.reduce((s, l) => s + l.d, 0) / byChapter.get(c)!.length;
const hardest = (c: number) => Math.max(...byChapter.get(c)!.map(l => l.d));

describe('the difficulty curve over the story', () => {
  it('is normalised so chapter 1 averages about 1', () => {
    expect(mean(1)).toBeGreaterThan(0.9);
    expect(mean(1)).toBeLessThan(1.1);
  });

  it('every chapter averages harder than the one before', () => {
    for (let i = 1; i < chapters.length; i++) {
      expect(mean(chapters[i]), `chapter ${chapters[i]} over chapter ${chapters[i - 1]}`).toBeGreaterThan(mean(chapters[i - 1]));
    }
  });

  it('each chapter\'s hardest level beats the hardest of the chapter before', () => {
    for (let i = 1; i < chapters.length; i++) {
      expect(hardest(chapters[i]), `chapter ${chapters[i]} over chapter ${chapters[i - 1]}`).toBeGreaterThan(hardest(chapters[i - 1]));
    }
  });

  it('inside every chapter the levels never get easier in story order', () => {
    for (const c of chapters) {
      const ls = byChapter.get(c)!;
      for (let i = 1; i < ls.length; i++) expect(ls[i].d, `${ls[i].id} after ${ls[i - 1].id}`).toBeGreaterThanOrEqual(ls[i - 1].d);
    }
  });

  it('chapter 4 rises level by level', () => {
    const four = byChapter.get(4)!;
    expect(four.map(l => l.id)).toEqual(['4-1', '4-2', '4-3', '4-4']);
    for (let i = 1; i < four.length; i++) expect(four[i].d, `${four[i].id} over ${four[i - 1].id}`).toBeGreaterThan(four[i - 1].d);
  });
});
