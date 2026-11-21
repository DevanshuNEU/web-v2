import { describe, it, expect } from 'vitest';
import { ROWS, TILE, isOneWayTile, isSolidTile, parseLevel, tileAt } from '@/components/apps/games/platformer/sim/level';
import { createWorld, drainEvents, enterLevel, stepWorld, type World } from '@/components/apps/games/platformer/sim/world';
import { nextStoryId, storyEntry, storyLevelDef } from '@/components/apps/games/platformer/sim/story';
import { BOSTON, type BostonId } from '@/components/apps/games/platformer/sim/story/boston';
import { emptyFrame, type InputFrame } from '@/components/apps/games/platformer/input/frame';
import { reach } from '../setup/platformerReach';
import type { LevelDef } from '@/components/apps/games/platformer/sim/levels';
import { POWERS, POWER_KINDS } from '@/components/apps/games/platformer/sim/powers';
import { DECOR_BY_THEME } from '@/components/apps/games/platformer/sim/level';
import { DRONE, GULL, PIGEON, ENEMY_KINDS } from '@/components/apps/games/platformer/sim/enemies';
import { GUST_WARN, type GustDef } from '@/components/apps/games/platformer/sim/gusts';
import { HOOK_W, type HookDef } from '@/components/apps/games/platformer/sim/hooks';
import { WAVE, type WaveDef } from '@/components/apps/games/platformer/sim/waves';
import { DT } from '../setup/platformerWorld';
import { VEHICLE_SIZE, type VehicleDef } from '@/components/apps/games/platformer/sim/vehicles';
import { custom, run, runUntil } from '../setup/platformerWorld';

type Theme = Parameters<typeof custom>[1];
/** A world on hand-made rows (bottom aligned) with extra level fields. */
function worldWith(rows: string[], extra: Partial<LevelDef> = {}, theme: Theme = 'newbury', mode: 'story' | 'endless' = 'endless'): World {
  const w = createWorld({ rand: () => 0.5, mode, abilities: { wallJump: true, dash: true, blade: true } });
  enterLevel(w, 0, custom(rows, theme, extra));
  drainEvents(w);
  return w;
}
/** Put her in the air at column x, feet at row `feet`, still. */
function dropAt(w: World, x: number, feet: number) {
  const h = w.hero;
  h.x = x + (1 - h.w) / 2; h.y = feet - h.h; h.vx = 0; h.vy = 0; h.onGround = false; h.coyote = 0;
}
/** Highest point (smallest feet y) reached over `seconds`. */
function apex(w: World, seconds: number, input: Parameters<typeof run>[2] = {}): number {
  let top = Infinity;
  run(w, seconds, input, ww => { top = Math.min(top, ww.hero.y + ww.hero.h); });
  return top;
}
const W = 40;
const open = (n = W) => '.'.repeat(n);

describe('Awnings (A): shop awnings bounce her up', () => {
  /** Floor at row 13 (her feet at 13); an awning 3 wide on row 10, columns 18 to 20. */
  const rows = [open(), open(), open(), '..................AAA...................', open(), '.P' + open(W - 2), '#'.repeat(W)];
  /** A held jump on the floor: the height of a full jump. */
  const fullJump = () => {
    const w = worldWith(rows);
    const feet = w.hero.y + w.hero.h;
    return feet - apex(w, 1.2, { jumpPressed: true, jumpHeld: true });
  };

  it('parses A as an awning: a one-way surface, never solid', () => {
    const l = custom(rows, 'newbury');
    expect(l.tiles[10 * W + 18]).toBe(TILE.AWNING);
    expect(isOneWayTile(TILE.AWNING)).toBe(true);
    expect(isSolidTile(TILE.AWNING)).toBe(false);
  });

  it('landing on one launches her to about 1.6 times a full jump, without holding Jump', () => {
    const w = worldWith(rows);
    dropAt(w, 19, 7);
    expect(runUntil(w, ww => ww.events.some(e => e.type === 'bounce'), {}, 2)).toBe(true);
    const rise = 10 - apex(w, 1.5);
    expect(rise / fullJump()).toBeGreaterThan(1.5);
    expect(rise / fullJump()).toBeLessThan(1.7);
  });

  it('holding Jump adds a little height, not a lot', () => {
    const plain = worldWith(rows);
    dropAt(plain, 19, 7);
    const a = 10 - apex(plain, 2);
    const held = worldWith(rows);
    dropAt(held, 19, 7);
    const b = 10 - apex(held, 2, { jumpHeld: true });
    expect(b).toBeGreaterThan(a * 1.05);
    expect(b).toBeLessThan(a * 1.25);
  });

  it('she never stands on one: she bounces again every time she comes down on it', () => {
    const w = worldWith(rows);
    dropAt(w, 19, 7);
    let bounces = 0, stood = false;
    run(w, 4, {}, ww => {
      for (const e of drainEvents(ww)) if (e.type === 'bounce') bounces++;
      if (ww.hero.onGround) stood = true;
    });
    expect(bounces).toBeGreaterThanOrEqual(2);
    expect(stood).toBe(false);
  });

  it('is one-way: a jump from below passes up through it', () => {
    const w = worldWith(rows);
    w.hero.x = 19.16; w.hero.y = 13 - w.hero.h;
    const top = apex(w, 0.5, { jumpPressed: true, jumpHeld: true });
    expect(top).toBeLessThan(10);
  });

  it('keeps the double jump for after the bounce', () => {
    const w = worldWith(rows);
    dropAt(w, 19, 7);
    expect(runUntil(w, ww => ww.events.some(e => e.type === 'bounce'), {}, 2)).toBe(true);
    expect(w.hero.airJumps).toBe(1);
  });

  it('lists one bounce per awning tile; a bounce restarts the clock of the whole awning, for the squash', () => {
    const w = worldWith(rows);
    expect(w.bounces.map(b => [b.x, b.y])).toEqual([[18, 10], [19, 10], [20, 10]]);
    run(w, 0.5);
    expect(w.bounces.every(b => b.t > 0.4)).toBe(true);
    dropAt(w, 19, 7);
    expect(runUntil(w, ww => ww.events.some(e => e.type === 'bounce'), {}, 2)).toBe(true);
    expect(w.bounces.every(b => b.t < 0.05)).toBe(true);
    run(w, 0.2);
    expect(w.bounces.every(b => b.t > 0.15 && b.t < 0.25)).toBe(true);
  });
});

describe('Water (W): falling in is a fall', () => {
  /** Floor at the left, water from column 12 to 27, floor again; a checkpoint at column 6. */
  const rows = ['.P....K.....' + open(16) + open(12), '#'.repeat(12) + 'W'.repeat(16) + '#'.repeat(12), '#'.repeat(12) + 'W'.repeat(16) + '#'.repeat(12)];

  it('parses W as water: neither solid nor one-way', () => {
    const l = custom(rows, 'river');
    expect(l.tiles[12 * W + 14]).toBe(TILE.WATER);
    expect(isSolidTile(TILE.WATER) || isOneWayTile(TILE.WATER)).toBe(false);
  });

  it('touching it is a fall: she respawns at the last checkpoint, and the death costs points', () => {
    const w = worldWith(rows, {}, 'river', 'story');
    run(w, 0.8, { move: 1 });
    expect(w.checkpointIdx).toBe(0);
    dropAt(w, 16, 10);
    let fell = false;
    run(w, 0.5, {}, ww => { for (const e of drainEvents(ww)) if (e.type === 'die' && e.n === 1) fell = true; });
    expect(fell).toBe(true);
    expect(w.stats.deaths).toBe(1);
    run(w, 1.6);
    expect(w.phase).toBe('play');
    expect(Math.floor(w.hero.x)).toBe(6);
  });

  it('a pigeon that drops into the water is gone', () => {
    const w = worldWith(['.P' + open(11) + 'p' + open(14) + open(12), rows[1], rows[2]], {}, 'river');
    expect(w.enemies).toHaveLength(1);
    run(w, 1);
    expect(w.enemies.filter(e => e.deadT === -1)).toHaveLength(0);
  });
});

