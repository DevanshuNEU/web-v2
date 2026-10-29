/**
 * GitHub API client
 *
 * Server-side only — all calls go through Next.js API routes.
 * Uses GITHUB_TOKEN env var if set (5000 req/hr vs 60 unauthenticated).
 * Every fetcher drops the repos in lib/githubExclusions.ts (forks, the
 * profile README, the job-search list), so no route can show them.
 */

import { isExcludedRepo } from './githubExclusions';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  updated_at: string;
  pushed_at: string;
  fork: boolean;
  private: boolean;
  archived: boolean;
  open_issues_count: number;
}

export interface GitHubLanguages {
  [language: string]: number; // bytes
}

const BASE = 'https://api.github.com';

function headers(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'devOS-portfolio/2.0',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Fetch a user's public portfolio repos (no forks, archived or excluded repos) */
export async function getUserRepos(username: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    `${BASE}/users/${username}/repos?type=owner&sort=pushed&per_page=100`,
    { headers: headers(), next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const repos: GitHubRepo[] = await res.json();
  return repos.filter(isPortfolioRepo);
}

/** Fetch an org's public portfolio repos (same rules as getUserRepos) */
export async function getOrgRepos(org: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    `${BASE}/orgs/${org}/repos?type=public&sort=pushed&per_page=100`,
    { headers: headers(), next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const repos: GitHubRepo[] = await res.json();
  return repos.filter(isPortfolioRepo);
}

function isPortfolioRepo(r: GitHubRepo): boolean {
  return !r.private && !r.archived && !isExcludedRepo(r.full_name, { fork: r.fork });
}

/** Fetch language breakdown for a repo */
export async function getRepoLanguages(fullName: string): Promise<GitHubLanguages> {
  const res = await fetch(
    `${BASE}/repos/${fullName}/languages`,
    { headers: headers(), next: { revalidate: 3600 } }
  );
  if (!res.ok) return {};
  return res.json();
}

/** Fetch basic user stats */
export async function getUserStats(username: string): Promise<{ publicRepos: number; followers: number; following: number }> {
  const res = await fetch(
    `${BASE}/users/${username}`,
    { headers: headers(), next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = await res.json();
  return {
    publicRepos: data.public_repos,
    followers: data.followers,
    following: data.following,
  };
}

/* --------------------------------------------------------------------
 * Activity surface — events + contribution calendar
 * ------------------------------------------------------------------ */

export interface PushedCommit {
  sha: string;
  message: string;
  url: string;
}

export interface ActivityEvent {
  id: string;
  type: 'PushEvent' | 'PullRequestEvent' | 'CreateEvent' | 'IssuesEvent' | 'ReleaseEvent' | 'WatchEvent' | 'ForkEvent';
  repo: string;
  repoUrl: string;
  createdAt: string;
  /** Present on PushEvent when GitHub still sends commits (up to 20, newest last). */
  commits?: PushedCommit[];
  /** PushEvent: the branch pushed to, without "refs/heads/". */
  branch?: string;
  /** PushEvent: the commit the branch now points at, for the row link. */
  headSha?: string;
  /** Present on PullRequestEvent. */
  prAction?: 'opened' | 'closed' | 'reopened' | 'edited' | 'merged';
  prNumber?: number;
  /** Filled by getPullRequestTitles; the public events feed no longer sends it. */
  prTitle?: string;
  /** The PR's source branch, the fallback label when the title is unknown. */
  prBranch?: string;
  prUrl?: string;
  /** Present on CreateEvent. */
  refType?: 'repository' | 'branch' | 'tag';
  /** CreateEvent: the branch or tag name. */
  refName?: string;
  /** Present on ReleaseEvent. */
  releaseTag?: string;
}

/**
 * Fetch recent public events for a user, newest first. GitHub returns up to
 * 300 events over the last 90 days, 100 per page. Excluded repos (the
 * job-search list, the profile README, forks) are dropped, and since they can
 * fill whole pages, `maxPages` lets the caller keep reading until it has
 * `minResults` events. Paging stops early when the rate limit runs low.
 * Filters out noisy event types (WatchEvent for stars, etc.) by default.
 * A PR that was opened and then merged shows once, as its latest action.
 */
export async function getUserEvents(
  username: string,
  options: { perPage?: number; includeAll?: boolean; maxPages?: number; minResults?: number } = {}
): Promise<ActivityEvent[]> {
  const { perPage = 30, includeAll = false, maxPages = 1, minResults = 0 } = options;

  const interesting = new Set(
    includeAll
      ? ['PushEvent', 'PullRequestEvent', 'CreateEvent', 'IssuesEvent', 'ReleaseEvent', 'WatchEvent', 'ForkEvent']
      : ['PushEvent', 'PullRequestEvent', 'CreateEvent', 'ReleaseEvent']
  );

  const kept: GitHubRawEvent[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const res = await fetch(
      `${BASE}/users/${username}/events/public?per_page=${perPage}${page > 1 ? `&page=${page}` : ''}`,
      { headers: headers(), next: { revalidate: 600 } }
    );
    if (!res.ok) {
      // A later page failing still leaves the earlier pages worth showing.
      if (page === 1) throw new Error(`GitHub API error: ${res.status}`);
      break;
    }
    const raw: GitHubRawEvent[] = await res.json();
    kept.push(...raw.filter((e) => interesting.has(e.type) && !isExcludedRepo(e.repo.name)));
    const remaining = Number(res.headers?.get?.('x-ratelimit-remaining') ?? NaN);
    if (raw.length < perPage || kept.length >= minResults || remaining < RATE_FLOOR) break;
  }

  const seenPrs = new Set<string>();
  return kept
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .filter((e) => {
      if (e.type !== 'PullRequestEvent') return true;
      const n = e.payload.number ?? e.payload.pull_request?.number;
      if (n === undefined) return true;
      const key = `${e.repo.name}#${n}`;
      if (seenPrs.has(key)) return false;
      seenPrs.add(key);
      return true;
    })
    .map(toActivityEvent);
}

/** Below this many core requests left, skip optional calls (extra pages, PR titles). */
const RATE_FLOOR = 15;

function toActivityEvent(e: GitHubRawEvent): ActivityEvent {
  const repoUrl = `https://github.com/${e.repo.name}`;
  const base = {
    id: e.id,
    type: e.type as ActivityEvent['type'],
    repo: e.repo.name,
    repoUrl,
    createdAt: e.created_at,
  };
  const p = e.payload;
  if (e.type === 'PushEvent') {
    const branch = p.ref?.replace(/^refs\/heads\//, '');
    return {
      ...base,
      ...(p.commits && p.commits.length > 0
        ? {
            commits: p.commits.map((c) => ({
              sha: c.sha,
              message: c.message,
              url: `${repoUrl}/commit/${c.sha}`,
            })),
          }
        : {}),
      ...(branch ? { branch } : {}),
      ...(p.head ? { headSha: p.head } : {}),
    };
  }
  if (e.type === 'PullRequestEvent') {
    const pr = p.pull_request;
    const number = p.number ?? pr?.number;
    // GitHub reports a merge as action "closed" with merged: true in older
    // payloads and as action "merged" in current ones.
    const action = p.action === 'closed' && pr?.merged ? 'merged' : p.action;
    return {
      ...base,
      prAction: action as ActivityEvent['prAction'],
      ...(number !== undefined ? { prNumber: number } : {}),
      ...(pr?.title ? { prTitle: pr.title } : {}),
      ...(pr?.head?.ref ? { prBranch: pr.head.ref } : {}),
      prUrl: pr?.html_url ?? (number !== undefined ? `${repoUrl}/pull/${number}` : repoUrl),
    };
  }
  if (e.type === 'CreateEvent') {
    return {
      ...base,
      refType: p.ref_type as ActivityEvent['refType'],
      ...(p.ref ? { refName: p.ref } : {}),
    };
  }
  if (e.type === 'ReleaseEvent' && p.release) {
    return { ...base, releaseTag: p.release.tag_name };
  }
  return base;
}

/**
 * Fill in PR titles, which the public events feed stopped sending. Looks up at
 * most `limit` PRs, each cached for a day (a title rarely changes), and skips
 * the lookups when the rate limit is low. A failed lookup leaves the event as
 * it was, so the row falls back to the PR number and branch.
 */
export async function getPullRequestTitles(
  events: ActivityEvent[],
  limit = 5
): Promise<ActivityEvent[]> {
  const wanted = events
    .filter((e) => e.type === 'PullRequestEvent' && !e.prTitle && e.prNumber !== undefined)
    .slice(0, limit);
  if (wanted.length === 0) return events;

  const titles = new Map<string, string>();
  for (const e of wanted) {
    try {
      const res = await fetch(`${BASE}/repos/${e.repo}/pulls/${e.prNumber}`, {
        headers: headers(),
        next: { revalidate: 86400 },
      });
      if (!res.ok) break; // rate limited or gone: stop asking
      const pr: { title?: string } = await res.json();
      if (pr.title) titles.set(e.id, pr.title);
      const remaining = Number(res.headers?.get?.('x-ratelimit-remaining') ?? NaN);
      if (remaining < RATE_FLOOR) break;
    } catch {
      break;
    }
  }
  return events.map((e) => (titles.has(e.id) ? { ...e, prTitle: titles.get(e.id) } : e));
}

/** Single day in a contribution calendar. `level` is 0–4 matching GitHub's shade scale. */
export interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ContributionCalendar {
  totalLastYear: number;
  /** Days in chronological order, oldest first. ~365 entries. */
  days: ContributionDay[];
  /** Longest consecutive-days streak ending on or before today. */
  currentStreak: number;
  /** Longest streak ever in the window. */
  longestStreak: number;
}

/**
 * Fetch the contribution calendar (the green-square heatmap) for a user.
 * Uses the community jogruber.de API, which scrapes github.com/users/{u}/contributions
 * and serves stable JSON. No auth required — keeps the activity surface
 * working in fresh forks of the portfolio without a GITHUB_TOKEN.
 *
 * Returns null when the upstream API is unreachable so the UI can degrade
 * gracefully rather than fail-stop the whole activity feed.
 */
export async function getContributionCalendar(
  username: string
): Promise<ContributionCalendar | null> {
  try {
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${username}?y=last`,
      {
        headers: { 'User-Agent': 'devOS-portfolio/2.0' },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    const data: JogruberCalendarResponse = await res.json();
    const days: ContributionDay[] = data.contributions.map((d) => ({
      date: d.date,
      count: d.count,
      level: Number(d.level) as ContributionDay['level'],
    }));
    return {
      totalLastYear: data.total.lastYear ?? days.reduce((s, d) => s + d.count, 0),
      days,
      ...computeStreaks(days),
    };
  } catch (err) {
    console.error('Contribution calendar fetch failed:', err);
    return null;
  }
}

function computeStreaks(days: ContributionDay[]): { currentStreak: number; longestStreak: number } {
  if (days.length === 0) return { currentStreak: 0, longestStreak: 0 };
  let longest = 0;
  let run = 0;
  for (const d of days) {
    if (d.count > 0) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }
  // Current streak: count backwards from the most recent day until a zero.
  // The last day is today, which may have no commits yet, so one trailing zero
  // is allowed. Two or more means the run has ended and the streak is 0.
  let current = 0;
  let i = days.length - 1;
  if (i >= 0 && days[i].count === 0) i -= 1;
  while (i >= 0 && days[i].count > 0) {
    current += 1;
    i -= 1;
  }
  return { currentStreak: current, longestStreak: longest };
}

/* Minimal shapes for upstream payloads we don't fully export. */
interface GitHubRawEvent {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
  payload: {
    action?: string;
    ref?: string;
    ref_type?: string;
    head?: string;
    number?: number;
    commits?: Array<{ sha: string; message: string }>;
    pull_request?: {
      number?: number;
      title?: string;
      html_url?: string;
      merged?: boolean;
      head?: { ref?: string };
    };
    release?: { tag_name: string };
  };
}

interface JogruberCalendarResponse {
  total: { lastYear?: number; [year: string]: number | undefined };
  contributions: Array<{ date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }>;
}
