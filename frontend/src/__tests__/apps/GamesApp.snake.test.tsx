// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GamesApp from '@/components/apps/GamesApp';

/**
 * Snake gained touch controls (swipe + on-screen D-pad) so it's playable on a
 * phone. This asserts the D-pad renders and the controls hint reflects touch.
 * jsdom has no canvas, so stub a minimal 2D context the draw loop calls.
 */

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillStyle: '',
    strokeStyle: '',
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe('Snake — mobile touch controls', () => {
  it('renders the on-screen D-pad and the touch hint in the mobile variant', async () => {
    render(<GamesApp variant="mobile" />);
    await userEvent.click(screen.getByText('Snake'));

    expect(screen.getByLabelText('Move up')).toBeInTheDocument();
    expect(screen.getByLabelText('Move left')).toBeInTheDocument();
    expect(screen.getByLabelText('Move down')).toBeInTheDocument();
    expect(screen.getByLabelText('Move right')).toBeInTheDocument();
    // Mobile variant shows the touch hint, never the keyboard "P pause" / WASD text.
    expect(screen.getByText(/swipe or tap the controls/i)).toBeInTheDocument();
  });

  it('shows keyboard hints (not touch) in the desktop variant', async () => {
    render(<GamesApp variant="desktop" />);
    await userEvent.click(screen.getByText('Snake'));
    expect(screen.getByText(/arrow keys or wasd to steer/i)).toBeInTheDocument();
  });
});

/**
 * Snake used to listen on window and preventDefault arrow keys and Space for
 * the whole desktop, so no other window could scroll while Snake was open.
 * Keys are now handled on the focused game root only.
 */
describe('Snake: keys stay inside the game', () => {
  async function openSnake() {
    render(
      <>
        <div data-testid="other-window" tabIndex={0} style={{ overflow: 'auto', height: 100 }}>
          <div style={{ height: 1000 }}>Preferences content</div>
        </div>
        <GamesApp variant="desktop" />
      </>,
    );
    await userEvent.click(screen.getByText('Snake'));
    return screen.getByTestId('snake-root');
  }

  it('takes focus when opened', async () => {
    const root = await openSnake();
    expect(root).toHaveFocus();
  });

  it('does not block arrow keys or Space in another window (Preferences can scroll)', async () => {
    await openSnake();
    const other = screen.getByTestId('other-window');
    act(() => other.focus());
    for (const key of ['ArrowDown', 'ArrowUp', ' ', 'PageDown']) {
      // fireEvent returns false when a listener called preventDefault.
      const notPrevented = fireEvent.keyDown(other, { key });
      expect(notPrevented).toBe(true);
      expect(fireEvent.keyDown(window, { key })).toBe(true);
    }
  });

  it('handles arrow keys and Space when the game has focus', async () => {
    const root = await openSnake();
    expect(fireEvent.keyDown(root, { key: 'ArrowDown' })).toBe(false);
    // Space on the focused root starts the game from idle.
    expect(screen.getAllByRole('button', { name: 'Start' }).length).toBeGreaterThan(0);
    fireEvent.keyDown(root, { key: ' ' });
    expect(screen.getAllByRole('button', { name: 'Pause' }).length).toBeGreaterThan(0);
    // Space again pauses.
    fireEvent.keyDown(root, { key: ' ' });
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
  });

  it('leaves Space on a focused button to that button (Space can press Start)', async () => {
    const root = await openSnake();
    const start = screen.getAllByRole('button', { name: 'Start' })[0];
    act(() => start.focus());
    // The game does not swallow Space here, so the browser presses the button.
    expect(fireEvent.keyDown(start, { key: ' ' })).toBe(true);
    await userEvent.keyboard(' ');
    expect(screen.getAllByRole('button', { name: 'Pause' }).length).toBeGreaterThan(0);
    expect(root).toHaveFocus();
  });

  it('pauses when focus leaves the game', async () => {
    const root = await openSnake();
    fireEvent.keyDown(root, { key: ' ' });
    expect(screen.getAllByRole('button', { name: 'Pause' }).length).toBeGreaterThan(0);
    act(() => screen.getByTestId('other-window').focus());
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
  });
});