describe('Boats: the rowing shell and the sailboat are vehicles on water lanes', () => {
  const rows = ['.P' + open(W - 2), '##' + 'W'.repeat(W - 4) + '##', '##' + 'W'.repeat(W - 4) + '##'];
  const SHELL: VehicleDef = { kind: 'shell', row: 12, x0: 2, x1: 37, speed: 8, dir: 1, gap: 1 };
  const SAIL: VehicleDef = { kind: 'sailboat', row: 11, x0: 2, x1: 37, speed: 2, dir: 1, gap: 1, bob: 0.25 };

  it('sizes: a shell 8 by 0.5, a sailboat 4 by 3', () => {
    expect(VEHICLE_SIZE.shell).toEqual({ w: 8, h: 0.5 });
    expect(VEHICLE_SIZE.sailboat).toEqual({ w: 4, h: 3 });
  });

  it('a sailboat bobs its deck up and down by its bob, around its row; a shell stays flat', () => {
    const w = worldWith(rows, { vehicles: [SAIL, SHELL] }, 'river');
    const ys: number[] = [], shellYs: number[] = [];
    run(w, 6, {}, ww => { ys.push(ww.vehicles[0].y); shellYs.push(ww.vehicles[1].y); });
    expect(Math.max(...ys)).toBeCloseTo(11.25, 2);
    expect(Math.min(...ys)).toBeCloseTo(10.75, 2);
    expect(new Set(shellYs)).toEqual(new Set([12]));
  });

  it('the bob keeps time with the world clock (replays see the same boats)', () => {
    const a = worldWith(rows, { vehicles: [SAIL] }, 'river');
    const b = worldWith(rows, { vehicles: [SAIL] }, 'river');
    run(a, 3.3, { move: 1 });
    run(b, 3.3, { move: -1, jumpPressed: true, jumpHeld: true });
    expect(b.vehicles[0].y).toBe(a.vehicles[0].y);
    expect(b.vehicles[0].x).toBe(a.vehicles[0].x);
  });

  it('she stands on a bobbing deck and rides it across the water, up and down with it', () => {
    const w = worldWith(rows, { vehicles: [SAIL] }, 'river');
    const v = w.vehicles[0];
    expect(runUntil(w, ww => ww.vehicles[0].x > 4, {}, 6)).toBe(true);
    w.hero.x = v.x + 1.5; w.hero.y = v.y - w.hero.h - 0.1; w.hero.vy = 0; w.hero.onGround = false;
    run(w, 0.1);
    expect(w.riding).toBe(v);
    const rel = w.hero.x - v.x;
    let off = 0;
    run(w, 4, {}, ww => { off = Math.max(off, Math.abs(ww.hero.y + ww.hero.h - ww.vehicles[0].y)); });
    expect(w.phase).toBe('play');
    expect(off).toBeLessThan(0.02);
    expect(w.hero.x - v.x).toBeCloseTo(rel, 3);
  });
});

describe('Pigeon (p): a walker that hops', () => {
  /** A 7 tile ledge (columns 14 to 20) over the floor, a pigeon on it; she waits far off. */
  const ledge = (pigeonAt = 17) => worldWith([
    '.'.repeat(pigeonAt) + 'p' + '.'.repeat(W - pigeonAt - 1),
    '..............#######...................',
    open(), open(), '.P' + open(W - 2), '#'.repeat(W),
  ]);
  const wake = (w: World) => { w.hero.x = 26; w.hero.y = 13 - w.hero.h; };

  it('stands still between hops and hops every 1.2 s', () => {
    const w = ledge();
    wake(w);
    const e = w.enemies[0];
    let hops = 0, wasGround = true, still = 0;
    run(w, 6, {}, () => {
      if (wasGround && !e.onGround) hops++;
      if (e.onGround && e.vx === 0) still++;
      wasGround = e.onGround;
    });
    expect(PIGEON.every).toBe(1.2);
    expect(hops).toBeGreaterThanOrEqual(4);
    expect(hops).toBeLessThanOrEqual(6);
    expect(still).toBeGreaterThan(6 * 120 * 0.6);
  });

  it('never hops off a ledge: it turns at the edge', () => {
    const w = ledge();
    wake(w);
    const e = w.enemies[0];
    let minX = Infinity, maxX = -Infinity;
    run(w, 20, {}, () => { minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x + e.w); });
    expect(e.deadT).toBe(-1);
    expect(e.y + e.h).toBeCloseTo(9, 3);
    expect(minX).toBeGreaterThanOrEqual(14);
    expect(maxX).toBeLessThanOrEqual(21);
    expect(maxX - minX).toBeGreaterThan(3);
  });

  it('a stomp knocks it out; one blade hit does too', () => {
    expect(ENEMY_KINDS.pigeon.hp).toBe(1);
    expect(ENEMY_KINDS.pigeon.flies).toBe(false);
    const w = ledge();
    const e = w.enemies[0];
    dropAt(w, Math.floor(e.x + e.w / 2), 5);
    w.hero.x = e.x + e.w / 2 - w.hero.w / 2;
    let stomped = false;
    run(w, 0.6, {}, ww => { for (const ev of drainEvents(ww)) if (ev.type === 'stomp') stomped = true; });
    expect(stomped).toBe(true);
  });
});

describe('Gull (g): hovers, then swoops in a fast arc', () => {
  /** A gull over an open floor at column 20, row 6. */
  const sky = () => worldWith([
    '....................g...................',
    open(), open(), open(), open(), open(), '.P' + open(W - 2), '#'.repeat(W),
  ]);
  /** Stand her on the floor at column x. */
  const standAt = (w: World, x: number) => { w.hero.x = x + 0.16; w.hero.y = 13 - w.hero.h; w.hero.vx = 0; w.hero.vy = 0; w.hero.onGround = true; };

  it('hovers near its spot while she is out of reach', () => {
    const w = sky();
    standAt(w, 2);
    const e = w.enemies[0];
    e.active = true;
    const hx = e.homeX, hy = e.homeY;
    run(w, 4, {}, () => {
      expect(Math.abs(e.x - hx)).toBeLessThan(2);
      expect(Math.abs(e.y - hy)).toBeLessThan(1);
    });
    expect(e.mode).toBe('hover');
  });

  it('swoops down through where she stood and up the other side, faster than a drone dives', () => {
    const w = sky();
    standAt(w, 23);
    const e = w.enemies[0];
    w.invuln = 99;
    const target = { x: w.hero.x + w.hero.w / 2, y: w.hero.y + w.hero.h / 2 };
    expect(runUntil(w, () => e.mode === 'dive', {}, 2)).toBe(true);
    const sx = e.x + e.w / 2, sy = e.y + e.h / 2;
    // She steps away at once: the arc still goes through where she was.
    w.hero.x = 2;
    let low = { x: 0, y: -Infinity }, fastest = 0, end = { x: 0, y: 0 };
    run(w, 3, {}, () => {
      if (e.mode !== 'dive') return;
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      if (cy > low.y) low = { x: cx, y: cy };
      fastest = Math.max(fastest, Math.hypot(e.x - e.px, e.y - e.py) * 120);
      end = { x: cx, y: cy };
    });
    expect(Math.abs(low.x - target.x)).toBeLessThan(0.7);
    expect(Math.abs(low.y - target.y)).toBeLessThan(0.7);
    expect(fastest).toBeGreaterThan(DRONE.diveSpeed);
    expect(GULL.speed).toBeGreaterThan(DRONE.diveSpeed);
    // Up the other side: past her, back near its starting height.
    expect(Math.sign(end.x - target.x)).toBe(Math.sign(target.x - sx));
    expect(end.y).toBeLessThan(target.y - 2);
    expect(Math.abs(end.y - sy)).toBeLessThan(1.5);
  });

  it('then flies home and waits before the next swoop', () => {
    const w = sky();
    standAt(w, 23);
    const e = w.enemies[0];
    w.invuln = 99;
    expect(runUntil(w, () => e.mode === 'dive', {}, 2)).toBe(true);
    expect(runUntil(w, () => e.mode === 'hover', {}, 4)).toBe(true);
    run(w, GULL.cooldown * 0.8);
    expect(e.mode).toBe('hover');
    expect(runUntil(w, () => e.mode === 'dive', {}, 2)).toBe(true);
  });

  it('a swoop that hits her hurts; one blade hit knocks it out', () => {
    expect(ENEMY_KINDS.gull.hp).toBe(1);
    expect(ENEMY_KINDS.gull.flies).toBe(true);
    const w = sky();
    standAt(w, 23);
    expect(runUntil(w, ww => ww.phase === 'dying', {}, 3)).toBe(true);
  });
});

