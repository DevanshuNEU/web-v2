// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

const ev = (repo: string) => ({
  id: repo,
  type: 'PushEvent',
  repo,
  repoUrl: `https://github.com/${repo}`,
  createdAt: '2026-10-01T00:00:00Z',
});

vi.mock('@/lib/github', () => ({
  // Events on a true fork (preswald-dev) carry no fork flag; the route drops
  // them because the repo list, which lib/github filters, does not contain it.
  getUserEvents: vi.fn(async () => [
    ev('DevanshuNEU/overhear'),
    ev('DevanshuNEU/preswald-dev'),
    ev('OpenCodeIntel/saar'),
    ev('someone/else'),
  ]),
  getContributionCalendar: vi.fn(async () => null),
  getUserRepos: vi.fn(async () => [
    { name: 'overhear', full_name: 'DevanshuNEU/overhear', pushed_at: new Date().toISOString() },
  ]),
  getOrgRepos: vi.fn(async () => []),
}));

import { GET } from '@/app/api/github/activity/route';

describe('/api/github/activity events', () => {
  it('drops events on owner repos the portfolio repo list does not know', async () => {
    const data = await (await GET()).json();
    expect(data.events.map((e: { repo: string }) => e.repo)).toEqual([
      'DevanshuNEU/overhear',
      'OpenCodeIntel/saar',
      'someone/else',
    ]);
  });
});
