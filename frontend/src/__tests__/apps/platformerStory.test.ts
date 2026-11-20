import { describe, it, expect } from 'vitest';
import { DYING_SECONDS, LIVES, POINTS, createWorld, drainEvents, enterLevel, score, scoreOf, type World } from '@/components/apps/games/platformer/sim/world';
import { G40, custom, run, runUntil } from '../setup/platformerWorld';

/** A hand-made level played under story rules. */
function storyOn(rows: string[]): World {
  const w = createWorld({ seed: 1 });
  w.mode = 'story';
  w.levelId = '1-1';
  enterLevel(w, 0, custom(rows, 'rooftops'));
  drainEvents(w);
  return w;
}

const PIT = ['.P.......K..............................', '##################......################', '##################......################'];

describe('Main Character story rules', () => {
  it('no lives and no game over: every death respawns, however many', () => {
    const w = storyOn(['.P.....^^...............................', G40, G40]);
    for (let i = 0; i < LIVES + 3; i++) {
      expect(runUntil(w, ww => ww.phase === 'dying', { move: 1 }, 3)).toBe(true);
      run(w, DYING_SECONDS + 0.2);
      expect(w.phase).toBe('play');
    }
    expect(w.stats.deaths).toBe(LIVES + 3);
    expect(w.result).toBeNull();
  });

  it('a death respawns at the last checkpoint reached', () => {
    const w = storyOn(PIT);
    expect(runUntil(w, ww => ww.phase === 'dying', { move: 1 })).toBe(true);
    run(w, DYING_SECONDS + 0.3);
    expect(Math.floor(w.hero.x)).toBe(9);
    expect(w.stats.deaths).toBe(1);
  });

  it('each death costs 50 points, and the score never goes below 0', () => {
    expect(POINTS.death).toBe(50);
    const base = { coins: 10, stomps: 0, bricks: 0, flag: 0, clears: 0, time: 0, bonus: 0 };
    expect(scoreOf({ ...base, deaths: 1 })).toBe(50);
    expect(scoreOf({ ...base, deaths: 3 })).toBe(0);
    const w = storyOn(['.Poo...^^...............................', G40, G40]);
    expect(runUntil(w, ww => ww.phase === 'dying', { move: 1 })).toBe(true);
    expect(w.stats.coins).toBe(2);
    expect(score(w)).toBe(0);
  });

  it('Endless keeps its lives and game over, and counts no deaths', () => {
    const w = createWorld({ seed: 1 });
    enterLevel(w, 0, custom(['.P.....^^...............................', G40, G40], 'rooftops'));
    for (let i = 0; i < LIVES; i++) run(w, 1 + DYING_SECONDS + 0.2, { move: 1 });
    expect(w.result).toBe('lost');
    expect(w.stats.deaths).toBe(0);
  });

  it('finishing a story level wins it and names the next level', () => {
    const w = storyOn(['.P......................................', G40, G40]);
    const p = w.level.goal;
    w.hero.x = p.x - 0.1; w.hero.y = 8;
    run(w, 10);
    expect(w.phase).toBe('done');
    expect(w.result).toBe('won');
    expect(w.next).toBe('1-2');
    expect(w.stats.clears).toBe(1);
    expect(w.levelId).toBe('1-1');
  });
});

describe('Main Character memories', () => {
  const MEM = ['.P...M.......M.......M..................', G40, G40];

  function memOn(rows: string[], taken: string[] = []) {
    const w = createWorld({ seed: 1, memoriesTaken: taken });
    w.mode = 'story';
    w.levelId = '1-1';
    enterLevel(w, 0, custom(rows, 'rooftops'));
    drainEvents(w);
    return w;
  }

  it('M places memories, named by level and placement order', () => {
    const w = memOn(MEM);
    expect(w.memories).toEqual([
      { id: '1-1-a', x: 5, y: 11, taken: false },
      { id: '1-1-b', x: 13, y: 11, taken: false },
      { id: '1-1-c', x: 21, y: 11, taken: false },
    ]);
  });

  it('touching one takes it once, with a memory event naming its index', () => {
    const w = memOn(MEM);
    const got: number[] = [];
    run(w, 3, { move: 1 }, ww => { for (const e of drainEvents(ww)) if (e.type === 'memory') got.push(e.n); });
    expect(got).toEqual([0, 1, 2]);
    expect(w.memories.every(m => m.taken)).toBe(true);
  });

  it('memories already found on this device start taken and stay quiet', () => {
    const w = memOn(MEM, ['1-1-b', '9-9-z']);
    expect(w.memories.map(m => m.taken)).toEqual([false, true, false]);
    const got: number[] = [];
    run(w, 3, { move: 1 }, ww => { for (const e of drainEvents(ww)) if (e.type === 'memory') got.push(e.n); });
    expect(got).toEqual([0, 2]);
  });

  it('are named in the goal direction on a level played right to left', () => {
    const rows = ['..G..M.......M.......M...............P..', G40, G40];
    const w = memOn(rows);
    expect(w.memories.map(m => [m.id, m.x])).toEqual([['1-1-a', 21], ['1-1-b', 13], ['1-1-c', 5]]);
  });
});

describe('Main Character checkpoints', () => {
  // Ground at 0-17, a pit at 18-21, ground at 22-26, a pit at 27-32, ground to the end.
  const ground = '#'.repeat(18) + '.'.repeat(4) + '#'.repeat(5) + '.'.repeat(6) + '#'.repeat(9);
  const TWO = ['.P.......K..............K.................', ground, ground];

  it('a level may have several, in goal order; respawn is at the last one passed', () => {
    const w = storyOn(TWO);
    expect(w.level.checkpoints.map(c => c.x)).toEqual([9, 24]);
    expect(w.level.checkpoint).toEqual(w.level.checkpoints[0]);
    const seen: number[] = [];
    expect(runUntil(w, ww => { for (const e of drainEvents(ww)) if (e.type === 'checkpoint') seen.push(e.n); return ww.phase === 'dying'; }, { move: 1 })).toBe(true);
    expect(seen).toEqual([0]);
    run(w, DYING_SECONDS + 0.3);
    expect(Math.floor(w.hero.x)).toBe(9);
    // Jump the first pit and reach the second checkpoint, then fall in the next pit.
    w.hero.x = 23; w.hero.y = 12 - w.hero.h; w.hero.onGround = true;
    expect(runUntil(w, ww => { for (const e of drainEvents(ww)) if (e.type === 'checkpoint') seen.push(e.n); return ww.phase === 'dying'; }, { move: 1 })).toBe(true);
    expect(seen).toEqual([0, 1]);
    run(w, DYING_SECONDS + 0.3);
    expect(Math.floor(w.hero.x)).toBe(24);
    expect(w.checkpointHit).toBe(true);
  });

  it('on a right-to-left level a checkpoint counts only once he is past it toward the goal', () => {
    const w = storyOn(['..G.........K..........P................', G40, G40]);
    run(w, 0.3);
    expect(w.checkpointHit).toBe(false);
    run(w, 2, { move: -1 });
    expect(w.checkpointHit).toBe(true);
  });
});
