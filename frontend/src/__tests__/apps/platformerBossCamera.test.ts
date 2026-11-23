// The fight camera on a portrait phone (about 13 tiles across, the arena is
// 30): it frames her and the gorilla together when they fit, and otherwise
// keeps her near the edge with the rest of the view toward him.

import { describe, it, expect } from 'vitest';
import { frameFight } from '@/components/apps/games/platformer/sim/boss';

const ARENA = { viewL: 10, viewR: 44 };
const inView = (camX: number, x: number, view: number, margin = 0) => x >= camX + margin && x <= camX + view - margin;

describe('the fight camera frames both fighters', () => {
  it('both in view when they fit (portrait, 13 tiles)', () => {
    const cam = frameFight(ARENA, 15, 23, 13);
    expect(inView(cam, 15, 13, 1)).toBe(true);
    expect(inView(cam, 23 + 2.2, 13, 0.5)).toBe(true);
  });

  it('when they are too far apart she stays in view, near the edge, and the view leans toward him', () => {
    const left = frameFight(ARENA, 14, 40, 13);
    expect(inView(left, 14, 13, 1)).toBe(true);
    expect(14 - left).toBeLessThanOrEqual(3.5);
    const right = frameFight(ARENA, 40, 14, 13);
    expect(inView(right, 40, 13, 1)).toBe(true);
    expect(right + 13 - 40).toBeLessThanOrEqual(3.5);
  });

  it('never leaves the arena, and a view wider than the arena is centred on it', () => {
    expect(frameFight(ARENA, 11, 12, 13)).toBeGreaterThanOrEqual(10);
    expect(frameFight(ARENA, 43, 42, 13)).toBeLessThanOrEqual(44 - 13);
    expect(frameFight(ARENA, 20, 30, 40)).toBe(27 - 20);
  });
});
