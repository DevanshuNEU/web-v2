/**
 * Aura Tower rules. Pure, no DOM. The view owns input, the loop and drawing.
 *
 * World units: the play column is WORLD_W wide, y grows upward, row i of the
 * tower spans y = i * SLAB_H to (i + 1) * SLAB_H. Row 0 is the base slab,
 * which sits on a pedestal that runs off the bottom of the screen.
 *
 * The state object is mutated in place by `tick` and `drop` so the 120 Hz
 * loop allocates nothing; every rule that decides an outcome is also exposed
 * as a small pure function for the tests.
 */

export const WORLD_W = 320;
export const SLAB_H = 26;
export const START_W = 200;
/** Width won back on every third perfect in a row. */
export const GROW = 14;
/** Colours to cycle through (the cast size). */
export const COLORS = 9;

export const MIN_SPEED = 100;
export const MAX_SPEED = 290;
/** Floors for the speed to cover about 63% of the way from MIN to MAX. */
export const SPEED_FLOORS = 55;

/** Overlaps thinner than this count as no overlap. */
export const MIN_OVERLAP = 1;
export const GRAVITY = 900;
export const DEBRIS_LIFE = 1.3;
export const DEBRIS_LIFE_REDUCED = 0.3;
/** Where the active slab sits on screen, as a fraction from the top. */
export const ACTIVE_FROM_TOP = 1 / 3;

export type Side = 'left' | 'right';

export interface Span { x: number; w: number }
export interface Slab extends Span { color: number; perfect: boolean }
export interface Mover extends Span { dir: 1 | -1; color: number; speed: number; from: Side }
export interface Debris {
  x: number; y: number; w: number;
  vx: number; vy: number; rot: number; vr: number;
  age: number; life: number; color: number;
  /** The whole slab (a total miss), not a sliced-off piece. */
  whole: boolean;
}

export interface StackerState {
  stack: Slab[];
  mover: Mover | null;
  debris: Debris[];
  /** Score: slabs placed on the base. */
  floors: number;
  perfects: number;
  combo: number;
  bestCombo: number;
  over: boolean;
  time: number;
  nextSide: Side;
  reduced: boolean;
  rand: () => number;
}

export type SliceResult =
  | { kind: 'perfect'; x: number; w: number }
  | { kind: 'cut'; x: number; w: number; cutX: number; cutW: number; side: Side }
  | { kind: 'miss' };

export interface DropEvent {
  kind: SliceResult['kind'];
  /** Floors after this drop. */
  floors: number;
  combo: number;
  /** The placed slab grew back (third perfect in a row). */
  grew: boolean;
  /** 10, 20, 30... when this drop reached a milestone, else null. */
  milestone: number | null;
  /** The placed slab, or the missed one. */
  x: number; w: number;
  /** Row the slab was dropped on. */
  row: number;
}

/** Snap distance for a perfect: 3% of the slab, never under 3 units. */
export function perfectTolerance(w: number): number {
  return Math.max(3, w * 0.03);
}

/**
 * Lay `cur` on `prev`. Within the tolerance it snaps onto `prev` exactly;
 * otherwise the overhang is cut; no overlap at all is a miss.
 */
export function slice(prev: Span, cur: Span): SliceResult {
  if (Math.abs(cur.x - prev.x) <= perfectTolerance(prev.w)) {
    return { kind: 'perfect', x: prev.x, w: Math.min(cur.w, prev.w) };
  }
  const left = Math.max(prev.x, cur.x);
  const right = Math.min(prev.x + prev.w, cur.x + cur.w);
  const overlap = right - left;
  if (overlap < MIN_OVERLAP) return { kind: 'miss' };
  if (cur.x < prev.x) {
    return { kind: 'cut', x: left, w: overlap, cutX: cur.x, cutW: prev.x - cur.x, side: 'left' };
  }
  return { kind: 'cut', x: left, w: overlap, cutX: right, cutW: cur.x + cur.w - right, side: 'right' };
}

/** Grow a span about its centre by GROW, never past START_W. */
export function regrow(s: Span): Span {
  const w = Math.min(START_W, s.w + GROW);
  return { x: s.x - (w - s.w) / 2, w };
}

/** Whether the perfect that made `combo` also regrows the slab. */
export function growsAt(combo: number): boolean {
  return combo > 0 && combo % 3 === 0;
}

/** Slide speed in units per second: gentle at first, rising, capped. */
export function speedFor(floors: number): number {
  const f = Math.max(0, floors);
  return MIN_SPEED + (MAX_SPEED - MIN_SPEED) * (1 - Math.exp(-f / SPEED_FLOORS));
}

/** Travel limits for a slab of width w: it pokes about a third off each side. */
export function moverBounds(w: number): { min: number; max: number } {
  return { min: -w * 0.35, max: WORLD_W - w * 0.65 };
}

