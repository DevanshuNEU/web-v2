/**
 * Unified skill data — single source of truth.
 *
 * Consumed by:
 *   - SkillsDashboardApp  (visual skill tree)
 *   - ResumeApp           (skills section, via skillsForResume())
 *
 * To add a skill: add one entry here. Both places update automatically.
 * To change a description or level: edit here only.
 */

export type SkillCategory = 'language' | 'frontend' | 'backend' | 'cloud' | 'ai' | 'tool';

export interface Skill {
  /** Unique identifier — used for dependency references */
  id: string;
  name: string;
  category: SkillCategory;
  /** 1 (beginner) → 5 (expert) */
  level: 1 | 2 | 3 | 4 | 5;
  /** One-liner for the skill card */
  description: string;
  /** IDs of skills that are prerequisites / closely related */
  deps: string[];
}

export const SKILLS: Skill[] = [
  // ── Languages ────────────────────────────────────────────────────────
  { id: 'ts',         name: 'TypeScript',       category: 'language', level: 5, description: 'Primary language for all frontend and Node.js work. Strict mode always on.', deps: [] },
  { id: 'python',     name: 'Python',           category: 'language', level: 5, description: 'ML pipelines, Flask APIs, scripts, and data engineering.', deps: [] },
  { id: 'java',       name: 'Java',             category: 'language', level: 4, description: 'Spring Boot microservices and enterprise patterns.',     deps: [] },
  { id: 'sql',        name: 'SQL',              category: 'language', level: 5, description: 'Complex queries, window functions, query optimisation, migrations.', deps: [] },

  // ── Frontend ─────────────────────────────────────────────────────────
  { id: 'react',      name: 'React / Next.js',  category: 'frontend', level: 5, description: 'App Router, RSC, Suspense, streaming. This portfolio runs on Next.js 15.', deps: ['ts'] },
  { id: 'tailwind',   name: 'Tailwind CSS',     category: 'frontend', level: 5, description: 'Utility-first styling, custom design systems, dark mode.', deps: ['ts'] },
  { id: 'framer',     name: 'Framer Motion',    category: 'frontend', level: 4, description: 'Spring physics, layout animations, gesture-driven UI.',  deps: ['react'] },

  // ── Backend ───────────────────────────────────────────────────────────
  { id: 'node',       name: 'Node.js',          category: 'backend',  level: 5, description: 'REST APIs, event-driven services, WebSockets.',          deps: ['ts'] },
  { id: 'fastapi',    name: 'FastAPI',          category: 'backend',  level: 5, description: 'Async Python APIs. Primary backend for all AI/ML services. Pydantic schemas.', deps: ['python'] },
  { id: 'flask',      name: 'Flask',            category: 'backend',  level: 4, description: 'RESTful Python APIs, ML model serving, blueprint architecture.', deps: ['python'] },
  { id: 'postgres',   name: 'PostgreSQL',       category: 'backend',  level: 5, description: 'Schema design, indexing, full-text search, row-level security.', deps: ['sql'] },
  { id: 'redis',      name: 'Redis',            category: 'backend',  level: 3, description: 'Caching layers, pub/sub messaging, session storage.',    deps: ['postgres'] },
  { id: 'spring',     name: 'Spring Boot',      category: 'backend',  level: 4, description: 'Microservices, dependency injection, JPA/Hibernate.',    deps: ['java'] },

  // ── Cloud / DevOps ────────────────────────────────────────────────────
  { id: 'aws',        name: 'AWS',              category: 'cloud',    level: 5, description: 'EC2, S3, Lambda, RDS, VPC, ALB, ASG, KMS, IAM. Production-grade multi-AZ architecture.', deps: ['node'] },
  { id: 'gcp',        name: 'GCP',              category: 'cloud',    level: 4, description: 'Cloud Run, Pub/Sub, Firestore. Serverless, event-driven ingestion pipelines.', deps: ['python'] },
  { id: 'docker',     name: 'Docker',           category: 'cloud',    level: 4, description: 'Multi-stage builds, Compose orchestration, optimised images.', deps: ['node'] },
  { id: 'k8s',        name: 'Kubernetes',       category: 'cloud',    level: 3, description: 'Deployments, services and rolling updates in coursework projects, plus occasional use at work.', deps: ['docker'] },
  { id: 'terraform',  name: 'Terraform',        category: 'cloud',    level: 4, description: 'IaC for AWS. Modules, state management, remote backends. 99.9% uptime achieved.', deps: ['aws'] },
  { id: 'cicd',       name: 'CI / CD',          category: 'cloud',    level: 4, description: 'GitHub Actions, automated testing, zero-downtime deploy pipelines.', deps: ['docker'] },
  { id: 'prometheus', name: 'Observability',    category: 'cloud',    level: 3, description: 'CloudWatch alarms and dashboards, Sentry error tracking.', deps: ['aws'] },

  // ── AI / ML Engineering ───────────────────────────────────────────────
  { id: 'rag',        name: 'RAG Pipelines',    category: 'ai',       level: 5, description: 'Hybrid retrieval: vector + BM25 fused with RRF, then reranked. 94% Hit@1 on the OpenCodeIntel research eval.', deps: ['python', 'embeddings'] },
  { id: 'openai',     name: 'OpenAI API',       category: 'ai',       level: 5, description: 'GPT-4o, embeddings, function calling, structured outputs. Both completion and embedding APIs.', deps: ['python', 'ts'] },
  { id: 'mcp',        name: 'MCP Servers',      category: 'ai',       level: 5, description: 'A 12-tool code-search MCP server (OpenCodeIntel) and a 4-tool FastMCP server (CallBudget), over stdio and streamable HTTP.', deps: ['python', 'ts'] },
  { id: 'embeddings', name: 'Embeddings',       category: 'ai',       level: 5, description: 'OpenAI, Voyage AI, Cohere. Embedding models, reranking, semantic similarity at scale.', deps: ['openai'] },
  { id: 'treesitter', name: 'Tree-sitter',      category: 'ai',       level: 4, description: 'Function-level AST chunking for Python, JavaScript and TypeScript in OpenCodeIntel.', deps: ['python'] },
  { id: 'llmeval',    name: 'LLM Evaluation',   category: 'ai',       level: 4, description: 'Retrieval evals (Hit@k, MRR, ablations) and LLM-as-a-judge graders scored against a golden dataset.', deps: ['rag'] },
  { id: 'voice',      name: 'Voice Agents',     category: 'ai',       level: 4, description: 'Pipecat and Deepgram call agents (CallBudget) and Retell agents graded call by call (Overhear).', deps: ['python', 'llmeval'] },

  // ── Tools ─────────────────────────────────────────────────────────────
  { id: 'git',        name: 'Git',              category: 'tool',     level: 5, description: 'Rebasing, bisect, worktrees, hooks. Git is muscle memory.', deps: ['ts'] },
  { id: 'posthog',    name: 'PostHog',          category: 'tool',     level: 4, description: 'Product analytics, feature flags, session replay. Powers this portfolio.', deps: ['react'] },
];

