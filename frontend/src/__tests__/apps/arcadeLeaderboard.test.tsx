// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RunResult, BoardView } from '@/components/apps/games/leaderboard/Leaderboard';
import { checkName, startRun, submitScore, fetchBoard, savedName, savedCrown } from '@/components/apps/games/leaderboard/api';
import { StrictMode } from 'react';
import type { Board } from '@/components/apps/games/leaderboard/api';

type Handler = (url: string, init?: RequestInit) => unknown;

function mockFetch(handler: Handler) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const body = handler(url, init);
    if (body instanceof Error) throw body;
    return { ok: true, json: async () => body } as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

const ok = (over: Partial<{ name: string; best: number; crowned: boolean; all: number | null; week: number | null; isTop: boolean }> = {}) => ({
  ok: true,
  name: over.name ?? 'Dev',
  score: 12,
  best: over.best ?? 12,
  crowned: over.crowned ?? false,
  rank: { all: over.all === undefined ? 12 : over.all, week: over.week === undefined ? 3 : over.week },
  isTop: over.isTop ?? false,
});

function renderResult(score = 12, token: string | null = 'tok') {
  const onPlayAgain = vi.fn();
  const onShowBoard = vi.fn();
  render(
    <RunResult game="snake" score={score} getToken={async () => token} onPlayAgain={onPlayAgain} onShowBoard={onShowBoard} mono={false} />,
  );
  return { onPlayAgain, onShowBoard };
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('checkName (client side, mirrors the server)', () => {
  it.each([
    ['Dev', null],
    ['  Dev  ', null],
    ['Jo_2', null],
    ['Zoë', null],
    ['देव', null],
    ['D', 'Use at least 2 characters.'],
    ['ThirteenChars', 'Use 12 characters or fewer.'],
    ['no!pe', 'Use letters, numbers, spaces or underscores.'],
  ])('%s', (name, expected) => {
    expect(checkName(name)).toBe(expected);
  });
});

describe('api client', () => {
  it('startRun returns the token, or null when the board is unreachable', async () => {
    mockFetch(() => ({ token: 'abc', expiresAt: 1 }));
    expect(await startRun('snake')).toBe('abc');
    mockFetch(() => new Error('network'));
    expect(await startRun('snake')).toBeNull();
  });

  it('submitScore posts the token, name and score as JSON', async () => {
    const f = mockFetch(() => ok());
    await submitScore('tok', 'Dev', 12);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('/api/arcade/score');
    expect(JSON.parse(init!.body as string)).toEqual({ token: 'tok', name: 'Dev', score: 12 });
  });

  it('fetchBoard asks for my rank when I have a name', async () => {
    const f = mockFetch(() => ({ game: 'snake', all: [], week: [], me: null }));
    await fetchBoard('snake', 'Dev');
    expect(f.mock.calls[0][0]).toBe('/api/arcade/board?game=snake&name=Dev');
  });

  it('turns a server that answers garbage into a readable offline error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => { throw new Error('bad json'); } })));
    const r = await fetchBoard('snake');
    expect(r).toEqual({ error: { code: 'offline', message: expect.stringContaining('did not answer') } });
  });
});

