// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stubCanvas } from '../setup/canvas';

import GamesApp from '@/components/apps/GamesApp';

beforeEach(() => {
  stubCanvas();
  localStorage.clear();
  // The leaderboard is unreachable in tests; the game must not care.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function openMerge(variant: 'mobile' | 'desktop' = 'mobile') {
  render(<GamesApp variant={variant} />);
  await userEvent.click(screen.getByText('Brainrot Evolution'));
  return screen.findByTestId('merge-root');
}

/** With rand pinned at 0 the game starts with two Pebble Rizzos in the top-left cells. */
async function startPinned() {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const root = await openMerge();
  await userEvent.click(screen.getByRole('button', { name: 'Start' }));
  return root;
}

describe('Brainrot Evolution: start screen', () => {
  it('opens from the arcade with a named root that takes focus', async () => {
    const root = await openMerge();
    expect(root).toHaveAttribute('aria-label', 'Brainrot Evolution');
    expect(root).toHaveFocus();
  });

  it('shows the title, how to play, Start, the sound toggle and the board link', async () => {
    await openMerge();
    expect(screen.getByRole('heading', { name: 'Brainrot Evolution' })).toBeInTheDocument();
    expect(screen.getByText(/swipe to slide\. two of a kind evolve/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sound off' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'See the board' })).toBeInTheDocument();
  });

  it('labels the board and the evolution chain', async () => {
    await openMerge();
    expect(screen.getByRole('img', { name: 'Brainrot Evolution board' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /evolution chain, \d of 9 reached/i })).toBeInTheDocument();
  });

  it('shows keyboard hints on desktop', async () => {
    await openMerge('desktop');
    expect(screen.getByText(/arrow keys or wasd to slide/i)).toBeInTheDocument();
  });
});

describe('Brainrot Evolution: playing', () => {
  it('starts, then pauses and resumes from the pause button', async () => {
    await startPinned();
    const pause = screen.getByRole('button', { name: 'Pause' });
    await userEvent.click(pause);
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('keeps the header controls named', async () => {
    await startPinned();
    expect(screen.getByRole('button', { name: 'Back to arcade' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset game' })).toBeInTheDocument();
  });

  it('an arrow key merges two Pebbles into a Croissantoni for 80 points', async () => {
    const root = await startPinned();
    expect(fireEvent.keyDown(root, { key: 'ArrowLeft' })).toBe(false);
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('New evolution: Croissantoni.');
    expect(screen.getByRole('img', { name: 'Evolution chain, 2 of 9 reached' })).toBeInTheDocument();
  });

  it('a swipe on the play area makes a move', async () => {
    await startPinned();
    const play = screen.getByTestId('merge-play');
    fireEvent.pointerDown(play, { pointerId: 1, clientX: 200, clientY: 300 });
    fireEvent.pointerMove(play, { pointerId: 1, clientX: 170, clientY: 302 });
    fireEvent.pointerUp(play, { pointerId: 1, clientX: 120, clientY: 302 });
    expect(screen.getByText('80')).toBeInTheDocument();
  });

  it('pauses when focus leaves the game', async () => {
    render(<div data-testid="elsewhere" tabIndex={0} />);
    await startPinned();
    act(() => screen.getByTestId('elsewhere').focus());
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
  });

  it('Space pauses while playing', async () => {
    const root = await startPinned();
    fireEvent.keyDown(root, { key: ' ' });
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
  });

  it('does not take arrow keys from other windows', async () => {
    render(<div data-testid="other" tabIndex={0} />);
    await startPinned();
    const other = screen.getByTestId('other');
    act(() => other.focus());
    expect(fireEvent.keyDown(other, { key: 'ArrowLeft' })).toBe(true);
  });
});
