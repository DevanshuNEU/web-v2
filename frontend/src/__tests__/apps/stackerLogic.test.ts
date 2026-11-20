import { describe, it, expect } from 'vitest';
import {
  ACTIVE_FROM_TOP, COLORS, DEBRIS_LIFE, DEBRIS_LIFE_REDUCED, GROW, MAX_SPEED, MIN_SPEED, SLAB_H, START_W, WORLD_W,
  cameraTarget, createStacker, drop, easeCamera, growsAt, moverBounds, perfectTolerance, regrow, slice, spawn,
  speedFor, tick, top, type StackerState,
} from '@/components/apps/games/stacker/logic';

/** A seeded generator so runs repeat exactly. */
function lcg(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

/** Put the mover at x (relative to the top slab) and drop it. */
function dropAt(s: StackerState, offset: number) {
  s.mover!.x = top(s).x + offset;
  return drop(s)!;
}

describe('slice', () => {
  const prev = { x: 100, w: 100 };

  it('cuts a left overhang and keeps the overlap', () => {
    const r = slice(prev, { x: 80, w: 100 });
    expect(r).toEqual({ kind: 'cut', x: 100, w: 80, cutX: 80, cutW: 20, side: 'left' });
  });

  it('cuts a right overhang and keeps the overlap', () => {
    const r = slice(prev, { x: 130, w: 100 });
    expect(r).toEqual({ kind: 'cut', x: 130, w: 70, cutX: 200, cutW: 30, side: 'right' });
  });

  it('kept part plus cut part always add up to the dropped slab', () => {
    for (const x of [12, 41.5, 96, 104, 150.25, 199]) {
      const r = slice(prev, { x, w: 100 });
      if (r.kind !== 'cut') throw new Error(`expected a cut at ${x}`);
      expect(r.w + r.cutW).toBeCloseTo(100, 9);
    }
  });

  it('exact overlap is a perfect with nothing cut', () => {
    expect(slice(prev, { x: 100, w: 100 })).toEqual({ kind: 'perfect', x: 100, w: 100 });
  });

  it('snaps onto the slab below inside the tolerance, from either side', () => {
    const tol = perfectTolerance(100);
    expect(slice(prev, { x: 100 + tol, w: 100 })).toEqual({ kind: 'perfect', x: 100, w: 100 });
    expect(slice(prev, { x: 100 - tol, w: 100 })).toEqual({ kind: 'perfect', x: 100, w: 100 });
  });

  it('just outside the tolerance is a cut, not a perfect', () => {
    const tol = perfectTolerance(100);
    expect(slice(prev, { x: 100 + tol + 0.01, w: 100 }).kind).toBe('cut');
  });

  it('tolerance is 3% of the width with a floor of 3', () => {
    expect(perfectTolerance(200)).toBeCloseTo(6);
    expect(perfectTolerance(50)).toBe(3);
    expect(perfectTolerance(10)).toBe(3);
  });

  it('no overlap at all is a miss, on both sides', () => {
    expect(slice(prev, { x: -5, w: 100 }).kind).toBe('miss');
    expect(slice(prev, { x: 260, w: 100 }).kind).toBe('miss');
  });

  it('touching edges and sub-unit slivers count as a miss', () => {
    expect(slice(prev, { x: 0, w: 100 }).kind).toBe('miss');
    expect(slice(prev, { x: 199.5, w: 100 }).kind).toBe('miss');
    expect(slice(prev, { x: 198, w: 100 }).kind).toBe('cut');
  });
});

describe('regrowth', () => {
  it('grows about the centre', () => {
    const g = regrow({ x: 100, w: 100 });
    expect(g.w).toBe(100 + GROW);
    expect(g.x + g.w / 2).toBeCloseTo(150);
  });

  it('never grows past the starting width', () => {
    expect(regrow({ x: 0, w: START_W - 2 }).w).toBe(START_W);
    expect(regrow({ x: 0, w: START_W }).w).toBe(START_W);
  });

  it('happens on every third perfect in a row', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 9].map(growsAt)).toEqual([false, false, true, false, false, true, false, true]);
    expect(growsAt(0)).toBe(false);
  });

  it('three perfects in a row win width back, the first two do not', () => {
    const s = createStacker({ rand: lcg() });
    dropAt(s, 20);
    const w = top(s).w;
    expect(dropAt(s, 0).grew).toBe(false);
    expect(dropAt(s, 0).grew).toBe(false);
    const e = dropAt(s, 0);
    expect(e.grew).toBe(true);
    expect(top(s).w).toBe(w + GROW);
    expect(s.mover!.w).toBe(w + GROW);
  });

  it('a full width slab does not grow on a third perfect', () => {
    const s = createStacker({ rand: lcg() });
    for (let i = 0; i < 3; i++) dropAt(s, 0);
    expect(s.combo).toBe(3);
    expect(top(s).w).toBe(START_W);
  });

  it('regrowth is capped at the starting width', () => {
    const s = createStacker({ rand: lcg() });
    dropAt(s, 4 + 3); // lose a little: 7 units
    for (let i = 0; i < 3; i++) dropAt(s, 0);
    expect(top(s).w).toBe(START_W);
  });
});

