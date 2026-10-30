// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import AppTile from '@/components/shared/AppTile';
import { useThemeStore } from '@/store/themeStore';
import { COLOR_TILE } from '@/lib/appTile';

beforeEach(() => {
  useThemeStore.setState({ palette: 'color', mode: 'dark' });
});

const tileOf = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-app-tile]')!;

describe('AppTile', () => {
  it('renders the navy tile in the color palette', () => {
    const { container } = render(<AppTile appType="about-me" size={56} />);
    const tile = tileOf(container);
    expect(COLOR_TILE.background).toBe('linear-gradient(180deg, oklch(0.30 0.05 268) 0%, oklch(0.22 0.06 268) 100%)');
    expect(tile.style.background).toContain('oklch(0.3 0.05 268)');
    expect(tile.getAttribute('style')).not.toMatch(/#60a5fa|#3b82f6|rgba\(255, ?255, ?255, ?0\.28\)/);
    expect(tile.dataset.tilePalette).toBe('color');
  });

  it('colors the glyph with its own gradient, unique per tile', () => {
    const { container } = render(
      <>
        <AppTile appType="about-me" size={56} />
        <AppTile appType="about-me" size={72} />
      </>
    );
    const ids = [...container.querySelectorAll('linearGradient')].map((g) => g.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    const glyphs = [...container.querySelectorAll<SVGElement>('svg.glyph-two-tone')];
    expect(glyphs).toHaveLength(2);
    glyphs.forEach((g, i) => {
      expect(g.style.getPropertyValue('--glyph-front')).toBe(`url(#${ids[i]})`);
      expect(g.style.getPropertyValue('--glyph-back')).toBe('#00d4ff');
    });
  });

  it('renders the graphite tile with a white glyph in mono', () => {
    useThemeStore.setState({ palette: 'mono' });
    const { container } = render(<AppTile appType="projects" size={56} />);
    const tile = tileOf(container);
    expect(tile.dataset.tilePalette).toBe('mono');
    expect(tile.style.background).toContain('rgb(42, 42, 46)');
    expect(container.querySelector('linearGradient')).toBeNull();
    const glyph = container.querySelector('svg')!;
    expect(glyph.getAttribute('fill')).toBe('#fff');
  });
});
