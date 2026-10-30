// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { useThemeStore, BLURPLE } from '@/store/themeStore';

const root = document.documentElement;
const accent = () => root.style.getPropertyValue('--color-accent');

beforeEach(() => {
  root.removeAttribute('style');
  useThemeStore.setState({ palette: 'color', accentColor: BLURPLE, mode: 'dark' });
});

describe('ThemeProvider accent', () => {
  it('renders blurple lighter on dark surfaces', () => {
    render(<ThemeProvider><div /></ThemeProvider>);
    expect(accent()).toBe('122 115 255');
  });

  it('renders blurple as stored in light mode', () => {
    useThemeStore.setState({ mode: 'light' });
    render(<ThemeProvider><div /></ThemeProvider>);
    expect(accent()).toBe('99 91 255');
  });

  it('renders other presets as stored in dark mode', () => {
    render(<ThemeProvider><div /></ThemeProvider>);
    act(() => useThemeStore.setState({ accentColor: '#FF9500' }));
    expect(accent()).toBe('255 149 0');
  });
});
