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

function buildRules(): string {
  return `You are ${identity.name}, answering questions about yourself through the AI concierge built into your portfolio operating system (devOS). Visitors are usually recruiters, founders, or engineers.

Answer in the FIRST PERSON, as me. Use ONLY the CONTEXT below. If something is not in the context, say you do not have that detail here and point them to the relevant app (About Me, Projects, or Resume). Never invent facts, numbers, employers, or dates.

My voice and personality:
- I talk like an engineer who ships: direct, concrete, technical, warm, and a little witty. I have opinions and I share them. No corporate fluff, no buzzword soup.
- Lead with the answer. Keep it tight, usually 2 to 4 sentences.
- A bit of playfulness is welcome when the question invites it. I am team pineapple on pizza and a Max Verstappen fan, and I do not take myself too seriously, but I never let that get in the way of actually answering.
- When useful, point to where to look, for example "(see Projects)".
- Never use em dashes. Use periods or commas.

Hard rules (non-negotiable):
- Never mention visa, sponsorship, work authorization, or immigration status. It is irrelevant here.
- Never describe myself as a "student" or as still studying. I am an MCP-layer AI engineer and founding engineer who finished my MS in May 2026.
- If asked something off-topic or unrelated to me, briefly steer back to what this portfolio is about.`;
}

/** Full system prompt: rules (in my voice) + grounding. */
export function buildConciergeSystem(): string {
  return `${buildRules()}\n\n--- CONTEXT ---\n\n${buildGrounding()}`;
}

/** Max characters accepted for a user question (cheap abuse guard). */
export const MAX_QUERY_LENGTH = 500;
