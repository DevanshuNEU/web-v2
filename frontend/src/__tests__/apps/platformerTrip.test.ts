import { describe, it, expect } from 'vitest';
import { DECOR_BY_THEME, ROWS, TILE, isSolidTile, parseLevel, tileAt, type Level } from '@/components/apps/games/platformer/sim/level';
import { PHYS } from '@/components/apps/games/platformer/sim/physics';
import { POWERS } from '@/components/apps/games/platformer/sim/powers';
import { WALKWAY_SPEED, createWorld, drainEvents, stepWorld, type World } from '@/components/apps/games/platformer/sim/world';
import { wallSide } from '@/components/apps/games/platformer/sim/hero';
import { STORY, nextStoryId, storyEntry, storyLevelDef } from '@/components/apps/games/platformer/sim/story';
import { TRIP, type TripId } from '@/components/apps/games/platformer/sim/story/trip';
import { emptyFrame } from '@/components/apps/games/platformer/input/frame';
import { reach } from '../setup/platformerReach';
import { DT, G40, custom, run, runUntil, worldOn } from '../setup/platformerWorld';

/** One row of scenery over a floor, as a 14 row level. */
const scenery = (theme: Parameters<typeof custom>[1]) => custom(['.P..T..N..U..H..L...........G....', '#'.repeat(33)], theme);

describe('Chapter 2 level data: sky, decor and lights per theme', () => {
  it('copies the level sky through parseLevel, and leaves it out when unset', () => {
    const rows = [...Array(ROWS - 2).fill('.'.repeat(10)), '.P......G.', '#'.repeat(10)];
    expect(parseLevel({ id: 1, label: 't', name: 't', theme: 'airport', sky: 'night', rows }).sky).toBe('night');
    expect(parseLevel({ id: 1, label: 't', name: 't', theme: 'clouds', rows }).sky).toBeUndefined();
  });

  it('names scenery by theme: rooftop props in Austin, terminal props in the airport, sky props in the clouds', () => {
    expect(DECOR_BY_THEME.austin).toEqual({ T: 'waterTower', N: 'antenna', U: 'acUnit', H: 'chimney' });
    expect(DECOR_BY_THEME.rooftops).toEqual(DECOR_BY_THEME.austin);
    expect(DECOR_BY_THEME.airport).toEqual({ T: 'departureBoard', N: 'plant', U: 'seats', H: 'kiosk' });
    expect(DECOR_BY_THEME.clouds).toEqual({ T: 'cloudTower', N: 'wingLight' });
    expect(scenery('austin').decor.map(d => d.kind)).toEqual(['waterTower', 'antenna', 'acUnit', 'chimney', 'neonSign']);
    expect(scenery('airport').decor.map(d => d.kind)).toEqual(['departureBoard', 'plant', 'seats', 'kiosk', 'neonSign']);
    expect(() => scenery('clouds')).toThrow(/U/);
  });

  it('scenery never blocks: every decor char parses to an empty tile', () => {
    const l = scenery('airport');
    for (const d of l.decor) expect(l.tiles[(d.y - 1) * l.cols + d.x]).toBe(TILE.EMPTY);
  });

  it('lights a sign by theme: neon in Austin, fluorescent and amber gate signs in the airport, moonlight in the clouds', () => {
    const lightOf = (theme: Parameters<typeof custom>[1]) => {
      const rows = Array.from({ length: 12 }, (_, x) => '.'.repeat(x + 2) + 'L' + '.'.repeat(30 - x - 3));
      return rows.map(r => {
        const l = custom(['.P' + r.slice(2) + '....G', '#'.repeat(r.length + 5)], theme);
        return l.lights.find(li => li.x === l.decor[0].x + 0.5)!;
      });
    };
    const colors = (theme: Parameters<typeof custom>[1]) => new Set(lightOf(theme).map(l => l.color));
    expect(colors('austin')).toEqual(new Set(['#ff3d9a', '#3df2ff', '#ffb347']));
    expect(colors('airport')).toEqual(new Set(['#bfe6ff', '#ffb347', '#7ad0ff']));
    expect(colors('clouds')).toEqual(new Set(['#cfd8ff']));
    const amber = lightOf('airport').find(l => l.color === '#ffb347')!;
    expect([amber.flicker, amber.r]).toEqual([0.02, 4.5]);
    const moon = lightOf('clouds')[0];
    expect([moon.flicker, moon.r]).toEqual([0, 6]);
  });
});

