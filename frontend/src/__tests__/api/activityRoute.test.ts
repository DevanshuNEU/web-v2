// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as github from '@/lib/github';

const ev = (repo: string) => ({
  id: repo,
  type: 'PushEvent',
  repo,
  repoUrl: `https://github.com/${repo}`,
  createdAt: '2026-10-01T00:00:00Z',
});

vi.mock('@/lib/github', () => ({
  getUserEvents: vi.fn(),
  getPullRequestTitles: vi.fn(async (events: unknown[]) => events),
  getContributionCalendar: vi.fn(),
  getUserRepos: vi.fn(),
  getOrgRepos: vi.fn(),
}));

import { GET } from '@/app/api/github/activity/route';

const mocked = vi.mocked(github);

beforeEach(() => {
  // Events on a true fork (preswald-dev) carry no fork flag; the route drops
  // them because the repo list, which lib/github filters, does not contain it.
  mocked.getUserEvents.mockResolvedValue([
    ev('DevanshuNEU/overhear'),
    ev('DevanshuNEU/preswald-dev'),
    ev('OpenCodeIntel/saar'),
    ev('someone/else'),
  ] as github.ActivityEvent[]);
  mocked.getContributionCalendar.mockResolvedValue({
    totalLastYear: 1,
    days: [{ date: '2026-10-01', count: 1, level: 1 }],
    currentStreak: 1,
    longestStreak: 1,
  });
  mocked.getUserRepos.mockResolvedValue([
    { name: 'overhear', full_name: 'DevanshuNEU/overhear', pushed_at: new Date().toISOString() },
  ] as github.GitHubRepo[]);
  mocked.getOrgRepos.mockResolvedValue([]);
});

describe('/api/github/activity', () => {
  it('drops events on owner repos the portfolio repo list does not know', async () => {
    const data = await (await GET()).json();
    expect(data.events.map((e: { repo: string }) => e.repo)).toEqual([
      'DevanshuNEU/overhear',
      'OpenCodeIntel/saar',
      'someone/else',
    ]);
  });

  it('caches a full response for 10 minutes', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=600');
  });

  it('caches a partial response briefly and names the failed source', async () => {
    mocked.getContributionCalendar.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=60,');
    const data = await res.json();
    expect(data.warnings.some((w: string) => w.startsWith('calendar'))).toBe(true);
  });

  it('returns an uncached 503, not an empty 200, when every source fails', async () => {
    mocked.getUserEvents.mockRejectedValue(new Error('GitHub API error: 403'));
    mocked.getContributionCalendar.mockResolvedValue(null);
    mocked.getUserRepos.mockRejectedValue(new Error('GitHub API error: 403'));
    mocked.getOrgRepos.mockRejectedValue(new Error('GitHub API error: 403'));
    const res = await GET();
    expect(res.status).toBe(503);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect((await res.json()).error).toBe('unavailable');
  });
});
