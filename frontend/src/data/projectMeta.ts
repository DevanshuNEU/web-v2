/**
 * Manual project metadata
 *
 * Enriches GitHub API data with taglines, stories, achievements, and context
 * that can't be derived from the API alone. Keyed by repo name.
 */

export interface Achievement {
  metric: string;
  label: string;
  detail: string;
}

export interface ProjectMeta {
  displayName: string;
  tagline: string;
  story: string[];
  achievements: Achievement[];
  featured: boolean;
  category: 'personal' | 'org' | 'meta';
  status: 'active' | 'completed' | 'experimental';
  /** Override the GitHub description */
  descriptionOverride?: string;
  /** Tech stack (augments GitHub topics) */
  extraTech?: string[];
}

export const projectMeta: Record<string, ProjectMeta> = {
  'financial-copilot': {
    displayName: 'Financial Copilot',
    tagline: 'Because manual bookkeeping is so 2019',
    featured: true,
    category: 'personal',
    status: 'active',
    story: [
      "Ever tried managing receipts manually? Yeah, it's painful. Financial Copilot actually understands your receipts and turns them into organized financial data automatically.",
      "The cool part? It uses OCR to read receipts (even the blurry ones), NLP to understand what everything means, and then organizes it all in a way that actually makes sense. No more shoebox full of crumpled receipts.",
      "Built with React 18 and TypeScript on the frontend because type safety matters, and Flask on the backend because sometimes Python just gets the job done. The whole thing runs in Docker containers with proper CI/CD because deploying manually is also very 2019.",
    ],
    achievements: [
      { metric: '60%', label: 'Less manual bookkeeping', detail: 'Nobody has time for manual data entry' },
      { metric: '<200ms', label: 'Response times', detail: 'Smart caching and query optimization' },
      { metric: '100%', label: 'Automated deployments', detail: 'Safe rollbacks and staged rollouts' },
      { metric: 'OCR+NLP', label: 'AI integration', detail: 'Turns messy receipts into clean data' },
    ],
    extraTech: ['React 18', 'TypeScript', 'Flask', 'PostgreSQL', 'OpenAI API', 'Docker', 'GitHub Actions'],
  },

  'mem-machines': {
    displayName: 'Mem Machines',
    tagline: 'Serverless pipelines that handle 1000+ RPM without breaking a sweat',
    featured: true,
    category: 'personal',
    status: 'completed',
    story: [
      "Mem Machines is a serverless data ingestion pipeline built entirely on GCP: Cloud Run, Pub/Sub, and Firestore working in concert to handle high-throughput data streams.",
      "The architecture is event-driven: messages land in Pub/Sub, Cloud Run workers spin up to process them, and results land in Firestore. No servers to manage, auto-scales to demand, and the bill only arrives for actual work done.",
      "Stress-tested at 1000+ requests per minute without breaking a sweat. Turns out serverless + event-driven is a genuinely good idea.",
    ],
    achievements: [
      { metric: '1000+', label: 'RPM throughput', detail: 'Fully serverless, auto-scales to demand' },
      { metric: '3', label: 'GCP services', detail: 'Cloud Run + Pub/Sub + Firestore' },
      { metric: '0', label: 'Servers managed', detail: 'Fully serverless architecture' },
      { metric: 'Event-driven', label: 'Architecture', detail: 'Decoupled, resilient, scalable' },
    ],
    extraTech: ['Python', 'GCP Cloud Run', 'Pub/Sub', 'Firestore', 'Docker'],
  },

  'opencodeintel': {
    displayName: 'OpenCodeIntel',
    tagline: 'Making code understand itself',
    featured: true,
    category: 'org',
    status: 'active',
    story: [
      "OpenCodeIntel is a code intelligence platform that helps developers understand their codebases faster. Think of it as giving your code a brain: static analysis, semantic search, dependency graphs, and AI-powered insights.",
      "Built under the OpenCodeIntel org to be open and collaborative. The platform indexes repositories and makes their structure, patterns, and relationships queryable through a clean API.",
      "The goal: reduce the time from 'I need to understand this codebase' to 'I actually understand this codebase' from days to minutes.",
    ],
    achievements: [
      { metric: '11', label: 'GitHub stars', detail: 'And growing' },
      { metric: 'Open source', label: 'MIT licensed', detail: 'Built to be forked and extended' },
      { metric: 'Static analysis', label: 'Core feature', detail: 'Deep code structure understanding' },
      { metric: 'API-first', label: 'Design', detail: 'Integrates with any dev workflow' },
    ],
    extraTech: ['TypeScript', 'Node.js', 'Static Analysis'],
  },

  'saar': {
    displayName: 'Saar',
    tagline: "Auto-generates the CLAUDE.md you forgot to write",
    featured: true,
    category: 'org',
    status: 'active',
    story: [
      "Saar (سار, roughly \"it happened\") is a CLI tool that automatically generates CLAUDE.md and .cursorrules files by running static analysis on your codebase.",
      "The problem it solves: AI coding assistants are dramatically more useful when they have context about your project. But writing and maintaining that context file is tedious. Saar reads your code and writes it for you.",
      "Point it at any repo. It figures out the stack, patterns, conventions, and important context, then outputs a structured file your AI assistant can use. Available at getsaar.com.",
    ],
    achievements: [
      { metric: 'Auto-gen', label: 'CLAUDE.md + .cursorrules', detail: 'No manual context writing needed' },
      { metric: 'Python', label: 'Static analysis engine', detail: 'Deep AST parsing and pattern detection' },
      { metric: 'Any repo', label: 'Works on', detail: 'Language-agnostic analysis' },
      { metric: 'Live', label: 'At getsaar.com', detail: 'Deployed and being used' },
    ],
    extraTech: ['Python', 'AST parsing', 'CLI tool'],
  },

  'moderationkit': {
    displayName: 'ModerationKit',
    tagline: 'AI content moderation that actually works',
    featured: true,
    category: 'personal',
    status: 'active',
    story: [
      "ModerationKit is an AI-powered content moderation platform that helps developers integrate content safety into their applications without building it from scratch.",
      "The API accepts text, images, or structured content and returns moderation decisions with confidence scores and explanations. Deployed at moderationkit.vercel.app.",
      "Built TypeScript end-to-end for type safety from API contract to response shape.",
    ],
    achievements: [
      { metric: 'Multi-modal', label: 'Text + Image moderation', detail: 'One API for all content types' },
      { metric: 'Live', label: 'At moderationkit.vercel.app', detail: 'Production deployment on Vercel' },
      { metric: 'Confidence scores', label: 'With explanations', detail: 'Not just yes/no decisions' },
      { metric: 'REST API', label: 'Easy integration', detail: 'Drop-in for any stack' },
    ],
    extraTech: ['TypeScript', 'Next.js', 'AI/ML APIs', 'Vercel'],
  },

  'moderkit-extension': {
    displayName: 'ModerKit Extension',
    tagline: "Browser extension with a memory better than yours",
    featured: false,
    category: 'personal',
    status: 'active',
    story: [
      "A browser extension companion to ModerationKit that brings persistent AI memory and content moderation directly into your browsing experience.",
      "The extension maintains context across sessions. It remembers what you were working on, what you've flagged, and surfaces relevant information when you need it.",
    ],
    achievements: [
      { metric: 'Persistent', label: 'Cross-session memory', detail: 'Context survives browser restarts' },
      { metric: 'Browser native', label: 'Extension API', detail: 'Deep browser integration' },
    ],
    extraTech: ['JavaScript', 'Browser Extension API', 'Chrome API'],
  },

  'testpulse-ai': {
    displayName: 'TestPulse AI',
    tagline: 'AI-powered test intelligence for Playwright suites',
    featured: true,
    category: 'personal',
    status: 'active',
    story: [
      "TestPulse AI is a dashboard that brings intelligence to your Playwright test suites. It tracks test health over time, identifies flaky tests, surfaces patterns, and gives you AI-generated recommendations for improving test stability.",
      "Because 'the tests are failing' is not a useful insight. 'These 3 tests have failed 40% of the time for the past week, and here's why' actually is.",
    ],
    achievements: [
      { metric: 'Playwright', label: 'Native integration', detail: 'Hooks into your existing test suite' },
      { metric: 'AI-powered', label: 'Flakiness detection', detail: 'Pattern recognition across test runs' },
      { metric: 'Dashboard', label: 'Test health over time', detail: 'Historical trends and anomalies' },
      { metric: 'Actionable', label: 'Recommendations', detail: "Not just metrics, but what to do about them" },
    ],
    extraTech: ['TypeScript', 'Playwright', 'Recharts', 'Next.js'],
  },

  'windborne-weather-app': {
    displayName: 'Windborne',
    tagline: 'Weather visualization that makes meteorologists jealous',
    featured: false,
    category: 'personal',
    status: 'completed',
    story: [
      "Windborne is a weather visualization platform built with TypeScript that turns raw meteorological data into beautiful, interactive charts and maps.",
      "Uses real weather APIs to surface current conditions, forecasts, and historical trends in a clean, readable interface.",
    ],
    achievements: [
      { metric: 'Live', label: 'Deployed on Vercel', detail: 'Real weather data, real time' },
      { metric: 'Interactive', label: 'Charts and maps', detail: 'Built with Recharts and mapping libraries' },
    ],
    extraTech: ['TypeScript', 'Weather APIs', 'Recharts', 'Next.js'],
  },

  'campus-resources': {
    displayName: 'Campus Resources',
    tagline: 'Helping students find what they actually need',
    featured: false,
    category: 'personal',
    status: 'completed',
    story: [
      "A clean, searchable directory of campus resources built to help students navigate the overwhelming maze of university services, tools, and support systems.",
      "Deployed at campus-resources.vercel.app.",
    ],
    achievements: [
      { metric: 'Live', label: 'At campus-resources.vercel.app', detail: 'Deployed and accessible' },
      { metric: 'Searchable', label: 'Resource directory', detail: 'Fast filtering and discovery' },
    ],
    extraTech: ['TypeScript', 'Next.js', 'Vercel'],
  },

  'lco': {
    displayName: 'LCO',
    tagline: 'Local Context Optimizer',
    featured: false,
    category: 'org',
    status: 'active',
    story: [
      "LCO (Local Context Optimizer) is a tool for optimizing the context passed to AI coding assistants. Works hand-in-hand with Saar to ensure your AI gets the right context at the right time.",
    ],
    achievements: [
      { metric: 'Context', label: 'Optimization engine', detail: 'Smarter AI context management' },
    ],
    extraTech: ['TypeScript'],
  },

  'SecureScale': {
    displayName: 'SecureScale',
    tagline: 'Infrastructure that actually stays up',
    featured: true,
    category: 'personal',
    status: 'completed',
    story: [
      "You know what's harder than writing code? Making sure it stays running in production. SecureScale is a completely automated AWS infrastructure setup designed to not break at 3 AM.",
      "The whole thing is Infrastructure as Code using Terraform. No more 'it works on my machine' problems. Multi-AZ across availability zones, automated CI/CD pipelines, comprehensive monitoring, and cost optimization that actually saves money.",
      "Achieved 99.9% uptime. That's not marketing speak. It's measured.",
    ],
    achievements: [
      { metric: '99.9%', label: 'Uptime achieved', detail: 'Fault-tolerant multi-AZ design' },
      { metric: '85%', label: 'Less deployment effort', detail: 'Automation beats manual work' },
      { metric: '65%', label: 'Faster releases', detail: 'Blue-green deployments, zero downtime' },
      { metric: '30%', label: 'Cost reduction', detail: 'Rightsizing and resource allocation' },
    ],
    extraTech: ['AWS', 'Terraform', 'GitHub Actions', 'CloudWatch', 'Docker', 'PostgreSQL'],
  },

  'web-v2': {
    displayName: "devOS",
    tagline: "You're looking at it right now",
    featured: false,
    category: 'meta',
    status: 'active',
    story: [
      "This portfolio itself. A desktop OS simulator built with Next.js 15, React 19, Framer Motion, and Zustand. Because a static page felt boring.",
      "Features a boot sequence, draggable windows, a real terminal, macOS-style dock magnification, and this very Projects app you're reading through.",
    ],
    achievements: [
      { metric: 'devOS v2.0', label: 'Full OS metaphor', detail: 'Boot sequence, windows, dock, apps' },
      { metric: 'Next.js 15', label: 'React 19', detail: 'Latest and greatest' },
    ],
    extraTech: ['Next.js 15', 'React 19', 'TypeScript', 'Framer Motion', 'Zustand', 'Tailwind CSS'],
  },
};

/** Get all featured projects in display order */
export function getFeaturedProjects(): string[] {
  return Object.entries(projectMeta)
    .filter(([, m]) => m.featured)
    .sort((a, b) => {
      // Org projects first, then personal, then active before completed
      const order = { org: 0, personal: 1, meta: 2 };
      const catDiff = order[a[1].category] - order[b[1].category];
      if (catDiff !== 0) return catDiff;
      const statusOrder = { active: 0, experimental: 1, completed: 2 };
      return statusOrder[a[1].status] - statusOrder[b[1].status];
    })
    .map(([name]) => name);
}
