// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import HelpApp, {
  TOUR_STEPS_DESKTOP,
  TOUR_STEPS_MOBILE,
  SHORTCUTS_DESKTOP,
  SHORTCUTS_MOBILE,
} from '@/components/apps/HelpApp';

/**
 * The tour must teach the real interactions and be platform-aware: desktop
 * teaches ⌘K + right-click; mobile teaches swipe-to-App-Library + pull-to-dismiss
 * and must NOT leak desktop-only concepts (⌘K, right-click, "macOS").
 */

const text = (steps: { title: string; body: string; chips?: string[] }[]) =>
  steps.map((s) => `${s.title} ${s.body} ${(s.chips ?? []).join(' ')}`).join(' ').toLowerCase();

describe('tour step sets — content', () => {
  it('desktop teaches ⌘K and right-click via chips', () => {
    const chips = TOUR_STEPS_DESKTOP.flatMap((s) => s.chips ?? []);
    expect(chips).toContain('⌘ K');
    expect(chips).toContain('right-click');
  });

  it('mobile teaches swipe-to-App-Library and pull-to-dismiss', () => {
    const chips = TOUR_STEPS_MOBILE.flatMap((s) => s.chips ?? []);
    expect(chips).toContain('swipe ←');
    expect(chips).toContain('pull down');
  });

  it('mobile tour does not leak desktop-only concepts', () => {
    const blob = text(TOUR_STEPS_MOBILE);
    expect(blob).not.toContain('⌘');
    expect(blob).not.toContain('right-click');
    expect(blob).not.toContain('macos');
  });

  it('both step sets are non-empty with unique titles', () => {
    for (const steps of [TOUR_STEPS_DESKTOP, TOUR_STEPS_MOBILE]) {
      expect(steps.length).toBeGreaterThan(0);
      const titles = steps.map((s) => s.title);
      expect(new Set(titles).size).toBe(titles.length);
    }
  });
});

describe('shortcuts — platform-aware', () => {
  it('desktop shortcuts lead with the command palette and context menu', () => {
    const keys = SHORTCUTS_DESKTOP.flatMap((r) => r.keys).join(' ');
    expect(keys).toContain('⌘ K');
    expect(keys.toLowerCase()).toContain('right-click');
  });

  it('mobile shortcuts are gesture-based, no ⌘', () => {
    const keys = SHORTCUTS_MOBILE.flatMap((r) => r.keys).join(' ');
    expect(keys).not.toContain('⌘');
    expect(keys.toLowerCase()).toMatch(/swipe|pull|tap/);
  });
});

describe('tour render', () => {
  beforeEach(() => {
    localStorage.clear(); // first-ever open → tour mode
  });

  it('renders the desktop tour and shows the ⌘K chip on the command-palette step', async () => {
    render(<HelpApp variant="desktop" />);
    expect(screen.getByText('Tour')).toBeInTheDocument();
    // Welcome is step 1; the command-palette step (with the ⌘K chip) is step 2.
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Command palette')).toBeInTheDocument();
    expect(screen.getByText('⌘ K')).toBeInTheDocument();
  });
});
