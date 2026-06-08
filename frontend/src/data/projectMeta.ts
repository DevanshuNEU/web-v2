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
    featured: false,
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
      { metric: 'Hybrid', label: 'AST + lexical retrieval', detail: 'Deep code structure + fast keyword search' },
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
    featured: false,
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
    featured: false,
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
    featured: true,
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

  'callbudget': {
    displayName: 'CallBudget',
    tagline: 'Teach a pharmacy-finder to call less and find more',
    featured: true,
    category: 'personal',
    status: 'active',
    story: [
      "Finding specialty medication in a shortage is genuinely miserable. You call pharmacy after pharmacy, get put on hold, and half the time they say 'in stock' and then it's not. CallBudget fixes the calling problem.",
      "It reframes the search as Bayesian active sensing: a HistGradientBoosting model ranks pharmacies by predicted stock probability, a voice agent navigates IVRs and hold music, and calibrated abstention suppresses false-positive-in-stock answers — the ones that send patients to empty shelves.",
      "The result is a 47% reduction in expected calls (4.3 to 2.3 avg) with false-positive rate suppressed from ~10% to ~0%. Shipped as an MCP server so it drops into any agentic workflow. Built on a 19-pharmacy Boston corpus for Adderall XR 20mg, entirely on public data (NPPES, RxNorm, DEA ARCOS) — zero PHI.",
    ],
    achievements: [
      { metric: '47%', label: 'Fewer calls to find', detail: 'Bayesian active sensing vs naive random calling' },
      { metric: '~0%', label: 'False-positive suppressed', detail: 'Self-consistency voting; safety is a hard constraint' },
      { metric: 'MCP native', label: 'Ships as MCP server', detail: 'Drops into any agentic workflow via FastMCP' },
      { metric: 'Zero PHI', label: '100% public data', detail: 'NPPES + RxNorm + DEA ARCOS + FDA/ASHP' },
    ],
    extraTech: ['Python', 'scikit-learn', 'DuckDB', 'FastMCP', 'Pipecat', 'Deepgram', 'Optuna', 'Claude API'],
  },

  'tool-crowding': {
    displayName: 'Tool Crowding Benchmark',
    tagline: 'Does adding more MCP servers hurt code retrieval? Here is the experiment.',
    featured: true,
    category: 'personal',
    status: 'experimental',
    story: [
      "There is a real question nobody has measured cleanly: when you pile on MCP servers, does discrimination interference degrade code retrieval? Tool Crowding is the pre-registered, open-methodology benchmark designed to answer it.",
      "The key methodological move: a padded-N=1 control (adapted from Chroma's text-retrieval work) isolates interference from prompt-length effects. The harness varies N as a continuous variable and measures pass@1 degradation. Conflict of interest (built OpenCodeIntel) is disclosed upfront with a mandatory leave-OCI-out sensitivity run.",
      "Exploratory probes already found something interesting: a task-framing x agent-persona interaction that prior art (RAG-MCP, LongFuncEval, MCPVerse, LiveMCPBench) did not report. The methodology is locked across 10 binding design docs. The sweep is paused — turns out frontier model API bills are real. Will pick up when the budget does.",
    ],
    achievements: [
      { metric: 'Pre-registered', label: 'Before any data', detail: '4 scenario abstracts, locked decision rules, kill criteria' },
      { metric: '10', label: 'Binding design docs', detail: 'Methodology locked end-to-end before first trial' },
      { metric: 'New finding', label: 'Framing x persona', detail: 'Not reported by RAG-MCP, LongFuncEval, or MCPVerse' },
      { metric: 'Paused', label: 'API budget constraint', detail: 'Harness ready; sweep resumes when funds do' },
    ],
    extraTech: ['Python', 'pytest', 'Anthropic API', 'Claude Sonnet/Opus', 'Apache 2.0'],
  },

  'parsewave-terminal-bench': {
    displayName: 'ParseWave Terminal-Bench',
    tagline: 'Contract work: LLM debugging benchmarks calibrated to actually discriminate',
    featured: true,
    category: 'personal',
    status: 'completed',
    story: [
      "Freelance work for ParseWave. The brief: author a benchmark suite of systems debugging tasks that are hard enough to measure LLM agent reliability — not just pass/fail on obvious bugs.",
      "Turns out Opus 4.8 passes naive 'find the bug' tasks 4 out of 5 times. That is not a benchmark, that is a tutorial. Tasks here are calibrated to 0-2/5 agent pass rate. Each uses Harbor format: oracle/nop baselines, anti-cheat measures (hash-locked backends, nonce echo), preflight checks.",
      "Three tasks shipped: nginx-502, fd-leak-emfile, and concurrent-ledger (the one where the winning fix — minimal-scope locking — drops latency from 5.2s to 0.95s and is genuinely non-obvious).",
    ],
    achievements: [
      { metric: '3', label: 'Harbor-verified tasks', detail: 'nginx-502, fd-leak-emfile, concurrent-ledger' },
      { metric: '0-2/5', label: 'Target agent pass rate', detail: 'Calibrated to discriminate, not tutor' },
      { metric: '5.2s to 0.95s', label: 'Oracle vs naive on ledger', detail: 'Minimal-scope lock is the non-obvious move' },
      { metric: 'Gig', label: 'Contract for ParseWave', detail: 'Delivered on spec, Harbor-verified' },
    ],
    extraTech: ['Python', 'pytest', 'Go', 'Nginx', 'PostgreSQL', 'Harbor format'],
  },

  'external-agents-fork': {
    displayName: 'Entire External Agents',
    tagline: 'OSS contribution: protocol bridge so any AI coding agent plugs into Entire',
    featured: true,
    category: 'personal',
    status: 'completed',
    story: [
      "Open-source contribution to entire.io. Entire gives AI coding agents checkpoint/rewind/lifecycle hooks — External Agents is the protocol layer that lets any agent (Kiro, Amp, Cursor, Claude Code) plug in without native support.",
      "Subcommand interface over stdin/stdout. Each agent binary implements the protocol contract; the lifecycle harness auto-discovers and builds them all; shared integration tests run across every CLI in one pass.",
      "Shipped two production agents: Kiro (hooks + transcript analysis) and Amp (hooks + transcript + token calculation + compact transcripts). Three test layers: generic protocol compliance, per-agent unit/build, lifecycle integration.",
    ],
    achievements: [
      { metric: '2', label: 'Agents shipped', detail: 'Kiro and Amp, both protocol-compliant' },
      { metric: '3-layer', label: 'Test architecture', detail: 'Protocol compliance + agent unit + lifecycle integration' },
      { metric: 'Auto-discovery', label: 'Lifecycle harness', detail: 'No hardcoded agent list' },
      { metric: 'OSS', label: 'Contribution to entire.io', detail: 'Apache 2.0, merged upstream' },
    ],
    extraTech: ['Go', 'bash', 'Python', 'Entire CLI', 'GitHub Actions'],
  },

  'bob-wxo-hackathon': {
    displayName: 'watsonx Test Forge',
    tagline: 'Hackathon: auto-generate Journey Success test cases for IBM watsonx agents',
    featured: true,
    category: 'personal',
    status: 'completed',
    story: [
      "IBM watsonx Orchestrate hackathon. The problem: manually authoring Journey Success test cases for watsonx agents is tedious and error-prone. Test Forge is a multi-tool agent that reads deployed agent specs and generates validated test cases automatically.",
      "Tool lifecycle: list_deployed_agents, get_agent_spec, generate_test_case, upload_test_case. Test cases cover happy path, edge cases, and failure scenarios with strict/fuzzy/optional argument matching plus response text keywords — all goals must pass for a test to succeed.",
      "Built on IBM's ADK + watsonx Orchestrate MCP server, integrated with Bob IDE. Demonstrates manager/collaborator agent composition: manager agents coordinate via named collaborators; collaborator agents own the tools.",
    ],
    achievements: [
      { metric: '4', label: 'Tools implemented', detail: 'list, get_spec, generate, upload with ToolResponse wrapping' },
      { metric: '13', label: 'Unit tests passing', detail: 'Schema validation, error handling, tool contracts' },
      { metric: 'Hackathon', label: 'IBM ADK', detail: 'Full deployment pipeline on watsonx Orchestrate' },
      { metric: 'Journey Success', label: 'Evaluation metric', detail: 'Tool-call + text-keyword matching' },
    ],
    extraTech: ['Python', 'IBM watsonx ADK', 'Pydantic', 'pytest', 'Groq/OpenAI LLMs'],
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
  const explicit = [
    'lco',
    'saar',
    'opencodeintel',
    'financial-copilot',
  ];
  // Append any featured projects not explicitly listed, preserving declaration order
  const rest = Object.keys(projectMeta).filter(
    k => projectMeta[k].featured && !explicit.includes(k)
  );
  return [...explicit, ...rest].filter(k => k in projectMeta);
}
