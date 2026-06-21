// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

let mockMono = true;
let mockReduced = true;

vi.mock('@/hooks/usePalette', () => ({
  useIsMono: () => mockMono,
  usePalette: () => (mockMono ? 'mono' : 'color'),
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => mockReduced };
});

import Plotter from '@/components/signature/Plotter';
import Halftone from '@/components/signature/Halftone';
import { strokeSet } from '@/lib/signature/plotter';

let rafSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockMono = true;
  mockReduced = true;

  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );

  // requestAnimationFrame spy that does NOT auto-invoke, so we can assert
  // whether an animation loop was *started* rather than how it runs.
  rafSpy = vi.fn(() => 1);
  vi.stubGlobal('requestAnimationFrame', rafSpy);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('reduced motion — Plotter', () => {
  it('does not apply the draw-on animation style when reduced motion is on', () => {
    mockReduced = true;
    const { container } = render(
      <Plotter generator={(s) => strokeSet(s, 3)} seed={1} animate />,
    );
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      // Static final frame: no animation, no dash offset set.
      expect((p as SVGElement).getAttribute('style') ?? '').not.toContain('animation');
      expect(p.getAttribute('pathLength')).toBeNull();
    }
    // No keyframes injected when not animating.
    expect(container.querySelector('style')).toBeNull();
  });

  it('applies the draw-on animation when animate is set and motion is allowed', () => {
    mockReduced = false;
    const { container } = render(
      <Plotter generator={(s) => strokeSet(s, 3)} seed={1} animate />,
    );
    const path = container.querySelector('path');
    expect(path).not.toBeNull();
    expect((path as SVGElement).getAttribute('style') ?? '').toContain('animation');
  });
});

describe('reduced motion — Halftone', () => {
  it('draws a single static frame and never re-arms a rAF loop', () => {
    mockReduced = true;
    render(<Halftone animate />);
    // The static draw path may schedule at most a debounce frame, but it must
    // never start the animation loop. With auto-invoke disabled, a static draw
    // does not call rAF at all (draw() runs synchronously once on mount).
    expect(rafSpy).not.toHaveBeenCalled();
  });
});
