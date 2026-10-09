/**
 * Server-rendered summary for crawlers and AI search on the home route.
 *
 * The desktop at / is a client-rendered SPA, so this block is what a no-JS
 * fetch of the home page reads. It is built from data/ (no hand-copied text to
 * drift) and links every plain-HTML page so crawlers can follow them.
 */

import Link from 'next/link';
import { identity, quickIntro, contactLinks } from '@/data/aboutMe';
import { RESUME } from '@/data/resume';
import { projectMeta, getAllProjectKeys } from '@/data/projectMeta';
import { projectDescription, projectPath } from '@/lib/seoContent';
import { PERSON_NAME } from '@/lib/site';

export default function HomeSummary() {
  return (
    <div className="sr-only">
      <h1>{PERSON_NAME}, Software Engineer and AI Engineer (MCP servers, RAG, evals, voice agents)</h1>
      <p>{identity.availability}. Based in {identity.location}.</p>
      {quickIntro.map(p => <p key={p}>{p}</p>)}
      <nav aria-label="Pages">
        <Link href="/about">About</Link> <Link href="/projects">Projects</Link> <Link href="/resume">Resume</Link>
      </nav>
      <h2>Projects</h2>
      <ul>
        {getAllProjectKeys().map(key => {
          const meta = projectMeta[key];
          return (
            <li key={key}>
              <Link href={projectPath(meta.slug)}>{meta.displayName}</Link>: {projectDescription(meta, 320)}
            </li>
          );
        })}
      </ul>
      <h2>Experience</h2>
      <ul>
        {RESUME.experience.map(e => (
          <li key={e.company + e.period}>{e.role}, {e.company}, {e.period}</li>
        ))}
      </ul>
      <h2>Skills</h2>
      <ul>
        {RESUME.skills.map(g => <li key={g.category}>{g.category}: {g.items.join(', ')}</li>)}
      </ul>
      <h2>Contact</h2>
      <p>Email: {contactLinks.email}</p>
      <p>GitHub: <a href={contactLinks.github}>{contactLinks.github}</a></p>
      <p>LinkedIn: <a href={contactLinks.linkedin}>{contactLinks.linkedin}</a></p>
    </div>
  );
}
