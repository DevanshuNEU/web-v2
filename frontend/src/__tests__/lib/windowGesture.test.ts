// @vitest-environment jsdom
import '../setup/dom';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, act } from '@testing-library/react';
import { beginWindowGesture, isWindowGestureActive } from '@/lib/windowGesture';
import { ParallaxProvider, useParallaxContext } from '@/components/os/ParallaxProvider';

const attr = () => document.documentElement.hasAttribute('data-window-drag');

describe('windowGesture', () => {
  it('sets the flag on begin and clears it on end', () => {
    const end = beginWindowGesture();
    expect(attr()).toBe(true);
    expect(isWindowGestureActive()).toBe(true);
    end();
    expect(attr()).toBe(false);
    expect(isWindowGestureActive()).toBe(false);
  });

  it('end is idempotent: a double end leaves the count at 0', () => {
    const end = beginWindowGesture();
    end();
    end();
    expect(isWindowGestureActive()).toBe(false);
    const end2 = beginWindowGesture();
    expect(attr()).toBe(true);
    expect(isWindowGestureActive()).toBe(true);
    end2();
    expect(attr()).toBe(false);
    expect(isWindowGestureActive()).toBe(false);
  });

  it('keeps the flag until every overlapping gesture has ended', () => {
    const a = beginWindowGesture();
    const b = beginWindowGesture();
    a();
    expect(attr()).toBe(true);
    expect(isWindowGestureActive()).toBe(true);
    b();
    expect(attr()).toBe(false);
    expect(isWindowGestureActive()).toBe(false);
  });
});

describe('ParallaxProvider during a window gesture', () => {
  const original = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      matches: query === '(pointer: fine)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = original;
  });

  it('holds still while a gesture is active, then tracks again after end', () => {
    let ctx: ReturnType<typeof useParallaxContext> = null;
    function Probe() {
      ctx = useParallaxContext();
      return null;
    }
    render(createElement(ParallaxProvider, null, createElement(Probe)));
    expect(ctx).not.toBeNull();

    const end = beginWindowGesture();
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 0, clientY: 0 }));
    });
    expect(ctx!.nx.get()).toBe(0);

    end();
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 0, clientY: 0 }));
    });
    expect(ctx!.nx.get()).toBe(-0.5);
  });
});