describe('Gusts: wind zones over columns, on a timetable, telegraphed before they blow', () => {
  const rows = ['.P' + open(W - 2), '#'.repeat(W), '#'.repeat(W)];
  /** Columns 10 to 29 blow right: every 4 s, 1.5 s of wind, the first starting at 2.5 s (+0.5 offset). */
  const GUST: GustDef = { x0: 10, x1: 29, dir: 1, strength: 6, period: 4, blow: 1.5, offset: 0.5 };
  const gw = () => worldWith(rows, { gusts: [GUST] }, 'harbor');
  /** Times (to the step) at which flag `k` of the gust turns on. */
  const starts = (w: World, k: 'warn' | 'on', seconds: number) => {
    const out: number[] = [];
    let was = false;
    run(w, seconds, {}, ww => { const v = ww.gusts[0][k]; if (v && !was) out.push(+ww.t.toFixed(3)); was = v; });
    return out;
  };

  it('copies the zones into the world, calm at the start', () => {
    const w = gw();
    expect(w.gusts).toEqual([{ x0: 10, x1: 29, dir: 1, strength: 6, warn: false, on: false }]);
  });

  it('warns 0.6 s before each blow, blows for its time, then is calm again, every period', () => {
    expect(GUST_WARN).toBe(0.6);
    const near = (got: number[], want: number[]) => { expect(got).toHaveLength(want.length); got.forEach((t, i) => expect(Math.abs(t - want[i])).toBeLessThanOrEqual(DT * 1.01)); };
    near(starts(gw(), 'warn', 11.5), [2.4, 6.4, 10.4]);
    near(starts(gw(), 'on', 11.5), [3, 7, 11]);
    const w = gw();
    run(w, 3.2);
    expect([w.gusts[0].warn, w.gusts[0].on]).toEqual([false, true]);
    run(w, 1.4);
    expect([w.gusts[0].warn, w.gusts[0].on]).toEqual([false, false]);
  });

  it('while it blows it pushes her along its way in the air, half as much on the ground, and only inside its columns', () => {
    const moved = (x: number, air: boolean) => {
      const w = gw();
      run(w, 3.1);
      expect(w.gusts[0].on).toBe(true);
      if (air) dropAt(w, x, 2); else { w.hero.x = x + 0.16; w.hero.y = 12 - w.hero.h; w.hero.onGround = true; }
      const x0 = w.hero.x;
      run(w, 0.3, {}, ww => { if (air) { ww.hero.vy = 0; ww.hero.vx = 0; } });
      return w.hero.x - x0;
    };
    expect(moved(15, true)).toBeCloseTo(6 * 0.3, 1);
    expect(moved(15, false)).toBeGreaterThan(0.5);
    expect(moved(15, false)).toBeLessThan(6 * 0.3 * 0.6);
    expect(moved(3, true)).toBeCloseTo(0, 3);
  });

  it('no push while it only warns', () => {
    const w = gw();
    run(w, 2.5);
    expect(w.gusts[0].warn).toBe(true);
    dropAt(w, 15, 2);
    const x0 = w.hero.x;
    run(w, 0.2, {}, ww => { ww.hero.vy = 0; ww.hero.vx = 0; });
    expect(w.hero.x).toBeCloseTo(x0, 6);
  });
});

describe('Crane hooks: pendulum platforms', () => {
  const rows = ['.P' + open(W - 2), '#'.repeat(W), '#'.repeat(W)];
  /** A hook hanging 5 tiles under the boom tip at column 20 row 1, swinging 0.5 rad each way every 4 s. */
  const HOOK: HookDef = { x: 20, y: 1, len: 5, amp: 0.5, period: 4 };
  const hw = (d: HookDef = HOOK) => worldWith(rows, { hooks: [d] }, 'harbor');

  it('swings on its rope: angle amp times a sine of the world clock, the hook block at the rope end', () => {
    const w = hw();
    const hk = w.hooks[0];
    expect([hk.x, hk.y, hk.len, hk.w]).toEqual([20.5, 2, 5, HOOK_W]);
    run(w, 1);
    expect(hk.angle).toBeCloseTo(0.5, 2);
    expect(hk.px).toBeCloseTo(20.5 + 5 * Math.sin(0.5), 2);
    expect(hk.py).toBeCloseTo(2 + 5 * Math.cos(0.5), 2);
    run(w, 2);
    expect(hk.angle).toBeCloseTo(-0.5, 2);
    run(w, 1);
    expect(hk.angle).toBeCloseTo(0, 2);
    expect(hk.py).toBeCloseTo(7, 2);
  });

  it('keeps its time whatever she does', () => {
    const a = hw(), b = hw();
    run(a, 2.7, { move: 1 });
    run(b, 2.7, { jumpPressed: true, jumpHeld: true, move: -1 });
    expect(b.hooks[0].angle).toBe(a.hooks[0].angle);
  });

  it('she lands on the hook block and swings with it', () => {
    const w = hw({ ...HOOK, offset: 1 });
    const hk = w.hooks[0];
    run(w, 0.01);
    w.hero.x = hk.px - w.hero.w / 2; w.hero.y = hk.py - w.hero.h - 0.1; w.hero.vy = 0; w.hero.vx = 0; w.hero.onGround = false;
    run(w, 0.1);
    expect(w.riding).toBe(hk.deck);
    let off = 0;
    run(w, 2.5, {}, () => { off = Math.max(off, Math.abs(w.hero.x + w.hero.w / 2 - hk.px), Math.abs(w.hero.y + w.hero.h - hk.py)); });
    expect(off).toBeLessThan(0.1);
    expect(w.riding).toBe(hk.deck);
  });
});

