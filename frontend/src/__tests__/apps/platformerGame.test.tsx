// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stubCanvas } from '../setup/canvas';
import GamesApp from '@/components/apps/GamesApp';
import type { World } from '@/components/apps/games/platformer/logic';

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
  await userEvent.click(screen.getByText('Baguettino Run'));
  return screen.getByTestId('platformer-root');
}

describe('Baguettino Run in the arcade', () => {
  it('opens on a start screen with the title, how to play, sound and Start', async () => {
    const root = await open('mobile');
    expect(root).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Baguettino Run' })).toBeInTheDocument();
    expect(screen.getByText(/left thumb runs, right thumb jumps/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sound/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /baguettino run, world 1/i })).toBeInTheDocument();
  });

  it('has thumb controls with names and thumb sizes on a phone', async () => {
    await open('mobile');
    const left = screen.getByRole('button', { name: 'Run left' });
    const right = screen.getByRole('button', { name: 'Run right' });
    const jump = screen.getByRole('button', { name: 'Jump' });
    for (const b of [left, right]) expect(parseInt(b.style.width, 10)).toBeGreaterThanOrEqual(64);
    expect(parseInt(jump.style.width, 10)).toBeGreaterThanOrEqual(80);
  });

  it('starts, then pauses and resumes from the pause button', async () => {
    await open('mobile');
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.queryByRole('heading', { name: 'Baguettino Run' })).not.toBeInTheDocument();
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
    expect(w.input.right).toBe(true);
    expect(w.input.jump).toBe(true);
    expect(w.hero.x).toBeGreaterThan(x0);
    expect(w.hero.vy).toBeLessThan(0);
    fireEvent.pointerUp(jump, { pointerId: 2 });
    fireEvent.pointerUp(right, { pointerId: 1 });
    await frames(2);
    expect(dev().world().input.right).toBe(false);
  });

  it('the run pad follows a thumb sliding from Left to Right without lifting', async () => {
    await open('mobile');
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    const left = screen.getByRole('button', { name: 'Run left' });
    const pad = left.parentElement!;
    pad.getBoundingClientRect = () => ({ left: 0, width: 160, top: 0, height: 76, right: 160, bottom: 76, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(left, { pointerId: 5, clientX: 30 });
    await frames(2);
    expect(dev().world().input.left).toBe(true);
    fireEvent.pointerMove(pad, { pointerId: 5, clientX: 130 });
    await frames(2);
    expect(dev().world().input.left).toBe(false);
    expect(dev().world().input.right).toBe(true);
  });

  it('on desktop: no thumb deck, a keyboard hint, Space starts and P pauses', async () => {
    const root = await open('desktop');
    expect(screen.queryByRole('button', { name: 'Jump' })).not.toBeInTheDocument();
    expect(screen.getByText(/arrows or a and d to run/i)).toBeInTheDocument();
    fireEvent.keyDown(root, { key: ' ' });
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();
    fireEvent.keyDown(root, { key: 'ArrowRight' });
    await frames(4);
    expect(dev().world().input.right).toBe(true);
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
