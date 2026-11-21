import { describe, it, expect } from 'vitest';
import { DECOR_BY_THEME, ROWS, TILE, isSolidTile, parseLevel, tileAt, type Level } from '@/components/apps/games/platformer/sim/level';
import { POWERS } from '@/components/apps/games/platformer/sim/powers';
import { createWorld, drainEvents, enterLevel, stepWorld, type World } from '@/components/apps/games/platformer/sim/world';
import { VEHICLE_SIZE, type VehicleDef } from '@/components/apps/games/platformer/sim/vehicles';
import { STORY, nextStoryId, storyEntry, storyLevelDef } from '@/components/apps/games/platformer/sim/story';
import { CAMPUS, type CampusId } from '@/components/apps/games/platformer/sim/story/campus';
import { emptyFrame, type InputFrame } from '@/components/apps/games/platformer/input/frame';
import { reach } from '../setup/platformerReach';
import { DT, custom, press, run, runUntil, worldOn } from '../setup/platformerWorld';

type Theme = Parameters<typeof custom>[1];
/** One row of scenery over a floor, as a 14 row level. */
const scenery = (theme: Theme, chars = 'T..N..U..H') => {
  const top = `.P..${chars}..L...........G....`;
  return custom([top, '#'.repeat(top.length)], theme);
};

describe('Chapter 3 level data: decor and lights per theme', () => {
  it('names scenery by theme: the campus, the library stacks, the tracks', () => {
    expect(DECOR_BY_THEME.campus).toEqual({ T: 'tree', N: 'lampPost', U: 'bench', H: 'bikeRack' });
    expect(DECOR_BY_THEME.library).toEqual({ T: 'ladder', N: 'studyLamp', U: 'studyTable', H: 'cart' });
    expect(DECOR_BY_THEME.tracks).toEqual({ T: 'gantry', N: 'stationLamp', U: 'bench' });
    expect(scenery('campus').decor.map(d => d.kind)).toEqual(['tree', 'lampPost', 'bench', 'bikeRack', 'neonSign']);
    expect(scenery('library').decor.map(d => d.kind)).toEqual(['ladder', 'studyLamp', 'studyTable', 'cart', 'neonSign']);
    expect(scenery('tracks', 'T..N..U...').decor.map(d => d.kind)).toEqual(['gantry', 'stationLamp', 'bench', 'neonSign']);
    expect(() => scenery('tracks')).toThrow(/H/);
  });

  it('lights a sign by theme: warm lamps on the campus, green and warm study lamps, amber and cold at the tracks', () => {
    const lightsOf = (theme: Theme) => Array.from({ length: 12 }, (_, i) => {
      const r = '.'.repeat(i + 2) + 'L' + '.'.repeat(30 - i - 3);
      const l = custom(['.P' + r.slice(2) + '....G', '#'.repeat(r.length + 5)], theme);
      return l.lights.find(li => li.x === l.decor[0].x + 0.5)!;
    });
    const table = (theme: Theme) => [...new Map(lightsOf(theme).map(l => [l.color, { color: l.color, flicker: l.flicker, r: l.r }])).values()]
      .sort((a, b) => a.color.localeCompare(b.color));
    expect(table('campus')).toEqual([{ color: '#ffcf8a', flicker: 0.03, r: 5 }, { color: '#fff1c2', flicker: 0.02, r: 4.5 }]);
    expect(table('library')).toEqual([{ color: '#9fe0a0', flicker: 0, r: 4.5 }, { color: '#ffd59a', flicker: 0.02, r: 5 }]);
    expect(table('tracks')).toEqual([{ color: '#bfe6ff', flicker: 0.04, r: 5 }, { color: '#ffb347', flicker: 0.05, r: 5 }]);
  });
});

describe('Wicked Fast (k): the dash recharges at once, so dashes chain', () => {
  /** A long open hall with a high ceiling, Wicked Fast at column 4. */
  const hall = (pickup = 'k') => worldOn(['.P..' + pickup + '.'.repeat(115), '#'.repeat(120), '#'.repeat(120)]);
  const dashes = (w: World) => drainEvents(w).filter(e => e.type === 'dash').length;
  /** High in the air at the top of the hall, falling, then three dash presses, each once the last dash (and its hit stop) is over. */
  const chain = (w: World) => {
    w.hero.x = 20; w.hero.y = 0.1; w.hero.vx = 0; w.hero.vy = 0; w.hero.onGround = false; w.hero.coyote = 0;
    drainEvents(w);
    for (let i = 0; i < 3; i++) {
      expect(w.hero.onGround).toBe(false);
      press(w, { dashPressed: true, move: 1 });
      run(w, 0.23);
    }
    return dashes(w);
  };

  it('is live, placed with k, and lasts 8 s', () => {
    expect(POWERS.wickedFast.live).toBe(true);
    expect(POWERS.wickedFast.duration).toBe(8);
    expect(hall().pickups).toEqual([{ kind: 'wickedFast', x: 4, y: 11, taken: false }]);
  });

  it('without it, one dash per jump: the second and third presses in the air do nothing', () => {
    const w = hall('.');
    expect(chain(w)).toBe(1);
  });

  it('while it runs, dash after dash in the air, each one as soon as the last is over', () => {
    const w = hall();
    run(w, 0.5, { move: 1 });
    expect(w.power?.kind).toBe('wickedFast');
    expect(chain(w)).toBe(3);
  });

  it('runs out after 8 s, and then the dash waits for the ground again', () => {
    const w = hall();
    run(w, 0.5, { move: 1 });
    run(w, 8, {}, ww => { ww.hero.vx = 0; });
    expect(w.power).toBeNull();
    expect(chain(w)).toBe(1);
  });
});

