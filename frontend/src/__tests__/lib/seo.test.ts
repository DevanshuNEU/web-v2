import { describe, it, expect } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { buildLlmsTxt } from '@/lib/llmsTxt';
import { projectMeta, getAllProjectKeys, getProjectBySlug } from '@/data/projectMeta';
import { posts } from '@/data/writing';
import { projectDescription } from '@/lib/seoContent';
import { SITE_URL, ROLE_LINE, absoluteUrl } from '@/lib/site';

const keys = Object.keys(projectMeta);

describe('project slugs', () => {
  it('are unique, lowercase and URL safe', () => {
    const slugs = keys.map(k => projectMeta[k].slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('resolve back to their project', () => {
    for (const k of keys) expect(getProjectBySlug(projectMeta[k].slug)?.key).toBe(k);
    expect(getProjectBySlug('nope')).toBeNull();
  });

  it('list every project, featured first', () => {
    const all = getAllProjectKeys();
    expect(all).toHaveLength(keys.length);
    expect(all[0]).toBe('opencodeintel');
  });

  it('never point a repo link at a repo that is not public', () => {
    expect(projectMeta.SecureScale.repoUrl).toBeUndefined();
    expect(projectMeta['bob-wxo-hackathon'].repoUrl).toBeUndefined();
  });
});

describe('role line', () => {
  it('names all three roles on every link-preview card', () => {
    expect(ROLE_LINE).toBe('Software Engineer, AI Engineer, Forward Deployed Engineer');
  });
});

describe('OpenCodeIntel latency claims', () => {
  // The 641ms / 242ms numbers were measured on the public playground, which runs
  // search v3 without Cohere (pro_user is never set on that route). Never pair
  // them with reranking or call them the MCP path.
  it('name the playground and never claim reranking', () => {
    const oci = projectMeta.opencodeintel;
    const tile = oci.achievements.find(a => a.metric === '641ms')!;
    expect(tile.label).toContain('playground');
    expect(`${tile.label} ${tile.detail}`).not.toMatch(/rerank/i);
    expect(oci.story.join(' ')).not.toMatch(/production, a cold search/i);
  });
});

describe('canonical origin', () => {
  it('is www', () => {
    expect(SITE_URL).toBe('https://www.devanshuchicholikar.com');
    expect(absoluteUrl('/')).toBe(SITE_URL);
    expect(absoluteUrl('about')).toBe(`${SITE_URL}/about`);
  });
});

describe('sitemap', () => {
  const entries = sitemap();
  const urls = entries.map(e => e.url);

  it('lists home, the four pages, every project and every post on www', () => {
    expect(urls).toContain(SITE_URL);
    for (const p of ['/about', '/projects', '/resume', '/writing']) expect(urls).toContain(`${SITE_URL}${p}`);
    for (const k of keys) expect(urls).toContain(`${SITE_URL}/projects/${projectMeta[k].slug}`);
    for (const post of posts) expect(urls).toContain(`${SITE_URL}/writing/${post.slug}`);
    expect(urls).toHaveLength(5 + keys.length + posts.length);
    for (const u of urls) expect(u.startsWith(SITE_URL)).toBe(true);
  });

  it('uses a fixed content date, not the build time', () => {
    for (const e of entries) expect(e.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('robots', () => {
  const r = robots();
  const rules = Array.isArray(r.rules) ? r.rules : [r.rules];

  it('allows search and AI crawlers, training ones included', () => {
    const named = rules.flatMap(x => (Array.isArray(x.userAgent) ? x.userAgent : [x.userAgent]));
    for (const bot of ['*', 'Googlebot', 'Bingbot', 'OAI-SearchBot', 'GPTBot', 'Claude-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot']) {
      expect(named).toContain(bot);
    }
    for (const x of rules) {
      expect(x.allow).toBe('/');
      expect(x.disallow).toEqual(['/api/', '/mobile-preview']);
    }
  });

  it('points at the www sitemap', () => {
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});

describe('llms.txt', () => {
  const txt = buildLlmsTxt();

  it('opens with the name and a summary line', () => {
    expect(txt.startsWith('# Devanshu Chicholikar\n\n> ')).toBe(true);
    expect(txt).toContain('Software Engineer, AI Engineer and Forward Deployed Engineer');
  });

  it('links every project page on www', () => {
    for (const k of keys) expect(txt).toContain(`(${SITE_URL}/projects/${projectMeta[k].slug})`);
  });

  it('has no em or en dashes', () => {
    expect(txt).not.toMatch(/[–—]/);
  });
});

describe('projectDescription', () => {
  it('clips on a word boundary', () => {
    for (const k of keys) {
      const d = projectDescription(projectMeta[k], 120);
      expect(d.length).toBeLessThanOrEqual(123);
    }
  });
});
