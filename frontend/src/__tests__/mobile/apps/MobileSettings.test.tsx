// @vitest-environment jsdom

import '../../setup/dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * MobileSettings — verifies the iOS Settings shell composes correctly,
 * the variant prop on SettingsApp routes to it, and the REAL sub-views
 * (Display & Brightness, Wallpaper, Sounds, About) wire to themeStore /
 * sound preferences. The fake rows (Airplane Mode, Wi-Fi, Bluetooth,
 * Notifications) were removed; a test keeps them out.
 */

// Sonner toasts call into a portal — stub out so tests don't depend on it.
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Suppress real playSound calls during sound toggle tests.
vi.mock('@/hooks/useSoundEffects', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useSoundEffects')>(
    '@/hooks/useSoundEffects'
  );
  return {
    ...actual,
    playSound: vi.fn(),
  };
});

import MobileSettings from '@/components/apps/MobileSettings';
import SettingsApp from '@/components/apps/SettingsApp';
import { useThemeStore } from '@/store/themeStore';
import { setSoundEnabled } from '@/hooks/useSoundEffects';

beforeEach(() => {
  // Reset theme to a known state before each test so order doesn't matter.
  // palette: 'color' keeps the accent picker visible for the accent-wiring
  // tests; the palette describe block sets 'mono' explicitly where it matters.
  useThemeStore.setState({ mode: 'dark', palette: 'color', accentColor: '#007AFF' });
  setSoundEnabled(false);
});

describe('MobileSettings — structure', () => {
  it('renders Settings as the NavBar title at root', () => {
    render(<MobileSettings />);
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('shows the profile row with name + subtitle', () => {
    render(<MobileSettings />);
    expect(screen.getByText('Devanshu Chicholikar')).toBeInTheDocument();
    expect(
      screen.getByText('Software Engineer · Portfolio Build')
    ).toBeInTheDocument();
  });

  it('shows only rows that do something real on the root', () => {
    render(<MobileSettings />);
    expect(screen.getByText('Sounds & Haptics')).toBeInTheDocument();
    expect(screen.getByText('Display & Brightness')).toBeInTheDocument();
    expect(screen.getByText('Wallpaper')).toBeInTheDocument();
    expect(screen.getByText('Privacy & Security')).toBeInTheDocument();
    for (const fake of ['Airplane Mode', 'Wi-Fi', 'Bluetooth', 'Notifications', 'Accessibility']) {
      expect(screen.queryByText(fake)).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/demo-only/i)).not.toBeInTheDocument();
  });
});

describe('MobileSettings — variant routing', () => {
  it("SettingsApp default (no variant) renders the desktop sidebar", () => {
    render(<SettingsApp />);
    // Desktop has "Preferences" sidebar header; mobile does not.
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.queryByText('Devanshu Chicholikar')).not.toBeInTheDocument();
  });

  it("SettingsApp variant='mobile' renders the iOS shell", () => {
    render(<SettingsApp variant="mobile" />);
    expect(screen.getByText('Devanshu Chicholikar')).toBeInTheDocument();
    expect(screen.queryByText('Preferences')).not.toBeInTheDocument();
  });

  it("SettingsApp variant='desktop' (explicit) renders the desktop sidebar", () => {
    render(<SettingsApp variant="desktop" />);
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });
});

describe('MobileSettings — drill-downs', () => {
  it('tapping the profile row pushes the About view', async () => {
    render(<MobileSettings />);
    await userEvent.click(
      screen.getByRole('button', { name: /devanshu chicholikar/i })
    );
    expect(screen.getByText('devOS 2.2')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /back to settings/i })
    ).toBeInTheDocument();
  });
});

