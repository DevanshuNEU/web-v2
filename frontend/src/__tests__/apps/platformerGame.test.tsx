// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stubCanvas } from '../setup/canvas';
import GamesApp from '@/components/apps/GamesApp';
import type { World } from '@/components/apps/games/platformer/sim/world';
import { useMobileStore } from '@/store/mobileStore';

beforeEach(() => {
  stubCanvas();
  localStorage.clear();
  // jsdom stamps rAF callbacks with a clock that lags performance.now(); real
  // browsers share one origin. Use performance.now() so the loop steps at once.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'offline', message: 'x' } }), { status: 503 })));
});

const dev = () => (window as unknown as { __baguettino: { world: () => World } }).__baguettino;
const frames = (n = 4) => act(() => new Promise<void>(r => {
  let i = 0;
  const f = () => (++i >= n ? r() : requestAnimationFrame(f));
  requestAnimationFrame(f);
}));

async function open(variant: 'mobile' | 'desktop') {
  render(<GamesApp variant={variant} />);
  await userEvent.click(screen.getByText('Main Character'));
  return screen.findByTestId('platformer-root');
}

/** Give the game's box a size, as the phone shell or a window would, and tell it. */
function sizeRoot(root: HTMLElement, w: number, h: number) {
  Object.defineProperty(root, 'clientWidth', { configurable: true, get: () => w });
  Object.defineProperty(root, 'clientHeight', { configurable: true, get: () => h });
  act(() => { window.dispatchEvent(new Event('resize')); });
}

