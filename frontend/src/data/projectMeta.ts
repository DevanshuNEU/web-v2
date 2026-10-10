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
  /** URL slug for /projects/[slug]. Stable: changing it breaks indexed links. */
  slug: string;
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
  /** Public source repo. Omitted when the code is not public. */
  repoUrl?: string;
  /** Live site, package page or walkthrough. */
  liveUrl?: string;
  /** Label for liveUrl when it is not a website ("Walkthrough", "PyPI"). */
  liveLabel?: string;
}

export const projectMeta: Record<string, ProjectMeta> = {
  'opencodeintel': {
    slug: 'opencodeintel',
    displayName: 'OpenCodeIntel',
    tagline: 'Code search for AI coding agents, so they stop guessing',
    descriptionOverride: "Code-search platform for AI coding agents: hybrid BM25 + vector retrieval with reranking, tree-sitter AST chunking, a web app, a REST API and a 12-tool MCP server.",
    featured: true,
    category: 'org',
    status: 'active',
    story: [
      "OpenCodeIntel is a code-search platform for AI coding agents: a web app, a REST API and a 12-tool MCP server that give an agent real context on a codebase instead of letting it guess.",
      "Indexing parses each repo with tree-sitter into function-level chunks (Python, JavaScript and TypeScript), embeds them and stores them in Pinecone next to a BM25 index. A query runs both, fuses the results with reciprocal rank fusion and reranks them with a cross-encoder. The MCP server speaks stdio for local agents and streamable HTTP for hosted Claude.ai connectors.",
      "On a 665-query research eval across 14 open-source codebases, retrieval hit 94% Hit@1, and a 98-run ablation isolated the reranker at +8.4 points. On production, a cold search takes 641ms at the median and a cached repeat 242ms. One result went against me: rerankers trained on web text made code search worse. It stays in the research log.",
    ],
    achievements: [
      { metric: '94%', label: 'Hit@1, research eval', detail: '14 open-source codebases, 665 queries' },
      { metric: '641ms', label: 'p50 cold search, production', detail: 'Embedding, hybrid retrieval and reranking' },
      { metric: '242ms', label: 'p50 cached repeat', detail: 'End to end from Boston, measured Oct 2026' },
      { metric: '12', label: 'MCP tools', detail: 'stdio for local agents, streamable HTTP for Claude.ai' },
    ],
    extraTech: ['Python', 'FastAPI', 'FastMCP', 'tree-sitter', 'Pinecone', 'Cohere', 'Supabase', 'Redis', 'React', 'TypeScript'],
    repoUrl: 'https://github.com/OpenCodeIntel/opencodeintel',
    liveUrl: 'https://opencodeintel.com',
  },

  'overhear': {
    slug: 'overhear',
    displayName: 'Overhear',
    tagline: "A QA analyst for voice agents. It listens to every call so you don't have to",
    descriptionOverride: "AI QA analyst for voice agents: grades every call a Retell scheduling agent takes. Code checks what the call log proves, and an LLM-as-a-judge checks what the agent said against the clinic's real slots.",
    featured: true,
    category: 'personal',
    status: 'active',
    story: [
      "Voice agents fail quietly. They offer a slot that does not exist, skip the identity check or book the wrong provider, and the call still sounds fine. Overhear grades every call a Retell healthcare-scheduling agent takes against the clinic's real database.",
      "The split is the point. Code reads the call's action log in time order: was the patient verified before anything got booked, did the booking go through, did any tool call fail. Those 3 of 7 rubric dimensions carry 50% of the score and never depend on a model. An LLM-as-a-judge, handed the clinic's real open slots from Postgres, grades the other 4: invented slots, the wrong provider, safety and tone.",
      "On a 39-call golden dataset with 4 planted failure types, it caught 23 of 23 planted failures (macro-F1 0.89) with 0.99 self-consistency across 3 repeat runs. In one earlier run the judge missed an identity check skipped behind medical advice; the code check caught it, matching the gold labels 14 of 14. Adversarial cases showed where the judge over-flags (precision 0.60 and 0.67 on two types), and the eval page says so. Built in 7 days: 39 commits, 27 merged PRs, 132 tests.",
    ],
    achievements: [
      { metric: '23/23', label: 'Planted failures caught', detail: '4 failure types on a 39-call golden dataset' },
      { metric: '0.89', label: 'Macro-F1', detail: 'Small, mostly synthetic set with one labeler' },
      { metric: '50%', label: 'Of the score decided in code', detail: 'Identity, booking and tool checks read from the call log' },
      { metric: '132', label: 'Vitest cases', detail: '38 files over in-memory PGlite databases' },
    ],
    extraTech: ['Next.js', 'TypeScript', 'Retell', 'Claude API', 'Postgres', 'Drizzle', 'PGlite', 'Vitest', 'Railway'],
    repoUrl: 'https://github.com/DevanshuNEU/overhear',
  },

  'callbudget': {
    slug: 'callbudget',
    displayName: 'CallBudget',
    tagline: 'Teach a pharmacy-finder to call less and find more',
    descriptionOverride: "Active-sensing pharmacy search: predict which pharmacy has a hard-to-find drug, call the most likely first through a voice agent, and learn from every call.",
    featured: true,
    category: 'personal',
    status: 'active',
    story: [
      "Finding a drug during a shortage means calling pharmacy after pharmacy, and half the time 'in stock' turns out to be wrong. CallBudget treats it as a search problem: predict which pharmacy is most likely to have it, call that one first, and learn from every answer.",
      "A HistGradientBoosting ranker scores pharmacies by predicted stock. A Claude-driven voice agent (Pipecat, Deepgram, Cartesia) handles the conversation, tested against a simulated pharmacist on real pharmacy data. In the evals, every stock answer goes through an extractor that reads it several times and abstains when the reads disagree, so a shaky answer never sends a patient to an empty shelf. Wiring that vote into the live call is next.",
      "On a 19-pharmacy Boston pool, expected calls to find the drug fell from 4.3 to 2.3 (47%). With the extractor rigged to misread stock 25% of the time, false 'in stock' answers fell from 10% to 0% at 3 votes, and 5 votes held 0% while abstaining on 51% of calls instead of 69%. It ships as a 4-tool FastMCP server. Real inputs are NPPES pharmacies, RxNorm and the FDA shortage window; call outcomes are synthetic, with zero PHI. There is a Loom walkthrough on the repo.",
    ],
    achievements: [
      { metric: '47%', label: 'Fewer calls to find', detail: '4.3 to 2.3 expected calls vs a shuffled baseline' },
      { metric: '10% to 0%', label: "False 'in stock' answers", detail: 'Self-consistency voting under a 25%-unreliable extractor' },
      { metric: '4', label: 'MCP tools', detail: 'predict, plan, eval and converse over FastMCP' },
      { metric: 'Zero PHI', label: 'Real public inputs', detail: 'NPPES, RxNorm and FDA shortage data; synthetic outcomes' },
    ],
    extraTech: ['Python', 'scikit-learn', 'FastMCP', 'Pipecat', 'Deepgram', 'Cartesia', 'Optuna', 'DuckDB', 'Claude API'],
    repoUrl: 'https://github.com/DevanshuNEU/callbudget',
    liveUrl: 'https://www.loom.com/share/0231954a438c4b3ab011fd21f4f41bf2',
    liveLabel: 'Walkthrough',
  },

  'lco': {
    slug: 'saar',
    displayName: 'Saar',
    tagline: 'A Claude.ai token and cost meter that runs entirely in the browser',
    descriptionOverride: "Chrome extension that tracks Claude.ai token usage and cost in real time, entirely in the browser. Published on the Chrome Web Store.",
    featured: true,
    category: 'org',
    status: 'active',
    story: [
      "Saar is a Chrome extension, published on the Chrome Web Store, that shows Claude.ai token usage and cost in real time. There is no backend, so nothing leaves the browser.",
      "It runs in three contexts: a page-context script that intercepts Claude.ai's streaming responses and reads exact token counts, a content script that draws the overlay in a Shadow DOM, and a service worker running a BPE tokenizer.",
      "v1.0.0 cleared Chrome Web Store review in May 2026. v1.0.2 removed a permission Google flagged as unused.",
    ],
    achievements: [
      { metric: '1,808', label: 'Vitest tests', detail: '63 files, 2.1s suite, plus Playwright e2e' },
      { metric: 'Published', label: 'Chrome Web Store', detail: 'Chrome MV3, getsaar.com' },
      { metric: '0', label: 'Backend servers', detail: 'Usage data never leaves the browser' },
      { metric: '3', label: 'Extension contexts', detail: 'Page script, content script, service worker' },
    ],
    extraTech: ['TypeScript', 'WXT', 'Chrome MV3', 'React', 'Vitest', 'Playwright'],
    repoUrl: 'https://github.com/OpenCodeIntel/lco',
    liveUrl: 'https://getsaar.com',
  },

  'saar': {
    slug: 'saar-cli',
    displayName: 'saar CLI',
    tagline: 'Writes the context files coding agents need',
    descriptionOverride: "Statically analyzes a codebase and generates agent context files (AGENTS.md, CLAUDE.md, .cursorrules). Published on PyPI.",
    featured: true,
    category: 'org',
    status: 'active',
    story: [
      "saar CLI is a Python command-line tool, published on PyPI, that statically analyzes a codebase (package manager, logging, auth patterns and more) and writes the context files coding agents read: AGENTS.md, CLAUDE.md and .cursorrules.",
      "Coding agents do far better with context about the project, and nobody enjoys writing or maintaining that file. Point saar at a repo and it writes it for you.",
    ],
    achievements: [
      { metric: '22', label: 'Releases on PyPI', detail: 'v0.2.0 to v0.6.0' },
      { metric: '3', label: 'Context formats', detail: 'AGENTS.md, CLAUDE.md, .cursorrules' },
      { metric: 'Python', label: 'Static analysis', detail: 'Stack, patterns and conventions from the code' },
    ],
    extraTech: ['Python', 'Static analysis', 'CLI', 'PyPI'],
    repoUrl: 'https://github.com/OpenCodeIntel/saar',
    liveUrl: 'https://pypi.org/project/saar/',
    liveLabel: 'PyPI',
  },

  'web-v2': {
    slug: 'portfolio-os',
    displayName: 'Portfolio OS',
    tagline: "You're looking at it right now",
    descriptionOverride: "A desktop operating system in a browser tab: window manager, terminal and dock, built from scratch.",
    featured: true,
    category: 'meta',
    status: 'active',
    story: [
      "This portfolio itself. A desktop OS in a browser tab, built with Next.js 15, React 19, Framer Motion and Zustand. Because a static page felt boring.",
      "Boot sequence, draggable windows, a real terminal, dock magnification and an iOS-style phone shell on mobile, plus this very Projects app you're reading through.",
    ],
    achievements: [
      { metric: 'From scratch', label: 'Window manager', detail: 'Windows, terminal, dock and apps' },
      { metric: 'Mobile', label: 'Phone shell', detail: 'iOS-style home screen and app library' },
      { metric: 'Next.js 15', label: 'React 19', detail: 'TypeScript and Zustand throughout' },
    ],
    extraTech: ['Next.js 15', 'React 19', 'TypeScript', 'Framer Motion', 'Zustand', 'Tailwind CSS'],
    repoUrl: 'https://github.com/DevanshuNEU/web-v2',
  },

  'financial-copilot': {
    slug: 'financial-copilot',
    displayName: 'Financial Copilot',
    tagline: 'Because manual bookkeeping is so 2019',
    descriptionOverride: "AI expense tracker with automatic categorization, category budgets, spending insights and a daily safe-to-spend figure.",
    featured: true,
    category: 'personal',
    status: 'completed',
    story: [
      "Financial Copilot (ExpenseSink) is an AI expense tracker. Log an expense and it gets categorized automatically, counted against its category budget and folded into dashboards and AI spending insights.",
      "It also works out a daily safe-to-spend figure and compares each week with the last, so a bad week shows up before the month is gone.",
      "React 18 and TypeScript with Recharts on the front end; Supabase Edge Functions (Deno), Postgres and Supabase Auth behind it; deployed on Vercel.",
    ],
    achievements: [
      { metric: 'Auto', label: 'Expense categorization', detail: 'No manual tagging' },
      { metric: 'Daily', label: 'Safe-to-spend figure', detail: 'Budgets tracked per category' },
      { metric: 'AI', label: 'Spending insights', detail: 'Plus week-over-week comparisons' },
      { metric: 'Edge', label: 'Serverless backend', detail: 'Supabase Edge Functions on Deno' },
    ],
    extraTech: ['React 18', 'TypeScript', 'Tailwind CSS', 'Recharts', 'Supabase', 'PostgreSQL', 'Vercel'],
    repoUrl: 'https://github.com/DevanshuNEU/financial-copilot',
  },

  'SecureScale': {
    slug: 'securescale',
    displayName: 'SecureScale',
    tagline: 'Infrastructure that actually stays up',
    featured: true,
    category: 'personal',
    status: 'completed',
    story: [
      "You know what's harder than writing code? Making sure it stays running in production. SecureScale is a fully automated AWS infrastructure setup designed to not break at 3 AM.",
      "The whole thing is Infrastructure as Code in modular Terraform: VPC, ALB, auto-scaling groups, RDS and S3 encrypted with KMS, across multiple availability zones, with least-privilege IAM, Packer-built AMIs, GitHub Actions and CloudWatch monitoring.",
      "Provisioning went from 2 hours to 10 minutes, cloud spend dropped 30%, and it held 99.9% uptime.",
    ],
    achievements: [
      { metric: '99.9%', label: 'Uptime', detail: 'Fault-tolerant multi-AZ design' },
      { metric: '2h to 10m', label: 'Environment provisioning', detail: 'Terraform, Packer and GitHub Actions' },
      { metric: '30%', label: 'Cloud spend cut', detail: 'Rightsizing and resource allocation' },
      { metric: 'KMS + IAM', label: 'Defense in depth', detail: 'Least privilege, encryption, NAT isolation' },
    ],
    extraTech: ['AWS', 'Terraform', 'Packer', 'GitHub Actions', 'CloudWatch', 'Docker', 'PostgreSQL'],
  },

  'tool-crowding': {
    slug: 'tool-crowding',
    displayName: 'Tool Crowding Benchmark',
    tagline: 'Does an agent pick the wrong tool when too many MCP servers are loaded?',
    featured: false,
    category: 'personal',
    status: 'experimental',
    story: [
      "When an agent has dozens of MCP tools loaded, does it start picking the wrong one? Tool Crowding is a harness built to measure that cleanly, with the design and its hypotheses pre-registered before any data.",
      "Every trial is cache-cold: a per-trial nonce defeats prompt caching, a runtime assertion halts the run on a cache hit, and server SHAs plus tool schemas hash into every run ID, so a result can be reproduced byte for byte.",
      "Status: harness built, 19 exploratory trials run, the 144-trial pilot not run yet. The exploratory trials found no mis-routing with 6 dissimilar tools, which points at task ambiguity and agent persona rather than raw tool count.",
    ],
    achievements: [
      { metric: '345', label: 'Harness tests', detail: 'Fail-closed, cache-cold enforcement' },
      { metric: '199', label: 'Synthetic tools', detail: 'The corpus agents choose from' },
      { metric: '144', label: 'Pre-registered trials', detail: 'Factorial design locked before data' },
      { metric: '19', label: 'Exploratory trials run', detail: 'Pilot not run yet' },
    ],
    extraTech: ['Python', 'MCP', 'pytest', 'Anthropic API', 'Apache 2.0'],
    repoUrl: 'https://github.com/DevanshuNEU/tool-crowding',
  },

  'mem-machines': {
    slug: 'mem-machines',
    displayName: 'Mem Machines',
    tagline: 'Serverless ingestion on GCP with multi-tenant isolation and PII redaction',
    featured: false,
    category: 'personal',
    status: 'completed',
    story: [
      "Mem Machines is a serverless data ingestion pipeline built entirely on GCP: Cloud Run, Pub/Sub and Firestore working together on high-throughput data streams.",
      "The architecture is event-driven: messages land in Pub/Sub, Cloud Run workers spin up to process them, and results land in Firestore. Tenants stay isolated and PII is redacted on the way in. No servers to manage, it scales with demand, and the bill only arrives for actual work done.",
    ],
    achievements: [
      { metric: '3', label: 'GCP services', detail: 'Cloud Run + Pub/Sub + Firestore' },
      { metric: '0', label: 'Servers managed', detail: 'Fully serverless architecture' },
      { metric: 'PII', label: 'Automatic redaction', detail: 'Before anything is stored' },
      { metric: 'Event-driven', label: 'Architecture', detail: 'Decoupled, resilient, scalable' },
    ],
    extraTech: ['Python', 'GCP Cloud Run', 'Pub/Sub', 'Firestore', 'Docker'],
    repoUrl: 'https://github.com/DevanshuNEU/mem-machines',
  },

  'bob-wxo-hackathon': {
    slug: 'watsonx-test-forge',
    displayName: 'watsonx Test Forge',
    tagline: 'Hackathon: auto-generate Journey Success test cases for IBM watsonx agents',
    featured: true,
    category: 'personal',
    status: 'completed',
    story: [
      "IBM watsonx Orchestrate hackathon. The problem: manually authoring Journey Success test cases for watsonx agents is tedious and error-prone. Test Forge is a multi-tool agent that reads deployed agent specs and generates validated test cases automatically.",
      "Tool lifecycle: list_deployed_agents, get_agent_spec, generate_test_case, upload_test_case. Test cases cover happy path, edge cases, and failure scenarios with strict/fuzzy/optional argument matching plus response text keywords. All goals must pass for a test to succeed.",
      "Built on IBM's ADK + watsonx Orchestrate MCP server, integrated with Bob IDE. Demonstrates manager/collaborator agent composition: manager agents coordinate via named collaborators; collaborator agents own the tools.",
    ],
    achievements: [
      { metric: '4', label: 'Tools implemented', detail: 'list, get_spec, generate, upload with ToolResponse wrapping' },
      { metric: '13', label: 'Unit tests passing', detail: 'Schema validation, error handling, tool contracts' },
      { metric: 'Hackathon', label: 'IBM ADK', detail: 'Built on IBM ADK and watsonx Orchestrate' },
      { metric: 'Journey Success', label: 'Evaluation metric', detail: 'Tool-call + text-keyword matching' },
    ],
    extraTech: ['Python', 'IBM watsonx ADK', 'Pydantic', 'pytest', 'Groq/OpenAI LLMs'],
  },

  'campus-resources': {
    slug: 'campus-resources',
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
    extraTech: ['React', 'TypeScript', 'Tailwind CSS', 'Vite', 'Vercel'],
    repoUrl: 'https://github.com/DevanshuNEU/campus-resources',
    liveUrl: 'https://campus-resources.vercel.app',
  },
};

