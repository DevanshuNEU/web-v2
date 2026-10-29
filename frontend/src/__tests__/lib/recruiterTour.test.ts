// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  runRecruiterTour,
  stopRecruiterTour,
  isRecruiterTourRunning,
  TOUR_BAR_ID,
  STOP_MS,
} from '@/lib/recruiterTour';
import { useOSStore } from '@/store/osStore';
import { useNotificationStore } from '@/store/notificationStore';

/**
 * Quick tour (Option+T): one tour window at a time, a visible bar with Next
 * and Stop, Esc stops it, and running it again stops it.
 */

const openTypes = () => useOSStore.getState().windows.filter((w) => w.isOpen && !w.isMinimized).map((w) => w.appType);
const bar = () => document.getElementById(TOUR_BAR_ID);
const button = (name: string) =>
  [...(bar()?.querySelectorAll('button') ?? [])].find((b) => b.textContent === name) as HTMLButtonElement;

beforeEach(() => {
  vi.useFakeTimers();
  useOSStore.setState({ windows: [], activeWindowId: null });
  useNotificationStore.setState({ notifications: [] });
});

afterEach(() => {
  stopRecruiterTour();
  vi.useRealTimers();
});

describe('quick tour', () => {
  it('shows a bar with the stop it is on, and opens one window', () => {
    runRecruiterTour();
    expect(isRecruiterTourRunning()).toBe(true);
    expect(bar()?.textContent).toContain('Quick tour 1 of 3: About Me');
    expect(openTypes()).toEqual(['about-me']);
  });

  it('Next moves on and closes the previous tour window (no stacking)', () => {
    runRecruiterTour();
    button('Next').click();
    expect(openTypes()).toEqual(['projects']);
    button('Next').click();
    expect(openTypes()).toEqual(['resume']);
    expect(button('Done')).toBeTruthy();
    button('Done').click();
    expect(isRecruiterTourRunning()).toBe(false);
    expect(bar()).toBeNull();
    expect(openTypes()).toEqual(['resume']);
    expect(useNotificationStore.getState().notifications.at(-1)?.title).toMatch(/that's the tour/i);
  });

  it('advances on its own timer', () => {
    runRecruiterTour();
    vi.advanceTimersByTime(STOP_MS + 10);
    expect(openTypes()).toEqual(['projects']);
  });

  it('minimizes, not closes, a window the visitor already had open', () => {
    useOSStore.getState().openWindow('about-me');
    runRecruiterTour();
    button('Next').click();
    const about = useOSStore.getState().windows.find((w) => w.appType === 'about-me');
    expect(about?.isOpen).toBe(true);
    expect(about?.isMinimized).toBe(true);
  });

  it('Stop ends it and removes the bar', () => {
    runRecruiterTour();
    button('Stop').click();
    expect(isRecruiterTourRunning()).toBe(false);
    expect(bar()).toBeNull();
    vi.advanceTimersByTime(STOP_MS * 4);
    expect(openTypes()).toEqual(['about-me']);
  });

  it('Esc stops it and does not reach the window-level Esc handler', () => {
    const docEsc = vi.fn();
    document.addEventListener('keydown', docEsc);
    runRecruiterTour();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(isRecruiterTourRunning()).toBe(false);
    expect(docEsc).not.toHaveBeenCalled();
    document.removeEventListener('keydown', docEsc);
  });

  it('running it again stops it instead of stacking a second tour', () => {
    runRecruiterTour();
    runRecruiterTour();
    expect(isRecruiterTourRunning()).toBe(false);
    expect(document.querySelectorAll(`#${TOUR_BAR_ID}`)).toHaveLength(0);
  });
});
