/**
 * About Me data — single source of truth for all About Me section content.
 *
 * Consumed by:
 *   - AboutMeApp.tsx (masthead, spec sheet)
 *   - JourneySection.tsx
 *   - ExcitesSection.tsx
 *   - CurrentlySection.tsx
 *   - ContactSection.tsx
 *
 * To update your bio, availability status, fun facts, or contact links:
 * edit this file. Components are thin renderers — no content lives in JSX.
 *
 * Long-form narrative paragraphs (journey, excites) remain in their
 * components since they're pure storytelling and tied to specific layouts.
 * Structured, update-prone data (contact, availability, lists) lives here.
 */

import portfolioData from './portfolio.json';

const { personalInfo } = portfolioData;

// ---------------------------------------------------------------------------
// Personal / identity
// ---------------------------------------------------------------------------

export const identity = {
  name:         personalInfo.name,
  title:        personalInfo.title,
  location:     personalInfo.location,
  availability: 'Open to Software Engineer, AI Engineer and Forward Deployed Engineer roles',
  photo:        '/devanshu-photo.png',
} as const;

// ---------------------------------------------------------------------------
// Masthead spec-line - identity-from-specifics, rendered as mono MetaLabel
// cells separated by middots. No role-label padding, no student/visa framing.
// ---------------------------------------------------------------------------

export const mastheadSpecLine = [
  'SOFTWARE + AI ENGINEER',
  'MCP · RAG · EVALS',
  'BOSTON',
  'OCI / OVERHEAR / SAAR',
] as const;

// ---------------------------------------------------------------------------
// Overview spec sheet - "About This Machine" definition list. Mono values,
// MetaLabel keys. Identity leaks from the work (MCP / OCI / Saar), never from
// a degree, a graduation date, or an availability label.
// ---------------------------------------------------------------------------

export interface SpecItem {
  key:   string;
  value: string;
}

export const specs: SpecItem[] = [
  { key: 'Discipline',  value: 'Software + AI engineering · forward deployed' },
  { key: 'Layer',       value: 'MCP · RAG · evals · voice agents' },
  { key: 'Stack',       value: 'TypeScript · Python · Go · AWS' },
  { key: 'Retrieval',   value: 'BM25 + vectors, RRF fusion, rerank' },
  { key: 'Shipping',    value: 'OpenCodeIntel · Overhear · CallBudget · Saar' },
  { key: 'Based in',    value: 'Boston, MA' },
];

// ---------------------------------------------------------------------------
// Intro section
// ---------------------------------------------------------------------------

export const quickIntro = [
  "Hey! I ship AI systems to production end to end: MCP servers, RAG with retrieval evals, LLM-as-a-judge eval harnesses and voice agents, plus the full-stack, infra and design work around them. OpenCodeIntel is a code-search platform for AI coding agents (web app, API and MCP server), and Overhear grades every call a voice agent takes against a clinic's real database. MS Software Engineering Systems from Northeastern, finished May 2026.",
  "Before that I spent two years full-time building a Java / Spring Boot quotation platform, and TA'd Network Structures & Cloud Computing for 100+ grad students across two semesters. Teaching set my bar: if I can't explain it at 11 PM to someone whose AWS setup is on fire, I don't understand it yet.",
] as const;

export interface OriginCard {
  iconName: string;   // lucide icon name (kept for non-visitor surfaces)
  title: string;
  text: string;
}

export const originStory: OriginCard[] = [
  {
    iconName: 'Gamepad2',
    title:    'The 8-year-old kid',
    text:     "My father brought home our first laptop. I went straight for the games, but Google blew my mind. This thing had answers to everything. That curiosity never stopped. It just got more focused.",
  },
  {
    iconName: 'Disc',
    title:    'Digit magazine weekends',
    text:     "Every Friday, new CDs full of software to explore. Those weekends shaped everything: breaking things, fixing them, learning how computers actually work. That hands-on exploration became my approach to learning.",
  },
  {
    iconName: 'Monitor',
    title:    'The "Hello World" moment',
    text:     "10th standard. First C program. Discovered for loops and pattern making. Right there, I knew: I wanted to be a software engineer. Not just use technology, but build it.",
  },
  {
    iconName: 'Rocket',
    title:    'Building real things',
    text:     "From struggling with a 2-month library database project to optimizing APIs at internships. Every failure taught patience. Every success unlocked new capabilities. That's still how I approach problems today.",
  },
];

