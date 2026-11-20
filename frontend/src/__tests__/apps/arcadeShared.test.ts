// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { stubCanvas } from '../setup/canvas';
import { HYPE, hype, comboTier, auraText } from '@/components/apps/games/shared/slang';
import { Juice } from '@/components/apps/games/shared/juice';
import { CAST, creature, drawCreature } from '@/components/apps/games/shared/cast';
import { arcadeTheme, COLOR_THEME, MONO_THEME, hypeFont } from '@/components/apps/games/shared/theme';
import { isArcadeSoundOn, setArcadeSound, sfx } from '@/components/apps/games/shared/sound';
import { GAMES, BOARD_GAMES } from '@/components/apps/games/registry';

const DASHES = /[–—]/;

describe('slang', () => {
  it('picks from the requested tier, deterministically with an injected rand', () => {
    expect(hype('fail', () => 0)).toBe(HYPE.fail[0]);
    expect(hype('fail', () => 0.9999)).toBe(HYPE.fail[HYPE.fail.length - 1]);
  });

  it('never returns undefined, even for rand() === 1', () => {
    expect(hype('small', () => 1)).toBeTypeOf('string');
  });

  it('maps combos to louder tiers', () => {
    expect(comboTier(1)).toBe('small');
    expect(comboTier(3)).toBe('big');
    expect(comboTier(6)).toBe('huge');
    expect(comboTier(40)).toBe('huge');
  });

  it('writes aura points', () => {
    expect(auraText(50)).toBe('+50 aura');
  });

  it('contains no em or en dashes anywhere', () => {
    for (const list of Object.values(HYPE)) for (const line of list) expect(line).not.toMatch(DASHES);
  });
});

describe('Juice', () => {
  it('bursts particles that fall and expire', () => {
    const j = new Juice(false, () => 0.5);
    j.burst(100, 100, '#fff', 10);
    expect(j.particles).toHaveLength(10);
    const y0 = j.particles[0].y;
    j.update(0.1);
    j.update(0.1);
    expect(j.particles[0].y).not.toBe(y0);
    for (let i = 0; i < 20; i++) j.update(0.1);
    expect(j.particles).toHaveLength(0);
  });

  it('caps particles so a long combo cannot pile up memory', () => {
    const j = new Juice(false);
    for (let i = 0; i < 100; i++) j.burst(0, 0, '#fff', 20);
    expect(j.particles.length).toBeLessThanOrEqual(400);
  });

  it('keeps at most 12 floating words', () => {
    const j = new Juice(false);
    for (let i = 0; i < 30; i++) j.float(0, 0, 'W', '#fff');
    expect(j.floaters).toHaveLength(12);
  });

  it('floats words upward and fades them out', () => {
    const j = new Juice(false);
    j.float(0, 100, 'sigma', '#fff', 18, 0.5);
    j.update(0.2);
    expect(j.floaters[0].y).toBeLessThan(100);
    j.update(0.4);
    expect(j.floaters).toHaveLength(0);
  });

  it('shakes, then settles back to zero', () => {
    const j = new Juice(false, () => 1);
    j.shake(10, 0.2);
    expect(Math.abs(j.offset().x)).toBeGreaterThan(0);
    j.update(0.25);
    expect(j.offset()).toEqual({ x: 0, y: 0 });
  });

  it('under reduced motion: no shake, no particles, words stay put but still show', () => {
    const j = new Juice(true);
    j.shake(10);
    j.burst(0, 0, '#fff', 30);
    j.float(0, 100, 'W', '#fff');
    j.update(0.1);
    expect(j.offset()).toEqual({ x: 0, y: 0 });
    expect(j.particles).toHaveLength(0);
    expect(j.floaters).toHaveLength(1);
    expect(j.floaters[0].y).toBe(100);
  });

  it('clear() empties everything', () => {
    const j = new Juice(false);
    j.burst(0, 0, '#fff'); j.float(0, 0, 'W', '#fff'); j.shake();
    j.clear();
    expect(j.particles).toHaveLength(0);
    expect(j.floaters).toHaveLength(0);
    expect(j.offset()).toEqual({ x: 0, y: 0 });
  });
});

