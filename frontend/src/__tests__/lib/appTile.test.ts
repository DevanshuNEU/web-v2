import { describe, it, expect } from 'vitest';
import { appRegistry } from '@/lib/appRegistry';
import { FLAVORS, TILE_MIDPOINT } from '@/lib/appTile';
import type { AppType } from '../../../../shared/types';

// The spec's app-to-flavor map (docs/superpowers/specs/2026-10-30-stripe-palette-default-design.md).
const SPEC_FLAVOR: Record<AppType, string> = {
  'about-me': 'chroma',
  resume: 'chroma',
  'dev-ai': 'cottonCandy',
  contact: 'pomegranate',
  games: 'sunset',
  projects: 'sunburst',
  changelog: 'sunburst',
  'github-activity': 'lemonLime',
  analytics: 'wintergreen',
  'skills-dashboard': 'overcast',
  browser: 'overcast',
  'file-explorer': 'slate',
  terminal: 'slate',
  'display-options': 'slate',
  help: 'slate',
};

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('app tile flavors', () => {
  it('gives every app a glyph and a known flavor', () => {
    for (const [app, reg] of Object.entries(appRegistry)) {
      expect(reg.glyph, app).toBeTruthy();
      expect(FLAVORS[reg.flavor], app).toBeDefined();
    }
  });

  it('maps apps to flavor families exactly as the spec says', () => {
    const actual = Object.fromEntries(Object.entries(appRegistry).map(([app, reg]) => [app, reg.flavor]));
    expect(actual).toEqual(SPEC_FLAVOR);
  });

  it('keeps every flavor color at 3:1 or better against the navy tile', () => {
    expect(TILE_MIDPOINT).toBe('#19223f');
    for (const [name, f] of Object.entries(FLAVORS)) {
      for (const color of [f.back, f.top, f.bottom]) {
        expect(contrast(color, TILE_MIDPOINT), `${name} ${color}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('uses the spec values for the chroma family', () => {
    expect(FLAVORS.chroma).toEqual({ back: '#00d4ff', top: '#ccffff', bottom: '#7a73ff' });
  });
});
