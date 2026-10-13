import { describe, it, expect } from 'vitest';
import { posts, getAllPosts, getPostBySlug, getPostsForProject, readPostBody, formatPostDate } from '@/data/writing';
import { projectMeta } from '@/data/projectMeta';
import { parseMarkdown, parseInline, headingId, wordCount } from '@/lib/markdown';
import { articleNode, PERSON_ID } from '@/lib/structuredData';
import { buildLlmsTxt } from '@/lib/llmsTxt';
import { SITE_URL } from '@/lib/site';

describe('posts', () => {
  it('have unique, URL-safe slugs that resolve back', () => {
    const slugs = posts.map(p => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of posts) {
      expect(p.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(getPostBySlug(p.slug)).toBe(p);
    }
    expect(getPostBySlug('nope')).toBeNull();
  });

  it('carry valid dates and a short description', () => {
    for (const p of posts) {
      expect(p.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (p.dateModified) expect(p.dateModified >= p.datePublished).toBe(true);
      expect(p.description.length).toBeLessThanOrEqual(200);
    }
  });

  it('point at a real project and a public https source', () => {
    for (const p of posts) {
      if (p.project) expect(projectMeta[p.project]).toBeDefined();
      if (p.sourceUrl) expect(p.sourceUrl).toMatch(/^https:\/\//);
    }
    expect(getPostsForProject('opencodeintel').map(p => p.slug)).toContain('rerankers-code-search');
    expect(getPostsForProject('overhear').map(p => p.slug)).toContain('llm-judge-missed-id-check');
  });

  it('sort newest first', () => {
    const dates = getAllPosts().map(p => p.datePublished);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('have a body file with no em or en dashes and only the supported markdown', () => {
    for (const p of posts) {
      const body = readPostBody(p.slug);
      expect(body.length).toBeGreaterThan(500);
      expect(body + p.title + p.description).not.toMatch(/[–—]/);
      expect(body).not.toMatch(/^#(?!# )/m); // only ## headings; the page owns the h1
      expect(body).not.toMatch(/\*\*|__|^\d+\. /m); // no bold or numbered lists, they would render literally
      expect(body).not.toMatch(/\]\((?!https:\/\/)/); // links must be absolute https to be recognised
    }
  });
});

describe('formatPostDate', () => {
  it('formats without a timezone shift', () => {
    expect(formatPostDate('2026-10-12')).toBe('October 12, 2026');
    expect(formatPostDate('2025-01-01')).toBe('January 1, 2025');
  });
});

describe('markdown subset', () => {
  it('parses headings, lists and paragraphs', () => {
    const blocks = parseMarkdown('Para one\nwraps.\n\n## About those labels\n\n- a `x`\n- b\n');
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'Para one wraps.' }] },
      { type: 'heading', id: 'about-those-labels', text: 'About those labels' },
      { type: 'list', items: [[{ type: 'text', text: 'a ' }, { type: 'code', text: 'x' }], [{ type: 'text', text: 'b' }]] },
    ]);
  });

  it('parses inline code and https links, leaves other text literal', () => {
    expect(parseInline('see [repo](https://github.com/a/b) and `rerank-2`.')).toEqual([
      { type: 'text', text: 'see ' },
      { type: 'link', text: 'repo', href: 'https://github.com/a/b' },
      { type: 'text', text: ' and ' },
      { type: 'code', text: 'rerank-2' },
      { type: 'text', text: '.' },
    ]);
    expect(parseInline('[x](javascript:alert(1))')).toEqual([{ type: 'text', text: '[x](javascript:alert(1))' }]);
  });

  it('makes URL-safe heading ids', () => {
    expect(headingId("Six things changed at once, so I can't tell you which one mattered"))
      .toBe('six-things-changed-at-once-so-i-can-t-tell-you-which-one-mattered');
  });

  it('counts words without markup or link targets', () => {
    expect(wordCount('## Two words\n\n- one [link text](https://x.com/y) `code`')).toBe(6);
  });

  it('renders the reranker post into the expected sections', () => {
    const blocks = parseMarkdown(readPostBody('rerankers-code-search'));
    const headings = blocks.filter(b => b.type === 'heading').map(b => (b as { text: string }).text);
    expect(headings).toContain('About those labels');
    expect(blocks.some(b => b.type === 'list')).toBe(true);
  });
});

describe('BlogPosting JSON-LD', () => {
  const post = getPostBySlug('rerankers-code-search')!;
  const node = articleNode(post, 900, projectMeta.opencodeintel);

  it('is authored by the Person and linked to the project and its data', () => {
    expect(node['@type']).toBe('BlogPosting');
    expect(node.author).toMatchObject({ '@id': PERSON_ID });
    expect(node.url).toBe(`${SITE_URL}/writing/rerankers-code-search`);
    expect(node.isBasedOn).toBe('https://github.com/OpenCodeIntel/retrieval-research');
    expect(node.about).toMatchObject({ '@id': `${SITE_URL}/projects/${projectMeta.opencodeintel.slug}#project` });
    expect(node.wordCount).toBe(900);
  });

  it('emits datePublished and dateModified as full ISO 8601 datetimes with timezone', () => {
    for (const p of getAllPosts()) {
      const n = articleNode(p, 100);
      expect(n.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/);
      expect(n.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/);
      expect(String(n.datePublished).startsWith(p.datePublished)).toBe(true);
      expect(String(n.dateModified).startsWith(p.dateModified ?? p.datePublished)).toBe(true);
    }
  });
});

describe('llms.txt writing section', () => {
  it('links every post on www', () => {
    const txt = buildLlmsTxt();
    expect(txt).toContain('## Writing');
    for (const p of posts) expect(txt).toContain(`(${SITE_URL}/writing/${p.slug})`);
  });
});