describe('combo and score', () => {
  it('a perfect adds to the combo and the perfect count', () => {
    const s = createStacker({ rand: lcg() });
    const e = dropAt(s, 1);
    expect(e.kind).toBe('perfect');
    expect(s.combo).toBe(1);
    expect(s.perfects).toBe(1);
  });

  it('a cut resets the combo but keeps the perfect count and best combo', () => {
    const s = createStacker({ rand: lcg() });
    dropAt(s, 0); dropAt(s, 0);
    dropAt(s, 30);
    expect(s.combo).toBe(0);
    expect(s.perfects).toBe(2);
    expect(s.bestCombo).toBe(2);
  });

  it('score is one floor per slab placed, perfect or not', () => {
    const s = createStacker({ rand: lcg() });
    dropAt(s, 0); dropAt(s, 15); dropAt(s, -10);
    expect(s.floors).toBe(3);
    expect(s.stack).toHaveLength(4);
  });

  it('a total miss ends the round without scoring and drops the whole slab', () => {
    const s = createStacker({ rand: lcg() });
    dropAt(s, 0);
    const e = dropAt(s, START_W + 5);
    expect(e.kind).toBe('miss');
    expect(s.over).toBe(true);
    expect(s.floors).toBe(1);
    expect(s.mover).toBeNull();
    expect(s.debris.at(-1)).toMatchObject({ whole: true, w: START_W });
    expect(drop(s)).toBeNull();
  });

  it('a cut drops the overhang as debris and keeps the rest as the new top', () => {
    const s = createStacker({ rand: lcg() });
    const base = top(s);
    dropAt(s, -25);
    expect(top(s)).toMatchObject({ x: base.x, w: START_W - 25 });
    expect(s.debris).toHaveLength(1);
    expect(s.debris[0]).toMatchObject({ x: base.x - 25, w: 25, whole: false });
  });

  it('reports a milestone every 10 floors', () => {
    const s = createStacker({ rand: lcg() });
    const ms: (number | null)[] = [];
    for (let i = 0; i < 20; i++) ms.push(dropAt(s, 0).milestone);
    expect(ms.filter(Boolean)).toEqual([10, 20]);
    expect(ms[9]).toBe(10);
  });
});

describe('speed', () => {
  it('starts gentle', () => {
    expect(speedFor(0)).toBe(MIN_SPEED);
    // Fifteen floors in, a pass across the screen still takes over 1.5s.
    expect(speedFor(15)).toBeLessThan(150);
  });

  it('rises with every floor and never passes the cap', () => {
    let last = -Infinity;
    for (let f = 0; f <= 1000; f++) {
      const v = speedFor(f);
      expect(v).toBeGreaterThan(last);
      expect(v).toBeLessThanOrEqual(MAX_SPEED);
      last = v;
    }
    expect(speedFor(10_000)).toBeCloseTo(MAX_SPEED, 3);
  });

  it('each new slab takes the speed of the current height', () => {
    const s = createStacker({ rand: lcg() });
    for (let i = 0; i < 12; i++) dropAt(s, 0);
    expect(s.mover!.speed).toBe(speedFor(12));
  });
});

