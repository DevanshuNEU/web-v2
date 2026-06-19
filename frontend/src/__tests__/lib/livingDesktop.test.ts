import { describe, it, expect } from 'vitest';
import { phaseForHour, tintForHour } from '@/lib/livingDesktop';

describe('phaseForHour', () => {
  it('maps the day into the four phases at the right boundaries', () => {
    expect(phaseForHour(4)).toBe('night');
    expect(phaseForHour(5)).toBe('dawn');
    expect(phaseForHour(7)).toBe('dawn');
    expect(phaseForHour(8)).toBe('day');
    expect(phaseForHour(16)).toBe('day');
    expect(phaseForHour(17)).toBe('dusk');
    expect(phaseForHour(19)).toBe('dusk');
    expect(phaseForHour(20)).toBe('night');
    expect(phaseForHour(23)).toBe('night');
    expect(phaseForHour(0)).toBe('night');
  });
});

describe('tintForHour', () => {
  it('returns a distinct rgba wash per phase', () => {
    const dawn = tintForHour(6);
    const day = tintForHour(12);
    const dusk = tintForHour(18);
    const night = tintForHour(2);
    const all = [dawn, day, dusk, night];
    all.forEach((t) => expect(t).toMatch(/^rgba\(/));
    expect(new Set(all).size).toBe(4); // all four are different
  });
});