describe('the cast', () => {
  beforeEach(() => stubCanvas());

  it('has nine creatures with unique ids, smallest to largest, ending on the Moon Gigachad', () => {
    expect(CAST).toHaveLength(9);
    expect(new Set(CAST.map(c => c.id)).size).toBe(9);
    expect(CAST[0].id).toBe('bean');
    expect(CAST[8].name).toBe('Moon Gigachad');
    expect(creature('baguette').name).toBe('Baguettino Chadoni');
  });

  it('mono fills get lighter along the chain, so levels read without hue', () => {
    const lum = (hex: string) => parseInt(hex.slice(1, 3), 16);
    for (let i = 1; i < CAST.length; i++) expect(lum(CAST[i].mono)).toBeGreaterThan(lum(CAST[i - 1].mono));
  });

  it('draws every creature in both palettes, every pose, without throwing', () => {
    const ctx = document.createElement('canvas').getContext('2d')!;
    for (const c of CAST) {
      for (const mono of [false, true]) {
        expect(() => drawCreature(ctx, c.id, 50, 50, 40, { mono, t: 1.3, facing: -1, squash: 1.2, dizzy: true })).not.toThrow();
        expect(() => drawCreature(ctx, c.id, 50, 50, 8, { mono })).not.toThrow();
      }
    }
  });

  it('balances save and restore, so it never leaks transforms into the game', () => {
    const ctx = document.createElement('canvas').getContext('2d')! as unknown as { save: { mock: { calls: unknown[] } }; restore: { mock: { calls: unknown[] } } };
    for (const c of CAST) drawCreature(ctx as unknown as CanvasRenderingContext2D, c.id, 0, 0, 30);
    expect(ctx.save.mock.calls.length).toBe(ctx.restore.mock.calls.length);
  });
});

describe('theme', () => {
  it('switches to grayscale under Mono', () => {
    expect(arcadeTheme(false)).toBe(COLOR_THEME);
    expect(arcadeTheme(true)).toBe(MONO_THEME);
    for (const v of Object.values(MONO_THEME)) {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16));
      expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(10);
    }
  });

  it('builds a canvas font string at the size asked', () => {
    expect(hypeFont(20.4)).toMatch(/^800 20px /);
  });
});

describe('sound', () => {
  beforeEach(() => localStorage.clear());

  it('is off until she turns it on, and remembers the choice', () => {
    setArcadeSound(false);
    expect(isArcadeSoundOn()).toBe(false);
    setArcadeSound(true);
    expect(isArcadeSoundOn()).toBe(true);
    expect(localStorage.getItem('devos-arcade-sound')).toBe('on');
    setArcadeSound(false);
  });

  it('sfx never throws, with or without audio support', () => {
    setArcadeSound(true);
    expect(() => sfx('coin')).not.toThrow();
    expect(() => sfx('merge', 4)).not.toThrow();
    setArcadeSound(false);
    expect(() => sfx('boom')).not.toThrow();
  });
});

describe('registry', () => {
  it('lists six games with unique ids and best-score keys', () => {
    expect(GAMES).toHaveLength(6);
    expect(new Set(GAMES.map(g => g.id)).size).toBe(6);
    expect(new Set(GAMES.map(g => g.hsKey)).size).toBe(6);
  });

  it('puts the four brainrot games on the global board, the platformer first', () => {
    expect(BOARD_GAMES.map(g => g.board)).toEqual(['platformer', 'snake', 'stacker', 'merge']);
  });

  it('copy has no em or en dashes and no exclamation marks', () => {
    for (const g of GAMES) {
      for (const s of [g.title, g.subtitle, g.controls, g.controlsMobile]) {
        expect(s).not.toMatch(DASHES);
        expect(s).not.toContain('!');
      }
    }
  });
});
