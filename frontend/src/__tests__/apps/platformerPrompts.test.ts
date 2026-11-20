import { describe, it, expect } from 'vitest';
import { promptSpots, promptText } from '@/components/apps/games/platformer/ui/prompts';
import { ROWS, TILE, type Level } from '@/components/apps/games/platformer/sim/level';

function level(gaps: [number, number][], hints?: unknown): Level {
  const cols = 60;
  const tiles = new Uint8Array(cols * ROWS);
  for (let x = 0; x < cols; x++) {
    if (gaps.some(([a, b]) => x >= a && x < b)) continue;
    for (let y = 11; y < ROWS; y++) tiles[y * cols + x] = TILE.GROUND;
  }
  return { cols, rows: ROWS, tiles, start: { x: 2, y: 11 }, goalDir: 1, ...(hints ? { hints } : {}) } as unknown as Level;
}

describe('beginner prompts', () => {
  it('the first gap teaches holding Jump; the first wide gap the double jump', () => {
    const s = promptSpots(level([[10, 12], [20, 26]]));
    expect(s.map(p => p.move)).toEqual(['hold', 'double']);
    expect(s[0].x).toBeCloseTo(9.5);
    expect(s[1].x).toBeCloseTo(19.5);
  });

  it('uses the level hints when the sim provides them', () => {
    const s = promptSpots(level([], [{ x: 7, y: 10, move: 'double' }, { x: 3, y: 10, move: 'jump' }]));
    expect(s).toEqual([{ x: 7, y: 10, move: 'double' }, { x: 3, y: 10, move: 'hold' }]);
  });

  it('desktop and touch wording', () => {
    expect(promptText('hold', false)).toBe('HOLD SPACE TO JUMP HIGHER');
    expect(promptText('hold', true)).toBe('HOLD JUMP TO JUMP HIGHER');
    expect(promptText('double', true)).toBe('JUMP AGAIN IN THE AIR');
    expect(promptText('attack', true)).toBe('TAP ATTACK TO SWING');
  });
});
