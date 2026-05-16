import { NextResponse } from 'next/server';
import {
  getUserEvents,
  getContributionCalendar,
  getUserRepos,
  getOrgRepos,
  type ActivityEvent,
  type ContributionCalendar,
} from '@/lib/github';

export const revalidate = 600; // 10 minutes — fresher than repos because commits are time-sensitive

const USER = 'DevanshuNEU';
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

  const [events, calendar, personalRepos, orgRepos] = await Promise.all([
    getUserEvents(USER).catch((err) => {
      warnings.push(`events: ${err.message ?? err}`);
      return [] as ActivityEvent[];
    }),
    getContributionCalendar(USER).catch((err) => {
      warnings.push(`calendar: ${err.message ?? err}`);
      return null;
    }),
    getUserRepos(USER).catch((err) => {
      warnings.push(`personal repos: ${err.message ?? err}`);
      return [];
    }),
    getOrgRepos(ORG).catch((err) => {
      warnings.push(`org repos: ${err.message ?? err}`);
      return [];
    }),
  ]);

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
    events,
    calendar,
    activeRepos,
    fetchedAt: new Date().toISOString(),
    warnings,
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' },
  });
}