/** Get all featured projects in display order */
export function getFeaturedProjects(): string[] {
  const explicit = [
    'opencodeintel',
    'overhear',
    'callbudget',
    'lco',
    'web-v2',
    'saar',
    'financial-copilot',
  ];
  // Append any featured projects not explicitly listed, preserving declaration order
  const rest = Object.keys(projectMeta).filter(
    k => projectMeta[k].featured && !explicit.includes(k)
  );
  return [...explicit, ...rest].filter(k => k in projectMeta);
}

/**
 * Sort key that puts featured projects first, in getFeaturedProjects() order.
 * Everything else ranks after them; Array.prototype.sort is stable, so the
 * rest keep their incoming order (GitHub's most-recently-pushed first).
 */
export function featuredRank(name: string): number {
  const order = getFeaturedProjects();
  const i = order.indexOf(name);
  return i === -1 ? order.length : i;
}

/** Every project in display order: featured first, then the rest as declared. */
export function getAllProjectKeys(): string[] {
  return Object.keys(projectMeta).sort((a, b) => featuredRank(a) - featuredRank(b));
}

/** Look a project up by its URL slug. */
export function getProjectBySlug(slug: string): { key: string; meta: ProjectMeta } | null {
  const key = Object.keys(projectMeta).find(k => projectMeta[k].slug === slug);
  return key ? { key, meta: projectMeta[key] } : null;
}
