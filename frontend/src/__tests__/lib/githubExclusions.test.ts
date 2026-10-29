// @vitest-environment node

/**
 * The owner's non-portfolio repos (the job-search list, the profile README,
 * forks) must never reach Projects, Finder or Activity. fetch is mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { EXCLUDED_REPOS, isExcludedRepo } from '@/lib/githubExclusions';
import { getUserRepos, getOrgRepos, getUserEvents } from '@/lib/github';

beforeEach(() => {
  fetchMock.mockReset();
});

const repo = (fullName: string, extra: Partial<{ fork: boolean; private: boolean; archived: boolean }> = {}) => ({
  name: fullName.split('/')[1],
  full_name: fullName,
  pushed_at: '2026-10-01T00:00:00Z',
  fork: false,
  private: false,
  archived: false,
  ...extra,
});

const event = (repoName: string) => ({
  id: repoName,
  type: 'PushEvent',
  created_at: '2026-10-01T00:00:00Z',
  repo: { name: repoName },
  payload: { commits: [] },
});

const json = (body: unknown) => ({ ok: true, json: async () => body });

describe('isExcludedRepo', () => {
  it('lists the job-search repo and the profile README repo', () => {
    expect(EXCLUDED_REPOS).toContain('DevanshuNEU/sept-23-companies');
    expect(EXCLUDED_REPOS).toContain('DevanshuNEU/DevanshuNEU');
  });

  it('excludes listed repos regardless of case', () => {
    expect(isExcludedRepo('DevanshuNEU/sept-23-companies')).toBe(true);
    expect(isExcludedRepo('devanshuneu/SEPT-23-COMPANIES')).toBe(true);
    expect(isExcludedRepo('DevanshuNEU/DevanshuNEU')).toBe(true);
  });

  it('excludes forks by flag and fork copies by name', () => {
    expect(isExcludedRepo('DevanshuNEU/developer-portfolios', { fork: true })).toBe(true);
    expect(isExcludedRepo('DevanshuNEU/opencodeintel-fork')).toBe(true);
    expect(isExcludedRepo('DevanshuNEU/opencodeintel-fork-new')).toBe(true);
    expect(isExcludedRepo('DevanshuNEU/webapp-fork')).toBe(true);
  });

  it('keeps portfolio repos, including the GitHub Pages repo name', () => {
    expect(isExcludedRepo('DevanshuNEU/overhear')).toBe(false);
    expect(isExcludedRepo('OpenCodeIntel/opencodeintel')).toBe(false);
    expect(isExcludedRepo('DevanshuNEU/forklift')).toBe(false);
  });
});

describe('lib/github fetchers apply the exclusions', () => {
  it('getUserRepos drops excluded repos, forks, private and archived repos', async () => {
    fetchMock.mockResolvedValueOnce(
      json([
        repo('DevanshuNEU/overhear'),
        repo('DevanshuNEU/sept-23-companies'),
        repo('DevanshuNEU/DevanshuNEU'),
        repo('DevanshuNEU/webapp-fork'),
        repo('DevanshuNEU/preswald-dev', { fork: true }),
        repo('DevanshuNEU/secret', { private: true }),
        repo('DevanshuNEU/old', { archived: true }),
      ])
    );
    const out = await getUserRepos('DevanshuNEU');
    expect(out.map((r) => r.full_name)).toEqual(['DevanshuNEU/overhear']);
  });

  it('getOrgRepos uses the same rules', async () => {
    fetchMock.mockResolvedValueOnce(
      json([repo('OpenCodeIntel/saar'), repo('OpenCodeIntel/upstream', { fork: true })])
    );
    const out = await getOrgRepos('OpenCodeIntel');
    expect(out.map((r) => r.full_name)).toEqual(['OpenCodeIntel/saar']);
  });

  it('getUserEvents drops events on excluded repos', async () => {
    fetchMock.mockResolvedValueOnce(
      json([
        event('DevanshuNEU/sept-23-companies'),
        event('DevanshuNEU/DevanshuNEU'),
        event('DevanshuNEU/opencodeintel-fork'),
        event('DevanshuNEU/overhear'),
      ])
    );
    const out = await getUserEvents('DevanshuNEU');
    expect(out.map((e) => e.repo)).toEqual(['DevanshuNEU/overhear']);
  });
});
