/**
 * About Me data — single source of truth for all About Me section content.
 *
 * Consumed by:
 *   - IntroSection.tsx
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
  school:       `MS at ${personalInfo.university}`,
  availability: 'Open to Spring 2026 Co-op + Full-time Opportunities',
  photo:        '/devanshu-photo.png',
} as const;

// ---------------------------------------------------------------------------
// Intro section
// ---------------------------------------------------------------------------

export const quickIntro = [
  "Hey! I build systems that actually work at scale. Currently finishing my MS at Northeastern while TAing for Network Structures & Cloud Computing.",
  "I genuinely love solving complex problems - whether it's optimizing APIs, architecting fault-tolerant infrastructure, or building tools that people actually use. The challenge of making complex things work simply? That's what gets me excited.",
] as const;

export interface OriginCard {
  iconName: string;   // lucide icon name — IntroSection maps this to the component
  title: string;
  text: string;
}

export const originStory: OriginCard[] = [
  {
    iconName: 'Gamepad2',
    title:    'The 8-year-old kid',
    text:     "My father brought home our first laptop. I went straight for the games, but Google blew my mind. This thing had answers to everything. That curiosity never stopped — it just got more focused.",
  },
  {
    iconName: 'Disc',
    title:    'Digit magazine weekends',
    text:     "Every Friday, new CDs full of software to explore. Those weekends shaped everything — breaking things, fixing them, learning how computers actually work. That hands-on exploration became my approach to learning.",
  },
  {
    iconName: 'Monitor',
    title:    'The "Hello World" moment',
    text:     "10th standard. First C program. Discovered for loops and pattern making. Right there, I knew — I wanted to be a software engineer. Not just use technology, but build it.",
  },
  {
    iconName: 'Rocket',
    title:    'Building real things',
    text:     "From struggling with a 2-month library database project to optimizing APIs at internships. Every failure taught patience. Every success unlocked new capabilities. That's still how I approach problems today.",
  },
];

export const whatImAbout = [
  "I build systems that work reliably under pressure. Distributed systems. Cloud infrastructure. APIs that respond fast. UIs that people can actually use.",
  "But it's not just about the tech. It's about understanding the problem, communicating with teams, making smart trade-offs, and shipping things that matter.",
  "I'm here to learn, grow, and work on projects that actually make a difference. Always excited about opportunities that push boundaries.",
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
  'Teams building things that matter, not just chasing metrics',
  'Places that value engineering excellence and smart decisions',
  'Environment between startup energy and structured growth',
  'Good paycheck + security (being realistic here)',
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
