/**
 * JSON-LD for every page, built from data/ so it never drifts from the copy.
 *
 * One Person node with a stable @id carries the identity: name, the legal name
 * as alternateName, roles, schools and the profiles that are unambiguously
 * him (sameAs). Product sites (opencodeintel.com, getsaar.com) are not him, so
 * they hang off project nodes as url/sameAs with the Person as author, which
 * is how search engines connect a person to the things they built.
 *
 * Projects use SoftwareSourceCode, not SoftwareApplication: Google validates
 * SoftwareApplication for rich results (offers, ratings) and would flag every
 * project; SoftwareSourceCode still links code, author and live site.
 */

import { identity, contactLinks } from '@/data/aboutMe';
import { RESUME } from '@/data/resume';
import type { ProjectMeta } from '@/data/projectMeta';
import { projectDescription, projectPath } from './seoContent';
import { SITE_URL, SITE_NAME, PERSON_NAME, SITE_DESCRIPTION, CONTENT_UPDATED, absoluteUrl } from './site';

export const PERSON_ID = `${SITE_URL}/#devanshu`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const LEGAL_NAME = 'Devanshu Rajesh Chicholikar';

/** Profiles that are him and only him. Product and org sites do not belong here. */
export const PERSON_SAME_AS = [
  contactLinks.linkedin,
  contactLinks.github,
  'https://github.com/Devanshuc',
];

type Node = Record<string, unknown>;

/** Short reference used wherever the Person is not the page's subject. */
export const personRef: Node = { '@type': 'Person', '@id': PERSON_ID, name: PERSON_NAME, url: SITE_URL };

export function personNode(): Node {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: PERSON_NAME,
    alternateName: LEGAL_NAME,
    givenName: 'Devanshu',
    familyName: 'Chicholikar',
    jobTitle: ['Software Engineer', 'AI Engineer', 'Forward Deployed Engineer'],
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: absoluteUrl(identity.photo),
    email: `mailto:${contactLinks.email}`,
    sameAs: PERSON_SAME_AS,
    alumniOf: RESUME.education.map(e => ({ '@type': 'CollegeOrUniversity', name: e.institution })),
    address: { '@type': 'PostalAddress', addressLocality: 'Boston', addressRegion: 'MA', addressCountry: 'US' },
    knowsAbout: [
      'Software engineering',
      'Model Context Protocol (MCP)',
      'MCP servers',
      'Retrieval-Augmented Generation (RAG)',
      'LLM evaluation (LLM-as-a-judge, golden datasets)',
      'Voice agents',
      'AI agents',
      'Code intelligence',
      'Hybrid retrieval (BM25, vectors, reranking)',
      'Full-stack development',
      'Backend development',
      'TypeScript',
      'Python',
      'Java',
      'React',
      'Next.js',
      'FastAPI',
      'AWS',
      'Terraform',
      'Distributed systems',
    ],
  };
}

export function websiteNode(): Node {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: 'en-US',
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
  };
}

/** ProfilePage: the page is about one person. Google reads mainEntity. */
export function profilePageNode(path: string): Node {
  return {
    '@type': 'ProfilePage',
    '@id': `${absoluteUrl(path)}#profile`,
    url: absoluteUrl(path),
    name: path === '/' ? `${PERSON_NAME} | Software Engineer, AI Engineer` : `About ${PERSON_NAME}`,
    isPartOf: { '@id': WEBSITE_ID },
    dateModified: CONTENT_UPDATED,
    mainEntity: personNode(),
  };
}

export function breadcrumbNode(trail: Array<{ name: string; path: string }>): Node {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: absoluteUrl(t.path),
    })),
  };
}

export function projectNode(meta: ProjectMeta): Node {
  const sameAs = [meta.repoUrl, meta.liveUrl].filter((u): u is string => Boolean(u));
  return {
    '@type': meta.repoUrl ? 'SoftwareSourceCode' : 'CreativeWork',
    '@id': `${absoluteUrl(projectPath(meta.slug))}#project`,
    name: meta.displayName,
    headline: meta.tagline,
    description: projectDescription(meta, 320),
    url: absoluteUrl(projectPath(meta.slug)),
    ...(meta.repoUrl && { codeRepository: meta.repoUrl }),
    ...(sameAs.length > 0 && { sameAs }),
    ...(meta.extraTech && { keywords: meta.extraTech.join(', ') }),
    author: personRef,
    creator: personRef,
  };
}

/** Wrap nodes in one @graph document. */
export function graph(...nodes: Node[]): Node {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

/** Safe for a <script> body: no "</script>" breakout. */
export function serializeJsonLd(doc: Node): string {
  return JSON.stringify(doc).replace(/</g, '\\u003c');
}