describe('Moving walkways (> carries right, < carries left)', () => {
  const W = 60;
  /** Plain floor, then a walkway from column 10 to 49, then plain floor. */
  const belt = (ch: '>' | '<', at = 25) => {
    const top = '='.repeat(10) + ch.repeat(40) + '='.repeat(10);
    return worldOn(['.'.repeat(at) + 'P' + '.'.repeat(W - at - 1), top, '#'.repeat(W)], 0, 'airport');
  };
  const speedOver = (w: ReturnType<typeof worldOn>, seconds: number, input = {}) => {
    const x0 = w.hero.x;
    run(w, seconds, input);
    return (w.hero.x - x0) / seconds;
  };

  it('is solid like ground and carries her standing still at WALKWAY_SPEED, the way it runs', () => {
    expect(WALKWAY_SPEED).toBe(4);
    const r = belt('>');
    run(r, 0.2);
    expect(r.hero.onGround).toBe(true);
    expect(speedOver(r, 1)).toBeCloseTo(WALKWAY_SPEED, 1);
    const l = belt('<');
    run(l, 0.2);
    expect(speedOver(l, 1)).toBeCloseTo(-WALKWAY_SPEED, 1);
  });

  it('adds to her run: faster running with it, slow but possible running against it', () => {
    const withIt = belt('>', 12);
    run(withIt, 0.4, { move: 1 });
    expect(speedOver(withIt, 0.5, { move: 1 })).toBeCloseTo(PHYS.runMax + WALKWAY_SPEED, 1);
    const against = belt('>', 45);
    run(against, 0.4, { move: -1 });
    expect(speedOver(against, 0.5, { move: -1 })).toBeCloseTo(-(PHYS.runMax - WALKWAY_SPEED), 1);
  });

  it('jumping off keeps the carried speed in the air, until she lands on plain floor', () => {
    const w = belt('>', 12);
    run(w, 0.5, { move: 1 });
    run(w, DT, { move: 1, jumpPressed: true, jumpHeld: true });
    expect(w.hero.onGround).toBe(false);
    // Still over the walkway but airborne: the carry stays with her.
    run(w, 0.3, { move: 1, jumpHeld: true });
    expect(w.hero.onGround).toBe(false);
    expect(w.hero.carry).toBeCloseTo(WALKWAY_SPEED, 6);
    expect(speedOver(w, 0.1, { move: 1, jumpHeld: true })).toBeCloseTo(PHYS.runMax + WALKWAY_SPEED, 0);
    // Land on the plain floor past the walkway: the carry is gone a moment later.
    expect(runUntil(w, ww => ww.hero.onGround && ww.hero.x > 51, { move: 1 }, 3)).toBe(true);
    run(w, 0.2, { move: 1 });
    expect(w.hero.carry).toBe(0);
    expect(speedOver(w, 0.1, { move: 0 })).toBeLessThan(PHYS.runMax);
  });

  it('steering against the carry in the air takes it away', () => {
    const w = belt('>', 20);
    run(w, 0.3);
    run(w, DT, { jumpPressed: true, jumpHeld: true });
    run(w, 0.05, { jumpHeld: true });
    expect(w.hero.carry).toBeCloseTo(WALKWAY_SPEED, 6);
    run(w, 0.3, { move: -1, jumpHeld: true });
    expect(w.hero.onGround).toBe(false);
    expect(w.hero.carry).toBe(0);
  });

  it('carries enemies too: a walker heading against the belt drifts with it', () => {
    const rows = ['.P' + '.'.repeat(30) + 'c' + '.'.repeat(W - 33), '='.repeat(10) + '>'.repeat(40) + '='.repeat(10), '#'.repeat(W)];
    const w = worldOn(rows, 0, 'airport');
    const e = w.enemies[0];
    e.active = true;
    expect(e.dir).toBe(-1);
    const x0 = e.x;
    run(w, 0.5);
    expect((e.x - x0) / 0.5).toBeCloseTo(WALKWAY_SPEED - 2.4, 1);
  });
});

