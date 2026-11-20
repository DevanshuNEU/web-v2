import { describe, it, expect } from 'vitest';
import {
  SCARF_POINTS, SCARF_SEG, createScarf, neckOf, scarfLength, stepScarf, torsoOf, type ScarfPoint,
} from '@/components/apps/games/platformer/sim/scarf';
import { createHero } from '@/components/apps/games/platformer/sim/hero';
import { PHYS } from '@/components/apps/games/platformer/sim/physics';
import { DT, FLAT, run, worldOn } from '../setup/platformerWorld';

const REST = (SCARF_POINTS - 1) * SCARF_SEG;

function inside(p: ScarfPoint, b: { x: number; y: number; w: number; h: number }) {
  return p.x > b.x + 1e-6 && p.x < b.x + b.w - 1e-6 && p.y > b.y + 1e-6 && p.y < b.y + b.h - 1e-6;
}

/** A hero moved by a script, with the scarf stepped after him every tick. */
function drive(seconds: number, vx: (t: number) => number, check?: (s: ScarfPoint[], h: ReturnType<typeof createHero>) => void) {
  const h = createHero(10, 10);
  const s = createScarf(neckOf(h));
  for (let t = 0; t < seconds; t += DT) {
    h.vx = vx(t);
    h.x += h.vx * DT;
    if (h.vx !== 0) h.facing = h.vx > 0 ? 1 : -1;
    stepScarf(s, neckOf(h), torsoOf(h), h.facing, h.vx, h.vy, DT);
    check?.(s, h);
  }
  return { h, s };
}

describe('Main Character scarf: a verlet rope from the neck', () => {
  it('has 10 points, the first pinned at the neck', () => {
    const { h, s } = drive(0.5, () => 0);
    expect(s).toHaveLength(SCARF_POINTS);
    expect(SCARF_POINTS).toBe(10);
    const n = neckOf(h);
    expect(s[0].x).toBeCloseTo(n.x, 9);
    expect(s[0].y).toBeCloseTo(n.y, 9);
  });

  it('settles when the hero stands still', () => {
    const { s } = drive(4, () => 0);
    const before = s.map(p => ({ x: p.x, y: p.y }));
    const h = createHero(10, 10);
    stepScarf(s, neckOf(h), torsoOf(h), 1, 0, 0, DT);
    const moved = Math.max(...s.map((p, i) => Math.hypot(p.x - before[i].x, p.y - before[i].y)));
    expect(moved).toBeLessThan(1e-4);
    // At rest it hangs down behind him.
    expect(s[SCARF_POINTS - 1].y).toBeGreaterThan(s[0].y + REST * 0.5);
    expect(s[SCARF_POINTS - 1].x).toBeLessThanOrEqual(s[0].x + 1e-6);
  });

  it('keeps its length while running, dashing, turning and stopping: it may fold, never stretch', () => {
    let worst = 0, longest = 0;
    drive(4, t => (t < 1 ? PHYS.runMax : t < 1.2 ? -PHYS.dashSpeed : t < 3 ? -PHYS.runMax : 0), s => {
      worst = Math.max(worst, Math.abs(scarfLength(s) - REST) / REST);
      for (let i = 1; i < s.length; i++) longest = Math.max(longest, Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y));
    });
    expect(worst).toBeLessThan(0.05);
    expect(longest).toBeLessThanOrEqual(SCARF_SEG * 1.01);
  });

  it('trails behind the run', () => {
    const { s } = drive(1, () => PHYS.runMax);
    expect(s[SCARF_POINTS - 1].x).toBeLessThan(s[0].x - REST * 0.5);
  });

  it('whips across on a turn', () => {
    const { s } = drive(1.6, t => (t < 1 ? PHYS.runMax : -PHYS.runMax));
    expect(s[SCARF_POINTS - 1].x).toBeGreaterThan(s[0].x + REST * 0.5);
  });

  it('never passes through the hero, even through turns and a dash', () => {
    let hits = 0;
    drive(4, t => (t < 1 ? PHYS.runMax : t < 1.16 ? -PHYS.dashSpeed : t < 2.5 ? -PHYS.runMax : t < 3 ? PHYS.runMax : 0), (s, h) => {
      const torso = torsoOf(h);
      for (let i = 1; i < s.length; i++) if (inside(s[i], torso)) hits++;
    });
    expect(hits).toBe(0);
  });
});

describe('Main Character scarf in the world', () => {
  it('the world steps the scarf with the hero every tick', () => {
    const w = worldOn(FLAT);
    expect(w.scarf).toHaveLength(SCARF_POINTS);
    run(w, 0.8, { move: 1 });
    const n = neckOf(w.hero);
    expect(w.scarf[0].x).toBeCloseTo(n.x, 9);
    expect(w.scarf[SCARF_POINTS - 1].x).toBeLessThan(n.x);
  });
});
