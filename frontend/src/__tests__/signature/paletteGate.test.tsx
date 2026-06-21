// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

// Mono state is driven per-test via this mock.
let mockMono = true;
vi.mock('@/hooks/usePalette', () => ({
  useIsMono: () => mockMono,
  usePalette: () => (mockMono ? 'mono' : 'color'),
}));

import Dither from '@/components/signature/Dither';
import Halftone from '@/components/signature/Halftone';

beforeEach(() => {
  mockMono = true;

  // jsdom lacks canvas — stub a minimal 2D context.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
    createImageData: vi.fn((w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    })),
    putImageData: vi.fn(),
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
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('palette hard-gate', () => {
  it('Dither renders a plain <img> fallback in the color palette', () => {
    mockMono = false;
    const { container } = render(<Dither src="/x.png" alt="x" />);
    expect(container.querySelector('img')).not.toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('Dither renders a <canvas> in the mono palette', () => {
    mockMono = true;
    const { container } = render(<Dither src="/x.png" alt="x" />);
    expect(container.querySelector('canvas')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('Halftone renders no canvas in the color palette', () => {
    mockMono = false;
    const { container } = render(<Halftone />);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('Halftone renders a canvas in the mono palette', () => {
    mockMono = true;
    const { container } = render(<Halftone />);
    expect(container.querySelector('canvas')).not.toBeNull();
  });
});
