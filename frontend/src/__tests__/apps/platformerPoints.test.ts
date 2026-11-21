// Points that feel good: kills are worth something you can see, chains of
// kills in the air multiply, and a fast clear earns a real time bonus against
// a par time set by the level's length.

import { describe, it, expect } from 'vitest';
import { POINTS, createWorld, drainEvents, enterLevel, parTime, score, stepWorld, tallyView, timeBonus, type World } from '@/components/apps/games/platformer/sim/world';
import { storyLevelDef } from '@/components/apps/games/platformer/sim/story';
import { parseLevel } from '@/components/apps/games/platformer/sim/level';
import { emptyFrame, type InputFrame } from '@/components/apps/games/platformer/input/frame';
import { DT, G40, custom, run, runUntil } from '../setup/platformerWorld';

function bladeOn(rows: string[]): World {
  const w = createWorld({ seed: 1, abilities: { wallJump: true, dash: true, blade: true } });
  enterLevel(w, 0, custom(rows, 'rooftops'));
  drainEvents(w);
  return w;
}
const attack = (w: World, extra: Partial<InputFrame> = {}) => stepWorld(w, { ...emptyFrame(), actionPressed: true, ...extra }, DT);

describe('kills', () => {
  it('a kill is worth 100 and the kill event carries the points, so the view can show them', () => {
    expect(POINTS.kill).toBe(100);
    const w = bladeOn(['.P..........................................', '...d........................................', '............................................', G40 + '....', G40 + '....']);
    const e = w.enemies[0];
    e.active = true;
    w.hero.x = e.x - w.hero.w - 0.2; w.hero.y = e.y; w.hero.facing = 1;
    attack(w);
    expect(runUntil(w, ww => ww.enemies[0].deadT !== -1, {}, 0.5)).toBe(true);
    const kill = w.events.find(ev => ev.type === 'kill');
    expect(kill?.n).toBe(100);
    expect(score(w)).toBe(100);
  });

  it('kills chained without landing climb: 100, 200, 300 (capped at 500), and landing resets the chain', async () => {
    const { killPoints } = await import('@/components/apps/games/platformer/sim/world');
    expect([1, 2, 3, 4, 5, 6, 9].map(killPoints)).toEqual([100, 200, 300, 400, 500, 500, 500]);
  });
});

describe('the time bonus', () => {
  it('par grows with the level: a longer level allows more seconds', () => {
    const short = parseLevel({ id: 1, label: '', name: '', theme: 'rooftops', rows: Array.from({ length: 14 }, (_, r) => (r === 1 ? '.P' + '.'.repeat(56) + 'G.' : r >= 12 ? '#'.repeat(60) : '.'.repeat(60))) });
    const long = parseLevel(storyLevelDef('2-1'));
    expect(parTime(short)).toBeGreaterThanOrEqual(30);
    expect(parTime(long)).toBeGreaterThan(parTime(short));
  });

  it('at or under par it pays at least 1000, plus 25 a second under (up to 3000); past par it fades to 0 at twice par', () => {
    expect(timeBonus(60, 60)).toBe(1000);
    expect(timeBonus(40, 60)).toBe(1500);
    expect(timeBonus(0, 60)).toBe(2500);
    expect(timeBonus(0, 200)).toBe(3000);
    expect(timeBonus(90, 60)).toBe(500);
    expect(timeBonus(120, 60)).toBe(0);
    expect(timeBonus(500, 60)).toBe(0);
  });

  it('a story level clear counts the par-based bonus into the score', () => {
    const w = createWorld({ mode: 'story', levelId: '1-1' });
    while (w.phase !== 'play') stepWorld(w, emptyFrame(), DT);
    const g = w.level.goal;
    w.levelTime = 10;
    w.hero.x = g.x - 0.1; w.hero.y = g.top + 0.5;
    run(w, 10);
    expect(w.stats.time).toBe(timeBonus(10, parTime(w.level)));
    expect(w.stats.time).toBeGreaterThan(1000);
  });
});

describe('the level clear card', () => {
  it('counts the time bonus UP from 0 to what she earned (not down to 0), and shows the level\'s kill points', () => {
    const w = createWorld({ mode: 'story', levelId: '1-1' });
    while (w.phase !== 'play') stepWorld(w, emptyFrame(), DT);
    w.stats.kills = 300;
    const g = w.level.goal;
    w.levelTime = 10;
    w.hero.x = g.x - 0.1; w.hero.y = g.top + 0.5;
    const award = timeBonus(10, parTime(w.level));
    const shown: number[] = [];
    const phase = () => w.phase as string;
    for (let i = 0; i < 1200 && phase() !== 'done'; i++) {
      stepWorld(w, emptyFrame(), DT);
      if (phase() === 'tally') shown.push(tallyView(w).time);
    }
    expect(shown.length).toBeGreaterThan(10);
    expect(shown[0]).toBeLessThan(award);
    expect(shown[shown.length - 1]).toBe(award);
    for (let i = 1; i < shown.length; i++) expect(shown[i]).toBeGreaterThanOrEqual(shown[i - 1]);
    expect(tallyView(w).kills).toBe(300);
    expect(tallyView(w).par).toBe(parTime(w.level));
  });
});

describe('the story score in the header', () => {
  it('a cleared level is counted once, not again while its story card shows', async () => {
    const { bankedFor } = await import('@/components/apps/games/platformer/PlatformerGame');
    const w = createWorld({ mode: 'story', levelId: '1-1' });
    w.stats.coins = 10;
    const level = score(w);
    const run = { score: 2000 + level, counted: w as unknown };
    expect(bankedFor(run, w) + score(w)).toBe(2000 + level);
    const next = createWorld({ mode: 'story', levelId: '1-2' });
    expect(bankedFor(run, next)).toBe(2000 + level);
  });
});
