// @vitest-environment jsdom

import '../../setup/dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * MobileSettings — verifies the iOS Settings shell composes correctly,
 * the variant prop on SettingsApp routes to it, and the REAL sub-views
 * (Display & Brightness, Wallpaper, Sounds, About) wire to themeStore /
 * sound preferences. The decorative views (Wi-Fi, Bluetooth, placeholders)
 * only get a smoke test that they push without throwing.
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
  useThemeStore.setState({ mode: 'dark', accentColor: '#007AFF' });
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

  it('shows the canonical iOS Settings rows on the root', () => {
    render(<MobileSettings />);
    expect(screen.getByText('Airplane Mode')).toBeInTheDocument();
    expect(screen.getByText('Wi-Fi')).toBeInTheDocument();
    expect(screen.getByText('Bluetooth')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Sounds & Haptics')).toBeInTheDocument();
    expect(screen.getByText('Display & Brightness')).toBeInTheDocument();
    expect(screen.getByText('Wallpaper')).toBeInTheDocument();
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
  it('tapping Wi-Fi pushes the Wi-Fi view', async () => {
    render(<MobileSettings />);
    await userEvent.click(screen.getByRole('button', { name: /^Wi-Fi/ }));
    // Header reads "Wi-Fi" with a "Back to Settings" button.
    expect(
      screen.getByRole('button', { name: /back to settings/i })
    ).toBeInTheDocument();
    expect(screen.getByText('My Networks')).toBeInTheDocument();
  });

  it('tapping Bluetooth pushes the Bluetooth view', async () => {
    render(<MobileSettings />);
    await userEvent.click(screen.getByRole('button', { name: /^Bluetooth/ }));
    expect(screen.getByText('My Devices')).toBeInTheDocument();
  });

  it('tapping Notifications pushes the placeholder', async () => {
    render(<MobileSettings />);
    await userEvent.click(screen.getByRole('button', { name: /^Notifications/ }));
    // PlaceholderView renders the title as a heading + a description.
    expect(
      screen.getAllByText('Notifications').length
    ).toBeGreaterThanOrEqual(2); // NavBar + body
  });

  it('tapping the profile row pushes the About view', async () => {
    render(<MobileSettings />);
    await userEvent.click(
      screen.getByRole('button', { name: /devanshu chicholikar/i })
    );
    expect(screen.getByText('Version 2.1.0 · Sprint 4')).toBeInTheDocument();
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
  it('opening Sounds shows the UI Sound Effects row', async () => {
    render(<MobileSettings />);
    await userEvent.click(
      screen.getByRole('button', { name: /^Sounds & Haptics/ })
    );
    expect(screen.getByText('UI Sound Effects')).toBeInTheDocument();
  });

  it('toggling the sound switch updates the global preference', async () => {
    setSoundEnabled(false);
    render(<MobileSettings />);
    await userEvent.click(
      screen.getByRole('button', { name: /^Sounds & Haptics/ })
    );
    // Root view stays mounted under the pushed Sounds view — its Airplane
    // Mode switch is still in the DOM. The Sounds switch is the last one
    // rendered (z-index above), so query all and take the last.
    const switches = screen.getAllByRole('switch');
    const soundSwitch = switches[switches.length - 1];
    expect(soundSwitch).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(soundSwitch);
    expect(soundSwitch).toHaveAttribute('aria-checked', 'true');
  });
});

describe('MobileSettings — back navigation', () => {
  it('Back button on a sub-view returns to the root', async () => {
    render(<MobileSettings />);
    await userEvent.click(screen.getByRole('button', { name: /^Wi-Fi/ }));
    await userEvent.click(
      screen.getByRole('button', { name: /back to settings/i })
    );
    // Root markers visible again.
    expect(screen.getByText('Devanshu Chicholikar')).toBeInTheDocument();
    expect(screen.queryByText('My Networks')).not.toBeInTheDocument();
  });
});

describe('MobileSettings — airplane mode (decorative cross-effect)', () => {
  it('toggling Airplane Mode changes the Wi-Fi row value to "Off"', async () => {
    render(<MobileSettings />);
    // Airplane Mode is a switch row.
    const airplaneRow = screen
      .getByText('Airplane Mode')
      .closest('[data-testid="mobile-settings"]')!;
    const sw = within(airplaneRow as HTMLElement).getAllByRole('switch')[0];
    expect(sw).toHaveAttribute('aria-checked', 'false');

    // The Wi-Fi row currently shows the SSID; after toggling airplane it
    // should read "Off". (Bluetooth too.)
    expect(screen.getByText('Devanshu-5G')).toBeInTheDocument();
    await userEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByText('Devanshu-5G')).not.toBeInTheDocument();
    // Both Wi-Fi and Bluetooth read "Off" — there are at least two.
    expect(screen.getAllByText('Off').length).toBeGreaterThanOrEqual(2);
  });
});
