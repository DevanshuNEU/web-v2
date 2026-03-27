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
