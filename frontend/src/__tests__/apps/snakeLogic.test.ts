import { describe, it, expect } from 'vitest';
import {
  createSnake, enqueueTurn, step, tickMs, SNAKE_SPEEDS, type SnakeState,
} from '@/components/apps/games/snake/logic';

const fixedFood = () => ({ x: 0, y: 0 });

function moving(dir: SnakeState['dir'], body: { x: number; y: number }[]): SnakeState {
  return { ...createSnake(fixedFood), dir, body, queue: [] };
}

describe('snake turn queue', () => {
  it('two fast turns no longer reverse the snake into itself', () => {
    // Moving right, swipe up then left inside one tick.
    let s = moving('RIGHT', [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]);
    s = enqueueTurn(s, 'UP');
    s = enqueueTurn(s, 'LEFT');
    s = step(s, fixedFood);
    expect(s.over).toBe(false);
    expect(s.body[0]).toEqual({ x: 10, y: 9 });
    s = step(s, fixedFood);
    expect(s.over).toBe(false);
    expect(s.body[0]).toEqual({ x: 9, y: 9 });
  });

  it('ignores a turn straight back against the last queued direction', () => {
    let s = moving('RIGHT', [{ x: 10, y: 10 }, { x: 9, y: 10 }]);
    s = enqueueTurn(s, 'LEFT');
    expect(s.queue).toEqual([]);
    s = enqueueTurn(s, 'UP');
    s = enqueueTurn(s, 'DOWN');
    expect(s.queue).toEqual(['UP']);
  });

  it('ignores repeats and holds at most two turns', () => {
    let s = moving('RIGHT', [{ x: 10, y: 10 }]);
    s = enqueueTurn(s, 'RIGHT');
    expect(s.queue).toEqual([]);
    s = enqueueTurn(s, 'UP');
    s = enqueueTurn(s, 'LEFT');
    s = enqueueTurn(s, 'DOWN');
    expect(s.queue).toEqual(['UP', 'LEFT']);
  });
});

describe('snake step', () => {
  it('dies on the wall', () => {
    const s = step(moving('RIGHT', [{ x: 19, y: 5 }]), fixedFood);
    expect(s.over).toBe(true);
  });

  it('grows and scores when it eats', () => {
    const s0 = { ...moving('RIGHT', [{ x: 4, y: 4 }, { x: 3, y: 4 }]), food: { x: 5, y: 4 } };
    const s = step(s0, () => ({ x: 12, y: 12 }));
    expect(s.score).toBe(1);
    expect(s.body).toHaveLength(3);
    expect(s.food).toEqual({ x: 12, y: 12 });
    expect(s.ate).toBe(true);
  });

  it('never places food on the snake', () => {
    const s0 = { ...moving('RIGHT', [{ x: 4, y: 4 }, { x: 3, y: 4 }]), food: { x: 5, y: 4 } };
    const picks = [{ x: 4, y: 4 }, { x: 3, y: 4 }, { x: 7, y: 7 }];
    const s = step(s0, () => picks.shift()!);
    expect(s.food).toEqual({ x: 7, y: 7 });
  });

  it('keeps the previous body for smooth drawing', () => {
    const s0 = moving('RIGHT', [{ x: 4, y: 4 }, { x: 3, y: 4 }]);
    const s = step(s0, fixedFood);
    expect(s.prev).toEqual([{ x: 4, y: 4 }, { x: 3, y: 4 }]);
  });
});

describe('snake speed', () => {
  it('starts slow on Chill and speeds up as she eats, down to a floor', () => {
    expect(tickMs('chill', 0)).toBe(SNAKE_SPEEDS.chill.start);
    expect(tickMs('chill', 5)).toBeLessThan(tickMs('chill', 0));
    expect(tickMs('chill', 500)).toBe(SNAKE_SPEEDS.chill.floor);
  });

  it('Chill is slower than the old fixed 140ms tick', () => {
    expect(SNAKE_SPEEDS.chill.start).toBeGreaterThan(140);
    expect(SNAKE_SPEEDS.fast.start).toBeLessThan(SNAKE_SPEEDS.classic.start);
  });
});