/** A world on hand-made rows (bottom aligned) with these vehicles. */
function laneWorld(rows: string[], vehicles: VehicleDef[], theme: Theme = 'tracks'): World {
  const w = createWorld({ rand: () => 0.5 });
  enterLevel(w, 0, custom(rows, theme, { vehicles }));
  drainEvents(w);
  return w;
}
const at = (w: World, t: number) => { run(w, t - w.t); return w; };

describe('Vehicles: the trolley and the trains run on lanes, on a timetable', () => {
  const W = 70;
  /** Street floor: top at row 12. */
  const floor = ['.P' + '.'.repeat(W - 2), '#'.repeat(W), '#'.repeat(W)];
  /** A trolley (6 x 2) on the street: roof at row 10, lane from column 10 to 49, right at 5 tiles/s. */
  const TROLLEY: VehicleDef = { kind: 'trolley', row: 10, x0: 10, x1: 49, speed: 5, dir: 1, gap: 2, offset: 0.5 };

  it('copies the level\'s vehicles through parseLevel, and builds one per lane in the world at its size', () => {
    const defs: VehicleDef[] = [TROLLEY, { ...TROLLEY, kind: 'orangeTrain', row: 6 }, { ...TROLLEY, kind: 'commuterTrain', row: 2, dir: -1 }];
    expect(custom(floor, 'tracks', { vehicles: defs }).vehicles).toEqual(defs);
    expect(custom(floor, 'tracks').vehicles).toEqual([]);
    const w = laneWorld(floor, defs);
    expect(w.vehicles.map(v => [v.kind, v.w, v.h, v.y])).toEqual([['trolley', 6, 2, 10], ['orangeTrain', 8, 2, 6], ['commuterTrain', 8, 2.5, 2]]);
  });

  it('waits off its lane until its offset, enters from the far side of the lane start, runs at its speed', () => {
    const w = laneWorld(floor, [TROLLEY]);
    const v = w.vehicles[0];
    at(w, 0.4);
    expect(v.active).toBe(false);
    at(w, 0.5 + 1);
    expect(v.active).toBe(true);
    expect(v.x).toBeCloseTo(10 - 6 + 5, 1);
    expect(v.vx).toBe(5);
    at(w, 0.5 + 3);
    expect(v.x).toBeCloseTo(10 - 6 + 15, 1);
  });

  it('leaves past the lane end, waits its gap, and runs again', () => {
    const w = laneWorld(floor, [TROLLEY]);
    const v = w.vehicles[0];
    // A run is the lane plus its own length: (40 + 6) / 5 = 9.2 s.
    at(w, 0.5 + 9.1);
    expect(v.active).toBe(true);
    expect(v.x).toBeGreaterThan(49);
    at(w, 0.5 + 9.3);
    expect(v.active).toBe(false);
    at(w, 0.5 + 11.1);
    expect(v.active).toBe(false);
    at(w, 0.5 + 11.2 + 1);
    expect(v.active).toBe(true);
    expect(v.x).toBeCloseTo(10 - 6 + 5, 1);
  });

  it('runs the other way with dir -1: in from past the lane end, out past its start', () => {
    const w = laneWorld(floor, [{ ...TROLLEY, dir: -1 }]);
    const v = w.vehicles[0];
    at(w, 0.5 + 1);
    expect(v.vx).toBe(-5);
    expect(v.x).toBeCloseTo(50 - 5, 1);
    at(w, 0.5 + 9.1);
    expect(v.active).toBe(true);
    expect(v.x + v.w).toBeCloseTo(10.5, 1);
    at(w, 0.5 + 9.3);
    expect(v.active).toBe(false);
  });

  it('keeps its timetable whatever she does: the same times give the same places', () => {
    const a = laneWorld(floor, [TROLLEY]);
    const b = laneWorld(floor, [TROLLEY]);
    run(a, 6, { move: 1 });
    run(b, 3, { move: -1, jumpPressed: true, jumpHeld: true });
    run(b, 3);
    expect(b.vehicles).toEqual(a.vehicles);
  });
});