describe('MobileSettings — Display & Brightness (REAL theme wiring)', () => {
  it('opening Display & Brightness shows current mode highlighted', async () => {
    useThemeStore.setState({ mode: 'dark' });
    render(<MobileSettings />);
    await userEvent.click(
      screen.getByRole('button', { name: /display & brightness/i })
    );
    // MobileSegmented renders <button aria-pressed=...>; pressed=true → selected.
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('switching to Light mode updates the global themeStore', async () => {
    useThemeStore.setState({ mode: 'dark' });
    render(<MobileSettings />);
    await userEvent.click(
      screen.getByRole('button', { name: /display & brightness/i })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Light' }));
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('switching to Dark mode updates the global themeStore', async () => {
    useThemeStore.setState({ mode: 'light' });
    render(<MobileSettings />);
    await userEvent.click(
      screen.getByRole('button', { name: /display & brightness/i })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('tapping an accent swatch updates themeStore.accentColor', async () => {
    render(<MobileSettings />);
    await userEvent.click(
      screen.getByRole('button', { name: /display & brightness/i })
    );
    // ACCENT_COLORS includes named colors; pick one that isn't the default.
    const swatches = screen.getAllByRole('button', { name: /set accent/i });
    expect(swatches.length).toBeGreaterThan(1);
    await userEvent.click(swatches[1]);
    expect(useThemeStore.getState().accentColor).not.toBe('#007AFF');
  });
});

describe('MobileSettings — Palette (mono/Fun)', () => {
  it('shows the current palette highlighted in Display & Brightness', async () => {
    useThemeStore.setState({ palette: 'mono' });
    render(<MobileSettings />);
    await userEvent.click(
      screen.getByRole('button', { name: /display & brightness/i })
    );
    expect(screen.getByRole('button', { name: 'Mono' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Fun' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('switching to Fun updates the global themeStore palette', async () => {
    useThemeStore.setState({ palette: 'mono' });
    render(<MobileSettings />);
    await userEvent.click(
      screen.getByRole('button', { name: /display & brightness/i })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fun' }));
    expect(useThemeStore.getState().palette).toBe('color');
  });

  it('hides the accent picker in mono and shows it in Fun', async () => {
    useThemeStore.setState({ palette: 'mono' });
    render(<MobileSettings />);
    await userEvent.click(
      screen.getByRole('button', { name: /display & brightness/i })
    );
    // Mono: no accent swatches.
    expect(screen.queryAllByRole('button', { name: /set accent/i })).toHaveLength(0);
    // Flip to Fun: accent swatches appear.
    await userEvent.click(screen.getByRole('button', { name: 'Fun' }));
    expect(
      screen.getAllByRole('button', { name: /set accent/i }).length
    ).toBeGreaterThan(1);
  });
});

describe('MobileSettings — Wallpaper (REAL wiring)', () => {
  it('opening Wallpaper shows the picker grid', async () => {
    render(<MobileSettings />);
    await userEvent.click(screen.getByRole('button', { name: /^Wallpaper/ }));
    // Static wallpapers always exist; live grid is conditional.
    expect(screen.getByTestId('wallpaper-grid-static')).toBeInTheDocument();
  });

  it('tapping a wallpaper thumbnail updates themeStore.wallpaper', async () => {
    render(<MobileSettings />);
    await userEvent.click(screen.getByRole('button', { name: /^Wallpaper/ }));
    const choices = screen.getAllByRole('button', { name: /^use .+ wallpaper$/i });
    expect(choices.length).toBeGreaterThan(0);
    await userEvent.click(choices[0]);
    expect(useThemeStore.getState().wallpaper).toBeTruthy();
  });
});

describe('MobileSettings — Sounds & Haptics (REAL wiring)', () => {
  it('opening Sounds shows the Sound effects row', async () => {
    render(<MobileSettings />);
    await userEvent.click(
      screen.getByRole('button', { name: /^Sounds & Haptics/ })
    );
    expect(screen.getByText('Sound effects')).toBeInTheDocument();
  });

  it('toggling the sound switch updates the global preference', async () => {
    setSoundEnabled(false);
    render(<MobileSettings />);
    await userEvent.click(
      screen.getByRole('button', { name: /^Sounds & Haptics/ })
    );
    const soundSwitch = screen.getByRole('switch', { name: 'Sound effects' });
    expect(soundSwitch).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(soundSwitch);
    expect(soundSwitch).toHaveAttribute('aria-checked', 'true');
  });
});

describe('MobileSettings — back navigation', () => {
  it('Back button on a sub-view returns to the root', async () => {
    render(<MobileSettings />);
    await userEvent.click(screen.getByRole('button', { name: /^Sounds & Haptics/ }));
    expect(screen.getByText('Sound effects')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /back to settings/i })
    );
    // Root markers visible again.
    expect(screen.getByText('Devanshu Chicholikar')).toBeInTheDocument();
    expect(screen.queryByText('Sound effects')).not.toBeInTheDocument();
  });
});
