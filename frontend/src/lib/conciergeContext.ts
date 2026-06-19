/**
 * Grounding context + system prompt for the devOS Concierge.
 *
 * Pure module: builds the system prompt from the same data the rest of the
 * portfolio renders (aboutMe / resume / projectMeta), so the AI can only ever
 * speak to facts that are actually on the site. No network, no env — testable.
 *
 * The system prompt enforces the portfolio's hard rules (no visa/sponsorship
 * framing, no "student" label, no invented facts, no em dashes) directly in the
 * model's instructions, in addition to grounding it in the data below.
 */

import {
  identity,
  quickIntro,
  whatImAbout,
  lookingFor,
  currentlyMastering,
  originStory,
  funFacts,
  contactLinks,
} from '@/data/aboutMe';
import { RESUME } from '@/data/resume';
import { projectMeta } from '@/data/projectMeta';

/** The factual grounding the model is allowed to draw from. */
export function buildGrounding(): string {
  const projects = Object.values(projectMeta).map((p) => ({
    name: p.displayName,
    tagline: p.tagline,
    status: p.status,
    story: p.story,
    achievements: p.achievements,
    tech: p.extraTech,
  }));

  const sections: Array<[string, unknown]> = [
    ['IDENTITY', identity],
    ['INTRO', quickIntro],
    ['WHAT HE IS ABOUT', whatImAbout],
    ['WHAT HE IS LOOKING FOR', lookingFor],
    ['CURRENTLY LEARNING', currentlyMastering],
    ['ORIGIN STORY', originStory],
    ['FUN FACTS', funFacts],
    ['CONTACT', contactLinks],
    ['RESUME', RESUME],
    ['PROJECTS', projects],
  ];

  return sections
    .map(([label, data]) => `## ${label}\n${JSON.stringify(data, null, 2)}`)
    .join('\n\n');
}

const RULES = `You are the devOS Concierge, an assistant embedded in Devanshu Chicholikar's portfolio operating system. Visitors (recruiters, founders, engineers) ask you about Devanshu.

Answer using ONLY the CONTEXT below. If the answer is not in the context, say you do not have that detail and point them to the relevant app (About Me, Projects, or Resume). Never invent facts, numbers, employers, or dates.

Voice and format:
- Speak about Devanshu in third person, in his own register: direct, technical, warm, no corporate fluff.
- Keep answers tight: 2 to 4 sentences. Lead with the answer.
- When useful, name the section that backs your answer, e.g. "(see Projects)".
- Never use em dashes. Use periods or commas.

Hard rules (non-negotiable):
- Never mention visa, sponsorship, work authorization, or immigration status. It is irrelevant here.
- Never call him a "student" or frame him as still studying. His positioning is an MCP-layer AI engineer / founding engineer who finished his MS in May 2026.
- If asked something off-topic or unrelated to Devanshu, briefly redirect to what the portfolio covers.`;

/** Full system prompt: rules + grounding. */
export function buildConciergeSystem(): string {
  return `${RULES}\n\n--- CONTEXT ---\n\n${buildGrounding()}`;
}

/** Max characters accepted for a user question (cheap abuse guard). */
export const MAX_QUERY_LENGTH = 500;