describe('Vehicles: riding the roof', () => {
  const W = 70;
  /** Street floor: top at row 12. */
  const floor = ['.P' + '.'.repeat(W - 2), '#'.repeat(W), '#'.repeat(W)];
  const TROLLEY: VehicleDef = { kind: 'trolley', row: 10, x0: 10, x1: 49, speed: 5, dir: 1, gap: 2, offset: 0 };
  /** Stand her on the floor at column x (feet on row 12). */
  const standAt = (w: World, x: number) => { w.hero.x = x + 0.16; w.hero.y = 12 - w.hero.h; w.hero.vx = 0; w.hero.vy = 0; w.hero.onGround = true; };

  it('the roof is one-way: a jump from the street goes up through the body and lands on the roof', () => {
    const w = laneWorld(floor, [TROLLEY]);
    const v = w.vehicles[0];
    standAt(w, 20);
    // Wait until the trolley is right over her, then jump and hold.
    expect(runUntil(w, ww => ww.vehicles[0].x > 16, {}, 6)).toBe(true);
    run(w, 1.2, { jumpPressed: true, jumpHeld: true });
    expect(w.riding).toBe(v);
    expect(w.hero.y + w.hero.h).toBeCloseTo(10, 5);
  });

  it('carries her at its speed while she stands still', () => {
    const w = laneWorld(floor, [TROLLEY]);
    const v = w.vehicles[0];
    run(w, 3);
    w.hero.x = v.x + 1; w.hero.y = 10 - w.hero.h - 0.1; w.hero.vy = 0; w.hero.onGround = false;
    run(w, 0.1);
    expect(w.riding).toBe(v);
    const x0 = w.hero.x, rel = w.hero.x - v.x;
    run(w, 1);
    expect(w.hero.x - x0).toBeCloseTo(5, 1);
    expect(w.hero.x - v.x).toBeCloseTo(rel, 5);
    expect(w.hero.onGround).toBe(true);
  });

  it('the body is not solid and never hurts: she walks through a trolley coming at her', () => {
    const w = laneWorld(floor, [{ ...TROLLEY, dir: -1 }]);
    standAt(w, 8);
    let hurt = false;
    run(w, 4, { move: 1 }, ww => { if (drainEvents(ww).some(e => e.type === 'hurt' || e.type === 'die')) hurt = true; });
    expect(hurt).toBe(false);
    expect(w.phase).toBe('play');
    expect(w.hero.x).toBeGreaterThan(8 + 4 * 6);
  });

  it('when it leaves the lane she lets go and drops to the floor below', () => {
    const w = laneWorld(floor, [TROLLEY]);
    run(w, 6);
    const v = w.vehicles[0];
    w.hero.x = v.x + 1; w.hero.y = 10 - w.hero.h - 0.1; w.hero.vy = 0; w.hero.onGround = false;
    expect(runUntil(w, ww => !ww.vehicles[0].active, {}, 6)).toBe(true);
    run(w, 0.6);
    expect(w.riding).toBeNull();
    expect(w.phase).toBe('play');
    expect(w.hero.y + w.hero.h).toBeCloseTo(12, 5);
    // No jump in where the trolley parked.
    expect(w.hero.x).toBeGreaterThan(48);
  });
});

