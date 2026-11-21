import { describe, it, expect } from 'vitest';
import { cardLayout, cardWipe, WIPE_IN, WIPE_OUT } from '@/components/apps/games/platformer/render/pixel/card';
import { hasGlyph, textWidth } from '@/components/apps/games/platformer/render/pixel/font';
import { MODIFIERS } from '@/components/apps/games/platformer/sim/modifiers';

const NAMES = ['Doomscroll Heights', 'Rooftop Rizz', 'Sigma Skyline', 'No Cap Rooftops', 'Neon Delulu', 'Midnight Main Character'];

/** The world 1 title card is pixel-native: its own font, a wipe in and out. */
describe('pixel title card', () => {
  it('the font draws every letter the cards use', () => {
    const words = [...NAMES, ...Object.values(MODIFIERS).map(m => m.name), 'WORLD 1', 'LEVEL CLEARED', 'SECRET UNLOCKED', 'TIME BONUS', 'CLEAR BONUS +1000', '0123456789'];
    for (const w of words) for (const ch of w) expect(hasGlyph(ch), `${w}: ${ch}`).toBe(true);
  });

  it('a short name sets large on one line', () => {
    const l = cardLayout('Neon Delulu', 195);
    expect(l.scale).toBe(2);
    expect(l.lines).toEqual(['NEON DELULU']);
  });

  it('a long name wraps to two large lines on a phone, and every line fits', () => {
    const l = cardLayout('Midnight Main Character', 195);
    expect(l.scale).toBe(2);
    expect(l.lines.length).toBe(2);
    for (const line of l.lines) expect(textWidth(line, l.scale)).toBeLessThanOrEqual(195 - 28);
  });

  it('a very narrow view falls back to small type', () => {
    const l = cardLayout('Midnight Main Character', 120);
    expect(l.scale).toBe(1);
    for (const line of l.lines) expect(textWidth(line, 1)).toBeLessThanOrEqual(120 - 28);
  });

  it('wipes in from the top, holds, then closes to its middle line', () => {
    const o = { from: 0, to: 0 };
    cardWipe(o, 0, 2.4, false);
    expect(o.to - o.from).toBe(0);
    cardWipe(o, WIPE_IN / 2, 2.0, false);
    expect(o.from).toBe(0);
    expect(o.to).toBeGreaterThan(0.2);
    expect(o.to).toBeLessThan(0.9);
    cardWipe(o, 1.2, 1.2, false);
    expect(o).toEqual({ from: 0, to: 1 });
    cardWipe(o, 2.3, WIPE_OUT / 2, false);
    expect(o.from).toBeGreaterThan(0.2);
    expect(o.to).toBeLessThan(0.8);
    expect((o.from + o.to) / 2).toBeCloseTo(0.5);
  });

  it('reduced motion: no wipe, the card is simply there and then gone', () => {
    const o = { from: 0, to: 0 };
    cardWipe(o, 0.01, 2.39, true);
    expect(o).toEqual({ from: 0, to: 1 });
    cardWipe(o, 2.39, 0.01, true);
    expect(o).toEqual({ from: 0, to: 1 });
  });
});