/**
 * Camera: the world y at the bottom of the screen that puts the active row's
 * centre ACTIVE_FROM_TOP down from the top of a view `viewH` units tall.
 */
export function cameraTarget(stackLen: number, viewH: number): number {
  const activeCentre = stackLen * SLAB_H + SLAB_H / 2;
  return activeCentre - viewH * (1 - ACTIVE_FROM_TOP);
}

/** Frame-rate independent ease toward the target. */
export function easeCamera(cur: number, target: number, dt: number, rate = 7): number {
  return cur + (target - cur) * (1 - Math.exp(-dt * rate));
}

export function createStacker({ rand = Math.random, reduced = false }: { rand?: () => number; reduced?: boolean } = {}): StackerState {
  const s: StackerState = {
    stack: [{ x: (WORLD_W - START_W) / 2, w: START_W, color: 0, perfect: false }],
    mover: null,
    debris: [],
    floors: 0,
    perfects: 0,
    combo: 0,
    bestCombo: 0,
    over: false,
    time: 0,
    nextSide: 'left',
    reduced,
    rand,
  };
  spawn(s);
  return s;
}

export function top(s: StackerState): Slab {
  return s.stack[s.stack.length - 1];
}

/** Bring in the next slab, from the side opposite the last one. */
export function spawn(s: StackerState): Mover {
  const t = top(s);
  const from = s.nextSide;
  s.nextSide = from === 'left' ? 'right' : 'left';
  const b = moverBounds(t.w);
  s.mover = {
    x: from === 'left' ? b.min : b.max,
    w: t.w,
    dir: from === 'left' ? 1 : -1,
    color: s.stack.length % COLORS,
    speed: speedFor(s.floors),
    from,
  };
  return s.mover;
}

function addDebris(s: StackerState, x: number, w: number, row: number, color: number, whole: boolean, push: number) {
  const r = s.rand;
  const spin = (r() < 0.5 ? -1 : 1) * (1.5 + r() * 2.5);
  s.debris.push({
    x, y: row * SLAB_H, w,
    vx: s.reduced ? 0 : push * (40 + r() * 50),
    vy: s.reduced ? 0 : 60 + r() * 60,
    rot: 0, vr: s.reduced ? 0 : spin * (whole ? 0.6 : 1),
    age: 0, life: s.reduced ? DEBRIS_LIFE_REDUCED : DEBRIS_LIFE, color, whole,
  });
  if (s.debris.length > 24) s.debris.shift();
}

/** Drop the sliding slab. Returns what happened, or null if nothing could drop. */
export function drop(s: StackerState): DropEvent | null {
  const m = s.mover;
  if (!m || s.over) return null;
  const prev = top(s);
  const row = s.stack.length;
  const r = slice(prev, m);
  s.mover = null;

  if (r.kind === 'miss') {
    s.over = true;
    s.combo = 0;
    addDebris(s, m.x, m.w, row, m.color, true, m.dir);
    return { kind: 'miss', floors: s.floors, combo: 0, grew: false, milestone: null, x: m.x, w: m.w, row };
  }

  let x = r.x;
  let w = r.w;
  let grew = false;
  if (r.kind === 'perfect') {
    s.combo += 1;
    s.perfects += 1;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    if (growsAt(s.combo) && w < START_W) {
      const g = regrow({ x, w });
      x = g.x; w = g.w; grew = true;
    }
  } else {
    s.combo = 0;
    addDebris(s, r.cutX, r.cutW, row, m.color, false, r.side === 'left' ? -1 : 1);
  }
  s.stack.push({ x, w, color: m.color, perfect: r.kind === 'perfect' });
  s.floors += 1;
  spawn(s);
  return {
    kind: r.kind, floors: s.floors, combo: s.combo, grew,
    milestone: s.floors % 10 === 0 ? s.floors : null, x, w, row,
  };
}

/** Advance the sliding slab and the falling debris by dt seconds. */
export function tick(s: StackerState, dt: number) {
  s.time += dt;
  const m = s.mover;
  if (m && !s.over) {
    const b = moverBounds(m.w);
    m.x += m.dir * m.speed * dt;
    if (m.x > b.max) { m.x = 2 * b.max - m.x; m.dir = -1; }
    if (m.x < b.min) { m.x = 2 * b.min - m.x; m.dir = 1; }
  }
  let keep = 0;
  for (let i = 0; i < s.debris.length; i++) {
    const d = s.debris[i];
    d.age += dt;
    if (!s.reduced) {
      d.vy -= GRAVITY * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.vr * dt;
    }
    if (d.age < d.life) s.debris[keep++] = d;
  }
  s.debris.length = keep;
}