describe('Signals (s): green for 1 s before a vehicle reaches them', () => {
  const W = 70;
  /** Two lanes: a train at row 9 running right from column 10, and one at row 4 running left. A signal by each. */
  const rows = [
    '.'.repeat(W),
    '.'.repeat(30) + 's' + '.'.repeat(W - 31),
    '.'.repeat(W), '.'.repeat(W), '.'.repeat(W), '.'.repeat(W),
    '.'.repeat(25) + 's' + '.'.repeat(W - 26),
    '.P' + '.'.repeat(W - 2), '#'.repeat(W), '#'.repeat(W),
  ];
  const LOW: VehicleDef = { kind: 'orangeTrain', row: 9, x0: 10, x1: 49, speed: 5, dir: 1, gap: 3, offset: 0 };
  const HIGH: VehicleDef = { kind: 'commuterTrain', row: 4, x0: 10, x1: 49, speed: 4, dir: -1, gap: 3, offset: 2 };

  it('lists every signal in goal order, red at the start, each watching the nearest lane over its column', () => {
    const w = laneWorld(rows, [LOW, HIGH]);
    expect(w.signals).toEqual([{ x: 25, y: 10, green: false, watch: [0] }, { x: 30, y: 5, green: false, watch: [1] }]);
  });

  it('turns green 1 s before the front reaches it, red again as it arrives and while it passes', () => {
    const w = laneWorld(rows, [LOW, HIGH]);
    const low = w.signals[0];
    // The low train's front reaches column 25 at (25 - 10) / 5 = 3 s.
    at(w, 1.95);
    expect(low.green).toBe(false);
    at(w, 2.05);
    expect(low.green).toBe(true);
    at(w, 2.95);
    expect(low.green).toBe(true);
    expect(w.vehicles[0].x + w.vehicles[0].w).toBeLessThan(25);
    at(w, 3.05);
    expect(low.green).toBe(false);
    expect(w.vehicles[0].x + w.vehicles[0].w).toBeGreaterThan(25);
    at(w, 4);
    expect(low.green).toBe(false);
  });

  it('runs to the timetable every lap, and a lane running left counts its front from the right', () => {
    const w = laneWorld(rows, [LOW, HIGH]);
    const greens: number[][] = [[], []];
    const was = [false, false];
    run(w, 40, {}, ww => ww.signals.forEach((sg, i) => { if (sg.green && !was[i]) greens[1 - i].push(ww.t); was[i] = sg.green; }));
    const near = (got: number[], want: number[]) => {
      expect(got).toHaveLength(want.length);
      got.forEach((t, i) => expect(Math.abs(t - want[i])).toBeLessThanOrEqual(DT * 1.01));
    };
    // Low: period (40 + 8) / 5 + 3 = 12.6 s, green at 2, 14.6, 27.2, 39.8.
    near(greens[1], [2, 14.6, 27.2, 39.8]);
    // High: offset 2, front reaches the right edge of column 30 after (49 - 30) / 4 = 4.75 s; period 48 / 4 + 3 = 15 s.
    near(greens[0], [5.75, 20.75, 35.75]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The levels
// ─────────────────────────────────────────────────────────────────────────────

const IDS: CampusId[] = ['3-1', '3-2', '3-3'];
const level = (id: CampusId) => parseLevel(CAMPUS[id]);
/** Chapter 3 moves: run, jump, double jump, the blade, the wall jump, the dash (3-1 only after its shrine). Never a power. */
const CH3 = { dash: true, wallJump: true, doubleJump: true, smash: true } as const;
const NO_DASH = { dash: false, wallJump: true, doubleJump: true } as const;
const memBoxes = (l: Level) => l.memories.map(m => ({ x: m.x + 0.1, y: m.y + 0.1, w: 0.8, h: 0.8 }));
const solidAt = (l: Level, x: number, y: number) => isSolidTile(tileAt(l.tiles, l.cols, x, y));
/** The top of the floor under column x at or below row `from`, ROWS when there is none. */
const floorBelow = (l: Level, x: number, from: number) => { let y = from; while (y < ROWS && !solidAt(l, x, y)) y++; return y; };
/** Columns where a run of `ch` starts and ends on a row. */
function runsOf(id: CampusId, ch: string): { y: number; x0: number; x1: number }[] {
  const out: { y: number; x0: number; x1: number }[] = [];
  CAMPUS[id].rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if (r[x] !== ch || r[x - 1] === ch) continue;
      let x1 = x;
      while (r[x1 + 1] === ch) x1++;
      out.push({ y, x0: x, x1 });
    }
  });
  return out;
}
const storyWorld = (id: CampusId) => {
  const w = createWorld({ mode: 'story', levelId: id, abilities: { wallJump: true, dash: true, blade: true } });
  drainEvents(w);
  return w;
};
/** Stand her still at column x with her feet on row `feet` (the top of the floor there). */
function standAt(w: World, x: number, feet: number) {
  expect(solidAt(w.level, x, feet) && !solidAt(w.level, x, feet - 1) && !solidAt(w.level, x, feet - 2), `floor at ${x}, ${feet}`).toBe(true);
  w.hero.x = x + (1 - w.hero.w) / 2; w.hero.y = feet - w.hero.h; w.hero.vx = 0; w.hero.vy = 0; w.hero.onGround = true;
  w.cam.look = 0;
}
/** Step with a frame for `seconds`, collecting deaths. */
function play(w: World, seconds: number, f: Partial<InputFrame> = {}, each?: (w: World) => void): number {
  const frame = { ...emptyFrame(), ...f };
  let deaths = 0;
  for (let i = 0; i < seconds / DT; i++) {
    stepWorld(w, frame, DT);
    frame.jumpPressed = false; frame.dashPressed = false;
    for (const e of drainEvents(w)) if (e.type === 'die') deaths++;
    each?.(w);
  }
  return deaths;
}

describe('Story: chapter 3 is built, chapters 4 to 6 wait their turn', () => {
  it('3-1 Huntington Avenue, 3-2 Snell After Midnight and 3-3 Over the Tracks follow the trip', () => {
    expect(STORY.filter(s => s.built).map(s => s.id)).toEqual(['1-1', '1-2', '1-3', '2-1', '2-2', '3-1', '3-2', '3-3']);
    expect(IDS.map(id => [storyEntry(id).name, storyEntry(id).theme, storyEntry(id).world])).toEqual([
      ['Huntington Avenue', 'campus', 3], ['Snell After Midnight', 'library', 3], ['Over the Tracks', 'tracks', 3],
    ]);
    expect(nextStoryId('2-2')).toBe('3-1');
    expect(nextStoryId('3-3')).toBe('4-1');
    for (const id of IDS) expect(storyLevelDef(id)).toBe(CAMPUS[id]);
  });

  it('Boston nights, Jamaica Plain, the concert and the season boss are placeholders, in that order', () => {
    expect(STORY.filter(s => !s.built).map(s => [s.id, s.world, s.name])).toEqual([
      ['4-1', 4, 'Newbury Street'], ['4-2', 4, 'The Charles'], ['4-3', 4, 'Seaport Sunrise'], ['4-4', 4, 'Revere Beach'],
      ['4-boss', 4, 'The Ex-Bestie'], ['5-1', 5, 'Jamaica Pond'], ['5-2', 5, 'Home'], ['6-1', 6, 'The Headliner'],
      ['season-boss', 7, 'Job Hunting'],
    ]);
    expect(storyEntry('4-boss').cardId).toBe('card-boss');
    expect(storyEntry('5-2').cardId).toBe('card-5-2');
    expect(() => storyLevelDef('4-1')).toThrow(/not built/);
  });

  it('createWorld loads each level under its sky, with its memories named by level', () => {
    const w = storyWorld('3-1');
    expect([w.level.theme, w.level.sky, w.level.name]).toEqual(['campus', 'night', 'Huntington Avenue']);
    expect(w.memories.map(m => m.id)).toEqual(['3-1-a', '3-1-b', '3-1-c']);
    expect(createWorld({ mode: 'story', levelId: '3-1', abilities: { wallJump: true, blade: true } }).shrines.map(q => [q.ability, q.taken])).toEqual([['dash', false]]);
    expect([storyWorld('3-2').level.sky, storyWorld('3-3').level.sky]).toEqual(['night', 'lateNight']);
    expect(storyWorld('3-3').vehicles.length).toBe(CAMPUS['3-3'].vehicles!.length);
  });
});

describe('Story: chapter 3 levels, the shared rules', () => {
  for (const id of IDS) {
    describe(id, () => {
      const l = level(id);
      it('is 14 rows and 180 to 240 columns, with a goal beacon on the right', () => {
        expect(CAMPUS[id].rows).toHaveLength(ROWS);
        expect(l.cols).toBeGreaterThanOrEqual(180);
        expect(l.cols).toBeLessThanOrEqual(240);
        expect(l.goal.kind).toBe('beacon');
        expect(l.goalDir).toBe(1);
      });

      it('has three memories and two checkpoints at the thirds', () => {
        expect(l.memories).toHaveLength(3);
        expect(l.checkpoints).toHaveLength(2);
        const span = l.goal.x - l.start.x;
        l.checkpoints.forEach((c, i) => expect(Math.abs(c.x - (l.start.x + (span * (i + 1)) / 3))).toBeLessThan(span * 0.12));
      });

      it('can be finished, and every memory found, with the chapter\'s moves and no power', () => {
        expect(l.pickups.every(p => p.kind === 'wickedFast')).toBe(true);
        const r = reach(l, { ...CH3, targets: memBoxes(l) });
        expect(r.reached).toBe(true);
        expect(r.touched).toEqual([true, true, true]);
      }, 30_000);

      it('Wicked Fast waits once in every level after 3-1, never in 3-1', () => {
        expect(l.pickups).toHaveLength(id === '3-1' ? 0 : 1);
      });
    });
  }
});

describe('Story 3-1: Huntington Avenue', () => {
  const l = level('3-1');
  const shrine = l.shrines[0];
  const prompt = l.setPieces.find(p => p.kind === 'prompt')!;
  const firstGap = runsOf('3-1', '=').filter(r => r.y === 9).map(r => r.x1 + 1).find(x => x > shrine.x)!;
  const panels = runsOf('3-1', '%');

  it('has the dash shrine on the Common: lawn all round, nothing to fall into, no enemy near', () => {
    expect(CAMPUS['3-1'].shrine).toBe('dash');
    expect(l.shrines).toHaveLength(1);
    for (let x = shrine.x - 10; x <= shrine.x + 10; x++) expect(solidAt(l, x, shrine.y + 1), `column ${x}`).toBe(true);
    expect(l.enemies.filter(e => Math.abs(e.x - shrine.x) < 30)).toEqual([]);
    expect(l.enemies.every(e => e.x > shrine.x)).toBe(true);
  });

  it('nothing before the shrine needs the dash; memory a is on the Common by it', () => {
    const shrineBox = { x: shrine.x + 0.1, y: shrine.y - 1, w: 0.8, h: 2 };
    const without = reach(l, { ...NO_DASH, targets: [...memBoxes(l), shrineBox] });
    expect(without.touched[0]).toBe(true);
    expect(without.touched[3]).toBe(true);
    expect(Math.abs(l.memories[0].x - shrine.x)).toBeLessThan(8);
    const key = (s: { x: number; y: number }) => s.x * ROWS + s.y;
    const plain = new Set(without.stands.map(key));
    const extra = reach(l, { ...CH3, targets: memBoxes(l) }).stands.filter(s => s.x <= shrine.x && !plain.has(key(s)));
    expect(extra).toEqual([]);
  });

  it('the dash prompt sits right after the shrine, over the first gap in the covered walkway, with soft lawn under it', () => {
    expect(prompt.id).toBe('dash');
    expect(prompt.x0 - shrine.x).toBeGreaterThan(0);
    expect(prompt.x0 - shrine.x).toBeLessThan(30);
    expect(prompt.x1).toBeGreaterThanOrEqual(firstGap);
    // Low ceiling over the walkway: no room for a jump, so the dash is the way across.
    for (let x = firstGap - 3; x <= firstGap + 3; x++) expect(solidAt(l, x, 6), `ceiling at ${x}`).toBe(true);
    for (let x = firstGap; x < firstGap + 3; x++) expect(floorBelow(l, x, 10), `lawn at ${x}`).toBe(12);
  });

  it('a beginner who runs and taps Dash anywhere in the last one and a half tiles before the first gap gets across', () => {
    const far = floorBelow(l, firstGap + 3, 8);
    expect(far).toBe(10);
    for (const before of [0.1, 0.5, 0.9, 1.3, 1.6]) {
      const w = storyWorld('3-1');
      standAt(w, firstGap - 8, 9);
      let dashed = false;
      const f = { ...emptyFrame(), move: 1 };
      for (let i = 0; i < 2 / DT; i++) {
        if (!dashed && w.hero.x + w.hero.w >= firstGap - before) { f.dashPressed = true; dashed = true; }
        stepWorld(w, f, DT);
        f.dashPressed = false;
        if (w.hero.x > firstGap + 3 && w.hero.onGround) break;
      }
      expect(w.hero.onGround, `dash ${before} before the edge`).toBe(true);
      expect(w.hero.y + w.hero.h, `dash ${before} before the edge`).toBeCloseTo(far, 5);
      expect(w.hero.x).toBeGreaterThan(firstGap + 3);
    }
  });

  it('a miss lands soft on the lawn, and she gets back up and on', () => {
    expect(floorBelow(l, firstGap + 1, 9)).toBe(12);
    expect(reach(l, { ...CH3, from: { x: firstGap + 1, y: 11 } }).reached).toBe(true);
  });

  it('the construction panel in the hall passage is the one thing that needs the dash, and a running dash breaks it', () => {
    const main = panels.find(p => p.y < 9)!;
    expect(main).toBeDefined();
    expect(reach(l, { ...NO_DASH, generous: true }).reached).toBe(false);
    expect(reach(l, { ...CH3, smash: false, generous: true }).maxX).toBeLessThan(main.x0);
    const w = storyWorld('3-1');
    standAt(w, main.x0 - 6, 9);
    let done = false;
    const f = { ...emptyFrame(), move: 1 };
    for (let i = 0; i < 3 / DT && !done; i++) {
      if (w.hero.x + w.hero.w > main.x0 - 2.5 && w.hero.dashT <= 0 && tileAt(w.tiles, w.level.cols, main.x0, main.y) === TILE.CRACK) f.dashPressed = true;
      stepWorld(w, f, DT);
      f.dashPressed = false;
      done = w.hero.x > main.x0 + 2;
    }
    expect(done).toBe(true);
    for (let y = 6; y <= 8; y++) expect(tileAt(w.tiles, w.level.cols, main.x0, y)).toBe(TILE.EMPTY);
  });

  it('memory c waits in a closed room behind a second panel', () => {
    const c = l.memories[2];
    const r = reach(l, { ...CH3, smash: false, generous: true, targets: memBoxes(l) });
    expect(r.touched[2]).toBe(false);
    expect(panels.some(p => p.y === c.y || p.y === c.y - 1)).toBe(true);
  });

  it('the twist: two trolleys on the median, over a dug-up trench only a trolley crosses', () => {
    const defs = CAMPUS['3-1'].vehicles!;
    expect(defs.map(d => d.kind)).toEqual(['trolley', 'trolley']);
    expect(reach(l, { ...CH3, vehicles: false, generous: true }).reached).toBe(false);
    // Memory b hangs over the middle of the trench: an ordinary jump cannot get there, a rider passes through it.
    expect(reach(l, { ...CH3, vehicles: false, targets: memBoxes(l) }).touched[1]).toBe(false);
    const b = l.memories[1];
    expect(b.y).toBe(defs[0].row - 1);
    expect(floorBelow(l, b.x, b.y)).toBe(ROWS);
  });

  it('a beginner waits at the stop for the green signal, jumps on, rides, and is set down past the trench', () => {
    const sg = l.signals[0];
    for (const reaction of [0.25, 0.5, 0.8]) {
      const w = storyWorld('3-1');
      w.enemies = [];
      standAt(w, sg.x - 1, 11);
      expect(runUntil(w, ww => ww.signals[0].green, {}, 12)).toBe(true);
      expect(play(w, reaction)).toBe(0);
      let rode = false;
      expect(play(w, 0.5, { jumpPressed: true, jumpHeld: true }, ww => { if (ww.riding) rode = true; })).toBe(0);
      expect(play(w, 9, {}, ww => { if (ww.riding) rode = true; })).toBe(0);
      expect(rode, `reaction ${reaction}`).toBe(true);
      expect(w.phase).toBe('play');
      expect(w.hero.onGround).toBe(true);
      expect(w.hero.x, `reaction ${reaction}`).toBeGreaterThan(201);
    }
  }, 30_000);

  it('a jump at the stop at any moment is harmless: on a trolley, or back on the stop', () => {
    const sg = l.signals[0];
    for (let t = 0; t < 10; t += 0.7) {
      const w = storyWorld('3-1');
      w.enemies = [];
      standAt(w, sg.x - 1, 11);
      play(w, t);
      expect(play(w, 0.4, { jumpPressed: true, jumpHeld: true }) + play(w, 10), `jump at ${t} s`).toBe(0);
      expect(w.hero.onGround).toBe(true);
    }
  }, 30_000);
});

describe('Story 3-2: Snell After Midnight', () => {
  const l = level('3-2');

  it('soft carpet everywhere: a floor under every column, so no fall is fatal, and every fall has a way back', () => {
    for (let x = 0; x < l.cols; x++) expect(solidAt(l, x, 13), `column ${x}`).toBe(true);
    const r = reach(l, { ...CH3, graph: true });
    const g = r.graph!;
    const back = new Map<number, number[]>();
    for (const [a, b] of g.edges) (back.get(b) ?? back.set(b, []).get(b)!).push(a);
    const ok = new Set(g.goal);
    const queue = [...g.goal];
    while (queue.length) { const n = queue.pop()!; for (const p of back.get(n) ?? []) if (!ok.has(p)) { ok.add(p); queue.push(p); } }
    expect(g.nodes.filter(n => !ok.has(n)).map(g.cell)).toEqual([]);
  }, 30_000);

  it('quiet: one ticket drone at most, no walkers', () => {
    expect(l.enemies.length).toBeLessThanOrEqual(1);
    expect(l.enemies.every(e => e.kind === 'adDrone')).toBe(true);
  });

  it('rolling ladders ride over the gaps; memory b sits on top of the highest one', () => {
    expect(l.platforms.filter(p => p.axis === 'x').length).toBeGreaterThanOrEqual(3);
    const top = [...l.platforms].sort((a, b) => a.y - b.y)[0];
    const b = l.memories[1];
    expect(b.y).toBe(top.y - 1);
    expect(b.x).toBeGreaterThanOrEqual(top.x - 3);
    expect(b.x).toBeLessThanOrEqual(top.x + top.w + 2);
  });

  it('memory a is on a study table; c is in a nook under the floor, off the path', () => {
    const [a, , c] = l.memories;
    expect(l.decor.some(d => d.kind === 'studyTable' && d.x === a.x && d.y === a.y + 2)).toBe(true);
    expect(solidAt(l, c.x, c.y - 2)).toBe(true);
    expect(solidAt(l, c.x + 1, c.y)).toBe(true);
  });

  it('Wicked Fast waits on the top floor before the atrium; the goal is the top floor window', () => {
    const k = l.pickups[0];
    const atrium = Math.max(...runsOf('3-2', '=').filter(r => r.y === 8).map(r => r.x1));
    expect(k.x).toBeLessThan(atrium);
    expect(k.y).toBeLessThanOrEqual(3);
    expect(l.goal.top).toBeLessThanOrEqual(2);
  });

  it('the atrium: stack towers with suspended map cases between them, a skylight beam over the first gap', () => {
    const atrium = Math.max(...runsOf('3-2', '=').filter(r => r.y === 8).map(r => r.x1));
    const hanging = runsOf('3-2', 'X').filter(r => r.x0 > atrium);
    expect(new Set(runsOf('3-2', 'X').filter(r => r.x0 > atrium).map(r => r.x0)).size).toBeGreaterThanOrEqual(3);
    expect(hanging.length).toBeGreaterThan(0);
  });
});

describe('Story 3-3: Over the Tracks', () => {
  const l = level('3-3');
  const defs = CAMPUS['3-3'].vehicles!;

  it('needs the trains: without them she never leaves the first platform', () => {
    expect(reach(l, { ...CH3, vehicles: false, generous: true }).reached).toBe(false);
  });

  it('two tracks: Orange Line trains below running right, commuter trains above running left', () => {
    expect(new Set(defs.filter(d => d.kind === 'orangeTrain').map(d => [d.row, d.dir].join()))).toEqual(new Set(['10,1']));
    expect(new Set(defs.filter(d => d.kind === 'commuterTrain').map(d => [d.row, d.dir].join()))).toEqual(new Set(['6,-1']));
  });

  it('every lane ends over a floor: a rider who does nothing is set down safe', () => {
    for (const d of defs) {
      const { w } = VEHICLE_SIZE[d.kind];
      const span = d.dir > 0 ? [d.x1 + 1, d.x1 + w] : [d.x0 - w, d.x0 - 1];
      for (let x = span[0]; x <= span[1]; x++) expect(floorBelow(l, x, d.row + 1), `${d.kind} lane end at ${x}`).toBeLessThan(ROWS);
    }
  });

  it('a signal waits by every place she boards', () => {
    expect(l.signals.length).toBeGreaterThanOrEqual(4);
    for (const s of l.signals) expect(storyWorld('3-3').signals.find(x => x.x === s.x)!.watch.length).toBeGreaterThan(0);
  });

  it('a beginner waits by the first signal for green, then jumps: the train takes her across to the next platform', () => {
    const sg = l.signals[0];
    for (const reaction of [0.25, 0.5, 0.8, 1.1]) {
      const w = storyWorld('3-3');
      w.enemies = [];
      standAt(w, sg.x - 1, 11);
      expect(runUntil(w, ww => ww.signals[0].green, {}, 20)).toBe(true);
      expect(play(w, reaction)).toBe(0);
      expect(play(w, 0.5, { jumpPressed: true, jumpHeld: true })).toBe(0);
      expect(play(w, 12)).toBe(0);
      expect(w.hero.onGround, `reaction ${reaction}`).toBe(true);
      expect(w.hero.x, `reaction ${reaction}`).toBeGreaterThan(l.checkpoints[0].x - 15);
    }
  }, 30_000);

  it('on the first platform a jump at any moment is safe: she lands on a train or back on the platform', () => {
    const sg = l.signals[0];
    for (const x of [sg.x - 10, sg.x - 1, sg.x + 2]) {
      for (let t = 0; t < 15; t += 1.25) {
        const w = storyWorld('3-3');
        w.enemies = [];
        standAt(w, x, 11);
        play(w, t);
        const deaths = play(w, 0.4, { jumpPressed: true, jumpHeld: true }) + play(w, 14);
        expect(deaths, `jump at ${t} s from column ${x}`).toBe(0);
        expect(w.hero.onGround).toBe(true);
      }
    }
  }, 60_000);

  it('the twist: the high stop on the island, the commuter train back over the trench to the canopy, then up onto the footbridge', () => {
    const w = storyWorld('3-3');
    w.enemies = [];
    const stop = l.signals.find(s => s.y < 9 && s.x > l.checkpoints[1].x)!;
    standAt(w, stop.x - 1, 6);
    let rode = false;
    expect(play(w, 20, {}, ww => { if (ww.riding) rode = true; })).toBe(0);
    expect(rode).toBe(true);
    // The commuter train set her down on the canopy, under the open sky by the footbridge stairs.
    expect(w.hero.onGround).toBe(true);
    expect(w.hero.y + w.hero.h).toBeCloseTo(6, 5);
    expect(w.hero.x).toBeLessThan(stop.x - 30);
  }, 30_000);

  it('memory a on the station platform, b on the signal gantry over the trench, c on a ledge under the footbridge', () => {
    const [a, b, c] = l.memories;
    expect(floorBelow(l, a.x, a.y)).toBe(a.y + 1);
    expect(tileAt(l.tiles, l.cols, b.x, b.y + 1)).toBe(TILE.ONEWAY);
    expect(floorBelow(l, b.x, b.y + 2)).toBe(ROWS);
    expect([...Array(c.y).keys()].some(y => solidAt(l, c.x, y))).toBe(true);
    expect(solidAt(l, c.x, c.y + 1)).toBe(true);
  });
});
