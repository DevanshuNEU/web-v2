// @vitest-environment jsdom

import '../setup/dom';
import { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { appRegistry } from '@/lib/appRegistry';

/**
 * Render smoke test.
 *
 * Mounts every app registered in appRegistry and asserts it renders without
 * throwing. Logic/unit tests and `next build` do not open app windows, so a
 * component that crashes at render slips through them. This catches that class
 * of bug (e.g. a "<App> crashed" ErrorBoundary screen) before it ships.
 *
 * Data-fetching apps are held in their loading state via a never-resolving
 * fetch, so this checks mount/render, not data-shape handling.
 */

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), message: vi.fn() },
}));

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  // jsdom has no matchMedia; some hooks (e.g. reduced-motion) call it.
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const appTypes = Object.keys(appRegistry) as (keyof typeof appRegistry)[];

describe('app render smoke test', () => {
  it.each(appTypes)('mounts "%s" without throwing', async (appType) => {
    const Component = appRegistry[appType].component;
    const { container } = render(
      <Suspense fallback={<span data-testid="suspense-fallback" />}>
        <Component />
      </Suspense>
    );

    // Wait for the lazy chunk to resolve (fallback gone). If the component
    // throws on render, this flush surfaces the error and the test fails.
    await waitFor(
      () => expect(screen.queryByTestId('suspense-fallback')).not.toBeInTheDocument(),
      { timeout: 5000 }
    );

    expect(container).not.toBeEmptyDOMElement();
  });
});