describe('sliding slab', () => {
  it('alternates entering from the left and the right', () => {
    const s = createStacker({ rand: lcg() });
    const sides = [s.mover!.from];
    for (let i = 0; i < 5; i++) { dropAt(s, 0); sides.push(s.mover!.from); }
    expect(sides).toEqual(['left', 'right', 'left', 'right', 'left', 'right']);
  });

  it('enters at the edge it comes from, heading inward', () => {
    const s = createStacker({ rand: lcg() });
    const b = moverBounds(START_W);
    expect(s.mover).toMatchObject({ x: b.min, dir: 1 });
    dropAt(s, 0);
    expect(s.mover).toMatchObject({ x: b.max, dir: -1 });
  });

  it('bounces between its bounds and stays inside them', () => {
    const s = createStacker({ rand: lcg() });
    const b = moverBounds(START_W);
    const dirs = new Set<number>();
    for (let i = 0; i < 120 * 10; i++) {
      tick(s, 1 / 120);
      expect(s.mover!.x).toBeGreaterThanOrEqual(b.min - 1e-9);
      expect(s.mover!.x).toBeLessThanOrEqual(b.max + 1e-9);
      dirs.add(s.mover!.dir);
    }
    expect(dirs).toEqual(new Set([1, -1]));
  });

  it('always passes over the slab below, so a drop is always possible', () => {
    for (const w of [5, 40, 120, START_W]) {
      const b = moverBounds(w);
      expect(b.min).toBeLessThan(0);
      expect(b.max + w).toBeGreaterThan(WORLD_W);
    }
  });

  it('cycles through the cast colours', () => {
    const s = createStacker({ rand: lcg() });
    for (let i = 0; i < COLORS + 2; i++) dropAt(s, 0);
    expect(s.stack.map(t => t.color).slice(0, COLORS + 2)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1]);
  });

  it('spawn flips the side each call', () => {
    const s = createStacker({ rand: lcg() });
    expect(spawn(s).from).toBe('right');
    expect(spawn(s).from).toBe('left');
  });
});

describe('camera', () => {
  const viewH = 480;

  it('puts the active row centre a third of the way down', () => {
    for (const n of [1, 5, 40]) {
      const cam = cameraTarget(n, viewH);
      const centre = n * SLAB_H + SLAB_H / 2;
      const fromTop = (cam + viewH - centre) / viewH;
      expect(fromTop).toBeCloseTo(ACTIVE_FROM_TOP);
    }
  });

  it('rises exactly one slab per floor', () => {
    expect(cameraTarget(11, viewH) - cameraTarget(10, viewH)).toBeCloseTo(SLAB_H);
  });

  it('eases toward the target without overshoot, the same at any frame rate', () => {
    let a = 0; let b = 0;
    for (let i = 0; i < 60; i++) a = easeCamera(a, 100, 1 / 60);
    for (let i = 0; i < 120; i++) b = easeCamera(b, 100, 1 / 120);
    expect(a).toBeLessThanOrEqual(100);
    expect(a).toBeGreaterThan(99);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('debris', () => {
  it('falls, spins and goes away', () => {
    const s = createStacker({ rand: lcg() });
    dropAt(s, 40);
    const d = s.debris[0];
    const y0 = d.y;
    for (let i = 0; i < 60; i++) tick(s, 1 / 120);
    expect(d.y).toBeLessThan(y0);
    expect(d.rot).not.toBe(0);
    for (let i = 0; i < DEBRIS_LIFE * 120; i++) tick(s, 1 / 120);
    expect(s.debris).toHaveLength(0);
  });

  it('under reduced motion it stays put and just disappears quickly', () => {
    const s = createStacker({ rand: lcg(), reduced: true });
    dropAt(s, 40);
    const d = { ...s.debris[0] };
    tick(s, DEBRIS_LIFE_REDUCED / 2);
    expect(s.debris[0]).toMatchObject({ x: d.x, y: d.y, rot: 0 });
    tick(s, DEBRIS_LIFE_REDUCED);
    expect(s.debris).toHaveLength(0);
  });
});

describe('determinism', () => {
  function play(seed: number) {
    const s = createStacker({ rand: lcg(seed) });
    const r = lcg(seed + 99);
    while (!s.over && s.floors < 200) {
      const frames = 10 + Math.floor(r() * 140);
      for (let i = 0; i < frames; i++) tick(s, 1 / 120);
      drop(s);
      for (let i = 0; i < 30; i++) tick(s, 1 / 120);
    }
    return JSON.stringify({ stack: s.stack, debris: s.debris, floors: s.floors, perfects: s.perfects });
  }

  it('the same rand and the same tap times give the same tower', () => {
    expect(play(7)).toBe(play(7));
    expect(play(7)).not.toBe(play(8));
  });

  it('a random tapper always ends with a valid tower', () => {
    const s = createStacker({ rand: lcg(3) });
    const r = lcg(4);
    while (!s.over) {
      for (let i = 0, n = Math.floor(r() * 200); i < n; i++) tick(s, 1 / 120);
      drop(s);
    }
    for (let i = 1; i < s.stack.length; i++) {
      const a = s.stack[i - 1]; const b = s.stack[i];
      expect(b.w).toBeGreaterThan(0);
      expect(b.w).toBeLessThanOrEqual(START_W);
      // Every slab rests on the one below.
      expect(Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)).toBeGreaterThan(0);
    }
  });
});