describe('Waves: they roll up the sand on a rhythm and push her back', () => {
  /** Sand top at row 12 (feet 12) all along; the wave rolls left from the sea edge at column 35 to column 10. */
  const rows = ['.P' + open(W - 2), '#'.repeat(W), '#'.repeat(W)];
  const WAVE_DEF: WaveDef = { x0: 10, x1: 34, row: 12, dir: -1, period: 6 };
  const ww = () => worldWith(rows, { waves: [WAVE_DEF] }, 'beach');
  const calm = 6 - (WAVE.warn + WAVE.rise + WAVE.hold + WAVE.fall);

  it('calm with the front at the sea edge, then the water draws back (the warning), then rolls up to the land edge and back', () => {
    const w = ww();
    const wv = w.waves[0];
    expect(wv).toEqual({ x0: 10, x1: 34, row: 12, dir: -1, front: 35, on: false, warn: false, pushing: false });
    run(w, calm + 0.1);
    expect([wv.warn, wv.on]).toEqual([true, false]);
    run(w, WAVE.warn + WAVE.rise / 2 - 0.1);
    expect(wv.on).toBe(true);
    expect(wv.front).toBeCloseTo(35 - 25 / 2, 0);
    run(w, WAVE.rise / 2 + WAVE.hold / 2);
    expect(wv.front).toBeCloseTo(10, 3);
    run(w, WAVE.hold / 2 + WAVE.fall);
    expect([wv.on, wv.front]).toEqual([false, 35]);
  });

  it('while it covers her on the sand it pushes her back, even running against it', () => {
    const w = ww();
    run(w, calm + WAVE.warn + WAVE.rise);
    w.hero.x = 20.16; w.hero.y = 12 - w.hero.h; w.hero.onGround = true; w.hero.vx = 0;
    const x0 = w.hero.x;
    run(w, 0.4);
    expect(w.hero.x).toBeLessThan(x0 - WAVE.push * 0.4 * 0.8);
    const w2 = ww();
    run(w2, calm + WAVE.warn + WAVE.rise);
    w2.hero.x = 20.16; w2.hero.y = 12 - w2.hero.h; w2.hero.onGround = true; w2.hero.vx = 8.5;
    const x1 = w2.hero.x;
    run(w2, 0.4, { move: 1 });
    expect(w2.hero.x - x1).toBeLessThan(8.5 * 0.4 * 0.6);
  });

  it('never hurts, does not push outside its cover, and a jump above it is out of its reach', () => {
    const w = ww();
    run(w, calm + WAVE.warn + WAVE.rise);
    dropAt(w, 20, 12 - WAVE.height - 0.5);
    const x0 = w.hero.x;
    run(w, 0.05, {}, x => { x.hero.vy = 0; x.hero.vx = 0; });
    expect(w.hero.x).toBeCloseTo(x0, 6);
    w.hero.x = 6; w.hero.y = 12 - w.hero.h; w.hero.onGround = true;
    run(w, 0.3);
    expect(w.hero.x).toBeCloseTo(6, 3);
    expect(w.phase).toBe('play');
  });
});

describe('Cannoli Shield (v): absorbs one hit, then it is gone', () => {
  /** A long floor, the shield at column 4, a pigeon at column 20. */
  const hall = (pickup = 'v') => worldWith(['.P..' + pickup + '.'.repeat(15) + 'p' + open(W - 21), '#'.repeat(W), '#'.repeat(W)], {}, 'newbury');
  const take = (w: World) => { run(w, 0.5, { move: 1 }); run(w, 0.5, {}, ww => { ww.hero.vx = 0; }); };
  /** Walk into the pigeon; count deaths and hurts. */
  const bump = (w: World) => {
    const e = w.enemies.find(en => en.deadT === -1)!;
    w.hero.x = e.x - 0.5; w.hero.y = 12 - w.hero.h; w.hero.onGround = true; w.hero.vx = 3;
    let hurts = 0, dies = 0;
    run(w, 0.3, { move: 1 }, ww => { for (const ev of drainEvents(ww)) { if (ev.type === 'hurt') hurts++; if (ev.type === 'die') dies++; } });
    return { hurts, dies };
  };

  it('is a live power, placed with v, lasting 15 s, listed last so older power indexes stay put', () => {
    expect(POWERS.cannoliShield.live).toBe(true);
    expect(POWERS.cannoliShield.duration).toBe(15);
    expect(POWERS.cannoliShield.shield).toBe(true);
    expect(POWER_KINDS.slice(0, 5)).toEqual(['batWings', 'tacoRush', 'priorityBoarding', 'wickedFast', 'encore']);
    expect(POWER_KINDS[5]).toBe('cannoliShield');
    expect(hall().pickups).toEqual([{ kind: 'cannoliShield', x: 4, y: 11, taken: false }]);
  });

  it('a hit while it runs: she lives, the shield breaks (power off), and she blinks a moment', () => {
    const w = hall();
    take(w);
    expect(w.power?.kind).toBe('cannoliShield');
    drainEvents(w);
    const r = bump(w);
    expect(r).toEqual({ hurts: 1, dies: 0 });
    expect(w.power).toBeNull();
    expect(w.invuln).toBeGreaterThan(0);
    expect(w.phase).toBe('play');
  });

  it('the next hit counts as usual', () => {
    const w = hall();
    take(w);
    bump(w);
    run(w, 2, {}, ww => { ww.hero.vx = 0; ww.enemies.forEach(e => { e.x = 30; }); });
    w.enemies[0].x = 20;
    w.enemies[0].deadT = -1;
    expect(bump(w).dies).toBe(1);
  });

  it('without it, the same hit is a death; and after 15 s it runs out unused', () => {
    expect(bump(hall('.')).dies).toBe(1);
    const w = hall();
    take(w);
    run(w, 14.5, {}, ww => { ww.hero.vx = 0; });
    expect(w.power).toBeNull();
  });

  it('it does not save her from water or a fall', () => {
    const w = worldWith(['.P..v' + open(W - 5), '#'.repeat(10) + 'W'.repeat(W - 10), '#'.repeat(10) + 'W'.repeat(W - 10)], {}, 'river');
    take(w);
    expect(w.power?.kind).toBe('cannoliShield');
    dropAt(w, 15, 9);
    expect(runUntil(w, ww => ww.phase === 'dying', {}, 1)).toBe(true);
  });
});

