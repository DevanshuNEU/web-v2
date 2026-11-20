import { describe, it, expect } from 'vitest';
import { FINALE, INTRO, ROOFTOP_CHUNKS, type Chunk } from '@/components/apps/games/platformer/sim/chunks/rooftops';
import { ROWS, parseLevel } from '@/components/apps/games/platformer/sim/level';
import { reachesGoal } from '../setup/platformerReach';

/** A chunk alone as a level: a start roof on its left, a goal roof on its right, slots resolved plainly. */
function alone(c: Chunk) {
  const rows = c.rows.map((r, y) => {
    const left = y === c.entry ? '===' : y > c.entry ? '###' : y === c.entry - 1 ? '.P.' : '...';
    const right = y === c.exit ? '====' : y > c.exit ? '####' : y === c.exit - 1 ? '..G.' : '....';
    const mid = r.replace(/[*]/g, 'o').replace(/[?]/g, 'a').replace(/[$&]/g, '.').replace(/%/g, '#').replace(/D/g, 'd')
      .replace(/[PG]/g, '.');
    return left + mid + right;
  });
  return parseLevel({ id: 1, label: 'Chunk', name: c.id, theme: 'rooftops', rows });
}

const ALL = [INTRO, ...ROOFTOP_CHUNKS, FINALE];

describe('Main Character rooftop chunks: the library', () => {
  it('has at least 14 chunks, each with a unique id and every difficulty from 1 to 5', () => {
    expect(ROOFTOP_CHUNKS.length).toBeGreaterThanOrEqual(14);
    expect(new Set(ROOFTOP_CHUNKS.map(c => c.id)).size).toBe(ROOFTOP_CHUNKS.length);
    expect(new Set(ROOFTOP_CHUNKS.map(c => c.difficulty))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('teaches the wall jump and the dash in more than one chunk each', () => {
    expect(ROOFTOP_CHUNKS.filter(c => c.requires.includes('wallJump')).length).toBeGreaterThanOrEqual(3);
    expect(ROOFTOP_CHUNKS.filter(c => c.requires.includes('dash')).length).toBeGreaterThanOrEqual(4);
    expect(INTRO.requires).toEqual(['jump', 'dash']);
  });

  for (const c of ALL) {
    describe(c.id, () => {
      it('is 14 rows of 20 to 30 columns, standing on its entry and exit roofs', () => {
        expect(c.rows).toHaveLength(ROWS);
        const w = c.rows[0].length;
        expect(w).toBeGreaterThanOrEqual(20);
        expect(w).toBeLessThanOrEqual(30);
        for (const r of c.rows) expect(r).toHaveLength(w);
        for (const x of [0, 1]) expect(c.rows[c.entry][x]).toBe('=');
        for (const x of [w - 2, w - 1]) expect(c.rows[c.exit][x]).toBe('=');
      });

      it('can be crossed with the moves it lists', () => {
        const moves = { dash: c.requires.includes('dash'), wallJump: c.requires.includes('wallJump') };
        expect(reachesGoal(alone(c), moves)).toBe(true);
      });

      for (const move of ['dash', 'wallJump'] as const) {
        if (!c.requires.includes(move)) continue;
        it(`really needs the ${move}: impossible without it even with generous numbers`, () => {
          const moves = { dash: move !== 'dash', wallJump: move !== 'wallJump', generous: true };
          expect(reachesGoal(alone(c), moves)).toBe(false);
        });
      }
    });
  }
});
