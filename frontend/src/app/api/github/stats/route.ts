import { NextResponse } from 'next/server';
import { getUserStats, getUserRepos, getOrgRepos } from '@/lib/github';

export const revalidate = 3600;

export async function GET() {
  try {
    const [stats, personalRepos, orgRepos] = await Promise.all([
      getUserStats('DevanshuNEU').catch(() => ({ publicRepos: 0, followers: 0, following: 0 })),
      getUserRepos('DevanshuNEU').catch(() => []),
      getOrgRepos('OpenCodeIntel').catch(() => []),
    ]);

    const allRepos = [...personalRepos, ...orgRepos];
    const totalStars = allRepos.reduce((sum, r) => sum + r.stargazers_count, 0);

    // Language frequency
    const langCounts: Record<string, number> = {};
    allRepos.forEach(r => {
      if (r.language) langCounts[r.language] = (langCounts[r.language] ?? 0) + 1;
    });

    return NextResponse.json({
      publicRepos: stats.publicRepos,
      followers: stats.followers,
      totalStars,
      totalRepos: allRepos.length,
      topLanguages: Object.entries(langCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([lang, count]) => ({ lang, count })),
    });
  } catch (err) {
    console.error('GitHub stats API error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
