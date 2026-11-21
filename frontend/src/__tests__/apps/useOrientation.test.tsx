// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect } from 'vitest';
import { useRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import { orientationOf, useOrientation } from '@/components/apps/games/shared/useOrientation';

function Probe() {
  const ref = useRef<HTMLDivElement>(null);
  const o = useOrientation(ref);
  return <div ref={ref} data-testid="box">{o}</div>;
}

function size(el: HTMLElement, w: number, h: number) {
  Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => w });
  Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => h });
}

describe('useOrientation', () => {
  it('wider than tall is landscape, otherwise portrait (a square is portrait)', () => {
    expect(orientationOf(844, 346)).toBe('landscape');
    expect(orientationOf(390, 800)).toBe('portrait');
    expect(orientationOf(500, 500)).toBe('portrait');
  });

  it('reads the container, not the device, and follows resize and orientationchange', () => {
    render(<Probe />);
    const box = screen.getByTestId('box');
    expect(box).toHaveTextContent('portrait');
    size(box, 844, 346);
    act(() => { window.dispatchEvent(new Event('orientationchange')); });
    expect(box).toHaveTextContent('landscape');
    size(box, 390, 800);
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(box).toHaveTextContent('portrait');
  });

  it('a container with no size yet stays portrait', () => {
    render(<Probe />);
    const box = screen.getByTestId('box');
    size(box, 0, 0);
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(box).toHaveTextContent('portrait');
  });
});