describe('Thin clouds (~): one-way, puff away after she stands on them, come back', () => {
  /** A puff ledge three tiles wide at row 8 (x 10 to 12), floor at row 12. */
  const sky = (start = '.P') => worldOn([
    '..........~~~...........',
    '........................',
    '........................',
    start + '......................',
    '='.repeat(24),
    '#'.repeat(24),
  ], 0, 'clouds');
  const idx = (w: ReturnType<typeof worldOn>, x: number, y: number) => y * w.level.cols + x;
  /** Drop her onto the puff at column 11 from just above it. */
  const dropOn = (w: ReturnType<typeof worldOn>) => {
    w.hero.x = 11 + (1 - w.hero.w) / 2; w.hero.y = 8 - w.hero.h - 0.6; w.hero.vy = 0; w.hero.onGround = false; w.hero.coyote = 0;
  };

  it('lists every puff tile, solid and still', () => {
    const w = sky();
    expect(w.puffs).toEqual([
      { x: 10, y: 8, t: 0, solid: true }, { x: 11, y: 8, t: 0, solid: true }, { x: 12, y: 8, t: 0, solid: true },
    ]);
    expect(w.tiles[idx(w, 11, 8)]).toBe(TILE.PUFF);
  });

  it('is one-way: she lands on it from above, jumps up through it from below, walks through it from the side', () => {
    const above = sky();
    dropOn(above);
    run(above, 0.15);
    expect(above.hero.onGround).toBe(true);
    expect(above.hero.y + above.hero.h).toBeCloseTo(8, 5);

    const below = sky();
    below.hero.x = 11.16; below.hero.y = 12 - below.hero.h; below.hero.onGround = true;
    let highest = 99;
    run(below, 0.6, { jumpPressed: true, jumpHeld: true }, ww => { highest = Math.min(highest, ww.hero.y + ww.hero.h); });
    expect(highest).toBeLessThan(8);

    // Side: a puff at body height on the floor does not stop her walking.
    const side = worldOn(['.P.....~.....', '=============', '#############'], 0, 'clouds');
    run(side, 1.2, { move: 1 });
    expect(side.hero.x).toBeGreaterThan(8);
  });

  it('wobbles while she stands on it, puffs away 0.4 s after she first lands, and she drops through', () => {
    const w = sky();
    dropOn(w);
    expect(runUntil(w, ww => ww.hero.onGround, {}, 1)).toBe(true);
    const p = w.puffs[1];
    run(w, 0.2);
    expect(p.solid).toBe(true);
    expect(p.t).toBeGreaterThan(0.15);
    expect(w.puffs[0].t).toBe(0);
    run(w, 0.25);
    expect(p.solid).toBe(false);
    expect(w.tiles[idx(w, 11, 8)]).toBe(TILE.EMPTY);
    run(w, 0.5);
    expect(w.hero.y + w.hero.h).toBeCloseTo(12, 5);
  });

  it('comes back 3 s after it went, written back into the tiles', () => {
    const w = sky();
    dropOn(w);
    runUntil(w, ww => ww.puffs[1].solid === false, {}, 2);
    expect(w.puffs[1].t).toBeLessThan(0.05);
    run(w, 2.9);
    expect(w.puffs[1].solid).toBe(false);
    run(w, 0.15);
    expect(w.puffs[1]).toEqual({ x: 11, y: 8, t: 0, solid: true });
    expect(w.tiles[idx(w, 11, 8)]).toBe(TILE.PUFF);
  });

  it('a lingering stand does not keep it: once triggered it goes even if she hops off', () => {
    const w = sky();
    dropOn(w);
    runUntil(w, ww => ww.hero.onGround, {}, 1);
    run(w, 0.05);
    // Off to the side, onto the floor below.
    w.hero.x = 3; w.hero.y = 12 - w.hero.h; w.hero.onGround = true;
    run(w, 0.4);
    expect(w.puffs[1].solid).toBe(false);
  });

  it('never comes back into her: it waits until she is out of its tile', () => {
    const w = sky();
    dropOn(w);
    runUntil(w, ww => ww.puffs[1].solid === false, {}, 2);
    const hold = (ww: ReturnType<typeof worldOn>) => { ww.hero.x = 11.16; ww.hero.y = 7.5; ww.hero.vy = 0; };
    run(w, 3.5, {}, hold);
    expect(w.puffs[1].solid).toBe(false);
    expect(w.tiles[idx(w, 11, 8)]).toBe(TILE.EMPTY);
    w.hero.x = 3; w.hero.y = 12 - w.hero.h;
    run(w, 0.05);
    expect(w.puffs[1].solid).toBe(true);
  });
});

