import { describe, it, expect } from 'vitest';
import { createWorld, score, stepWorld, type World } from '@/components/apps/games/platformer/sim/world';
import { mulberry32 } from '@/components/apps/games/platformer/sim/rand';
import { emptyFrame, type InputFrame } from '@/components/apps/games/platformer/input/frame';
import { DT } from '../setup/platformerWorld';

/** A recorded run: 20 seconds of fixed steps of busy, made-up input. */
function recording(seconds: number): InputFrame[] {
  const r = mulberry32(99);
  const frames: InputFrame[] = [];
  let move = 1, held = false;
  for (let i = 0; i < seconds / DT; i++) {
    if (r() < 0.02) move = r() < 0.75 ? 1 : r() < 0.5 ? 0 : -1;
    const jumpPressed = r() < 0.03;
    if (jumpPressed) held = true; else if (r() < 0.04) held = false;
    frames.push({ ...emptyFrame(), move, jumpHeld: held, jumpPressed, dashPressed: r() < 0.01 });
  }
  return frames;
}

function replay(levelIndex: number, seed: number, frames: readonly InputFrame[]): World {
  const w = createWorld({ levelIndex, seed });
  for (const f of frames) stepWorld(w, { ...f }, DT);
  return w;
}

const snapshot = (w: World) => ({
  hero: [w.hero.x, w.hero.y, w.hero.vx, w.hero.vy, w.hero.state],
  score: score(w), lives: w.lives, phase: w.phase, level: w.levelIndex,
  enemies: w.enemies.map(e => [e.kind, e.x, e.y, e.vx, e.vy, e.deadT]),
});

describe('Main Character replays: the sim is deterministic', () => {
  const frames = recording(20);

  for (const levelIndex of [0, 1]) {
    it(`world ${levelIndex + 1}: the same seed and the same recorded inputs give the same world after 20 seconds`, () => {
      const a = replay(levelIndex, 1234, frames);
      const b = replay(levelIndex, 1234, frames);
      expect(snapshot(a)).toEqual(snapshot(b));
    });
  }

  it('the seed is kept on the world and the generator is a pure function of it', () => {
    const w = createWorld({ seed: 7 });
    expect(w.seed).toBe(7);
    const r1 = mulberry32(7), r2 = mulberry32(7);
    const xs = Array.from({ length: 5 }, () => r1());
    expect(xs).toEqual(Array.from({ length: 5 }, () => r2()));
    for (const x of xs) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); }
    expect(new Set(xs).size).toBe(5);
  });

  it('slow motion is applied inside the sim: the same fixed dt advances less sim time', () => {
    const a = createWorld({ seed: 1 }), b = createWorld({ seed: 1 });
    b.slowMo = 0.5;
    for (let i = 0; i < 120; i++) { stepWorld(a, emptyFrame(), DT); stepWorld(b, emptyFrame(), DT); }
    expect(a.t).toBeCloseTo(1, 6);
    expect(b.t).toBeCloseTo(0.5, 6);
  });
});
