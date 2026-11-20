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

async function openTower(variant: 'mobile' | 'desktop' = 'mobile') {
  render(
    <>
      <button type="button">Elsewhere</button>
      <GamesApp variant={variant} />
    </>,
  );
  await userEvent.click(screen.getByText('Aura Tower'));
  return screen.getByTestId('stacker-root');
}

const play = () => screen.getByTestId('stacker-play');
const floorsLabel = () => screen.getByRole('img', { name: /^Aura Tower, \d+ floors? stacked$/ }).getAttribute('aria-label');
const status = () => screen.getByRole('status').textContent;

describe('Aura Tower: start screen', () => {
  it('opens from the arcade with a named root that takes focus', async () => {
    const root = await openTower();
    expect(root).toHaveAttribute('aria-label', 'Aura Tower');
    expect(root).toHaveFocus();
  });

  it('shows the title, how to play, Start, the sound toggle and the board link', async () => {
    await openTower();
    expect(screen.getByRole('heading', { name: 'Aura Tower' })).toBeInTheDocument();
    expect(screen.getByText(/drop each slab on the one below/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sound off' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'See the board' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to arcade' })).toBeInTheDocument();
    expect(floorsLabel()).toBe('Aura Tower, 0 floors stacked');
  });

  it('says tap on a phone and Space on desktop', async () => {
    await openTower('mobile');
    expect(screen.getByText('Tap anywhere to drop')).toBeInTheDocument();
  });

  it('shows the keyboard hint on desktop', async () => {
    await openTower('desktop');
    expect(screen.getByText(/space or click to drop/i)).toBeInTheDocument();
  });

  it('the play area cannot scroll, zoom or select', async () => {
    await openTower();
    expect(play().className).toMatch(/touch-none/);
    expect(play().className).toMatch(/select-none/);
    expect(play().className).toMatch(/overscroll-contain/);
  });
});

describe('Aura Tower: taps', () => {
  it('a tap on the start screen starts the round without dropping a slab', async () => {
    await openTower();
    fireEvent.pointerDown(play(), { pointerType: 'touch' });
    expect(status()).toBe('Aura Tower started.');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(floorsLabel()).toBe('Aura Tower, 0 floors stacked');
  });

  it('the Start button starts the round without dropping a slab', async () => {
    await openTower();
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(status()).toBe('Aura Tower started.');
    expect(floorsLabel()).toBe('Aura Tower, 0 floors stacked');
  });

  it('one tap drops exactly one slab, and the click that follows drops nothing', async () => {
    await openTower();
    fireEvent.pointerDown(play(), { pointerType: 'touch' });
    fireEvent.pointerDown(play(), { pointerType: 'touch' });
    fireEvent.pointerUp(play(), { pointerType: 'touch' });
    fireEvent.click(play());
    expect(floorsLabel()).toBe('Aura Tower, 1 floor stacked');
  });

  it('pressing Pause does not drop a slab', async () => {
    await openTower();
    fireEvent.pointerDown(play());
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
    expect(floorsLabel()).toBe('Aura Tower, 0 floors stacked');
  });

  it('a tap on the pause screen resumes without dropping', async () => {
    await openTower();
    fireEvent.pointerDown(play());
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.pointerDown(play());
    expect(status()).toBe('Aura Tower started.');
    expect(floorsLabel()).toBe('Aura Tower, 0 floors stacked');
  });

  it('a miss ends the round, saves the best and shows the result card', async () => {
    await openTower();
    // Animation frames run on a fake clock from here, so the fall animation
    // takes the same simulated time however busy the machine is.
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      fireEvent.pointerDown(play());
      // The first slab always lands (a full width slab cannot miss). The second
      // comes in from the far right over a narrow top, so an instant tap misses.
      fireEvent.pointerDown(play());
      fireEvent.pointerDown(play());
      await act(async () => { vi.advanceTimersByTime(5000); });
    } finally {
      vi.useRealTimers();
    }
    expect(await screen.findByRole('button', { name: 'Play again' })).toBeInTheDocument();
    expect(status()).toBe('Game over. 1 floor.');
    expect(localStorage.getItem('devos-stacker-hs')).toBe('1');
    expect(screen.getByText(/floor stacked, a new best/)).toBeInTheDocument();
    // Taps on the result card scrim do not restart or drop.
    fireEvent.pointerDown(play());
    expect(status()).toBe('Game over. 1 floor.');
  });
});

describe('Aura Tower: keyboard and pausing', () => {
  it('Space starts, then drops one slab per press, ignoring key repeat', async () => {
    const root = await openTower('desktop');
    fireEvent.keyDown(root, { key: ' ' });
    expect(status()).toBe('Aura Tower started.');
    expect(floorsLabel()).toBe('Aura Tower, 0 floors stacked');
    expect(fireEvent.keyDown(root, { key: ' ' })).toBe(false);
    fireEvent.keyDown(root, { key: ' ', repeat: true });
    fireEvent.keyDown(root, { key: ' ', repeat: true });
    expect(floorsLabel()).toBe('Aura Tower, 1 floor stacked');
  });

  it('P pauses and resumes', async () => {
    const root = await openTower('desktop');
    fireEvent.keyDown(root, { key: ' ' });
    fireEvent.keyDown(root, { key: 'p' });
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
    fireEvent.keyDown(root, { key: 'p' });
    expect(status()).toBe('Aura Tower started.');
  });

  it('pauses when focus leaves the game', async () => {
    await openTower();
    fireEvent.pointerDown(play());
    act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus());
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
  });

  it('pauses when the page is hidden', async () => {
    await openTower();
    fireEvent.pointerDown(play());
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    hidden.mockRestore();
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
  });

  it('opens and closes the leaderboard from the start screen', async () => {
    await openTower();
    await userEvent.click(screen.getByRole('button', { name: 'See the board' }));
    expect(screen.getByRole('dialog', { name: 'Aura Tower leaderboard' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close leaderboard' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