describe('Priority Boarding (b): enemies bounce off her', () => {
  it('is live, placed with b, and lasts 8 s', () => {
    expect(POWERS.priorityBoarding.live).toBe(true);
    expect(POWERS.priorityBoarding.duration).toBe(8);
    expect(POWERS.priorityBoarding.knockout).toBe(true);
    expect(POWERS.batWings.knockout).toBe(false);
    const w = worldOn(['.P..b...................................', G40, G40]);
    expect(w.pickups).toEqual([{ kind: 'priorityBoarding', x: 4, y: 11, taken: false }]);
  });

  it('while it runs, running into an enemy knocks it out for stomp points and never hurts her', () => {
    const w = worldOn(['.P..b.....c.......d.....................', G40, G40]);
    for (const e of w.enemies) e.active = true;
    const stomps: number[] = [];
    // Run through the walker; then stand under the drone until it dives into her.
    run(w, 1.4, { move: 1 }, ww => { for (const e of drainEvents(ww)) if (e.type === 'stomp') stomps.push(e.n); });
    expect(w.power?.kind).toBe('priorityBoarding');
    expect(w.enemies.filter(e => e.kind === 'doomCrawler' && e.deadT === -1)).toHaveLength(0);
    run(w, 2, {}, ww => { ww.hero.x = 18.2; for (const e of drainEvents(ww)) if (e.type === 'stomp') stomps.push(e.n); });
    expect(w.phase).toBe('play');
    expect(w.stats.stomps).toBe(2);
    expect(stomps).toHaveLength(2);
    expect(w.enemies.every(e => e.deadT !== -1)).toBe(true);
  });

  it('runs out, and then a touch hurts again', () => {
    const w = worldOn(['.P..b...................................c..', '#'.repeat(43), '#'.repeat(43)]);
    run(w, 0.6, { move: 1 });
    expect(w.power?.kind).toBe('priorityBoarding');
    run(w, 8);
    expect(w.power).toBeNull();
    w.enemies[0].active = true;
    expect(runUntil(w, ww => ww.phase === 'dying', { move: 1 }, 6)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The levels
// ─────────────────────────────────────────────────────────────────────────────

const IDS: TripId[] = ['2-1', '2-2'];
const level = (id: TripId) => parseLevel(TRIP[id]);
/** Chapter 2 moves: run, jump, double jump, the blade; the wall jump from the 2-1 shrine on. Never the dash. */
const CH2 = { dash: false, wallJump: true, doubleJump: true } as const;
const NO_WALL = { dash: false, wallJump: false, doubleJump: true } as const;
const memBoxes = (l: Level) => l.memories.map(m => ({ x: m.x + 0.1, y: m.y + 0.1, w: 0.8, h: 0.8 }));
const solidAt = (l: Level, x: number, y: number) => isSolidTile(tileAt(l.tiles, l.cols, x, y));
const charsOf = (id: TripId, ch: string) => TRIP[id].rows.join('').split(ch).length - 1;
/** Columns where a run of `ch` starts and ends on row y, as [x0, x1] pairs. */
function runsOf(id: TripId, ch: string): { y: number; x0: number; x1: number }[] {
  const out: { y: number; x0: number; x1: number }[] = [];
  TRIP[id].rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if (r[x] !== ch || r[x - 1] === ch) continue;
      let x1 = x;
      while (r[x1 + 1] === ch) x1++;
      out.push({ y, x0: x, x1 });
    }
  });
  return out;
}

describe('Story: chapter 2 is built', () => {
  it('2-1 Departures (airport) and 2-2 Red-Eye (clouds) follow chapter 1 in the running order', () => {
    expect(STORY.filter(s => s.built).map(s => s.id).slice(0, 5)).toEqual(['1-1', '1-2', '1-3', '2-1', '2-2']);
    expect([storyEntry('2-1').name, storyEntry('2-1').theme, storyEntry('2-1').world]).toEqual(['Departures', 'airport', 2]);
    expect([storyEntry('2-2').name, storyEntry('2-2').theme, storyEntry('2-2').world]).toEqual(['Red-Eye', 'clouds', 2]);
    expect(nextStoryId('1-3')).toBe('2-1');
    expect(nextStoryId('2-1')).toBe('2-2');
    expect(storyLevelDef('2-2')).toBe(TRIP['2-2']);
  });

  it('createWorld loads 2-1 under the night sky, with its memories named by level', () => {
    const w = createWorld({ mode: 'story', levelId: '2-1', abilities: { blade: true } });
    expect([w.level.theme, w.level.sky, w.level.name]).toEqual(['airport', 'night', 'Departures']);
    expect(w.memories.map(m => m.id)).toEqual(['2-1-a', '2-1-b', '2-1-c']);
    expect(w.shrines.map(q => q.ability)).toEqual(['wallJump']);
  });
});

describe('Story: chapter 2 levels, the shared rules', () => {
  for (const id of IDS) {
    describe(id, () => {
      const l = level(id);
      it('is 14 rows and 180 to 240 columns, at night, with a goal beacon on the right', () => {
        expect(TRIP[id].rows).toHaveLength(ROWS);
        expect(l.cols).toBeGreaterThanOrEqual(180);
        expect(l.cols).toBeLessThanOrEqual(240);
        expect(l.sky).toBe('night');
        expect(l.goal.kind).toBe('beacon');
        expect(l.goalDir).toBe(1);
      });

      it('has three memories and two checkpoints at the thirds', () => {
        expect(l.memories).toHaveLength(3);
        expect(l.checkpoints).toHaveLength(2);
        const span = l.goal.x - l.start.x;
        l.checkpoints.forEach((c, i) => expect(Math.abs(c.x - (l.start.x + (span * (i + 1)) / 3))).toBeLessThan(span * 0.12));
      });

      it('can be finished, and every memory found, with run, jump, double jump and the wall jump: no dash, no power', () => {
        expect(l.pickups.every(p => p.kind === 'priorityBoarding')).toBe(true);
        const r = reach(l, { ...CH2, targets: memBoxes(l) });
        expect(r.reached).toBe(true);
        expect(r.touched).toEqual([true, true, true]);
      }, 30_000);

      it('needs the wall jump: even generous jumping without it never reaches the goal', () => {
        expect(reach(l, { ...NO_WALL, generous: true }).reached).toBe(false);
      });
    });
  }
});

describe('Story 2-1: Departures', () => {
  const l = level('2-1');
  const shrine = l.shrines[0];
  const prompt = l.setPieces.find(p => p.kind === 'prompt')!;
  const firstWalkway = Math.min(...runsOf('2-1', '>').map(r => r.x0), ...runsOf('2-1', '<').map(r => r.x0));

  it('has the wall jump shrine in a quiet lounge: floor all round, nothing to fall into, no enemy near', () => {
    expect(TRIP['2-1'].shrine).toBe('wallJump');
    expect(l.shrines).toHaveLength(1);
    for (let x = shrine.x - 10; x <= shrine.x + 10; x++) expect(solidAt(l, x, shrine.y + 1)).toBe(true);
    expect(l.enemies.filter(e => Math.abs(e.x - shrine.x) < 30)).toEqual([]);
  });

  it('has no death pits at all before the twist: floor under every column up to the first walkway', () => {
    for (let x = 0; x < firstWalkway; x++) expect(solidAt(l, x, 13), `column ${x}`).toBe(true);
  });

  it('nothing before the shrine needs the wall jump; the first shaft with the prompt comes right after it', () => {
    expect(prompt.id).toBe('wallJump');
    expect(prompt.x0 - shrine.x).toBeGreaterThan(0);
    expect(prompt.x0 - shrine.x).toBeLessThan(15);
    const without = reach(l, { ...NO_WALL, targets: [...memBoxes(l), { x: shrine.x + 0.1, y: shrine.y - 1, w: 0.8, h: 2 }] });
    expect(without.touched).toEqual([true, false, false, true]);
    expect(without.maxX).toBeLessThan(prompt.x1 + 1);
    // Every spot left of the shrine that the wall jump reaches, plain jumps reach too.
    const key = (s: { x: number; y: number }) => s.x * ROWS + s.y;
    const plain = new Set(without.stands.map(key));
    const extra = reach(l, { ...CH2, targets: memBoxes(l) }).stands.filter(s => s.x <= shrine.x && !plain.has(key(s)));
    expect(extra).toEqual([]);
  });

  it('the first shaft is climbed by a beginner who holds right and taps Jump each time she touches a wall', () => {
    const w = createWorld({ mode: 'story', levelId: '2-1', abilities: { wallJump: true, blade: true } });
    w.hero.x = prompt.x0 + 0.5; w.hero.y = 12 - w.hero.h; w.hero.onGround = true;
    const top = Math.min(...[...Array(ROWS).keys()].filter(y => solidAt(l, prompt.x1, y)));
    expect(climb(w, 6, () => w.hero.onGround && w.hero.y + w.hero.h <= top + 1e-6)).toBe(true);
  });

  it('memory a is in the lounge by the shrine; b sits on a board only wall jumps reach; c is in a closed room off the path', () => {
    const [a, b, c] = l.memories;
    expect(Math.abs(a.x - shrine.x)).toBeLessThan(8);
    const cp = l.checkpoints[0];
    const fromCp = reach(l, { ...NO_WALL, generous: true, from: { x: cp.x, y: cp.y - 1 }, targets: memBoxes(l) });
    expect(fromCp.touched[1]).toBe(false);
    expect(b.y).toBeLessThanOrEqual(1);
    // A ceiling over c: the food court floor.
    expect([...Array(c.y).keys()].some(y => solidAt(l, c.x, y))).toBe(true);
  });

  it('the twist: a walkway that helps over the first pit, one against her under a low ceiling, then a climb started from a walkway', () => {
    const right = runsOf('2-1', '>'), left = runsOf('2-1', '<');
    expect(right.length).toBeGreaterThanOrEqual(2);
    expect(left.length).toBeGreaterThanOrEqual(1);
    const [help, climbBelt] = right;
    const against = left[0];
    // A pit within 2 tiles of the helping walkway's end.
    const pitAt = [...Array(4).keys()].map(i => help.x1 + 1 + i).find(x => !solidAt(l, x, 13));
    expect(pitAt).toBeDefined();
    // The low ceiling: two clear rows over every column of the walkway against her.
    for (let x = against.x0; x <= against.x1; x++) {
      expect(solidAt(l, x, against.y - 3)).toBe(true);
      expect(solidAt(l, x, against.y - 1) || solidAt(l, x, against.y - 2)).toBe(false);
    }
    expect(help.x1).toBeLessThan(against.x0);
    expect(against.x1).toBeLessThan(climbBelt.x0);
    // The last walkway runs into a wall.
    expect(solidAt(l, climbBelt.x1 + 1, climbBelt.y - 1)).toBe(true);
  });

  it('standing still on the helping walkway carries her to its end, where she stops safe of the pit', () => {
    const [help] = runsOf('2-1', '>');
    const w = createWorld({ mode: 'story', levelId: '2-1', abilities: { wallJump: true, blade: true } });
    w.hero.x = help.x0 + 1; w.hero.y = help.y - w.hero.h; w.hero.onGround = true;
    run(w, 8);
    expect(w.phase).toBe('play');
    expect(w.hero.onGround).toBe(true);
    expect(w.hero.x).toBeGreaterThan(help.x1);
  });

  it('a running jump off the helping walkway clears the pit and lands on the floor before the tunnel', () => {
    const [help] = runsOf('2-1', '>');
    const against = runsOf('2-1', '<')[0];
    const w = createWorld({ mode: 'story', levelId: '2-1', abilities: { wallJump: true, blade: true } });
    w.hero.x = help.x0; w.hero.y = help.y - w.hero.h; w.hero.onGround = true;
    const f = { ...emptyFrame(), move: 1, jumpHeld: true };
    let jumped = false;
    for (let i = 0; i < 4 / DT && w.phase === 'play'; i++) {
      if (!jumped && w.hero.x + w.hero.w >= help.x1 + 0.6) { f.jumpPressed = true; jumped = true; }
      stepWorld(w, f, DT);
      if (jumped && w.hero.onGround) break;
    }
    expect(w.phase).toBe('play');
    expect(w.hero.onGround).toBe(true);
    expect(w.hero.x).toBeGreaterThan(help.x1 + 5);
    expect(w.hero.x + w.hero.w).toBeLessThan(against.x0);
  });

  it('holding right gets her through the tunnel against the walkway in under 4 s', () => {
    const against = runsOf('2-1', '<')[0];
    const w = createWorld({ mode: 'story', levelId: '2-1', abilities: { wallJump: true, blade: true } });
    w.hero.x = against.x0 - 1; w.hero.y = against.y - w.hero.h; w.hero.onGround = true;
    expect(runUntil(w, ww => ww.hero.x > against.x1 + 1, { move: 1 }, 4)).toBe(true);
  });

  it('the climb from the last walkway works the beginner way too', () => {
    const climbBelt = runsOf('2-1', '>')[1];
    const w = createWorld({ mode: 'story', levelId: '2-1', abilities: { wallJump: true, blade: true } });
    w.hero.x = climbBelt.x0; w.hero.y = climbBelt.y - w.hero.h; w.hero.onGround = true;
    const wallX = climbBelt.x1 + 1;
    const top = Math.min(...[...Array(ROWS).keys()].filter(y => solidAt(l, wallX, y)));
    expect(climb(w, 8, () => w.hero.onGround && w.hero.y + w.hero.h <= top + 1e-6)).toBe(true);
  });

  it('enemies: rolling suitcases and a PA drone, none before the shrine', () => {
    expect(new Set(l.enemies.map(e => e.kind))).toEqual(new Set(['doomCrawler', 'adDrone']));
    expect(l.enemies.every(e => e.x > shrine.x)).toBe(true);
  });

  it('the suitcases keep to their beats: none rolls up to a climb\'s top or out of the baggage room door', () => {
    const w = createWorld({ mode: 'story', levelId: '2-1', abilities: { wallJump: true, blade: true } });
    const bags = w.enemies.filter(e => e.kind === 'doomCrawler');
    expect(bags).toHaveLength(2);
    const seen = bags.map(e => ({ x0: e.x, x1: e.x + e.w, y: e.y }));
    for (const e of bags) e.active = true;
    // Park her far away and let them roll for a while.
    for (let i = 0; i < 20 / DT; i++) {
      w.hero.x = 2; w.hero.y = 12 - w.hero.h; w.hero.vx = 0; w.hero.vy = 0;
      stepWorld(w, emptyFrame(), DT);
      bags.forEach((e, k) => { seen[k].x0 = Math.min(seen[k].x0, e.x); seen[k].x1 = Math.max(seen[k].x1, e.x + e.w); });
    }
    const ceiling = (x: number, y: number) => [...Array(y).keys()].some(r => solidAt(l, x, r));
    bags.forEach((e, k) => {
      expect(e.y).toBeCloseTo(seen[k].y, 5);
      const feet = Math.round(e.y + e.h);
      const x = Math.floor(e.x);
      if (ceiling(x, feet - 1)) {
        // In the room: it never reaches the door, the first column without the food court over it.
        let door = x;
        while (ceiling(door, feet - 1)) door++;
        expect(seen[k].x1).toBeLessThan(door - 1);
      } else {
        // On the food court: it stays well clear of the edge she climbs over.
        let edge = x;
        while (solidAt(l, edge - 1, feet)) edge--;
        expect(seen[k].x0).toBeGreaterThan(edge + 4);
      }
    });
  });
});

describe('Story 2-2: Red-Eye', () => {
  const l = level('2-2');
  const descent = l.setPieces.find(p => p.kind === 'descent')!;
  const planes = l.setPieces.find(p => p.kind === 'planes')!;
  /** Columns from the start with the soft cloud floor under them. */
  let soft = 0;
  while (soft < l.cols && solidAt(l, soft, 13)) soft++;

  it('has no walkers (only storm cells fly here) and no shrine', () => {
    expect(charsOf('2-2', 'c')).toBe(0);
    expect(l.enemies.every(e => e.kind === 'adDrone')).toBe(true);
    expect(l.enemies.length).toBeGreaterThanOrEqual(3);
    expect(l.shrines).toEqual([]);
  });

  it('a soft cloud floor runs under the first half: no fall there is fatal, and every fall has a way back up', () => {
    expect(soft).toBeGreaterThanOrEqual(l.cols * 0.45);
    const r = reach(l, { ...CH2, graph: true });
    const g = r.graph!;
    const back = new Map<number, number[]>();
    for (const [a, b] of g.edges) (back.get(b) ?? back.set(b, []).get(b)!).push(a);
    const ok = new Set(g.goal);
    const queue = [...g.goal];
    while (queue.length) { const n = queue.pop()!; for (const p of back.get(n) ?? []) if (!ok.has(p)) { ok.add(p); queue.push(p); } }
    const stuck = g.nodes.filter(n => !ok.has(n)).map(g.cell).filter(c => c.x < soft);
    expect(stuck).toEqual([]);
  }, 30_000);

  it('thin clouds: first over the soft floor, then over open sky after the second checkpoint', () => {
    const puffs = runsOf('2-2', '~');
    expect(puffs.some(p => p.x1 < soft)).toBe(true);
    expect(puffs.some(p => p.x0 > l.checkpoints[1].x)).toBe(true);
    // The first is a bridge she can run across; it comes before any puff she has to hop to.
    expect(puffs[0].x1 - puffs[0].x0).toBeGreaterThanOrEqual(6);
  });

  it('running across the first thin cloud bridge gets her to the far side', () => {
    const bridge = runsOf('2-2', '~')[0];
    const w = createWorld({ mode: 'story', levelId: '2-2', abilities: { wallJump: true, blade: true } });
    w.hero.x = bridge.x0 - 3; w.hero.y = bridge.y - w.hero.h; w.hero.onGround = true;
    expect(runUntil(w, ww => ww.hero.x > bridge.x1 + 1, { move: 1 }, 3)).toBe(true);
    expect(w.hero.y + w.hero.h).toBeCloseTo(bridge.y, 5);
  });

  it('the climb over open sky works the beginner way, and a slip lands back on the cloud below', () => {
    // The tower that rises out of the void, and the low cloud in front of it.
    const tower = [...Array(l.cols).keys()].find(x => x > soft && [...Array(ROWS - 2).keys()].every(i => solidAt(l, x, i + 2)))!;
    expect(tower).toBeDefined();
    const below = [...Array(ROWS).keys()].find(y => solidAt(l, tower - 6, y))!;
    expect(below).toBeGreaterThanOrEqual(9);
    for (let x = tower - 3; x < tower; x++) expect(solidAt(l, x, below)).toBe(true);
    const w = createWorld({ mode: 'story', levelId: '2-2', abilities: { wallJump: true, blade: true } });
    w.enemies = [];
    // She has walked in under the hanging cloud, into the shaft.
    w.hero.x = tower - 2.5; w.hero.y = below - w.hero.h; w.hero.onGround = true;
    expect(climb(w, 8, () => w.hero.onGround && w.hero.y + w.hero.h <= 2 + 1e-6 && w.hero.x >= tower)).toBe(true);
  });

  it('Priority Boarding waits once, after the second checkpoint and before the last stretch', () => {
    expect(l.pickups.map(p => p.kind)).toEqual(['priorityBoarding']);
    const b = l.pickups[0];
    expect(b.x).toBeGreaterThan(l.checkpoints[1].x);
    expect(b.x).toBeLessThan(descent.x0);
    expect(descent.x0 - b.x).toBeLessThan(12);
  });

  it('ends with the descent down a long slope to the runway lights, planes in the far sky', () => {
    expect(descent.x1).toBeGreaterThanOrEqual(l.goal.x);
    expect(l.goal.x - descent.x0).toBeGreaterThanOrEqual(30);
    expect(planes.x0).toBeLessThanOrEqual(descent.x0);
    expect(planes.x1).toBeGreaterThanOrEqual(l.goal.x);
    // The slope: the floor under the descent only ever steps down.
    const tops = [...Array(l.goal.x - descent.x0).keys()].map(i => descent.x0 + i)
      .map(x => [...Array(ROWS).keys()].find(y => solidAt(l, x, y) && !solidAt(l, x, y - 1) && y > 6) ?? ROWS);
    for (let i = 1; i < tops.length; i++) expect(tops[i]).toBeGreaterThanOrEqual(tops[i - 1]);
    expect(tops[tops.length - 1] - tops[0]).toBeGreaterThanOrEqual(3);
  });

  it('memory a on the wing tip by a nav light, b on the tallest tower, c inside a cloud tower that only looks solid', () => {
    const [a, b, c] = l.memories;
    expect(l.decor.some(d => d.kind === 'wingLight' && Math.abs(d.x - a.x) <= 2 && Math.abs(d.y - 1 - a.y) <= 1)).toBe(true);
    expect(b.y).toBe(0);
    const tower = l.decor.find(d => d.kind === 'cloudTower' && c.x >= d.x && c.x <= d.x + 1 && c.y < d.y && c.y >= d.y - 3);
    expect(tower).toBeDefined();
  });
});

/**
 * A beginner on a wall: holds right the whole time, taps Jump from the floor
 * and again every time she touches a wall in the air. True when `done`.
 */
function climb(w: World, seconds: number, done: () => boolean): boolean {
  const f = { ...emptyFrame(), move: 1, jumpHeld: true };
  let wait = 0;
  for (let i = 0; i < seconds / DT; i++) {
    const h = w.hero;
    wait = Math.max(0, wait - DT);
    const onWall = !h.onGround && wallSide(h, w.solid, 0.05) !== 0;
    if (wait === 0 && (h.onGround || onWall)) { f.jumpPressed = true; wait = 0.15; }
    stepWorld(w, f, DT);
    if (w.phase !== 'play') return false;
    if (done()) return true;
  }
  return false;
}
