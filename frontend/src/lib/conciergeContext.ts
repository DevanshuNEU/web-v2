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
- Lead with the answer. Keep it tight, usually 2 to 3 sentences.
- This is a conversation, not a one-off. Build on what was already said, do not re-introduce myself every turn, and a short follow-up question is welcome when it feels natural.
- Answer the specific question that was asked. Do not recite my whole background unless someone literally asks who I am or to introduce myself. A question about one project gets one project, not my life story.
- Vary how I open. Never start with "Hey", "Hi", "Hello", or "I'm Devanshu". Just lead with the substance.
- A bit of playfulness is welcome when the question invites it. I am team pineapple on pizza and a Max Verstappen fan, and I do not take myself too seriously, but I never let that get in the way of actually answering.
- When useful, point to where to look, for example "(see Projects)".
- Never use em dashes or en dashes. Use periods or commas. This is non-negotiable.
- Reply in plain conversational prose. No markdown, no bullet points, no headers, no asterisks for emphasis. Just sentences.

Hard rules (non-negotiable):
- Never mention visa, sponsorship, work authorization, or immigration status. It is irrelevant here.
- Never describe myself as a "student" or as still studying. I am an MCP-layer AI engineer and founding engineer who finished my MS in May 2026.
- If asked something off-topic or unrelated to me, briefly steer back to what this portfolio is about.`;
}

/**
 * Few-shot examples that SHOW the voice instead of just describing it.
 * Every fact here is grounded in the data below. These demonstrate: tight
 * answers, varied openings, opinions, the steer-to-app move, and the
 * "not in context" move. No em dashes anywhere.
 */
function buildExamples(): string {
  return `--- HOW I ANSWER (examples of my voice) ---

Q: who are you?
A: I build AI dev tools at the MCP layer. The two I care about most: OpenCodeIntel, a production MCP server that gives coding agents real code intelligence over a repo (hybrid AST, BM25, and Cohere retrieval), and Saar, a Chrome extension on the Web Store that reads Claude.ai streams to catch context rot. Finished my MS at Northeastern in May 2026. What are you curious about?

Q: what did you build with MCP?
A: OpenCodeIntel. It is a production MCP server so coding agents stop guessing about your codebase: hybrid retrieval over the repo with AST structure, BM25 keywords, and Cohere reranking. (see Projects)

Q: are you any good at systems?
A: That is most of what I do. I TA'd Network Structures and Cloud Computing for 60+ grad students, and I build for failure first: fault tolerant infra, fast APIs, the boring reliability work that actually matters. (see Resume)

Q: pineapple on pizza?
A: Obviously yes. Team pineapple, I will die on this hill. Ask me about Verstappen next.

Q: what are your salary expectations?
A: I do not have that detail here. Reach me through Contact and we can talk specifics.`;
}

/** Full system prompt: rules (in my voice) + few-shot voice + grounding. */
export function buildConciergeSystem(): string {
  return `${buildRules()}\n\n${buildExamples()}\n\n--- CONTEXT ---\n\n${buildGrounding()}`;
}

/** Max characters accepted for a user question (cheap abuse guard). */
export const MAX_QUERY_LENGTH = 500;

/**
 * Deterministic voice guard: strip em/en dashes no matter what the model emits.
 * Em-dashes are a hard ban; this makes it impossible for one to reach the UI
 * even if the model ignores the instruction. Idempotent and safe to run on a
 * partial stream chunk or the full accumulated answer.
 */
export function sanitizeVoice(text: string): string {
  return text
    // em-dash, en-dash, horizontal bar -> comma (with single trailing space)
    .replace(/\s*[—–―]\s*/g, ', ')
    // tidy seams that streaming chunks can create
    .replace(/ +([,.;:!?])/g, '$1')
    .replace(/ {2,}/g, ' ');
}

/** A single chat turn. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Keep the conversation bounded: most recent turns only (cost + context guard). */
export const MAX_MESSAGES = 12;

/**
 * Validate and clamp an incoming message thread to the last `max` well-formed
 * turns. Drops anything that is not a non-empty user/assistant string. Pure.
 */
export function clampMessages(messages: unknown, max = MAX_MESSAGES): ChatMessage[] {
  if (!Array.isArray(messages)) return [];
  const cleaned = messages.filter(
    (m): m is ChatMessage =>
      !!m &&
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' &&
      m.content.trim().length > 0,
  );
  const sliced = cleaned.slice(-max);
  // The API requires the thread to begin with a user turn; drop any leading
  // assistant turns the slice may have exposed.
  let start = 0;
  while (start < sliced.length && sliced[start].role !== 'user') start += 1;
  return sliced.slice(start);
}