describe('RunResult', () => {
  it('asks for a name the first time, then posts and shows the rank', async () => {
    const f = mockFetch(() => ok());
    renderResult();
    const input = screen.getByLabelText('Name on the board');
    await userEvent.type(input, 'Dev');
    await userEvent.click(screen.getByRole('button', { name: 'Post score' }));
    expect(await screen.findByText('#3 this week')).toBeInTheDocument();
    expect(screen.getByText(', #12 all time')).toBeInTheDocument();
    expect(savedName()).toBe('Dev');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('posts on its own when she already has a name', async () => {
    localStorage.setItem('devos-arcade-name', 'Dev');
    const f = mockFetch(() => ok());
    renderResult();
    expect(await screen.findByText('#3 this week')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name on the board')).not.toBeInTheDocument();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('catches a bad name before any request', async () => {
    const f = mockFetch(() => ok());
    renderResult();
    await userEvent.type(screen.getByLabelText('Name on the board'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Post score' }));
    expect(screen.getByText('Use at least 2 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name on the board')).toHaveAttribute('aria-invalid', 'true');
    expect(f).not.toHaveBeenCalled();
  });

  it('shows the server name error and lets her fix it on the same run', async () => {
    let calls = 0;
    mockFetch(() => (++calls === 1
      ? { error: { code: 'name_taken', message: 'That name is taken. Pick another.' } }
      : ok({ name: 'Dev2' })));
    renderResult();
    await userEvent.type(screen.getByLabelText('Name on the board'), 'Dev');
    await userEvent.click(screen.getByRole('button', { name: 'Post score' }));
    expect(await screen.findByText('That name is taken. Pick another.')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Name on the board'));
    await userEvent.type(screen.getByLabelText('Name on the board'), 'Dev2');
    await userEvent.click(screen.getByRole('button', { name: 'Post score' }));
    expect(await screen.findByText('#3 this week')).toBeInTheDocument();
    expect(savedName()).toBe('Dev2');
  });

  it('saves the board spelling of her name', async () => {
    localStorage.setItem('devos-arcade-name', 'dev');
    mockFetch(() => ok({ name: 'Dev' }));
    renderResult();
    await screen.findByText('#3 this week');
    expect(savedName()).toBe('Dev');
  });

  it('keeps the crown code apart from her name: the code posts, the name shows', async () => {
    const f = mockFetch(() => ok({ name: 'Her Name', crowned: true, week: 2, all: 2 }));
    renderResult();
    await userEvent.type(screen.getByLabelText('Name on the board'), 'secretcode');
    await userEvent.click(screen.getByRole('button', { name: 'Post score' }));
    await screen.findByText('#2 this week');
    expect(screen.getAllByLabelText('Crowned').length).toBeGreaterThan(0);
    expect(savedName()).toBe('Her Name');
    expect(savedCrown()).toBe('secretcode');
    expect(JSON.parse(f.mock.calls[0][1]!.body as string).name).toBe('secretcode');
  });

  it('next round posts with the saved crown code, without asking', async () => {
    localStorage.setItem('devos-arcade-name', 'Her Name');
    localStorage.setItem('devos-arcade-crown', 'secretcode');
    const f = mockFetch(() => ok({ name: 'Her Name', crowned: true }));
    renderResult();
    await screen.findByText('#3 this week');
    expect(JSON.parse(f.mock.calls[0][1]!.body as string).name).toBe('secretcode');
  });

  it('posts once even when the effect runs twice (React strict mode)', async () => {
    localStorage.setItem('devos-arcade-name', 'Dev');
    const f = mockFetch(() => ok());
    render(
      <StrictMode>
        <RunResult game="snake" score={12} getToken={async () => 'tok'} onPlayAgain={() => {}} onShowBoard={() => {}} mono={false} />
      </StrictMode>,
    );
    await screen.findByText('#3 this week');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('celebrates first place with confetti', async () => {
    localStorage.setItem('devos-arcade-name', 'Dev');
    mockFetch(() => ok({ isTop: true, all: 1, week: 1 }));
    renderResult();
    expect(await screen.findByTestId('confetti')).toBeInTheDocument();
  });

  it('celebrates first place', async () => {
    localStorage.setItem('devos-arcade-name', 'Dev');
    mockFetch(() => ok({ isTop: true, all: 1, week: 1 }));
    renderResult();
    expect(await screen.findByText('First place on the board.')).toBeInTheDocument();
  });

  it('says when her best stays higher than this round', async () => {
    localStorage.setItem('devos-arcade-name', 'Dev');
    mockFetch(() => ok({ best: 40 }));
    renderResult(12);
    expect(await screen.findByText('Your best stays 40.')).toBeInTheDocument();
  });

  it('when the board never answered, says the best is saved on this device', async () => {
    localStorage.setItem('devos-arcade-name', 'Dev');
    mockFetch(() => ok());
    renderResult(12, null);
    expect(await screen.findByText(/saved on this device/)).toBeInTheDocument();
  });

  it('offers to post again after a rate limit', async () => {
    localStorage.setItem('devos-arcade-name', 'Dev');
    let calls = 0;
    mockFetch(() => (++calls === 1 ? { error: { code: 'rate_limited', message: 'Too many scores from this network. Wait a few minutes and post again.' } } : ok()));
    renderResult();
    await userEvent.click(await screen.findByRole('button', { name: 'Post again' }));
    expect(await screen.findByText('#3 this week')).toBeInTheDocument();
  });

  it('does not post a zero score', () => {
    const f = mockFetch(() => ok());
    renderResult(0);
    expect(f).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Name on the board')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument();
  });

  it('changing the name after posting saves it for the next round without reposting', async () => {
    localStorage.setItem('devos-arcade-name', 'Dev');
    const f = mockFetch(() => ok());
    renderResult();
    await userEvent.click(await screen.findByRole('button', { name: 'Change name' }));
    expect(screen.getByText('The new name shows from your next round.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Name on the board'), 'Neo');
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(savedName()).toBe('Neo');
    expect(f).toHaveBeenCalledTimes(1);
    expect(screen.getByText('#3 this week')).toBeInTheDocument();
  });

  it('Play again and See the board call back', async () => {
    mockFetch(() => ok());
    const { onPlayAgain, onShowBoard } = renderResult(0);
    await userEvent.click(screen.getByRole('button', { name: 'Play again' }));
    await userEvent.click(screen.getByRole('button', { name: 'See the board' }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    expect(onShowBoard).toHaveBeenCalledTimes(1);
  });
});

describe('BoardView', () => {
  const entries = (n: number) => Array.from({ length: n }, (_, i) => ({ rank: i + 1, name: `P${i + 1}`, score: 100 - i, crown: i === 0 }));
  const board = (over: Partial<Board> = {}): Board => ({ game: 'snake', all: entries(10), week: entries(3), me: null, ...over });

  it('shows this week first, then all time on the tab', async () => {
    mockFetch(() => board());
    render(<BoardView game="snake" name={null} />);
    expect(await screen.findByText('P3')).toBeInTheDocument();
    expect(screen.queryByText('P10')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'All time' }));
    expect(screen.getByText('P10')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All time' })).toHaveAttribute('aria-selected', 'true');
  });

  it('marks the crown and my row', async () => {
    mockFetch(() => board());
    render(<BoardView game="snake" name="p2" />);
    await screen.findByText('P2');
    expect(screen.getByLabelText('Crowned')).toBeInTheDocument();
    expect(screen.getByText('P2').closest('li')).toHaveAttribute('aria-current', 'true');
  });

  it('adds my row under the top 10 when I am further down', async () => {
    mockFetch(() => board({ me: { name: 'Dev', all: { rank: 57, score: 3 }, week: { rank: 20, score: 3 } } }));
    render(<BoardView game="snake" name="Dev" />);
    await userEvent.click(await screen.findByRole('tab', { name: 'All time' }));
    expect(screen.getByText('57')).toBeInTheDocument();
    expect(screen.getByText('Dev').closest('li')).toHaveAttribute('aria-current', 'true');
  });

  it('has an empty state that says how it fills up', async () => {
    mockFetch(() => board({ all: [], week: [] }));
    render(<BoardView game="snake" name={null} />);
    expect(await screen.findByText('No scores this week yet.')).toBeInTheDocument();
    expect(screen.getByText('Finish a round to take first place.')).toBeInTheDocument();
  });

  it('shows the error and loads again on request', async () => {
    let calls = 0;
    mockFetch(() => (++calls === 1 ? new Error('down') : board()));
    render(<BoardView game="snake" name={null} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Load again' }));
    await waitFor(() => expect(screen.getByText('P1')).toBeInTheDocument());
  });
});

describe('fetchSecret: personal only on the crowned device', () => {
  it('without a crown code: asks only for the name and fills in the shared message', async () => {
    const { fetchSecret } = await import('@/components/apps/games/leaderboard/api');
    const f = mockFetch(() => ({ name: 'Her Name' }));
    expect(await fetchSecret()).toEqual({ name: 'Her Name', message: 'Made for you.', story: {} });
    expect(f.mock.calls[0][0]).toBe('/api/arcade/secret');
    expect(f.mock.calls[0][1]?.method ?? 'GET').toBe('GET');
  });

  it('with the crown code saved: posts it and gets the message and story', async () => {
    localStorage.setItem('devos-arcade-crown', 'secretcode');
    const { fetchSecret } = await import('@/components/apps/games/leaderboard/api');
    const f = mockFetch(() => ({ name: 'Her Name', message: 'hi you', story: { 'card-1': 'where we met' } }));
    expect(await fetchSecret()).toEqual({ name: 'Her Name', message: 'hi you', story: { 'card-1': 'where we met' } });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('/api/arcade/secret');
    expect(init!.method).toBe('POST');
    expect(JSON.parse(init!.body as string)).toEqual({ code: 'secretcode' });
  });

  it('falls back to the shared version when the code is refused', async () => {
    localStorage.setItem('devos-arcade-crown', 'stale');
    const { fetchSecret } = await import('@/components/apps/games/leaderboard/api');
    let n = 0;
    mockFetch(() => (++n === 1 ? { error: { code: 'not_crowned', message: 'no' } } : { name: 'Her Name' }));
    expect(await fetchSecret()).toEqual({ name: 'Her Name', message: 'Made for you.', story: {} });
  });
});
