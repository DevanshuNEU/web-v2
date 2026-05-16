// @vitest-environment node

/**
 * Unit tests for the activity-surface helpers in lib/github.ts. These
 * exercise pure data shaping — fetch is mocked. No network.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { getUserEvents, getContributionCalendar } from '@/lib/github';

beforeEach(() => {
  fetchMock.mockReset();
});

describe('getUserEvents — shaping', () => {
  it('keeps interesting event types and drops noisy ones by default', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        rawEvent('PushEvent', { commits: [{ sha: 'abc', message: 'fix bug' }] }),
        rawEvent('WatchEvent', {}),
        rawEvent('PullRequestEvent', {
          action: 'opened',
          pull_request: { title: 'New feature', html_url: 'https://x/pr/1' },
        }),
        rawEvent('ForkEvent', {}),
      ],
    });

    const out = await getUserEvents('alice');
    expect(out).toHaveLength(2);
    expect(out.map((e) => e.type)).toEqual(['PushEvent', 'PullRequestEvent']);
  });

  it('includes star/fork events when includeAll is true', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        rawEvent('WatchEvent', {}),
        rawEvent('ForkEvent', {}),
      ],
    });
    const out = await getUserEvents('alice', { includeAll: true });
    expect(out).toHaveLength(2);
  });

  it('maps PushEvent commits to PushedCommit shape with computed URLs', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        rawEvent(
          'PushEvent',
          { commits: [{ sha: 'deadbeef', message: 'feat: ship' }] },
          'octocat/devOS'
        ),
      ],
    });
    const [ev] = await getUserEvents('octocat');
    expect(ev.commits).toHaveLength(1);
    expect(ev.commits![0]).toEqual({
      sha: 'deadbeef',
      message: 'feat: ship',
      url: 'https://github.com/octocat/devOS/commit/deadbeef',
    });
    expect(ev.repoUrl).toBe('https://github.com/octocat/devOS');
  });

  it('throws when the API returns a non-200', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) });
    await expect(getUserEvents('alice')).rejects.toThrow(/GitHub API error: 502/);
  });
});

describe('getContributionCalendar — shaping + streaks', () => {
  it('returns null (not throws) when upstream API fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    const cal = await getContributionCalendar('alice');
    expect(cal).toBeNull();
  });

  it('returns null when fetch itself rejects (network down)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ENOTFOUND'));
    const cal = await getContributionCalendar('alice');
    expect(cal).toBeNull();
  });

  it('computes currentStreak from the tail of the year', async () => {
    // Mix of zeros and non-zeros; current streak is 3 (last 3 are non-zero).
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total: { lastYear: 10 },
        contributions: [
          { date: '2025-05-10', count: 2, level: 1 },
          { date: '2025-05-11', count: 0, level: 0 },
          { date: '2025-05-12', count: 3, level: 2 },
          { date: '2025-05-13', count: 1, level: 1 },
          { date: '2025-05-14', count: 4, level: 2 },
        ],
      }),
    });
    const cal = await getContributionCalendar('alice');
    expect(cal).toBeTruthy();
    expect(cal!.currentStreak).toBe(3);
    expect(cal!.longestStreak).toBe(3);
  });

  it('ignores a trailing zero day for currentStreak (allow today not-yet-committed)', async () => {
    // Streak should look back past the trailing zero.
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total: { lastYear: 6 },
        contributions: [
          { date: '2025-05-12', count: 1, level: 1 },
          { date: '2025-05-13', count: 2, level: 1 },
          { date: '2025-05-14', count: 0, level: 0 }, // today, not yet pushed
        ],
      }),
    });
    const cal = await getContributionCalendar('alice');
    expect(cal!.currentStreak).toBe(2);
  });

  it('returns longestStreak across the year, not just current', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total: { lastYear: 50 },
        contributions: [
          ...arr(10, (i) => ({ date: `2024-06-${pad(i + 1)}`, count: 5, level: 2 })),
          { date: '2024-06-11', count: 0, level: 0 },
          ...arr(3, (i) => ({ date: `2024-06-${pad(i + 12)}`, count: 1, level: 1 })),
        ],
      }),
    });
    const cal = await getContributionCalendar('alice');
    expect(cal!.longestStreak).toBe(10);
    expect(cal!.currentStreak).toBe(3);
  });

  it('falls back to summing days when total.lastYear is missing', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total: {},
        contributions: [
          { date: '2025-05-12', count: 2, level: 1 },
          { date: '2025-05-13', count: 3, level: 2 },
        ],
      }),
    });
    const cal = await getContributionCalendar('alice');
    expect(cal!.totalLastYear).toBe(5);
  });
});

/* ─── helpers ──────────────────────────────────────────────── */

function rawEvent(
  type: string,
  payload: Record<string, unknown>,
  repoName = 'alice/repo'
) {
  return {
    id: Math.random().toString(36).slice(2),
    type,
    created_at: '2025-05-15T10:00:00Z',
    repo: { name: repoName },
    payload,
  };
}

function arr<T>(n: number, fn: (i: number) => T): T[] {
  return Array.from({ length: n }, (_, i) => fn(i));
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
