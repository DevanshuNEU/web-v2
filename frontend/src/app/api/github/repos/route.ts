import { NextResponse } from 'next/server';
import { getUserRepos, getOrgRepos } from '@/lib/github';
import { projectMeta, featuredRank } from '@/data/projectMeta';

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
  /** /projects/[slug] page, when the project has one. */
  slug?: string;
  /** Label for homepage when it is not a website ("Walkthrough", "PyPI"). */
  liveLabel?: string;
}

function sameUrl(a: string, b: string | undefined): boolean {
  if (!b) return false;
  const norm = (u: string) => u.trim().replace(/\/+$/, '').toLowerCase();
  return norm(a) === norm(b);
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
          homepage: repo.homepage || meta?.liveUrl || null,
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
          slug: meta?.slug,
          // Keep the label when GitHub's homepage is the same link projectMeta names
          // (callbudget's Loom, saar's PyPI page); a different homepage gets the default.
          liveLabel: !repo.homepage || sameUrl(repo.homepage, meta?.liveUrl) ? meta?.liveLabel : undefined,
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

    // Inject projectMeta-only entries (no GitHub repo) so they always appear
    for (const [name, meta] of Object.entries(projectMeta)) {
      if (!seen.has(name)) {
        unique.push({
          name,
          displayName: meta.displayName,
          tagline: meta.tagline,
          description: meta.descriptionOverride ?? meta.tagline,
          htmlUrl: meta.repoUrl ?? '',
          homepage: meta.liveUrl ?? null,
          language: meta.extraTech?.[0] ?? null,
          stars: 0,
          forks: 0,
          topics: meta.extraTech ?? [],
          updatedAt: new Date().toISOString(),
          featured: meta.featured,
          category: meta.category,
          status: meta.status,
          story: meta.story,
          achievements: meta.achievements,
          extraTech: meta.extraTech ?? [],
          org: (meta.category === 'org' ? 'OpenCodeIntel' : 'DevanshuNEU') as 'DevanshuNEU' | 'OpenCodeIntel',
          slug: meta.slug,
          liveLabel: meta.liveLabel,
        });
      }
    }

    // Featured projects lead, in the order projectMeta defines.
    unique.sort((a, b) => featuredRank(a.name) - featuredRank(b.name));

    return NextResponse.json(unique, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    console.error('GitHub repos API error:', err);
    return NextResponse.json({ error: 'Failed to fetch repos' }, { status: 500 });
  }
}
