import { describe, it, expect } from 'vitest';
import { POINTS, drainEvents, score } from '@/components/apps/games/platformer/sim/world';
import { TILE, tileAt } from '@/components/apps/games/platformer/sim/level';
import { G40, press, run, runUntil, worldOn } from '../setup/platformerWorld';

describe('Main Character surprises: the golden Sigma coin', () => {
  it('is worth 500, not counted as a coin, with its own event', () => {
    const w = worldOn(['.P....$.................................', G40, G40]);
    expect(w.level.sigmas).toBe(1);
    expect(w.level.coinTotal).toBe(0);
    const seen: string[] = [];
    run(w, 1, { move: 1 }, ww => seen.push(...drainEvents(ww).map(e => e.type)));
    expect(seen).toContain('sigma');
    expect(w.stats.coins).toBe(0);
    expect(w.stats.bonus).toBe(POINTS.sigma);
    expect(POINTS.sigma).toBe(500);
    expect(score(w)).toBe(500);
    expect(tileAt(w.tiles, w.level.cols, 6, 11)).toBe(TILE.EMPTY);
  });
});

describe('Main Character surprises: the cracked wall', () => {
  const ROOM = [
    '.........%..............................',
    '.P.......%..oo..........................',
    G40, G40,
  ];

  it('is solid: walking or jumping into it does nothing', () => {
    const w = worldOn(ROOM);
    run(w, 1.5, { move: 1 });
    expect(w.hero.x + w.hero.w).toBeCloseTo(9, 5);
    expect(tileAt(w.tiles, w.level.cols, 9, 11)).toBe(TILE.CRACK);
  });

  it('a dash into it smashes the whole cracked column for 20 a tile and opens the room', () => {
    const w = worldOn(ROOM);
    expect(w.level.bricks).toBe(2);
    expect(runUntil(w, ww => ww.hero.x > 6, { move: 1 })).toBe(true);
    press(w, { dashPressed: true, move: 1 });
    const seen: string[] = [];
    run(w, 1, { move: 1 }, ww => seen.push(...drainEvents(ww).map(e => e.type)));
    expect(tileAt(w.tiles, w.level.cols, 9, 10)).toBe(TILE.EMPTY);
    expect(tileAt(w.tiles, w.level.cols, 9, 11)).toBe(TILE.EMPTY);
    expect(seen.filter(t => t === 'break')).toHaveLength(2);
    expect(w.stats.bricks).toBe(2);
    expect(w.stats.coins).toBe(2);
  });
});

describe('Main Character surprises: the elite drone', () => {
  const ELITE = [
    '...............e........................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '.P......................................',
    G40, G40,
  ];

  it('fires slow shots from a fixed pool at a hero within reach, and a shot hurts', () => {
    const w = worldOn(ELITE);
    const pool = w.shots;
    w.hero.x = 9;
    expect(runUntil(w, ww => ww.shots.some(s => s.t > 0), {}, 4)).toBe(true);
    const s = w.shots.find(sh => sh.t > 0)!;
    expect(Math.hypot(s.vx, s.vy)).toBeLessThan(5);
    expect(w.shots).toBe(pool);
    expect(runUntil(w, ww => ww.phase === 'dying', {}, 6)).toBe(true);
  });

  it('a stomp kills it', () => {
    const w = worldOn(ELITE);
    const e = w.enemies[0];
    expect(e.kind).toBe('eliteDrone');
    run(w, 0.2);
    w.hero.x = e.x; w.hero.y = e.y - w.hero.h - 0.3; w.hero.vy = 4; w.hero.onGround = false;
    run(w, 0.2);
    expect(w.stats.stomps).toBe(1);
  });
});
