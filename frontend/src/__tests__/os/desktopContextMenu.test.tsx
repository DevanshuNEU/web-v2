// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * Right-click (desktop context menu) regression test.
 *
 * The menu is wired with Radix `<ContextMenuTrigger asChild>`, which clones its
 * child to attach the contextmenu handler to a real DOM element. If a
 * context-only wrapper (e.g. ParallaxProvider) is ever inserted between the
 * trigger and the desktop <div>, the trigger has no host node to bind to and
 * right-click silently breaks. This test renders the REAL Desktop composition
 * (heavy leaf children mocked out) and asserts right-click opens the menu.
 */

// Heavy leaf children — render nothing so Desktop mounts fast. We keep the real
// DesktopContextMenu and ParallaxProvider, which are what this test exercises.
vi.mock('@/components/os/AnimatedBackground', () => ({ AnimatedBackground: () => null }));
vi.mock('@/components/os/Cursor', () => ({ default: () => null }));
vi.mock('@/components/os/Taskbar', () => ({ default: () => null }));
vi.mock('@/components/os/MenuBar', () => ({ default: () => null }));
vi.mock('@/components/os/DesktopIcons', () => ({ default: () => null }));
vi.mock('@/hooks/useKeyboardShortcuts', () => ({ useKeyboardShortcuts: () => {} }));
vi.mock('@/hooks/useMagnetic', () => ({ useMagneticField: () => {} }));

import Desktop from '@/components/os/Desktop';

beforeEach(() => {
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
  // Radix menus poke pointer-capture / scroll APIs jsdom doesn't implement.
  Element.prototype.hasPointerCapture = vi.fn(() => false) as never;
  Element.prototype.setPointerCapture = vi.fn() as never;
  Element.prototype.releasePointerCapture = vi.fn() as never;
  Element.prototype.scrollIntoView = vi.fn() as never;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('desktop right-click context menu', () => {
  it('opens the context menu on right-click of the desktop', async () => {
    const { container } = render(<Desktop><div data-testid="content" /></Desktop>);

    // The desktop surface is the trigger's bound host element.
    const surface = container.querySelector('.min-h-screen');
    expect(surface).not.toBeNull();

    fireEvent.contextMenu(surface as Element);

    // A menu item only renders once the trigger successfully opened the menu.
    expect(await screen.findByText('search devOS')).toBeInTheDocument();
  });
});
