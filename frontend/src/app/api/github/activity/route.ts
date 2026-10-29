import { NextResponse } from 'next/server';
import {
  getUserEvents,
  getPullRequestTitles,
  getContributionCalendar,
  getUserRepos,
  getOrgRepos,
  type ActivityEvent,
  type ContributionCalendar,
} from '@/lib/github';
import { GITHUB_OWNER } from '@/lib/githubExclusions';

// Rendered per request so a failure is never frozen into the route cache. The
// upstream fetches in lib/github carry their own revalidate windows (Next only
// caches 200s), and the CDN caches this response by the headers set below.
export const dynamic = 'force-dynamic';

/** Full data: cache at the CDN for 10 minutes. */
const CACHE_OK = 'public, s-maxage=600, stale-while-revalidate=3600';
/** Some sources failed: cache for a minute so a recovery shows up quickly. */
const CACHE_PARTIAL = 'public, s-maxage=60, stale-while-revalidate=60';

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
  /**
   * Set when a source failed but others loaded. Each entry starts with the
   * source: "events", "calendar", "personal repos" or "org repos".
   */
  warnings: string[];
}

export interface ActivityUnavailable {
  error: 'unavailable';
  username: string;
  warnings: string[];
}

export async function GET() {
  const warnings: string[] = [];
  const errMsg = (err: unknown): string =>
    err instanceof Error ? err.message : String(err);

  try {
    return await buildActivity(warnings, errMsg);
  } catch (err) {
    return unavailable([...warnings, `activity: ${errMsg(err)}`]);
  }
}

/**
 * Nothing loaded (GitHub down or rate limited). An empty 200 would render as an
 * engineer with no activity, so say so with a 503 and keep it out of every cache.
 */
function unavailable(warnings: string[]): NextResponse {
  const body: ActivityUnavailable = { error: 'unavailable', username: USER, warnings };
  return NextResponse.json(body, {
    status: 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}

async function buildActivity(
  warnings: string[],
  errMsg: (err: unknown) => string
): Promise<NextResponse> {
  let eventsFailed = false;
  let personalFailed = false;
  let orgFailed = false;
  const [events, calendar, personalRepos, orgRepos] = await Promise.all([
    // Excluded repos can fill whole pages of the feed, so read up to three
    // pages until there are enough portfolio events to show.
    getUserEvents(USER, { perPage: 100, maxPages: 3, minResults: 12 }).catch((err: unknown) => {
      eventsFailed = true;
      warnings.push(`events: ${errMsg(err)}`);
      return [] as ActivityEvent[];
    }),
    getContributionCalendar(USER).catch((err: unknown) => {
      warnings.push(`calendar: ${errMsg(err)}`);
      return null;
    }),
    getUserRepos(USER).catch((err: unknown) => {
      personalFailed = true;
      warnings.push(`personal repos: ${errMsg(err)}`);
      return [];
    }),
    getOrgRepos(ORG).catch((err: unknown) => {
      orgFailed = true;
      warnings.push(`org repos: ${errMsg(err)}`);
      return [];
    }),
  ]);
  // getContributionCalendar reports failure as null rather than throwing.
  if (calendar === null && !warnings.some((w) => w.startsWith('calendar'))) {
    warnings.push('calendar: unavailable');
  }

  if (eventsFailed && calendar === null && personalFailed && orgFailed) {
    return unavailable(warnings);
  }

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

  // The feed shows ten rows; look up titles only for the PRs among them.
  const shown = portfolioEvents.slice(0, 10);
  const titled = await getPullRequestTitles(shown).catch(() => shown);

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
    events: titled,
    calendar,
    activeRepos,
    fetchedAt: new Date().toISOString(),
    warnings,
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': warnings.length > 0 ? CACHE_PARTIAL : CACHE_OK },
  });
}
