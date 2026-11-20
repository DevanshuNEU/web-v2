// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

import HomeScreen from '@/components/mobile/HomeScreen';
import { useMobileStore } from '@/store/mobileStore';

/**
 * The home pager is a horizontal mandatory scroll-snap container whose pages
 * (and the App Library's grid and results) are vertical scrollers. Those
 * nested scrollers once carried `overscroll-contain`, which sets
 * overscroll-behavior on BOTH axes. Because overflow-y:auto also makes
 * overflow-x a scroll container, a horizontal swipe that began on a page was
 * contained there and never chained to the pager: in Chromium the pager did
 * not move at all, and on iOS Safari it moved in fits and could be left
 * resting between two pages. Nested scrollers may contain vertical overscroll
 * only.
 */

function pager() {
  return screen.getByLabelText(/^Home screen, page/);
}

function nestedScrollers(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>('*')).filter((el) =>
    /\boverflow-(y-)?auto\b/.test(el.className)
  );
}

beforeEach(() => {
  useMobileStore.setState({ currentPage: 0, openApps: [], openAppType: null, locked: false });
});

describe('HomeScreen pager', () => {
  it('keeps every page a full-width snap point', () => {
    render(<HomeScreen onOpenApp={() => {}} />);
    const el = pager();
    expect(el.className).toMatch(/\bsnap-x\b/);
    expect(el.className).toMatch(/\bsnap-mandatory\b/);
    const pages = Array.from(el.children) as HTMLElement[];
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      expect(page.className).toMatch(/\bsnap-start\b/);
      // One page per swipe, like iOS: a hard fling cannot skip a page.
      expect(page.className).toMatch(/\bsnap-always\b/);
      expect(page.className).toMatch(/\bw-full\b/);
      expect(page.className).toMatch(/\bflex-shrink-0\b/);
    }
  });

  it('lets horizontal swipes on nested vertical scrollers chain to the pager', () => {
    render(<HomeScreen onOpenApp={() => {}} />);
    const scrollers = nestedScrollers(pager());
    // Home pages plus the App Library grid at minimum.
    expect(scrollers.length).toBeGreaterThan(2);
    for (const el of scrollers) {
      // Both-axis or x-axis containment traps the horizontal swipe.
      expect(el.className).not.toMatch(/\boverscroll-(x-)?(contain|none)\b/);
      // Not a horizontal scroll container the user can drag.
      expect(el.className).toMatch(/\boverflow-x-hidden\b/);
    }
  });

  it('updates the page only when the visible page changes, not per scroll event', () => {
    const setPage = vi.fn(useMobileStore.getState().setPage);
    useMobileStore.setState({ setPage });
    render(<HomeScreen onOpenApp={() => {}} />);
    const el = pager();
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: 390 });

    const scrollTo = (left: number) =>
      act(() => {
        el.scrollLeft = left;
        el.dispatchEvent(new Event('scroll'));
      });

    // A swipe from page 1 to page 2 fires many scroll events.
    for (let x = 0; x <= 390; x += 30) scrollTo(x);
    expect(setPage.mock.calls.map(([p]) => p)).toEqual([1]);
    expect(useMobileStore.getState().currentPage).toBe(1);
    expect(el.getAttribute('aria-label')).toMatch(/page 2 of/);

    // And back again.
    for (let x = 390; x >= 0; x -= 30) scrollTo(x);
    expect(setPage.mock.calls.map(([p]) => p)).toEqual([1, 0]);
  });
});
