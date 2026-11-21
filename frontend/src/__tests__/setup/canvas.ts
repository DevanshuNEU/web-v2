import { vi } from 'vitest';

/**
 * jsdom has no canvas. Stub a 2D context where every method is a no-op spy
 * and every property can be set, so game drawing code runs unchanged.
 * `measureText` returns a zero width and gradients return a stub.
 */
export function stubCanvas() {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => {
    const store: Record<string | symbol, unknown> = {
      measureText: vi.fn(() => ({ width: 0 })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createPattern: vi.fn(() => ({})),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    };
    return new Proxy(store, {
      get(t, p) {
        if (!(p in t)) t[p] = vi.fn();
        return t[p];
      },
      set(t, p, v) { t[p] = v; return true; },
    });
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}
