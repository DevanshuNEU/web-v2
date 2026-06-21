import { describe, it, expect } from 'vitest';
import { getInk, parseRgbTriple, rgbString, type StyleSource } from '@/lib/signature/ink';

/** Build a fake CSSStyleDeclaration-like source from a var map. */
function fakeStyle(vars: Record<string, string>): StyleSource {
  return {
    getPropertyValue: (prop: string) => vars[prop] ?? '',
  };
}

describe('parseRgbTriple', () => {
  it('parses the space-separated "r g b" token format', () => {
    expect(parseRgbTriple('245 245 247')).toEqual([245, 245, 247]);
  });

  it('parses the comma form too', () => {
    expect(parseRgbTriple('29, 29, 31')).toEqual([29, 29, 31]);
  });

  it('clamps and rounds out-of-range/float components', () => {
    expect(parseRgbTriple('300 -5 12.6')).toEqual([255, 0, 13]);
  });

  it('returns null for empty or malformed input', () => {
    expect(parseRgbTriple('')).toBeNull();
    expect(parseRgbTriple('  ')).toBeNull();
    expect(parseRgbTriple('1 2')).toBeNull();
    expect(parseRgbTriple('a b c')).toBeNull();
    expect(parseRgbTriple(undefined)).toBeNull();
  });
});

describe('getInk', () => {
  it('parses ink/paper from "r g b" triples on the style source', () => {
    const style = fakeStyle({
      '--color-text': '29 29 31',
      '--color-bg': '245 245 247',
    });
    expect(getInk(style)).toEqual({ ink: [29, 29, 31], paper: [245, 245, 247] });
  });

  it('reads dark-mode tokens just as well', () => {
    const style = fakeStyle({
      '--color-text': '245 245 247',
      '--color-bg': '0 0 0',
    });
    expect(getInk(style)).toEqual({ ink: [245, 245, 247], paper: [0, 0, 0] });
  });

  it('falls back to black ink on white paper when vars are unset', () => {
    expect(getInk(fakeStyle({}))).toEqual({ ink: [0, 0, 0], paper: [255, 255, 255] });
  });

  it('falls back when the source is null', () => {
    expect(getInk(null)).toEqual({ ink: [0, 0, 0], paper: [255, 255, 255] });
  });

  it('falls back per-channel when only one var is set', () => {
    const style = fakeStyle({ '--color-text': '10 20 30' });
    expect(getInk(style)).toEqual({ ink: [10, 20, 30], paper: [255, 255, 255] });
  });
});

describe('rgbString', () => {
  it('formats a triple as rgb(...)', () => {
    expect(rgbString([1, 2, 3])).toBe('rgb(1, 2, 3)');
  });
});
