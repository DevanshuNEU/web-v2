// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsApp from '@/components/apps/SettingsApp';
import { useThemeStore } from '@/store/themeStore';
import { TOUR_STEPS, TOUR_STEPS_MOBILE } from '@/components/apps/HelpApp';

beforeEach(() => {
  useThemeStore.setState({ palette: 'color', mode: 'dark' });
});

describe('palette naming', () => {
  it('offers Color before Mono in Preferences', () => {
    render(<SettingsApp />);
    const group = screen.getByRole('radiogroup', { name: 'Palette' });
    const options = [...group.querySelectorAll('[role="radio"]')].map((o) => o.textContent?.trim());
    expect(options).toEqual(['Color', 'Mono']);
  });

  it('describes each palette without calling either one Fun', () => {
    const { unmount } = render(<SettingsApp />);
    expect(screen.getByText('Navy tiles, two-tone icons.')).toBeInTheDocument();
    expect(screen.queryByText(/\bFun\b/)).toBeNull();
    unmount();
    useThemeStore.setState({ palette: 'mono' });
    render(<SettingsApp />);
    expect(screen.getByText('Black and white.')).toBeInTheDocument();
  });

  it('names the palettes Color or Mono in the Help tour', () => {
    const text = [...TOUR_STEPS, ...TOUR_STEPS_MOBILE].map((s) => s.body).join(' ');
    expect(text).toContain('Color or Mono');
    expect(text).not.toMatch(/\bFun\b/);
  });

  it('reports the mono palette as Mono, matching Settings', async () => {
    const { commandRegistry } = await import('@/lib/terminalCommands');
    const result = commandRegistry.neofetch([], { palette: 'mono' } as Parameters<typeof commandRegistry.neofetch>[1]);
    expect(JSON.stringify(result)).toMatch(/Theme:  Mono(?!chrome)/);
  });
});

describe('neofetch palette name', () => {
  it('reports the color palette as Color', async () => {
    const { commandRegistry } = await import('@/lib/terminalCommands');
    const result = commandRegistry.neofetch([], { palette: 'color' } as Parameters<typeof commandRegistry.neofetch>[1]);
    const text = JSON.stringify(result);
    expect(text).toContain('Theme:  Color');
    expect(text).not.toMatch(/\bFun\b/);
  });

  it('reports the mono palette as Mono, matching Settings', async () => {
    const { commandRegistry } = await import('@/lib/terminalCommands');
    const result = commandRegistry.neofetch([], { palette: 'mono' } as Parameters<typeof commandRegistry.neofetch>[1]);
    expect(JSON.stringify(result)).toMatch(/Theme:  Mono(?!chrome)/);
  });
});