describe('Main Character in the arcade', () => {
  it('opens on a start screen with the title, how to play, sound and Start', async () => {
    const root = await open('mobile');
    expect(root).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Main Character' })).toBeInTheDocument();
    expect(screen.getByText(/left thumb runs, right thumb jumps/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sound/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /main character, world 1/i })).toBeInTheDocument();
  });

  it('has thumb controls with names and thumb sizes on a phone', async () => {
    await open('mobile');
    const left = screen.getByRole('button', { name: 'Run left' });
    const right = screen.getByRole('button', { name: 'Run right' });
    const jump = screen.getByRole('button', { name: 'Jump' });
    const dash = screen.getByRole('button', { name: 'Dash' });
    for (const b of [left, right, dash]) expect(parseInt(b.style.width, 10)).toBeGreaterThanOrEqual(64);
    expect(parseInt(jump.style.width, 10)).toBeGreaterThanOrEqual(80);
  });

  it('starts, then pauses and resumes from the pause button', async () => {
    await open('mobile');
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.queryByRole('heading', { name: 'Main Character' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/world 1, touch grass/i);
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(screen.queryByRole('heading', { name: 'Paused' })).not.toBeInTheDocument();
  });

  it('holding Run right and pressing Jump at once both reach the hero', async () => {
    await open('mobile');
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    const right = screen.getByRole('button', { name: 'Run right' });
    const jump = screen.getByRole('button', { name: 'Jump' });
    const x0 = dev().world().hero.x;
    fireEvent.pointerDown(right, { pointerId: 1, clientX: 9999 });
    fireEvent.pointerDown(jump, { pointerId: 2 });
    await frames(6);
    const w = dev().world();
    expect(w.hero.x).toBeGreaterThan(x0);
    expect(w.hero.vx).toBeGreaterThan(0);
    expect(w.hero.vy).toBeLessThan(0);
    fireEvent.pointerUp(jump, { pointerId: 2 });
    fireEvent.pointerUp(right, { pointerId: 1 });
    await frames(30);
    expect(dev().world().hero.vx).toBe(0);
  });

  it('the run pad follows a thumb sliding from Left to Right without lifting', async () => {
    await open('mobile');
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    const left = screen.getByRole('button', { name: 'Run left' });
    const pad = left.parentElement!;
    pad.getBoundingClientRect = () => ({ left: 0, width: 160, top: 0, height: 76, right: 160, bottom: 76, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(left, { pointerId: 5, clientX: 30 });
    await frames(3);
    expect(dev().world().hero.vx).toBeLessThan(0);
    fireEvent.pointerMove(pad, { pointerId: 5, clientX: 130 });
    await frames(8);
    expect(dev().world().hero.vx).toBeGreaterThan(0);
    expect(dev().world().hero.facing).toBe(1);
  });

  it('on desktop: no thumb deck, a keyboard hint, Space starts and P pauses', async () => {
    const root = await open('desktop');
    expect(screen.queryByRole('button', { name: 'Jump' })).not.toBeInTheDocument();
    expect(screen.getByText(/arrows or a and d to run/i)).toBeInTheDocument();
    fireEvent.keyDown(root, { key: ' ' });
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();
    fireEvent.keyDown(root, { key: 'ArrowRight' });
    await frames(4);
    expect(dev().world().hero.vx).toBeGreaterThan(0);
    fireEvent.keyUp(root, { key: 'ArrowRight' });
    fireEvent.keyDown(root, { key: 'p' });
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(screen.queryByRole('heading', { name: 'Paused' })).not.toBeInTheDocument();
  });

  it('pauses when focus leaves the game', async () => {
    const root = await open('desktop');
    fireEvent.keyDown(root, { key: ' ' });
    fireEvent.blur(root, { relatedTarget: null });
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
  });

  it('shows the game over card with the score after the last life', async () => {
    const root = await open('desktop');
    fireEvent.keyDown(root, { key: ' ' });
    act(() => {
      const w = dev().world();
      w.stats.coins = 7;
      w.lives = 1;
      w.hero.y = 30; // into the pit
    });
    await act(async () => { await new Promise(r => setTimeout(r, 1700)); });
    expect(await screen.findByRole('heading', { name: 'Out of lives' })).toBeInTheDocument();
    expect(screen.getAllByText('70').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
  });
});

describe('Main Character layouts and the phone shell', () => {
  beforeEach(() => {
    useMobileStore.setState({ locked: false, openApps: [], openAppType: null, immersive: false });
    useMobileStore.getState().openApp('games');
  });

  it('a portrait phone keeps the control deck under the view and the shell chrome', async () => {
    const root = await open('mobile');
    sizeRoot(root, 390, 800);
    expect(screen.getByRole('button', { name: 'Run left' })).toBeInTheDocument();
    expect(screen.queryByTestId('move-zone')).not.toBeInTheDocument();
    expect(useMobileStore.getState().immersive).toBe(false);
  });

  it('a phone on its side goes full bleed: thumb overlay, no deck, shell chrome hidden', async () => {
    const root = await open('mobile');
    sizeRoot(root, 844, 346);
    expect(screen.getByTestId('move-zone')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run left' })).not.toBeInTheDocument();
    for (const name of ['Jump', 'Dash', 'Action']) expect(screen.getByRole('button', { name })).toBeInTheDocument();
    expect(useMobileStore.getState().immersive).toBe(true);
    expect(screen.getByTestId('platformer-view')).toHaveClass('absolute', 'inset-0');
  });

  it('in landscape the game keeps its own way out and a pause control', async () => {
    const root = await open('mobile');
    sizeRoot(root, 844, 346);
    expect(screen.getByRole('button', { name: 'Back to arcade' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
  });

  it('the overlay thumbs drive the hero', async () => {
    const root = await open('mobile');
    sizeRoot(root, 844, 346);
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    const zone = screen.getByTestId('move-zone');
    fireEvent.pointerDown(zone, { pointerId: 1, clientX: 100 });
    fireEvent.pointerMove(zone, { pointerId: 1, clientX: 160 });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Jump' }), { pointerId: 2 });
    await frames(6);
    expect(dev().world().hero.vx).toBeGreaterThan(0);
    expect(dev().world().hero.vy).toBeLessThan(0);
  });

  it('turning back upright restores the deck and the shell chrome', async () => {
    const root = await open('mobile');
    sizeRoot(root, 844, 346);
    expect(useMobileStore.getState().immersive).toBe(true);
    sizeRoot(root, 390, 800);
    expect(useMobileStore.getState().immersive).toBe(false);
    expect(screen.getByRole('button', { name: 'Run left' })).toBeInTheDocument();
  });

  it('leaving the game for the launcher restores the shell chrome', async () => {
    const root = await open('mobile');
    sizeRoot(root, 844, 346);
    await userEvent.click(screen.getByRole('button', { name: 'Back to arcade' }));
    expect(await screen.findByText('Sigma Snake')).toBeInTheDocument();
    expect(useMobileStore.getState().immersive).toBe(false);
  });

  it('a wide desktop window keeps the desktop layout and never touches the phone shell', async () => {
    const root = await open('desktop');
    sizeRoot(root, 1000, 600);
    expect(screen.queryByTestId('move-zone')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Jump' })).not.toBeInTheDocument();
    expect(screen.getByText(/arrows or a and d to run/i)).toBeInTheDocument();
    expect(useMobileStore.getState().immersive).toBe(false);
  });
});