export const whatImAbout = [
  "I build systems that work reliably under pressure. Distributed systems. Cloud infrastructure. APIs that respond fast. UIs that people can actually use.",
  "Half the job never makes the resume: figuring out what the customer actually needs, saying no to the clever version, and shipping the one that works.",
  "If it isn't measured, I don't trust it, my own work included. That's why every project here comes with its numbers and its caveats.",
] as const;

export interface FunFact {
  iconName: string;
  label: string;
  value: string;
}

export const funFacts: FunFact[] = [
  { iconName: 'Bot',   label: 'Current workflow', value: 'Claude + MCPs = learning on steroids' },
  { iconName: 'Gauge', label: 'F1 enthusiast',    value: 'Max Verstappen fan, love the engineering' },
  { iconName: 'Flame', label: 'Hot take',         value: 'Team pineapple on pizza, fight me' },
];

// ---------------------------------------------------------------------------
// Currently section
// ---------------------------------------------------------------------------

export const lookingFor = [
  'Teams that ship to real users every week',
  'Engineers who argue with data and change their minds when it disagrees',
  'Environment between startup energy and structured growth',
  'Good paycheck + security (being realistic here)',
] as const;

// ---------------------------------------------------------------------------
// Opinions (strongly held). The first three are lines from his own posts; the
// rest come from what the projects actually measured. Rendered in About >
// What Excites Me, the terminal `opinions` command, and the concierge context.
// ---------------------------------------------------------------------------

export const opinions = [
  "You're paying for tokens the model isn't reading.",
  "The model isn't smarter. It's just enough. And \"just enough\" is what actually ships.",
  'Scale was never the moat.',
  'Some rerankers make code search worse. I know because I tried one, measured it, and wrote it down.',
  "If the database already knows the answer, don't ask the LLM. Overhear's judge never grades a fact it could make up.",
  '"I don\'t know" is a feature. A confident wrong "in stock" sends someone to an empty pharmacy shelf.',
  'My eval set is 39 calls, mostly synthetic, one labeler. That sentence sits right next to the F1, where it belongs.',
  "Pineapple belongs on pizza. This one isn't data-driven.",
] as const;

export interface LearningItem {
  name: string;
  detail: string;
}

export const currentlyMastering: LearningItem[] = [
  { name: 'Go / Golang',          detail: 'Building high-performance microservices. The concurrency model is beautiful.' },
  { name: 'Advanced Kubernetes',  detail: "Container orchestration at scale. Because Docker Compose isn't enough anymore." },
  { name: 'System Design',        detail: 'Thinking at scale. Designing for failure. The big picture stuff.' },
];

export const readingList = [
  '"Designing Data-Intensive Applications" (the bible)',
  'System design blogs and case studies',
  'AWS whitepapers (yes, actually reading them)',
  "PostHog's engineering blog (inspiration)",
] as const;

export interface LifeItem {
  iconName: string;
  title: string;
  detail: string;
}

export const lifeItems: LifeItem[] = [
  { iconName: 'Coffee',   title: 'Exploring Boston',   detail: "Good coffee shops for coding sessions. The city's got great spots." },
  { iconName: 'Gauge',    title: 'Following F1',       detail: 'Max Verstappen fan. Love the strategy, the engineering, the speed.' },
  { iconName: 'Star',     title: 'Staying connected',  detail: 'Celebrating festivals, staying connected to my roots. Ganesh Chaturthi this year was amazing.' },
  { iconName: 'Dumbbell', title: 'Staying active',     detail: 'Gym helps clear the mind after long debugging sessions.' },
];

export const portfolioTechStack = [
  'Next.js 15', 'TypeScript', 'Framer Motion', 'Zustand', 'Tailwind CSS',
] as const;

// ---------------------------------------------------------------------------
// Contact section
// ---------------------------------------------------------------------------

export const contactLinks = {
  email:    personalInfo.email,
  linkedin: personalInfo.linkedin,
  github:   personalInfo.github,
} as const;
