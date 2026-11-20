import { describe, it, expect } from 'vitest';
import { createWorld, snapCamera } from '@/components/apps/games/platformer/sim/world';
import { tileFor, VIEW_ROWS } from '@/components/apps/games/platformer/render/pipeline';
import { ROWS } from '@/components/apps/games/platformer/sim/level';

/**
 * Portrait phones get a tall game view. Tiles are sized from the width there
 * (so the world stays chunky and about 13 columns show), and the extra rows
 * are sky above the level, with the ground kept at the bottom of the view.
 */
describe('platformer view sizing', () => {
  it('a wide view keeps the original 13 rows', () => {
    expect(tileFor(800, 500)).toBeCloseTo(500 / VIEW_ROWS);
  });

  it('a tall phone view sizes tiles from the width, about 13 columns', () => {
    const T = tileFor(390, 500);
    expect(390 / T).toBeGreaterThanOrEqual(12.5);
    expect(390 / T).toBeLessThanOrEqual(13.5);
  });

  it('never shows more than 17 rows, however tall the view', () => {
    expect(1200 / tileFor(390, 1200)).toBeLessThanOrEqual(17.0001);
  });

  it('with more rows than the level, the camera anchors the ground to the bottom', () => {
    const w = createWorld({ rand: () => 0.5, viewCols: 15, viewRows: 18 });
    snapCamera(w);
    expect(w.cam.y).toBeCloseTo(ROWS - 18);
    expect(w.cam.y + w.viewRows).toBeCloseTo(ROWS);
  });

  it('with fewer rows than the level, the camera stays inside it', () => {
    const w = createWorld({ rand: () => 0.5, viewCols: 17, viewRows: 13 });
    snapCamera(w);
    expect(w.cam.y).toBeGreaterThanOrEqual(0);
    expect(w.cam.y).toBeLessThanOrEqual(ROWS - 13);
  });
});
