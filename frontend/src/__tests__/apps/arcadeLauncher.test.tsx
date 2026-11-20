// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GamesApp from '@/components/apps/GamesApp';
import { TouchButton } from '@/components/apps/games/shared/TouchButton';
import { useGameLoop, FIXED_DT } from '@/components/apps/games/shared/useGameLoop';
import { stubCanvas } from '../setup/canvas';

beforeEach(() => {
  localStorage.clear();
  stubCanvas();
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ game: 'platformer', all: [], week: [], me: null, token: 't' }) })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('Arcade launcher', () => {
  it('lists the five games, the platformer first, then the leaderboards', () => {
    render(<GamesApp variant="mobile" />);
    const rows = screen.getAllByTestId('index-row').map(r => r.querySelector('.font-display')?.textContent);
    expect(rows).toEqual(['Main Character', 'Sigma Snake', 'Aura Tower', 'Tetris', 'Type Racer']);
    expect(screen.getByRole('button', { name: /Leaderboards/ })).toBeInTheDocument();
    expect(screen.getByText('Five small games.')).toBeInTheDocument();
  });

  it('shows the phone controls line on mobile and the keyboard line on desktop', () => {
    const { unmount } = render(<GamesApp variant="mobile" />);
    expect(screen.getByText('Left thumb runs, right thumb jumps')).toBeInTheDocument();
    unmount();
    render(<GamesApp variant="desktop" />);
    expect(screen.getByText('Arrows to run. Space to jump, again in the air to double jump.')).toBeInTheDocument();
  });

  it('shows the best score saved on this device', () => {
    localStorage.setItem('devos-stacker-hs', '27');
    render(<GamesApp variant="mobile" />);
    expect(screen.getByText('27')).toBeInTheDocument();
    expect(screen.getByText('Best floors')).toBeInTheDocument();
  });

  it('opens the leaderboards with a tab per game and returns focus to the row on Back', async () => {
    render(<GamesApp variant="mobile" />);
    await userEvent.click(screen.getByRole('button', { name: /Leaderboards/ }));
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map(t => t.textContent)).toEqual(['Main Character', 'Sigma Snake', 'Aura Tower', 'This week', 'All time']);
    expect(await screen.findByText('No scores this week yet.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Aura Tower' }));
    expect(screen.getByRole('tab', { name: 'Aura Tower' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Back to arcade' }));
    expect(await screen.findByRole('button', { name: /Leaderboards/ })).toHaveFocus();
  });
});

describe('TouchButton', () => {
  it('presses on pointerdown and releases on pointerup, without waiting for a click', () => {
    const onPress = vi.fn(); const onRelease = vi.fn();
    render(<TouchButton label="Jump" onPress={onPress} onRelease={onRelease}>J</TouchButton>);
    const b = screen.getByRole('button', { name: 'Jump' });
    fireEvent.pointerDown(b, { pointerId: 1 });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onRelease).not.toHaveBeenCalled();
    fireEvent.pointerUp(b, { pointerId: 1 });
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it('releases when the finger slides off or the touch is cancelled', () => {
    const onRelease = vi.fn();
    render(<TouchButton label="Right" onPress={() => {}} onRelease={onRelease}>R</TouchButton>);
    const b = screen.getByRole('button', { name: 'Right' });
    fireEvent.pointerDown(b, { pointerId: 2 });
    fireEvent.pointerCancel(b, { pointerId: 2 });
    expect(onRelease).toHaveBeenCalledTimes(1);
    // A stray up after the cancel does not release twice.
    fireEvent.pointerUp(b, { pointerId: 2 });
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it('works from the keyboard (Enter arrives as a click with detail 0)', () => {
    const onPress = vi.fn(); const onRelease = vi.fn();
    render(<TouchButton label="Jump" onPress={onPress} onRelease={onRelease}>J</TouchButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Jump' }), { detail: 0 });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it('ignores the click a real tap sends after pointerdown, so one tap is one press', () => {
    const onPress = vi.fn();
    render(<TouchButton label="Jump" onPress={onPress}>J</TouchButton>);
    const b = screen.getByRole('button', { name: 'Jump' });
    fireEvent.pointerDown(b, { pointerId: 1 });
    fireEvent.pointerUp(b, { pointerId: 1 });
    fireEvent.click(b, { detail: 1 });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is at least 48px square by default (the thumb floor)', () => {
    render(<TouchButton label="Jump" onPress={() => {}}>J</TouchButton>);
    const style = screen.getByRole('button', { name: 'Jump' }).style;
    expect(parseInt(style.width, 10)).toBeGreaterThanOrEqual(48);
    expect(parseInt(style.height, 10)).toBeGreaterThanOrEqual(48);
  });
});

describe('useGameLoop', () => {
  it('runs fixed 120 Hz updates whatever the frame rate, and renders once per frame', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const update = vi.fn(); const render = vi.fn();
    renderHook(() => useGameLoop({ running: true, update, render }));
    act(() => { vi.advanceTimersByTime(1000); });
    // About 120 updates in a second of frames, each with the fixed dt.
    expect(update.mock.calls.length).toBeGreaterThanOrEqual(110);
    expect(update.mock.calls.length).toBeLessThanOrEqual(122);
    expect(update.mock.calls.every(c => c[0] === FIXED_DT)).toBe(true);
    expect(render.mock.calls.length).toBeGreaterThan(30);
  });

  it('does not run while stopped', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const update = vi.fn();
    renderHook(() => useGameLoop({ running: false, update, render: () => {} }));
    act(() => { vi.advanceTimersByTime(500); });
    expect(update).not.toHaveBeenCalled();
  });

  it('calls onHidden when the page is hidden', () => {
    const onHidden = vi.fn();
    renderHook(() => useGameLoop({ running: false, update: () => {}, render: () => {}, onHidden }));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onHidden).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });
});

describe('Sigma Snake, a full round', () => {
  it('starts, crashes into the wall, shows a fail line and the leaderboard card', async () => {
    render(<GamesApp variant="mobile" />);
    await userEvent.click(screen.getByText('Sigma Snake'));
    expect(await screen.findByRole('heading', { name: 'Sigma Snake' })).toBeInTheDocument();
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    expect(screen.getByRole('button', { name: 'Sound off' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Start' })[0]);
    // Chill speed: 220ms a move from x = 10 heading right, the wall is 10 moves away.
    await act(async () => { vi.advanceTimersByTime(4000); });
    expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'See the board' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Game over/);
  });

  it('pauses when she switches apps', async () => {
    render(<GamesApp variant="mobile" />);
    await userEvent.click(screen.getByText('Sigma Snake'));
    await screen.findByRole('heading', { name: 'Sigma Snake' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Start' })[0]);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
  });
});

describe('TouchButton when the browser refuses pointer capture', () => {
  it('still presses (capture is best effort)', () => {
    const onPress = vi.fn();
    render(<TouchButton label="Dash" onPress={onPress}>D</TouchButton>);
    const b = screen.getByRole('button', { name: 'Dash' });
    b.setPointerCapture = () => { throw new DOMException('No active pointer', 'NotFoundError'); };
    fireEvent.pointerDown(b, { pointerId: 7 });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('Arcade launcher: Main Character is the featured game', () => {
  it('tells the story and teaches the double jump in its copy', () => {
    render(<GamesApp variant="desktop" />);
    expect(screen.getByText('A night run across Boston, before sunrise.')).toBeInTheDocument();
    expect(screen.getByText('Arrows to run. Space to jump, again in the air to double jump.')).toBeInTheDocument();
  });

  it('marks the first game as featured and the rest as the grid', () => {
    render(<GamesApp variant="desktop" />);
    const rows = screen.getAllByTestId('index-row');
    expect(rows[0]).toHaveAttribute('data-featured', 'true');
    expect(rows.slice(1).every(r => r.getAttribute('data-featured') === 'false')).toBe(true);
  });
});
