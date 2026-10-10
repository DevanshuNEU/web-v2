/**
 * Shared copy helpers for the server-rendered pages, sitemap and llms.txt.
 * Everything here derives from data/, so the HTML pages, the desktop apps and
 * the concierge all say the same thing.
 */

import type { ProjectMeta } from '@/data/projectMeta';

export const SITE_PAGES = [
  { path: '/about', title: 'About', description: 'Who I am, how I got here, my experience, and the opinions I will argue about.' },
  { path: '/projects', title: 'Projects', description: 'What I shipped, with the numbers and the caveats.' },
  { path: '/resume', title: 'Resume', description: 'Experience, projects, education and skills. PDF included.' },
] as const;

export function projectPath(slug: string): string {
  return `/projects/${slug}`;
}

/** One-paragraph description for meta tags and listings. */
export function projectDescription(meta: ProjectMeta, max = 200): string {
  const text = meta.descriptionOverride ?? meta.story[0] ?? meta.tagline;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' '))}...`;
}

export const STATUS_LABEL: Record<ProjectMeta['status'], string> = {
  active: 'Active',
  completed: 'Completed',
  experimental: 'Experimental',
};
