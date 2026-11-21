import { describe, it, expect } from 'vitest';
import { createWorld, drainEvents, enterLevel } from '@/components/apps/games/platformer/sim/world';
import { PHYS } from '@/components/apps/games/platformer/sim/physics';
import { G40, custom, eventsOf, press, run, runUntil } from '../setup/platformerWorld';

/** A tall wall at column 15 on flat ground, with abilities as given. */
const WALL = [
  ...Array.from({ length: 9 }, () => '...............#........................'),
  '.P.............#........................',
  G40, G40,
];

function on(rows: string[], abilities: { wallJump: boolean; dash: boolean }, extra = {}) {
  const w = createWorld({ seed: 1, abilities });
  enterLevel(w, 0, custom(rows, 'rooftops', extra));
  drainEvents(w);
  return w;
}

function againstWall(w: ReturnType<typeof on>, vy = 6) {
  const h = w.hero;
  h.x = 15 - h.w - 0.01; h.y = 6 - h.h; h.vx = 0; h.vy = vy; h.onGround = false; h.coyote = 0;
}

describe('Main Character abilities', () => {
  it('Endless has every move; Story starts with none, plus what the view says this device unlocked', () => {
    expect(createWorld({ seed: 1 }).abilities).toEqual({ wallJump: true, dash: true, blade: true });
    expect(createWorld({ seed: 1, mode: 'endless' }).abilities).toEqual({ wallJump: true, dash: true, blade: true });
    expect(createWorld({ mode: 'story', levelId: '1-1' }).abilities).toEqual({ wallJump: false, dash: false, blade: false });
    expect(createWorld({ mode: 'story', levelId: '1-2', abilities: { blade: true } }).abilities).toEqual({ wallJump: false, dash: false, blade: true });
  });

  it('without the wall jump: no wall slide, no wall jump, and a wall gives nothing back', () => {
    const w = on(WALL, { wallJump: false, dash: true });
    againstWall(w, 8);
    w.hero.airJumps = 0;
    w.hero.dashReady = false;
    let slid = false;
    run(w, 0.2, { move: 1 }, ww => { if (ww.hero.state === 'wallSlide') slid = true; });
    expect(slid).toBe(false);
    expect(w.hero.vy).toBeGreaterThan(PHYS.wallSlideMax);
    expect(w.hero.airJumps).toBe(0);
    expect(w.hero.dashReady).toBe(false);
    press(w, { jumpPressed: true, jumpHeld: true, move: 1 });
    expect(eventsOf(w)).not.toContain('wallJump');
    expect(w.hero.vy).toBeGreaterThan(0);
  });

  it('without the wall jump, a press by a wall is the double jump (straight up, not a kick away)', () => {
    const w = on(WALL, { wallJump: false, dash: false });
    againstWall(w, 2);
    press(w, { jumpPressed: true, jumpHeld: true, move: 1 });
    const ev = eventsOf(w);
    expect(ev).toContain('doubleJump');
    expect(ev).not.toContain('wallJump');
    expect(w.hero.vx).toBeGreaterThanOrEqual(0);
  });

  it('without the dash, a dash press does nothing', () => {
    const w = on(['.P......................................', G40, G40], { wallJump: true, dash: false });
    const x = w.hero.x;
    press(w, { dashPressed: true, move: 1 });
    expect(w.hero.state).not.toBe('dash');
    expect(w.hitFreeze).toBe(0);
    expect(eventsOf(w)).not.toContain('dash');
    expect(w.hero.x - x).toBeLessThan(0.1);
  });
});

describe('Main Character shrines', () => {
  const SHRINE = ['.P......Q...............................', G40, G40];

  it('touching the shrine unlocks its ability once, with an unlock event (0 wall jump, 1 dash)', () => {
    const w = on(SHRINE, { wallJump: false, dash: false }, { shrine: 'wallJump' });
    expect(w.shrines).toEqual([{ x: 8, y: 11, ability: 'wallJump', taken: false }]);
    const seen: { type: string; n: number }[] = [];
    expect(runUntil(w, ww => { seen.push(...drainEvents(ww)); return ww.abilities.wallJump; }, { move: 1 }, 3)).toBe(true);
    expect(seen.filter(e => e.type === 'unlock').map(e => e.n)).toEqual([0]);
    expect(w.shrines[0].taken).toBe(true);
    expect(w.abilities.dash).toBe(false);
    run(w, 1, { move: -1 }); run(w, 1, { move: 1 });
    expect(eventsOf(w)).not.toContain('unlock');

    const d = on(SHRINE, { wallJump: true, dash: false }, { shrine: 'dash' });
    const ev: { type: string; n: number }[] = [];
    runUntil(d, ww => { ev.push(...drainEvents(ww)); return ww.abilities.dash; }, { move: 1 }, 3);
    expect(ev.filter(e => e.type === 'unlock').map(e => e.n)).toEqual([1]);
  });

  it('after the shrine the move works: the wall jump kicks off the wall', () => {
    const w = on([
      ...Array.from({ length: 9 }, () => '...............#........................'),
      '.P....Q........#........................',
      G40, G40,
    ], { wallJump: false, dash: false }, { shrine: 'wallJump' });
    expect(runUntil(w, ww => ww.abilities.wallJump, { move: 1 }, 3)).toBe(true);
    againstWall(w, 2);
    run(w, 0.05, { move: 1 });
    press(w, { jumpPressed: true, jumpHeld: true, move: 1 });
    expect(eventsOf(w)).toContain('wallJump');
  });

  it('a level with Q needs its shrine ability in the level data', () => {
    expect(() => custom(SHRINE, 'rooftops')).toThrow(/shrine/);
  });
});
