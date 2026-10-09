/**
 * Site identity for SEO surfaces: metadata, sitemap, robots, llms.txt, OG
 * images and the server-rendered pages. One place for the canonical origin so
 * nothing ships the bare domain by accident (the bare domain redirects to www).
 */

export const SITE_URL = 'https://www.devanshuchicholikar.com';
export const SITE_NAME = 'Devanshu Chicholikar';
export const PERSON_NAME = 'Devanshu Chicholikar';
export const ROLE_LINE = 'Software Engineer, AI Engineer';

export const SITE_DESCRIPTION =
  'Software engineer and AI engineer in Boston who ships AI to production end to end: MCP servers, RAG, LLM-as-a-judge evals and voice agents. Built OpenCodeIntel, a code-search platform for AI coding agents, and Overhear, a QA analyst for voice agents.';

/**
 * Last time the content behind the pages changed. Sitemap lastmod reads this,
 * so bump it whenever data/ changes in a way a reader would notice. Search
 * engines stop trusting lastmod that moves on every build.
 */
export const CONTENT_UPDATED = '2026-10-09';

/** Absolute URL on the canonical origin, for sitemap, OG and JSON-LD. */
export function absoluteUrl(path = '/'): string {
  if (path === '/' || path === '') return SITE_URL;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
