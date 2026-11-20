import { describe, it, expect } from 'vitest';
import { pickHeroAnim, type HeroPose } from '@/components/apps/games/platformer/render/pixel/anim';
import { readHero } from '@/components/apps/games/platformer/render/pixel/read';
import { createWorld } from '@/components/apps/games/platformer/sim/world';

const pose = (p: Partial<HeroPose>): HeroPose => ({
  state: 'ground', facing: 1, vx: 0, vy: 0, animT: 0, landT: 1, wallDir: 0, dashT: 0, ...p,
});

const out = () => ({ anim: 'idle' as string, frame: 0, facing: 1 as 1 | -1 });

/** Hero state to animation, per contract section D and the sprite frame counts. */
describe('hero animation selection', () => {
  it('standing still breathes through the 4 idle frames at 5 fps', () => {
    const o = out();
    pickHeroAnim(o, pose({ animT: 0.5 }));
    expect(o).toMatchObject({ anim: 'idle', frame: 2 });
    pickHeroAnim(o, pose({ animT: 0.85 }));
    expect(o.frame).toBe(0);
  });

  it('running cycles the 8 run frames', () => {
    const o = out();
    pickHeroAnim(o, pose({ vx: 8, animT: 0.3 }));
    expect(o.anim).toBe('run');
    expect(o.frame).toBe(4); // 0.3 s at 14 fps = frame 4
    pickHeroAnim(o, pose({ vx: -8, animT: 0.6, facing: -1 }));
    expect(o.frame).toBe(0); // frame 8 wraps
    expect(o.facing).toBe(-1);
  });

  it('just after landing shows the squash frame', () => {
    const o = out();
    pickHeroAnim(o, pose({ vx: 8, landT: 0.04 }));
    expect(o.anim).toBe('land');
    pickHeroAnim(o, pose({ vx: 8, landT: 0.2 }));
    expect(o.anim).toBe('run');
  });

  it('in the air: rise going up, apex near the top, fall coming down', () => {
    const o = out();
    pickHeroAnim(o, pose({ state: 'air', vy: -12 }));
    expect(o.anim).toBe('rise');
    pickHeroAnim(o, pose({ state: 'air', vy: 0.5 }));
    expect(o.anim).toBe('apex');
    pickHeroAnim(o, pose({ state: 'air', vy: 9, animT: 0.2 }));
    expect(o).toMatchObject({ anim: 'fall', frame: 1 });
  });

  it('a wall slide faces the wall: the sprite is drawn against a wall on his right', () => {
    const o = out();
    pickHeroAnim(o, pose({ state: 'wallSlide', wallDir: -1, facing: 1 }));
    expect(o).toMatchObject({ anim: 'wallSlide', facing: -1 });
    pickHeroAnim(o, pose({ state: 'wallSlide', wallDir: 1, facing: -1 }));
    expect(o.facing).toBe(1);
  });

  it('dash, pound, hurt, dead and victory each get their own frames', () => {
    const o = out();
    pickHeroAnim(o, pose({ state: 'dash', animT: 0.06 }));
    expect(o).toMatchObject({ anim: 'dash', frame: 1 });
    pickHeroAnim(o, pose({ state: 'pound', animT: 0.02 }));
    expect(o).toMatchObject({ anim: 'pound', frame: 0 });
    pickHeroAnim(o, pose({ state: 'pound', animT: 0.3 }));
    expect(o).toMatchObject({ anim: 'pound', frame: 1 });
    pickHeroAnim(o, pose({ state: 'hurt' }));
    expect(o.anim).toBe('hurt');
    pickHeroAnim(o, pose({ state: 'dead' }));
    expect(o.anim).toBe('hurt');
    pickHeroAnim(o, pose({ state: 'victory', animT: 0.9 }));
    expect(o).toMatchObject({ anim: 'victory', frame: 1 });
  });
});

describe('reading the hero from a world without the phase 2 fields', () => {
  it('falls back to ground or air from the body, and dead while dying', () => {
    const w = createWorld({ rand: () => 0.5 });
    // a phase 1 hero: none of the section D fields
    const bare = w.hero as unknown as Record<string, unknown>;
    for (const k of ['state', 'animT', 'landT', 'wallDir', 'dashT', 'dashReady']) delete bare[k];
    const p = pose({});
    readHero(p, w);
    expect(p.state).toBe('ground');
    w.hero.onGround = false;
    readHero(p, w);
    expect(p.state).toBe('air');
    w.phase = 'dying';
    readHero(p, w);
    expect(p.state).toBe('dead');
  });

  it('uses the phase 2 fields when the sim provides them', () => {
    const w = createWorld({ rand: () => 0.5 });
    Object.assign(w.hero, { state: 'dash', animT: 0.07, landT: 0.02, wallDir: 1, dashT: 0.1 });
    delete (w as unknown as Record<string, unknown>).landT;
    const p = pose({});
    readHero(p, w);
    expect(p).toMatchObject({ state: 'dash', animT: 0.07, landT: 0.02, wallDir: 1, dashT: 0.1 });
  });

  it('time since landing comes from the world countdown, which only a real landing sets', () => {
    const w = createWorld({ rand: () => 0.5 });
    w.hero.landT = 0; // reset by every grounded tick
    const p = pose({});
    w.landT = 0;
    readHero(p, w);
    expect(p.landT).toBeGreaterThan(0.5);
    w.landT = 0.12;
    readHero(p, w);
    expect(p.landT).toBeCloseTo(0.02);
  });
});
