// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stubCanvas } from '../setup/canvas';
import GamesApp from '@/components/apps/GamesApp';
import type { World } from '@/components/apps/games/platformer/sim/world';

/** How the view wires the sim and the music: seeds, reduced motion, tempo. */

const music = vi.hoisted(() => ({
  play: vi.fn(), stop: vi.fn(), setTempo: vi.fn(), setIntensity: vi.fn(), beat: vi.fn(() => 0), dispose: vi.fn(),
}));
vi.mock('@/components/apps/games/platformer/audio/music', () => ({ createMusic: () => music }));

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('framer-motion', async (orig) => ({ ...(await orig<typeof import('framer-motion')>()), useReducedMotion: () => motion.reduced }));

beforeEach(() => {
  stubCanvas();
  localStorage.clear();
  motion.reduced = false;
  for (const f of Object.values(music)) f.mockClear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'offline', message: 'x' } }), { status: 503 })));
});

const dev = () => (window as unknown as { __baguettino: { world: () => World; start: (i: number) => void } }).__baguettino;
const frames = (n = 4) => act(() => new Promise<void>(r => {
  let i = 0;
  const f = () => (++i >= n ? r() : requestAnimationFrame(f));
  requestAnimationFrame(f);
}));

async function start() {
  render(<GamesApp variant="mobile" />);
  await userEvent.click(screen.getByText('Main Character'));
  await screen.findByTestId('platformer-root');
  await userEvent.click(screen.getByRole('button', { name: 'Start' }));
}

describe('Main Character view wiring', () => {
  it('every new run gets a fresh seed, recorded on the world', async () => {
    await start();
    const a = dev().world().seed;
    act(() => dev().start(0));
    const b = dev().world().seed;
    act(() => dev().start(0));
    const c = dev().world().seed;
    expect(Number.isInteger(a)).toBe(true);
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it('reduced motion turns the hit freeze off', async () => {
    motion.reduced = true;
    await start();
    expect(dev().world().noFreeze).toBe(true);
  });

  it('without reduced motion the hit freeze stays on', async () => {
    await start();
    expect(dev().world().noFreeze).toBe(false);
  });

  it('world 1 plays the rooftops track at full intensity, follows tempo events, stops on pause', async () => {
    await start();
    expect(dev().world().level.theme).toBe('rooftops');
    expect(music.play).toHaveBeenCalledWith('rooftops');
    expect(music.setIntensity).toHaveBeenCalledWith(1);
    dev().world().events.push({ type: 'tempo', x: 0, y: 0, n: 1.25 });
    await frames(3);
    expect(music.setTempo).toHaveBeenCalledWith(1.25);
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(music.stop).toHaveBeenCalled();
  });

  it('the world 1 announcement points at the beacon, not a flag, and names the modifier', async () => {
    await start();
    const status = screen.getByRole('status');
    expect(status).not.toHaveTextContent(/flag/i);
    expect(status).toHaveTextContent(/beacon/i);
    const name = dev().world().modifier.name;
    if (name) expect(status).toHaveTextContent(name);
  });
});
