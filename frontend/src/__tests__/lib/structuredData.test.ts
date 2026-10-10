import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  personNode, profilePageNode, projectNode, websiteNode, breadcrumbNode, graph, serializeJsonLd,
  PERSON_ID, PERSON_SAME_AS, LEGAL_NAME,
} from '@/lib/structuredData';
import { projectMeta } from '@/data/projectMeta';
import { SITE_URL, INDEXNOW_KEY } from '@/lib/site';

describe('Person', () => {
  const p = personNode();

  it('carries the public name, the legal name as alternateName, and all three roles', () => {
    expect(p.name).toBe('Devanshu Chicholikar');
    expect(p.alternateName).toBe(LEGAL_NAME);
    expect(LEGAL_NAME).toBe('Devanshu Rajesh Chicholikar');
    expect(p.jobTitle).toEqual(['Software Engineer', 'AI Engineer', 'Forward Deployed Engineer']);
  });

  it('lists only profiles that are him in sameAs, never product or org sites', () => {
    expect(PERSON_SAME_AS).toEqual([
      'https://www.linkedin.com/in/devanshuchicholikar/',
      'https://github.com/DevanshuNEU',
      'https://github.com/Devanshuc',
    ]);
    for (const u of PERSON_SAME_AS) {
      expect(u).not.toMatch(/opencodeintel\.com|getsaar\.com|github\.com\/OpenCodeIntel/);
    }
  });

  it('uses the www origin for its @id, url and image', () => {
    expect(PERSON_ID).toBe(`${SITE_URL}/#devanshu`);
    expect(p.url).toBe(SITE_URL);
    expect(String(p.image).startsWith(SITE_URL)).toBe(true);
  });

  it('never calls OpenCodeIntel an employer', () => {
    expect(p).not.toHaveProperty('worksFor');
    expect(JSON.stringify(p)).not.toMatch(/founder|ceo/i);
  });
});

describe('ProfilePage', () => {
  it('puts the full Person in mainEntity', () => {
    const page = profilePageNode('/about');
    expect(page['@type']).toBe('ProfilePage');
    expect(page.url).toBe(`${SITE_URL}/about`);
    expect((page.mainEntity as Record<string, unknown>)['@id']).toBe(PERSON_ID);
    expect(page.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('projects', () => {
  it('link code, live site and the author for every project', () => {
    for (const meta of Object.values(projectMeta)) {
      const node = projectNode(meta);
      expect(node.url).toBe(`${SITE_URL}/projects/${meta.slug}`);
      expect((node.author as Record<string, unknown>)['@id']).toBe(PERSON_ID);
      if (meta.repoUrl) {
        expect(node['@type']).toBe('SoftwareSourceCode');
        expect(node.codeRepository).toBe(meta.repoUrl);
      } else {
        expect(node['@type']).toBe('CreativeWork');
        expect(node).not.toHaveProperty('codeRepository');
      }
    }
  });

  it('ties the product sites to the project, not the person', () => {
    expect(projectNode(projectMeta.opencodeintel).sameAs).toContain('https://opencodeintel.com');
    expect(projectNode(projectMeta.lco).sameAs).toContain('https://getsaar.com');
  });

  it('keeps a walkthrough video out of sameAs and describes it with subjectOf', () => {
    const node = projectNode(projectMeta.callbudget);
    expect(node.sameAs).toEqual(['https://github.com/DevanshuNEU/callbudget']);
    expect(node.subjectOf).toEqual({
      '@type': 'CreativeWork',
      name: 'CallBudget walkthrough',
      url: 'https://www.loom.com/share/0231954a438c4b3ab011fd21f4f41bf2',
    });
    // A package page still identifies the project.
    expect(projectNode(projectMeta.saar).sameAs).toContain('https://pypi.org/project/saar/');
    expect(projectNode(projectMeta.saar)).not.toHaveProperty('subjectOf');
  });
});

describe('graph and serialization', () => {
  it('wraps nodes in one schema.org document', () => {
    const doc = graph(websiteNode(), breadcrumbNode([{ name: 'Home', path: '/' }]));
    expect(doc['@context']).toBe('https://schema.org');
    expect(doc['@graph']).toHaveLength(2);
  });

  it('cannot break out of a script tag', () => {
    const out = serializeJsonLd({ x: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(JSON.parse(out).x).toBe('</script><script>alert(1)</script>');
  });
});

describe('IndexNow key', () => {
  it('is served from public/ and matches the script', () => {
    const root = process.cwd();
    expect(readFileSync(join(root, 'public', `${INDEXNOW_KEY}.txt`), 'utf8').trim()).toBe(INDEXNOW_KEY);
    expect(readFileSync(join(root, 'scripts', 'indexnow.mjs'), 'utf8')).toContain(`const KEY = '${INDEXNOW_KEY}'`);
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
  });
});
