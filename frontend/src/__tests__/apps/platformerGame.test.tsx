// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stubCanvas } from '../setup/canvas';
import GamesApp from '@/components/apps/GamesApp';
import type { World } from '@/components/apps/games/platformer/sim/world';
import { useMobileStore } from '@/store/mobileStore';

// The game-over test waits for the dying sequence on stubbed frames; give
// it room when the full suite runs in parallel.
vi.setConfig({ testTimeout: 15000 });

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
  return screen.findByTestId('platformer-root', {}, { timeout: 10000 });
}

/** Open the game and start an Endless run (the old Start). */
async function play(variant: 'mobile' | 'desktop') {
  const root = await open(variant);
  await userEvent.click(screen.getByRole('button', { name: 'Endless' }));
  return root;
}

/** Give the game's box a size, as the phone shell or a window would, and tell it. */
function sizeRoot(root: HTMLElement, w: number, h: number) {
  Object.defineProperty(root, 'clientWidth', { configurable: true, get: () => w });
  Object.defineProperty(root, 'clientHeight', { configurable: true, get: () => h });
  act(() => { window.dispatchEvent(new Event('resize')); });
}

describe('Main Character in the arcade', () => {
  it('opens on the title: Story, Endless, the leaderboard and sound, over the live scene', async () => {
    const root = await open('mobile');
    expect(root).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Main Character' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Story' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Endless' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leaderboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sound/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /main character, title screen/i })).toBeInTheDocument();
    // no controls until she plays
    expect(screen.queryByRole('button', { name: 'Jump' })).not.toBeInTheDocument();
    // the first frame bakes the night (sky, skyline, tiles) through the mocked canvas
  }, 15000);

  it('Story opens with the chapter card, typed; a tap finishes it, another starts 1-1 with memories, not lives', async () => {
    const root = await open('mobile');
    await userEvent.click(screen.getByRole('button', { name: 'Story' }));
    expect(root.dataset.status).toBe('card');
    expect(screen.getByRole('status')).toHaveTextContent(/boston/i);
    await userEvent.click(screen.getByRole('button', { name: 'Continue the story' }));
    expect(root.dataset.status).toBe('card');
    await userEvent.click(screen.getByRole('button', { name: 'Continue the story' }));
    expect(root.dataset.status).toBe('playing');
    expect(screen.getByText('Memories')).toBeInTheDocument();
    expect(screen.queryByText('Lives')).not.toBeInTheDocument();
  });

  it('has thumb controls with names and thumb sizes on a phone', async () => {
    await play('mobile');
    const left = screen.getByRole('button', { name: 'Run left' });
    const right = screen.getByRole('button', { name: 'Run right' });
    const jump = screen.getByRole('button', { name: 'Jump' });
    const dash = screen.getByRole('button', { name: 'Dash' });
    for (const b of [left, right, dash]) expect(parseInt(b.style.width, 10)).toBeGreaterThanOrEqual(64);
    expect(parseInt(jump.style.width, 10)).toBeGreaterThanOrEqual(88);
    expect(screen.getByText('Lives')).toBeInTheDocument();
  });

  it('starts, then pauses and resumes from the pause button', async () => {
    await play('mobile');
    expect(screen.queryByRole('heading', { name: 'Main Character' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/world 1, \w/i);
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(screen.queryByRole('heading', { name: 'Paused' })).not.toBeInTheDocument();
  });

  it('holding Run right and pressing Jump at once both reach the hero', async () => {
    await play('mobile');
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
    await play('mobile');
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

  it('on desktop: no thumb deck, a keyboard hint, Space through the card into play, P pauses', async () => {
    const root = await open('desktop');
    expect(screen.queryByRole('button', { name: 'Jump' })).not.toBeInTheDocument();
    expect(screen.getByText(/arrows to run\. space to jump/i)).toBeInTheDocument();
    fireEvent.keyDown(root, { key: ' ' });
    expect(root.dataset.status).toBe('card');
    fireEvent.keyDown(root, { key: 'Enter' });
    fireEvent.keyDown(root, { key: 'Enter' });
    expect(root.dataset.status).toBe('playing');
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
    const root = await play('desktop');
    fireEvent.blur(root, { relatedTarget: null });
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
  });

  it('Endless shows the game over card with the score after the last life', async () => {
    await play('desktop');
    act(() => {
      const w = dev().world();
      w.stats.coins = 7;
      w.lives = 1;
      w.hero.y = 30; // into the pit
    });
    // Wait for the outcome, not a fixed time: under a busy full-suite run the
    // stubbed frames arrive late and 1.7 s of wall time was sometimes not
    // enough game time for the dying sequence.
    expect(await screen.findByRole('heading', { name: 'Out of lives' }, { timeout: 10000 })).toBeInTheDocument();
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
    const root = await play('mobile');
    sizeRoot(root, 390, 800);
    expect(screen.getByRole('button', { name: 'Run left' })).toBeInTheDocument();
    expect(screen.queryByTestId('move-zone')).not.toBeInTheDocument();
    expect(useMobileStore.getState().immersive).toBe(false);
  });

  it('portrait first run: the stats bar steps aside so the control labels never cover it', async () => {
    localStorage.removeItem('devos-mc-controls');
    const root = await play('mobile');
    sizeRoot(root, 390, 800);
    const strip = screen.getByTestId('stat-strip');
    expect(strip).toHaveClass('invisible');
    expect(strip).toHaveAttribute('aria-hidden', 'true');
    // Once she has played, the stats come back.
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Jump' }), { pointerId: 1 });
    fireEvent.pointerUp(screen.getByRole('button', { name: 'Jump' }), { pointerId: 1 });
    expect(screen.getByTestId('stat-strip')).not.toHaveClass('invisible');
  });

  it('a phone on its side goes full bleed: thumb overlay, no deck, shell chrome hidden', async () => {
    const root = await play('mobile');
    sizeRoot(root, 844, 346);
    expect(screen.getByTestId('move-zone')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run left' })).not.toBeInTheDocument();
    for (const name of ['Jump', 'Dash']) expect(screen.getByRole('button', { name })).toBeInTheDocument();
    // Attack shows exactly when she has the blade, so no button ever does nothing
    const blade = !!(dev().world() as unknown as { abilities?: { blade?: boolean } }).abilities?.blade;
    expect(!!screen.queryByRole('button', { name: 'Attack' })).toBe(blade);
    expect(useMobileStore.getState().immersive).toBe(true);
    expect(screen.getByTestId('platformer-view')).toHaveClass('absolute', 'inset-0');
  });

  it('in landscape the game keeps its own way out and a pause control', async () => {
    const root = await open('mobile');
    sizeRoot(root, 844, 346);
    expect(screen.getByRole('button', { name: 'Back to arcade' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Endless' }));
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
  });

  it('the overlay thumbs drive the hero', async () => {
    const root = await open('mobile');
    sizeRoot(root, 844, 346);
    await userEvent.click(screen.getByRole('button', { name: 'Endless' }));
    const zone = screen.getByTestId('move-zone');
    fireEvent.pointerDown(zone, { pointerId: 1, clientX: 100 });
    fireEvent.pointerMove(zone, { pointerId: 1, clientX: 160 });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Jump' }), { pointerId: 2 });
    await frames(6);
    expect(dev().world().hero.vx).toBeGreaterThan(0);
    expect(dev().world().hero.vy).toBeLessThan(0);
  });

  it('turning back upright restores the deck and the shell chrome', async () => {
    const root = await play('mobile');
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
    expect(screen.getByText(/arrows to run/i)).toBeInTheDocument();
    expect(useMobileStore.getState().immersive).toBe(false);
  });
});