describe('Chapter 4 level data: decor and lights per theme', () => {
  it('names scenery by theme: Newbury Street, the river, the harbor, the beach', () => {
    expect(DECOR_BY_THEME.newbury).toEqual({ T: 'gasLamp', N: 'treeInPlanter', U: 'stoop', H: 'mailbox' });
    expect(DECOR_BY_THEME.river).toEqual({ T: 'bridgeLamp', N: 'bench', U: 'boatDock', H: 'lifebuoy' });
    expect(DECOR_BY_THEME.harbor).toEqual({ T: 'bollard', N: 'craneLeg', U: 'containerStack', H: 'fishCrates' });
    expect(DECOR_BY_THEME.beach).toEqual({ T: 'boulevardLamp', N: 'lifeguardChair', U: 'sandCastle', H: 'umbrella' });
  });

  it('lights a sign by theme: warm gas lamps, cool and warm in the fog, gold and red at the harbor, soft at the beach', () => {
    const table = (theme: Theme) => {
      const seen = new Map<string, { color: string; flicker: number; r: number }>();
      for (let i = 0; i < 12; i++) {
        const r = '.'.repeat(i + 2) + 'L' + '.'.repeat(30 - i - 3);
        const l = custom(['.P' + r.slice(2) + '....G', '#'.repeat(r.length + 5)], theme);
        const li = l.lights.find(x => x.x === l.decor[0].x + 0.5)!;
        seen.set(li.color, { color: li.color, flicker: li.flicker, r: li.r });
      }
      return [...seen.values()].sort((a, b) => a.color.localeCompare(b.color));
    };
    expect(table('newbury')).toEqual([{ color: '#ffd38a', flicker: 0.03, r: 5 }, { color: '#ffe3b0', flicker: 0.02, r: 4.5 }]);
    expect(table('river')).toEqual([{ color: '#e6ecff', flicker: 0.02, r: 6 }, { color: '#ffd38a', flicker: 0.03, r: 6 }]);
    expect(table('harbor')).toEqual([{ color: '#ff3b3b', flicker: 0.3, r: 4 }, { color: '#ffc58a', flicker: 0.02, r: 5 }]);
    expect(table('beach')).toEqual([{ color: '#ffe6b0', flicker: 0, r: 3.5 }]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The levels
// ─────────────────────────────────────────────────────────────────────────────

const IDS: BostonId[] = ['4-1', '4-2', '4-3', '4-4'];
const level = (id: BostonId) => parseLevel(BOSTON[id]);
/** Chapter 4 moves: all six (run, jump, double jump, the blade, the wall jump, the dash). Never a power. */
const CH4 = { dash: true, wallJump: true, doubleJump: true, smash: true, blade: true } as const;
const memBoxes = (l: ReturnType<typeof level>) => l.memories.map(m => ({ x: m.x + 0.1, y: m.y + 0.1, w: 0.8, h: 0.8 }));
const solidAt = (l: ReturnType<typeof level>, x: number, y: number) => isSolidTile(tileAt(l.tiles, l.cols, x, y));
const tileOf = (l: ReturnType<typeof level>, x: number, y: number) => tileAt(l.tiles, l.cols, x, y);
/** A pit column: no floor in the bottom row (water is no floor). */
const isPit = (l: ReturnType<typeof level>, x: number) => { const t = tileOf(l, x, ROWS - 1); return !isSolidTile(t) && !isOneWayTile(t); };
/** The level's rows with every char in `from` replaced by '.', parsed. */
const without = (id: BostonId, from: string, extra: Partial<LevelDef> = {}) =>
  parseLevel({ ...BOSTON[id], ...extra, rows: BOSTON[id].rows.map(r => r.replace(new RegExp(`[${from}]`, 'g'), '.')) });
const storyWorld = (id: BostonId) => {
  const w = createWorld({ mode: 'story', levelId: id, abilities: { wallJump: true, dash: true, blade: true } });
  drainEvents(w);
  return w;
};
/** Stand her still at column x with her feet on row `feet`. */
function standOn(w: World, x: number, feet: number) {
  const l = w.level;
  const t = tileOf(l, x, feet);
  expect(isSolidTile(t) || isOneWayTile(t), `floor at ${x}, ${feet}`).toBe(true);
  w.hero.x = x + (1 - w.hero.w) / 2; w.hero.y = feet - w.hero.h; w.hero.vx = 0; w.hero.vy = 0; w.hero.onGround = true;
  w.cam.look = 0;
}
/**
 * Step with a frame for `seconds`, counting deaths. `each` runs after every
 * step, sees that step's events, and may change the frame for the next.
 */
function play(w: World, seconds: number, f: Partial<InputFrame> = {}, each?: (w: World, f: InputFrame) => void): number {
  const frame = { ...emptyFrame(), ...f };
  let deaths = 0;
  for (let i = 0; i < seconds / DT; i++) {
    stepWorld(w, frame, DT);
    frame.jumpPressed = false; frame.dashPressed = false;
    each?.(w, frame);
    for (const e of drainEvents(w)) if (e.type === 'die') deaths++;
  }
  return deaths;
}

describe('Story: chapter 4 is built', () => {
  it('4-1 Newbury Street, 4-2 The Charles, 4-3 Seaport Sunrise and 4-4 Revere Beach follow Northeastern, the gorilla after them', () => {
    expect(IDS.map(id => [storyEntry(id).name, storyEntry(id).theme, storyEntry(id).world, storyEntry(id).built])).toEqual([
      ['Newbury Street', 'newbury', 4, true], ['The Charles', 'river', 4, true], ['Seaport Sunrise', 'harbor', 4, true], ['Revere Beach', 'beach', 4, true],
    ]);
    expect(nextStoryId('3-3')).toBe('4-1');
    expect(nextStoryId('4-4')).toBe('4-boss');
    expect(storyEntry('4-boss').built).toBe(false);
    for (const id of IDS) expect(storyLevelDef(id)).toBe(BOSTON[id]);
  });

  it('createWorld loads each level under its sky: night, late night fog, sunrise, morning', () => {
    expect(IDS.map(id => { const w = storyWorld(id); return [w.level.theme, w.level.sky]; })).toEqual([
      ['newbury', 'night'], ['river', 'lateNight'], ['harbor', 'sunrise'], ['beach', 'morning'],
    ]);
    expect(storyWorld('4-2').memories.map(m => m.id)).toEqual(['4-2-a', '4-2-b', '4-2-c']);
  });
});

describe('Story: chapter 4 levels, the shared rules', () => {
  for (const id of IDS) {
    describe(id, () => {
      const l = level(id);
      it('is 14 rows and 200 to 260 columns (longer than before), with a goal beacon on the right', () => {
        expect(BOSTON[id].rows).toHaveLength(ROWS);
        expect(l.cols).toBeGreaterThanOrEqual(200);
        expect(l.cols).toBeLessThanOrEqual(260);
        expect(l.goal.kind).toBe('beacon');
        expect(l.goalDir).toBe(1);
      });

      it('has three memories and three checkpoints near the quarters', () => {
        expect(l.memories).toHaveLength(3);
        expect(l.checkpoints).toHaveLength(3);
        const span = l.goal.x - l.start.x;
        l.checkpoints.forEach((c, i) => expect(Math.abs(c.x - (l.start.x + (span * (i + 1)) / 4)), `checkpoint ${i}`).toBeLessThan(span * 0.15));
      });

      it('opens with a safe teach section: no enemy and no pit in its first 30 columns', () => {
        expect(l.enemies.filter(e => e.x < l.start.x + 30)).toEqual([]);
        for (let x = 0; x < l.start.x + 30; x++) expect(isPit(l, x), `column ${x}`).toBe(false);
      });

      it('can be finished, and every memory found, with the six moves and no power', () => {
        const r = reach(l, { ...CH4, targets: memBoxes(l) });
        expect(r.reached).toBe(true);
        expect(r.touched).toEqual([true, true, true]);
      }, 30_000);

      it('the Cannoli Shield waits once, before the hardest stretch, never near the goal', () => {
        expect(l.pickups.map(p => p.kind)).toEqual(['cannoliShield']);
        const v = l.pickups[0];
        expect(v.x).toBeLessThan(l.checkpoints[2].x);
        expect(v.x).toBeGreaterThan(l.checkpoints[0].x);
        expect(l.goal.x - v.x).toBeGreaterThan(60);
      });

      it('meets the Boston birds: pigeons hop and gulls swoop', () => {
        expect(l.enemies.some(e => e.kind === 'pigeon')).toBe(true);
        expect(l.enemies.some(e => e.kind === 'gull')).toBe(true);
        expect(l.enemies.every(e => e.kind === 'pigeon' || e.kind === 'gull')).toBe(true);
      });
    });
  }

  it('each level brings its own new idea, and the later ones mix in the earlier ones', () => {
    const awnings = (id: BostonId) => level(id).tiles.filter(t => t === TILE.AWNING).length;
    const water = (id: BostonId) => level(id).tiles.filter(t => t === TILE.WATER).length;
    // 4-1: awnings, no water.
    expect(awnings('4-1')).toBeGreaterThanOrEqual(20);
    expect(water('4-1')).toBe(0);
    // 4-2: water and boats, plus an awning.
    expect(new Set(level('4-2').vehicles.map(v => v.kind))).toEqual(new Set(['sailboat', 'shell']));
    expect(water('4-2')).toBeGreaterThan(100);
    expect(awnings('4-2')).toBeGreaterThan(0);
    // 4-3: gusts and crane hooks over the water, plus an awning.
    expect(level('4-3').gusts.length).toBeGreaterThanOrEqual(4);
    expect(level('4-3').hooks.length).toBeGreaterThanOrEqual(4);
    expect(awnings('4-3')).toBeGreaterThan(0);
    // 4-4: waves and sand sculptures, plus a gust and an awning.
    expect(level('4-4').waves.length).toBeGreaterThanOrEqual(5);
    expect(level('4-4').crates).toBeGreaterThan(0);
    expect(level('4-4').gusts.length).toBeGreaterThan(0);
    expect(awnings('4-4')).toBeGreaterThan(0);
  });
});

describe('Story 4-1: Newbury Street', () => {
  const l = level('4-1');
  const pitCols = [...Array(l.cols).keys()].filter(x => isPit(l, x));
  const block = { x0: Math.min(...pitCols.filter(x => x > 100)), x1: 0 };
  for (let x = block.x0; isPit(l, x); x++) block.x1 = x;

  it('teach and practise are soft: a floor under every column until the dug-up block, and the first awning has the sidewalk under it', () => {
    expect(block.x0).toBeGreaterThan(l.checkpoints[1].x);
    for (let x = 0; x < block.x0; x++) expect(isPit(l, x), `column ${x}`).toBe(false);
    const first = [...Array(l.cols).keys()].find(x => [...Array(ROWS).keys()].some(y => tileOf(l, x, y) === TILE.AWNING))!;
    expect(first).toBeLessThan(l.start.x + 20);
    expect(solidAt(l, first, 12)).toBe(true);
  });

  it('the twist: the dug-up block has no floor at all, and only the awnings get her across', () => {
    expect(block.x1 - block.x0 + 1).toBeGreaterThanOrEqual(40);
    expect(reach(without('4-1', 'A'), { ...CH4, generous: true }).reached).toBe(false);
  }, 30_000);

  it('memory a on a stoop, b over the highest awning, c in a walled roof garden', () => {
    const [a, b, c] = l.memories;
    expect(a.x).toBeLessThan(l.checkpoints[0].x);
    expect(solidAt(l, a.x, a.y + 1)).toBe(true);
    const awningRows = [...Array(ROWS).keys()].filter(y => tileOf(l, b.x, y) === TILE.AWNING);
    expect(awningRows.length).toBeGreaterThan(0);
    expect(Math.min(...awningRows)).toBeLessThan(8);
    expect(b.y).toBeLessThan(2);
    expect(solidAt(l, c.x - 3, c.y) && solidAt(l, c.x + 3, c.y)).toBe(true);
  });

  it('a beginner runs off the roof and holds right: she bounces along the awning chain to the far sidewalk', () => {
    for (const held of [false, true]) {
      const w = storyWorld('4-1');
      w.enemies = [];
      standOn(w, block.x0 - 4, 5);
      let bounces = 0;
      const deaths = play(w, 7, { move: 1, jumpHeld: held }, ww => { for (const e of ww.events) if (e.type === 'bounce') bounces++; });
      expect(deaths, `holding jump: ${held}`).toBe(0);
      expect(bounces).toBeGreaterThanOrEqual(4);
      expect(w.hero.x, `holding jump: ${held}`).toBeGreaterThan(block.x1);
    }
  });

  it('the fire escape shaft past the block: from its floor the wall jump climbs to the roof, nothing else does', () => {
    const k3 = l.checkpoints[2];
    expect(k3.y).toBeLessThanOrEqual(4);
    // The alley: walls on both sides of a narrow floor just past the block.
    const alley = [...Array(12).keys()].map(i => block.x1 + 1 + i).find(x => !solidAt(l, x, 11) && solidAt(l, x - 1, 6) && (solidAt(l, x + 1, 6) || solidAt(l, x + 2, 6) || solidAt(l, x + 3, 6)))!;
    expect(alley).toBeDefined();
    const noAwnings = without('4-1', 'A');
    expect(reach(noAwnings, { ...CH4, from: { x: alley, y: 11 } }).maxX).toBeGreaterThanOrEqual(k3.x);
    expect(reach(noAwnings, { ...CH4, wallJump: false, generous: true, from: { x: alley, y: 11 } }).maxX).toBeLessThan(k3.x);
  }, 30_000);
});

describe('Story 4-2: The Charles', () => {
  const l = level('4-2');
  const defs = BOSTON['4-2'].vehicles!;
  /** The right edge column of the floor she stands on (row `feet`), scanning right from x. */
  const edgeOf = (x: number, feet: number) => { let e = x; while (solidAt(l, e + 1, feet)) e++; return e; };

  it('water everywhere boats go: she cannot get past the first dock without them', () => {
    expect(reach(l, { ...CH4, vehicles: false, generous: true }).maxX).toBeLessThan(defs[0].x1);
  }, 30_000);

  it('sailboats ride a row above the docks (so a bob never knocks her into a dock); shells sit on the water line', () => {
    for (const d of defs) {
      if (d.kind === 'sailboat') { expect(d.row).toBe(10); expect(d.bob).toBe(0.25); }
      else { expect(d.row).toBe(12); expect(d.bob ?? 0).toBe(0); }
    }
    // Every sailboat lane ends over a dock: a rider who does nothing is set down on it.
    for (const d of defs.filter(v => v.kind === 'sailboat')) {
      const end = d.dir > 0 ? d.x1 + 2 : d.x0 - 2;
      expect(solidAt(l, end, 11), `lane end at ${end}`).toBe(true);
    }
  });

  it('a beginner rides the first sailboat from the dock: waits for it, hops on, and is set down on the far dock', () => {
    const d = defs[0];
    const edge = edgeOf(d.x0 - 3, 11);
    for (const reaction of [0, 0.3, 0.6]) {
      const w = storyWorld('4-2');
      w.enemies = [];
      standOn(w, edge, 11);
      expect(runUntil(w, ww => ww.vehicles[0].active && ww.vehicles[0].x >= edge - 1.5, {}, 15)).toBe(true);
      expect(play(w, reaction)).toBe(0);
      expect(play(w, 0.25, { jumpPressed: true, jumpHeld: true, move: 1 })).toBe(0);
      let rode = false;
      expect(play(w, 9, {}, ww => { if (ww.riding) rode = true; }), `reaction ${reaction}`).toBe(0);
      expect(rode).toBe(true);
      expect(w.hero.onGround).toBe(true);
      expect(w.hero.x, `reaction ${reaction}`).toBeGreaterThan(d.x1);
    }
  }, 30_000);

  it('the twist: granite piers under the bridge deck, too far apart to jump, and a shell that passes every few seconds', () => {
    const piers = [...Array(l.cols).keys()].filter(x => tileOf(l, x, 12) === TILE.STONE && tileOf(l, x - 1, 12) !== TILE.STONE);
    expect(piers.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < piers.length; i++) expect(piers[i] - piers[i - 1] - 2).toBeGreaterThan(13);
    for (const x of piers) expect(solidAt(l, x, 4), `deck over the pier at ${x}`).toBe(true);
    const lane = defs.filter(d => d.kind === 'shell' && d.x0 < piers[0] && d.x1 > piers[piers.length - 1]);
    expect(lane.length).toBeGreaterThanOrEqual(1);
    for (const d of lane) expect(d.gap).toBeGreaterThanOrEqual(2.5);
  });

  it('a beginner crosses under the bridge: drops onto a passing shell, hops up onto each pier it meets, and makes the far bank', () => {
    const piers = [...Array(l.cols).keys()].filter(x => tileOf(l, x, 12) === TILE.STONE && tileOf(l, x - 1, 12) !== TILE.STONE);
    const bank = piers[0] - 16;
    const far = l.checkpoints[2].x;
    const w = storyWorld('4-2');
    w.enemies = [];
    standOn(w, edgeOf(bank, 11), 11);
    const shells = () => w.vehicles.filter(v => v.kind === 'shell' && v.active);
    let made = -1;
    const deaths = play(w, 45, {}, (ww, f) => {
      const h = ww.hero;
      if (made < 0 && h.onGround && !ww.riding && h.x > far - 2) made = ww.t;
      if (made >= 0) { f.move = 0; f.jumpHeld = false; return; }
      f.jumpHeld = !h.onGround && h.vy < 0;
      if (ww.riding) {
        // On the shell: hop up when a pier is right in front.
        const ahead = solidAt(l, Math.floor(h.x + h.w + 0.15), 11);
        f.move = ahead ? 1 : 0;
        if (ahead) { f.jumpPressed = true; f.jumpHeld = true; }
      } else if (h.onGround) {
        const edge = edgeOf(Math.floor(h.x + h.w / 2), Math.round(h.y + h.h));
        const ready = shells().some(v => v.x <= edge - 2 && v.x + v.w >= edge + 1);
        f.move = ready ? 1 : h.x + h.w < edge + 0.9 ? 0.4 : 0;
      } else {
        f.move = h.vy < 0 ? 1 : f.move;
      }
    });
    expect(deaths).toBe(0);
    expect(made).toBeGreaterThan(0);
    expect(made).toBeLessThan(40);
  }, 30_000);

  it('memory a on a dock, b high over a sailboat lane, c on a ledge under the bridge deck', () => {
    const [a, b, c] = l.memories;
    expect(solidAt(l, a.x, a.y + 1)).toBe(true);
    expect(tileOf(l, a.x, a.y + 2)).toBe(TILE.WATER);
    const lane = defs.find(d => d.kind === 'sailboat' && d.x0 <= b.x && d.x1 >= b.x)!;
    expect(lane).toBeDefined();
    expect(lane.row - b.y).toBeGreaterThanOrEqual(4);
    expect(tileOf(l, c.x, c.y + 1)).toBe(TILE.ONEWAY);
    expect(solidAt(l, c.x, c.y - 2)).toBe(true);
  });
});

describe('Story 4-3: Seaport Sunrise', () => {
  const l = level('4-3');
  const def = BOSTON['4-3'];
  /** The first gust zone over water, and the gap it covers. */
  const zone = def.gusts!.find(g => [...Array(g.x1 - g.x0 + 1).keys()].some(i => isPit(l, g.x0 + i)))!;
  const gap = { x0: [...Array(l.cols).keys()].find(x => x >= zone.x0 && isPit(l, x))!, x1: 0 };
  for (let x = gap.x0; isPit(l, x); x++) gap.x1 = x;

  it('teaches the wind on solid ground first: the first gust zone has a floor under all of it', () => {
    const first = def.gusts![0];
    expect(first.x0).toBeLessThan(zone.x0);
    for (let x = first.x0; x <= first.x1; x++) expect(isPit(l, x), `column ${x}`).toBe(false);
  });

  /** From a run-up, jump the gap at the first moment `go` says so; deaths. */
  const crossing = (go: (w: World) => boolean) => {
    const w = storyWorld('4-3');
    w.enemies = [];
    standOn(w, gap.x0 - 6, 11);
    let started = false, jumped = false;
    const deaths = play(w, 12, {}, (ww, f) => {
      if (!started && go(ww)) started = true;
      f.move = started ? 1 : 0;
      if (started && !jumped && ww.hero.x + ww.hero.w >= gap.x0 - 0.2) { f.jumpPressed = true; jumped = true; }
      f.jumpHeld = jumped && (f.jumpPressed || ww.hero.vy < 0);
    });
    return { deaths, w, jumped };
  };

  it('a beginner waits for the telegraph, lets the gust blow, then crosses in the calm', () => {
    for (const reaction of [0, 0.3, 0.6]) {
      let phase = 0, calmAt = Infinity;
      const r = crossing(ww => {
        const g = ww.gusts[def.gusts!.indexOf(zone)];
        if (phase === 0 && g.warn) phase = 1;
        if (phase === 1 && g.on) phase = 2;
        if (phase === 2 && !g.on) { phase = 3; calmAt = ww.t; }
        return phase === 3 && ww.t >= calmAt + reaction;
      });
      expect(r.jumped).toBe(true);
      expect(r.deaths, `reaction ${reaction}`).toBe(0);
      expect(r.w.hero.x).toBeGreaterThan(gap.x1);
    }
  });

  it('the same jump made as the gust starts to blow falls short into the water', () => {
    // She sets off from the run-up as the warning shows, so her jump meets the wind.
    const r = crossing(ww => ww.gusts[def.gusts!.indexOf(zone)].warn);
    expect(r.jumped).toBe(true);
    expect(r.deaths).toBeGreaterThan(0);
  });

  it('crane hooks carry her where no jump reaches: without them the harbor stops her', () => {
    expect(reach(parseLevel({ ...def, hooks: [] }), { ...CH4, generous: true }).reached).toBe(false);
  }, 30_000);

  it('a beginner rides the first hook: jumps on as it swings near, rides it out, and jumps off at the far end of the swing', () => {
    const hk = def.hooks![0];
    let edge = hk.x - 1;
    while (!solidAt(l, edge, 11)) edge--;
    for (const delay of [0, 0.15, 0.3]) {
      const w = storyWorld('4-3');
      w.enemies = [];
      standOn(w, edge, 11);
      const h = w.hero;
      let stage = 0, t0 = 0, rode = false;
      const deaths = play(w, 12, {}, (ww, f) => {
        const k = ww.hooks[0];
        if (ww.riding === k.deck) rode = true;
        f.jumpHeld = !h.onGround && h.vy < 0;
        if (stage === 0 && k.angle < -0.8 * hk.amp && k.deck.x < k.deck.px) { stage = 1; t0 = ww.t; }
        if (stage === 1 && ww.t >= t0 + delay) { stage = 2; f.jumpPressed = true; f.jumpHeld = true; }
        if (stage === 2) {
          // Double jump at the top, steer onto the block, then stand still on it.
          if (h.vy > -1 && h.airJumps > 0 && !h.onGround) { f.jumpPressed = true; f.jumpHeld = true; }
          f.move = ww.riding ? 0 : h.x + h.w / 2 < k.px - 0.2 ? 1 : h.x + h.w / 2 > k.px + 0.2 ? -1 : 0;
          if (ww.riding) stage = 3;
        }
        if (stage === 3) { f.move = 0; if (k.angle > 0.85 * hk.amp && k.deck.x > k.deck.px) { stage = 4; f.jumpPressed = true; f.jumpHeld = true; } }
        if (stage === 4) f.move = 1;
      });
      expect(rode, `delay ${delay}`).toBe(true);
      expect(deaths, `delay ${delay}`).toBe(0);
      expect(h.onGround).toBe(true);
      expect(h.x, `delay ${delay}`).toBeGreaterThan(hk.x + 6);
    }
  });

  it('memory a on a bollard, b on the crane cab roof, c on a moored workboat', () => {
    const [a, b, c] = l.memories;
    expect(l.decor.some(d => d.kind === 'bollard' && d.x === a.x && d.y === a.y + 2)).toBe(true);
    expect(b.y).toBeLessThanOrEqual(1);
    expect(solidAt(l, b.x, b.y + 1)).toBe(true);
    expect(tileOf(l, c.x, c.y + 1)).toBe(TILE.ONEWAY);
    expect(tileOf(l, c.x, c.y + 2)).toBe(TILE.WATER);
  });
});

describe('Story 4-4: Revere Beach', () => {
  const l = level('4-4');
  const def = BOSTON['4-4'];
  const first = def.waves![0];
  /** A wave over a sand bar with a tidal pool right behind its land edge, and a dune before that pool. */
  const bar = def.waves!.find(wv => isPit(l, wv.x0 - 1) && solidAt(l, wv.x0 - 6, 9))!;
  const waveIdx = (wv: typeof first) => def.waves!.indexOf(wv);

  it('the first wave rolls up a sand stretch with no pool behind it: it can only push her back, never drown her', () => {
    for (let x = first.x0 - 8; x <= first.x1 + 1; x++) expect(isPit(l, x), `column ${x}`).toBe(false);
    const w = storyWorld('4-4');
    w.enemies = [];
    standOn(w, first.x0 + 3, 11);
    const x0 = w.hero.x;
    const deaths = play(w, def.waves![0].period + 0.5);
    expect(deaths).toBe(0);
    expect(w.hero.x).toBeLessThan(x0 - 1);
  });

  it('a beginner sees the water draw back, steps back out of its reach, then crosses in the calm', () => {
    for (const reaction of [0, 0.2, 0.4]) {
      const w = storyWorld('4-4');
      w.enemies = [];
      standOn(w, first.x0 + 2, 11);
      let stage = 0, t0 = 0, pushed = false, lastX = 0;
      const deaths = play(w, 12, {}, (ww, f) => {
        const wv = ww.waves[0], h = ww.hero;
        if (stage === 0 && wv.warn) { stage = 1; t0 = ww.t; }
        if (stage === 1 && ww.t >= t0 + reaction) stage = 2;
        if (stage === 2) { f.move = h.x > first.x0 - 3 ? -1 : 0; if (wv.on) stage = 3; }
        if (stage === 3) {
          f.move = h.x > first.x0 - 3 ? -1 : 0;
          if (f.move === 0 && Math.abs(h.x - lastX) > 1e-6 && h.vx === 0) pushed = true;
          if (!wv.on) stage = 4;
        }
        if (stage === 4 && h.onGround && Math.round(h.y + h.h) === 9 && h.x > first.x1) stage = 5;
        if (stage === 5) { f.move = 0; f.jumpHeld = false; }
        if (stage === 4) {
          // The calm: run to the dune at the far end, jump up onto it, steer for its middle.
          const mid = first.x1 + 3;
          f.move = h.x + h.w / 2 < mid ? 1 : -1;
          f.jumpPressed = h.onGround && solidAt(l, Math.floor(h.x + h.w + 0.3), 10);
          f.jumpHeld = !h.onGround || f.jumpPressed;
        }
        lastX = h.x;
      });
      expect(deaths, `reaction ${reaction}`).toBe(0);
      expect(pushed, `reaction ${reaction}`).toBe(false);
      expect(w.hero.x, `reaction ${reaction}`).toBeGreaterThan(first.x1 + 1);
    }
  });

  it('out on the bars a wave that catches her pushes her back into the tidal pool behind', () => {
    const w = storyWorld('4-4');
    w.enemies = [];
    expect(runUntil(w, ww => ww.waves[waveIdx(bar)].warn, {}, 10)).toBe(true);
    standOn(w, bar.x0 + 3, 11);
    expect(play(w, 3)).toBeGreaterThan(0);
  });

  it('a beginner waits on the dune for the wave, then runs the bar in the calm to the next dune', () => {
    let dune = bar.x0 - 1;
    while (!solidAt(l, dune, 9)) dune--;
    const w = storyWorld('4-4');
    w.enemies = [];
    standOn(w, dune, 9);
    let stage = 0;
    const deaths = play(w, 14, {}, (ww, f) => {
      const wv = ww.waves[waveIdx(bar)], h = ww.hero;
      if (stage === 0 && wv.on) stage = 1;
      if (stage === 1 && !wv.on) stage = 2;
      if (stage === 2 && h.onGround && Math.round(h.y + h.h) === 9 && h.x > bar.x1) stage = 3;
      if (stage !== 2) { f.move = 0; f.jumpHeld = false; return; }
      // Run, jump the pool and the sand castle, then steer for the middle of the far dune.
      const mid = bar.x1 + 2.5;
      f.move = h.x + h.w / 2 < mid || (h.onGround && h.x < bar.x1) ? 1 : -1;
      const ahead = Math.floor(h.x + h.w + 0.6);
      const feet = Math.round(h.y + h.h);
      f.jumpPressed = h.onGround && (isPit(l, ahead) || solidAt(l, ahead, feet - 1));
      f.jumpHeld = !h.onGround || f.jumpPressed;
    });
    expect(deaths).toBe(0);
    expect(w.hero.x).toBeGreaterThan(bar.x1);
    expect(w.hero.y + w.hero.h).toBeCloseTo(9, 3);
  });

  it('the twist: a row of pavilion roofs over the pools and waves, memory b on the highest', () => {
    const roofs = [...Array(l.cols).keys()].filter(x => tileOf(l, x, 6) === TILE.ONEWAY && tileOf(l, x - 1, 6) !== TILE.ONEWAY);
    expect(roofs.length).toBeGreaterThanOrEqual(5);
    const b = l.memories[1];
    expect(tileOf(l, b.x, b.y + 1)).toBe(TILE.ONEWAY);
    expect(b.y + 1).toBeLessThan(6);
  });

  it('memories a and c wait inside sand sculptures (the blade opens them), c past the end of the boulevard', () => {
    const [a, , c] = l.memories;
    for (const m of [a, c]) {
      expect(tileOf(l, m.x - 1, m.y)).toBe(TILE.CRATE);
      expect(tileOf(l, m.x + 1, m.y)).toBe(TILE.CRATE);
      expect(tileOf(l, m.x, m.y - 1)).toBe(TILE.CRATE);
    }
    expect(reach(l, { ...CH4, blade: false, targets: memBoxes(l) }).touched).toEqual([false, true, false]);
    let end = c.x;
    while (!solidAt(l, end, 8)) end--;
    expect(c.x - end).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(l.checkpoints[2].x);
  }, 30_000);
});

describe('Reach oracle: spikes are never a floor', () => {
  /** Floor, a strip of `n` spikes at floor level, floor again, the goal past it. */
  const strip = (n: number) => custom(['.P' + '.'.repeat(8) + '.'.repeat(n) + '.'.repeat(8) + 'G.', '#'.repeat(10) + '^'.repeat(n) + '#'.repeat(10), '#'.repeat(n + 20)]);
  const moves = { dash: false, wallJump: false, doubleJump: true } as const;

  it('a strip a double jump clears is crossed in the air', () => {
    expect(reach(strip(6), moves).reached).toBe(true);
  });

  it('a strip too wide to jump stops her: landing on spikes ends the move', () => {
    const r = reach(strip(16), moves);
    expect(r.reached).toBe(false);
    expect(r.stands.some(s => s.x >= 10 && s.x < 26)).toBe(false);
  });
});
