import { NextResponse } from 'next/server';
import {
  getUserEvents,
  getContributionCalendar,
  getUserRepos,
  getOrgRepos,
  type ActivityEvent,
  type ContributionCalendar,
} from '@/lib/github';
import { GITHUB_OWNER } from '@/lib/githubExclusions';

export const revalidate = 600; // 10 minutes — fresher than repos because commits are time-sensitive

const USER = GITHUB_OWNER;
const ORG = 'OpenCodeIntel';

export interface ActivityPayload {
  username: string;
  events: ActivityEvent[];
  calendar: ContributionCalendar | null;
  activeRepos: Array<{
    name: string;
    fullName: string;
    description: string | null;
    htmlUrl: string;
    language: string | null;
    stars: number;
    pushedAt: string;
  }>;
  fetchedAt: string;
  /** Set when something failed but we still returned partial data. */
  warnings: string[];
}

export async function GET() {
  const warnings: string[] = [];
  const errMsg = (err: unknown): string =>
    err instanceof Error ? err.message : String(err);

  try {
    return await buildActivity(warnings, errMsg);
  } catch (err) {
    // Never fail-stop the whole surface: degrade to a clean empty payload so the
    // app shows its composed empty states instead of an error screen.
    const payload: ActivityPayload = {
      username: USER,
      events: [],
      calendar: null,
      activeRepos: [],
      fetchedAt: new Date().toISOString(),
      warnings: [...warnings, `activity: ${errMsg(err)}`],
    };
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' },
    });
  }
}

async function buildActivity(
  warnings: string[],
  errMsg: (err: unknown) => string
): Promise<NextResponse> {
  const [events, calendar, personalRepos, orgRepos] = await Promise.all([
    getUserEvents(USER).catch((err: unknown) => {
      warnings.push(`events: ${errMsg(err)}`);
      return [] as ActivityEvent[];
    }),
    getContributionCalendar(USER).catch((err: unknown) => {
      warnings.push(`calendar: ${errMsg(err)}`);
      return null;
    }),
    getUserRepos(USER).catch((err: unknown) => {
      warnings.push(`personal repos: ${errMsg(err)}`);
      return [];
    }),
    getOrgRepos(ORG).catch((err: unknown) => {
      warnings.push(`org repos: ${errMsg(err)}`);
      return [];
    }),
  ]);

  // The events feed does not say whether a repo is a fork, so drop events on
  // owner repos that the repo list (forks and excluded repos already removed
  // in lib/github) does not contain. Skipped when that list failed to load.
  const ownRepos = new Set(personalRepos.map((r) => r.full_name.toLowerCase()));
  const ownerPrefix = `${USER.toLowerCase()}/`;
  const portfolioEvents =
    ownRepos.size === 0
      ? events
      : events.filter((e) => {
          const repo = e.repo.toLowerCase();
          return !repo.startsWith(ownerPrefix) || ownRepos.has(repo);
        });

  // Active = pushed within the last 60 days, sorted by recency, top 8.
  const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const activeRepos = [...personalRepos, ...orgRepos]
    .filter((r) => new Date(r.pushed_at).getTime() > cutoff)
    .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
    .slice(0, 8)
    .map((r) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      htmlUrl: r.html_url,
      language: r.language,
      stars: r.stargazers_count,
      pushedAt: r.pushed_at,
    }));

  const payload: ActivityPayload = {
    username: USER,
    events: portfolioEvents,
    calendar,
    activeRepos,
    fetchedAt: new Date().toISOString(),
    warnings,
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' },
  });
}