// ---------------------------------------------------------------------------
// Display metadata — co-located with skill data (not in components)
// ---------------------------------------------------------------------------

export const CAT_COLOR: Record<SkillCategory, string> = {
  language: '#818cf8',
  frontend: '#22d3ee',
  backend:  '#34d399',
  cloud:    '#fbbf24',
  ai:       '#c084fc',
  tool:     '#f472b6',
};

export const CAT_LABEL: Record<SkillCategory, string> = {
  language: 'Language',
  frontend: 'Frontend',
  backend:  'Backend',
  cloud:    'Cloud / DevOps',
  ai:       'AI / ML Eng',
  tool:     'Tools',
};

export const LEVEL_LABEL: Record<number, string> = {
  1: 'Beginner',
  2: 'Familiar',
  3: 'Proficient',
  4: 'Advanced',
  5: 'Expert',
};

export const SKILL_CATEGORIES = ['all', 'ai', 'cloud', 'backend', 'frontend', 'language', 'tool'] as const;
export type FilterCategory = typeof SKILL_CATEGORIES[number];

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

/** Skills grouped by category, for resume-style flat display */
export function skillsForResume(): { category: string; items: string[] }[] {
  const groups: Record<string, string[]> = {
    Languages:      [],
    Frontend:       [],
    Backend:        [],
    'AI / ML':      [],
    'Cloud / DevOps': [],
    Tools:          [],
  };

  const catMap: Record<SkillCategory, string> = {
    language: 'Languages',
    frontend: 'Frontend',
    backend:  'Backend',
    ai:       'AI / ML',
    cloud:    'Cloud / DevOps',
    tool:     'Tools',
  };

  for (const skill of SKILLS) {
    groups[catMap[skill.category]].push(skill.name);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([category, items]) => ({ category, items }));
}

/** All valid skill IDs — useful for validation */
export const SKILL_IDS = new Set(SKILLS.map(s => s.id));
