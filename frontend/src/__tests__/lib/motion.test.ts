import { describe, it, expect } from 'vitest';
import { spring, INSTANT, withReduced } from '@/lib/motion';

describe('motion tokens', () => {
  it('exposes the spring presets used across the shell', () => {
    for (const key of ['window', 'windowLayout', 'dock', 'tilt', 'genie', 'cursor'] as const) {
      expect(spring[key]).toBeTypeOf('object');
    }
  });

  it('INSTANT collapses motion to zero duration', () => {
    expect(INSTANT).toEqual({ duration: 0 });
  });

  describe('withReduced', () => {
    const base = spring.window;

    it('returns the base transition when motion is allowed', () => {
      expect(withReduced(base, false)).toBe(base);
    });

    it('returns INSTANT when reduced motion is requested', () => {
      expect(withReduced(base, true)).toBe(INSTANT);
    });

    it('treats a null preference (pre-hydration) as not-reduced', () => {
      expect(withReduced(base, null)).toBe(base);
    });
  });
});
