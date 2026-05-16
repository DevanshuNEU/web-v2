/**
 * GitHub API client
 *
 * Server-side only — all calls go through Next.js API routes.
 * Uses GITHUB_TOKEN env var if set (5000 req/hr vs 60 unauthenticated).
 */

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

/** Fetch all non-fork repos for a user */
export async function getUserRepos(username: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    `${BASE}/users/${username}/repos?type=owner&sort=pushed&per_page=100`,
    { headers: headers(), next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const repos: GitHubRepo[] = await res.json();
  return repos.filter(r => !r.fork && !r.private && !r.archived);
}

/** Fetch all repos for an org */
export async function getOrgRepos(org: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    `${BASE}/orgs/${org}/repos?type=public&sort=pushed&per_page=100`,
    { headers: headers(), next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const repos: GitHubRepo[] = await res.json();
  return repos.filter(r => !r.fork && !r.private && !r.archived);
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
  /** Present on PushEvent — up to 20 commits per push, newest last. */
  commits?: PushedCommit[];
  /** Present on PullRequestEvent. */
  prAction?: 'opened' | 'closed' | 'reopened' | 'edited';
  prTitle?: string;
  prUrl?: string;
  /** Present on CreateEvent. */
  refType?: 'repository' | 'branch' | 'tag';
  /** Present on ReleaseEvent. */
  releaseTag?: string;
}

/**
 * Fetch recent public events for a user. GitHub returns up to 300 events
 * over the last 90 days; we slice the freshest 30 because that's all the UI
 * surfaces. Filters out noisy event types (WatchEvent for stars, etc.) by
 * default — caller decides whether to include them.
 */
export async function getUserEvents(
  username: string,
  options: { perPage?: number; includeAll?: boolean } = {}
): Promise<ActivityEvent[]> {
  const { perPage = 30, includeAll = false } = options;
  const res = await fetch(
    `${BASE}/users/${username}/events/public?per_page=${perPage}`,
    { headers: headers(), next: { revalidate: 600 } }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const raw: GitHubRawEvent[] = await res.json();

  const interesting = new Set(
    includeAll
      ? ['PushEvent', 'PullRequestEvent', 'CreateEvent', 'IssuesEvent', 'ReleaseEvent', 'WatchEvent', 'ForkEvent']
      : ['PushEvent', 'PullRequestEvent', 'CreateEvent', 'ReleaseEvent']
  );

  return raw
    .filter((e) => interesting.has(e.type))
    .map((e): ActivityEvent => {
      const base = {
        id: e.id,
        type: e.type as ActivityEvent['type'],
        repo: e.repo.name,
        repoUrl: `https://github.com/${e.repo.name}`,
        createdAt: e.created_at,
      };
      if (e.type === 'PushEvent' && e.payload.commits) {
        return {
          ...base,
          commits: e.payload.commits.map((c) => ({
            sha: c.sha,
            message: c.message,
            url: `https://github.com/${e.repo.name}/commit/${c.sha}`,
          })),
        };
      }
      if (e.type === 'PullRequestEvent' && e.payload.pull_request) {
        return {
          ...base,
          prAction: e.payload.action as ActivityEvent['prAction'],
          prTitle: e.payload.pull_request.title,
          prUrl: e.payload.pull_request.html_url,
        };
      }
      if (e.type === 'CreateEvent') {
        return { ...base, refType: e.payload.ref_type as ActivityEvent['refType'] };
      }
      if (e.type === 'ReleaseEvent' && e.payload.release) {
        return { ...base, releaseTag: e.payload.release.tag_name };
      }
      return base;
    });
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
  // Allow today to be 0 (commits not yet made) by starting from the last
  // day with count > 0.
  let current = 0;
  let i = days.length - 1;
  while (i >= 0 && days[i].count === 0) i -= 1;
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
    ref_type?: string;
    commits?: Array<{ sha: string; message: string }>;
    pull_request?: { title: string; html_url: string };
    release?: { tag_name: string };
  };
}

interface JogruberCalendarResponse {
  total: { lastYear?: number; [year: string]: number | undefined };
  contributions: Array<{ date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }>;
}
