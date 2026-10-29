/**
 * GitHub repos that are never shown anywhere on the site (Projects, Finder,
 * Activity, stats). One list, shared by lib/github.ts and every
 * /api/github/* route, so a hidden repo cannot leak through one surface.
 *
 * Kept free of fetch so tests that mock lib/github still see the real rules.
 */

/** The owner account whose personal repos the site lists. */
export const GITHUB_OWNER = 'DevanshuNEU';

/**
 * Owner repos that are not portfolio work, by full name (case-insensitive):
 * - sept-23-companies: a private job-search list. Must never be shown.
 * - DevanshuNEU/DevanshuNEU: the profile README repo.
 */
export const EXCLUDED_REPOS: readonly string[] = [
  `${GITHUB_OWNER}/sept-23-companies`,
  `${GITHUB_OWNER}/${GITHUB_OWNER}`,
];

// Copies kept as plain repos ("opencodeintel-fork", "webapp-fork") do not set
// GitHub's fork flag, so the name marks them. Matches "-fork" and "-fork-new".
const FORK_NAME = /-fork(?:-|$)/i;

const EXCLUDED = new Set(EXCLUDED_REPOS.map((r) => r.toLowerCase()));

/**
 * True when a repo must not be shown: listed in EXCLUDED_REPOS, a GitHub
 * fork, or a fork copy by name. `fullName` is "owner/name".
 */
export function isExcludedRepo(fullName: string, opts: { fork?: boolean } = {}): boolean {
  if (opts.fork) return true;
  const lower = fullName.toLowerCase();
  if (EXCLUDED.has(lower)) return true;
  const name = lower.slice(lower.lastIndexOf('/') + 1);
  return FORK_NAME.test(name);
}
