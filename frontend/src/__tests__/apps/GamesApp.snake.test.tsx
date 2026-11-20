// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GamesApp from '@/components/apps/GamesApp';
import { stubCanvas } from '../setup/canvas';

/**
 * Snake gained touch controls (swipe + on-screen D-pad) so it's playable on a
 * phone. This asserts the D-pad renders and the controls hint reflects touch.
 * jsdom has no canvas, so stub a minimal 2D context the draw loop calls.
 */

beforeEach(() => {
  stubCanvas();
});

describe('Snake — mobile touch controls', () => {
  it('on a phone: swipes only, no D-pad, and a pause button in the header', async () => {
    render(<GamesApp variant="mobile" />);
    await userEvent.click(screen.getByText('Sigma Snake'));
    await screen.findByTestId('snake-root');

    for (const d of ['Move up', 'Move left', 'Move down', 'Move right']) {
      expect(screen.queryByLabelText(d)).not.toBeInTheDocument();
    }
    expect(screen.getByText(/swipe anywhere to steer/i)).toBeInTheDocument();
    // No pause button until a round is running.
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Start' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
  });

  it('keeps the D-pad on desktop', async () => {
    render(<GamesApp variant="desktop" />);
    await userEvent.click(screen.getByText('Sigma Snake'));
    await screen.findByTestId('snake-root');
    expect(screen.getByLabelText('Move up')).toBeInTheDocument();
  });

  it('shows keyboard hints (not touch) in the desktop variant', async () => {
    render(<GamesApp variant="desktop" />);
    await userEvent.click(screen.getByText('Sigma Snake'));
    await screen.findByTestId('snake-root');
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
    await userEvent.click(screen.getByText('Sigma Snake'));
    return screen.findByTestId('snake-root');
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

/**
 * Snake moved too fast on phones (a fixed 140ms tick). The start screen now
 * offers Chill / Classic / Fast, defaults to Chill on phones, and remembers
 * the choice.
 */
describe('Snake: speed picker', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to Chill on a phone', async () => {
    render(<GamesApp variant="mobile" />);
    await userEvent.click(screen.getByText('Sigma Snake'));
    await screen.findByTestId('snake-root');
    expect(screen.getByRole('radio', { name: 'Chill' })).toBeChecked();
  });

  it('defaults to Classic on desktop', async () => {
    render(<GamesApp variant="desktop" />);
    await userEvent.click(screen.getByText('Sigma Snake'));
    await screen.findByTestId('snake-root');
    expect(screen.getByRole('radio', { name: 'Classic' })).toBeChecked();
  });

  it('remembers the speed she picked', async () => {
    const { unmount } = render(<GamesApp variant="mobile" />);
    await userEvent.click(screen.getByText('Sigma Snake'));
    await screen.findByTestId('snake-root');
    await userEvent.click(screen.getByRole('radio', { name: 'Fast' }));
    expect(localStorage.getItem('devos-snake-speed')).toBe('fast');
    unmount();
    render(<GamesApp variant="mobile" />);
    await userEvent.click(screen.getByText('Sigma Snake'));
    await screen.findByTestId('snake-root');
    expect(screen.getByRole('radio', { name: 'Fast' })).toBeChecked();
  });
});
