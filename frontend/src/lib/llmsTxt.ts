/**
 * Builds /llms.txt: a plain-markdown map of the site for language models, in the
 * llmstxt.org shape (title, summary, then link lists). No engine has said it
 * ranks on this file; it costs nothing and gives a model one clean read.
 * Built from data/ at build time, so it never drifts from the pages.
 */

import { identity, quickIntro, opinions, contactLinks } from '@/data/aboutMe';
import { RESUME } from '@/data/resume';
import { projectMeta, getAllProjectKeys } from '@/data/projectMeta';
import { SITE_PAGES, projectDescription, projectPath } from '@/lib/seoContent';
import { absoluteUrl, PERSON_NAME, SITE_DESCRIPTION } from '@/lib/site';

export function buildLlmsTxt(): string {
  const lines: string[] = [
    `# ${PERSON_NAME}`,
    '',
    `> ${SITE_DESCRIPTION} ${identity.availability}, based in ${identity.location}.`,
    '',
    ...quickIntro.flatMap(p => [p, '']),
    '## Pages',
    '',
    ...SITE_PAGES.map(p => `- [${p.title}](${absoluteUrl(p.path)}): ${p.description}`),
    `- [Resume PDF](${absoluteUrl('/resume.pdf')}): The one-page resume`,
    '',
    '## Projects',
    '',
    ...getAllProjectKeys().map(key => {
      const meta = projectMeta[key];
      return `- [${meta.displayName}](${absoluteUrl(projectPath(meta.slug))}): ${projectDescription(meta, 320)}`;
    }),
    '',
    '## Experience',
    '',
    ...RESUME.experience.map(e => `- ${e.role}, ${e.company} (${e.period})`),
    ...RESUME.education.map(e => `- ${e.degree}, ${e.institution} (${e.period})`),
    '',
    '## Opinions',
    '',
    ...opinions.map(o => `- ${o}`),
    '',
    '## Contact',
    '',
    `- Email: ${contactLinks.email}`,
    `- GitHub: ${contactLinks.github}`,
    `- LinkedIn: ${contactLinks.linkedin}`,
    '',
  ];
  return lines.join('\n');
}
