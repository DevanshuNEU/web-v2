import { NextResponse } from 'next/server';
import { getUserRepos, getOrgRepos } from '@/lib/github';
import { projectMeta } from '@/data/projectMeta';

export const revalidate = 3600; // 1 hour

export interface EnrichedRepo {
  name: string;
  displayName: string;
  tagline: string;
  description: string | null;
  htmlUrl: string;
  homepage: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  updatedAt: string;
  featured: boolean;
  category: 'personal' | 'org' | 'meta';
  status: 'active' | 'completed' | 'experimental';
  story: string[];
  achievements: { metric: string; label: string; detail: string }[];
  extraTech: string[];
  org: 'DevanshuNEU' | 'OpenCodeIntel';
}

export async function GET() {
  try {
    const [personalRepos, orgRepos] = await Promise.all([
      getUserRepos('DevanshuNEU').catch(() => []),
      getOrgRepos('OpenCodeIntel').catch(() => []),
    ]);

    const enrich = (repos: typeof personalRepos, org: 'DevanshuNEU' | 'OpenCodeIntel'): EnrichedRepo[] =>
      repos.map(repo => {
        const meta = projectMeta[repo.name] ?? projectMeta[repo.name.toLowerCase()];
        return {
          name: repo.name,
          displayName: meta?.displayName ?? repo.name,
          tagline: meta?.tagline ?? repo.description ?? '',
          description: repo.description,
          htmlUrl: repo.html_url,
          homepage: repo.homepage,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          topics: repo.topics ?? [],
          updatedAt: repo.updated_at,
          featured: meta?.featured ?? false,
          category: meta?.category ?? (org === 'OpenCodeIntel' ? 'org' : 'personal'),
          status: meta?.status ?? 'completed',
          story: meta?.story ?? [],
          achievements: meta?.achievements ?? [],
          extraTech: meta?.extraTech ?? [],
          org,
        };
      });

    const all = [
      ...enrich(personalRepos, 'DevanshuNEU'),
      ...enrich(orgRepos, 'OpenCodeIntel'),
    ];

    // Deduplicate by name (org repos might overlap)
    const seen = new Set<string>();
    const unique = all.filter(r => {
      if (seen.has(r.name)) return false;
      seen.add(r.name);
      return true;
    });

    return NextResponse.json(unique, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    console.error('GitHub repos API error:', err);
    return NextResponse.json({ error: 'Failed to fetch repos' }, { status: 500 });
  }
}
