/**
 * Posts for /writing. Metadata lives here; each body is a markdown file in
 * src/content/writing/<slug>.md, read at build time, so the text can be edited
 * as plain prose. Only the subset in lib/markdown.ts renders: ## headings,
 * "- " lists, paragraphs, `inline code` and [links](https://...).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Post {
  slug: string;
  title: string;
  /** Meta description and listing blurb. Keep it under about 200 characters. */
  description: string;
  /** YYYY-MM-DD */
  datePublished: string;
  /** YYYY-MM-DD, only when the post changed after publishing. */
  dateModified?: string;
  /** Link-preview card: the full title is too long for one line at card size. */
  card: { title: string; subtitle: string };
  /** projectMeta key the post is about, for links both ways. */
  project?: string;
  /** Public data or code the post's claims rest on. Goes in JSON-LD isBasedOn. */
  sourceUrl?: string;
  keywords: string[];
}

export const posts: Post[] = [
  {
    slug: 'rerankers-code-search',
    title: 'Rerankers made my code search worse. Then the same one made it better.',
    description:
      'A reranker made my code search worse on December 18, 2025. Two days later the same model was the biggest gain in the system. Six things changed in between, one of them my answer key.',
    datePublished: '2026-10-12',
    card: { title: 'Rerankers made my code search worse', subtitle: 'Then the same one made it better.' },
    project: 'opencodeintel',
    sourceUrl: 'https://github.com/OpenCodeIntel/retrieval-research',
    keywords: ['code search', 'reranking', 'retrieval evaluation', 'hybrid retrieval', 'RAG', 'ablation study'],
  },
];

const CONTENT_DIR = join(process.cwd(), 'src/content/writing');

/** Newest first. */
export function getAllPosts(): Post[] {
  return [...posts].sort((a, b) => b.datePublished.localeCompare(a.datePublished));
}

export function getPostBySlug(slug: string): Post | null {
  return posts.find(p => p.slug === slug) ?? null;
}

export function getPostsForProject(projectKey: string): Post[] {
  return getAllPosts().filter(p => p.project === projectKey);
}

export function readPostBody(slug: string): string {
  return readFileSync(join(CONTENT_DIR, `${slug}.md`), 'utf8');
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "2026-10-12" to "October 12, 2026", with no timezone in play. */
export function formatPostDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
