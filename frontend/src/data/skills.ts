/**
 * Unified skill data — single source of truth.
 *
 * Consumed by:
 *   - SkillsDashboardApp  (visual skill tree)
 *   - ResumeApp           (skills section, via skillsForResume())
 *
 * To add a skill: add one entry here. Both places update automatically.
 * To change a description, level, or XP: edit here only.
 */

export type SkillCategory = 'language' | 'frontend' | 'backend' | 'cloud' | 'ai' | 'tool';

export interface Skill {
  /** Unique identifier — used for dependency references */
  id: string;
  name: string;
  category: SkillCategory;
  /** 1 (beginner) → 5 (expert) */
  level: 1 | 2 | 3 | 4 | 5;
  /** Human-readable experience string, e.g. "3 yrs" */
  xp: string;
  /** One-liner for the skill card */
  description: string;
  /** IDs of skills that are prerequisites / closely related */
  deps: string[];
}

export const SKILLS: Skill[] = [
  // ── Languages ────────────────────────────────────────────────────────
  { id: 'ts',         name: 'TypeScript',       category: 'language', level: 5, xp: '3 yrs',   description: 'Primary language for all frontend and Node.js work. Strict mode always on.',                                  deps: [] },
  { id: 'python',     name: 'Python',           category: 'language', level: 5, xp: '4 yrs',   description: 'ML pipelines, Flask APIs, scripts, and data engineering.',                                                    deps: [] },
  { id: 'java',       name: 'Java',             category: 'language', level: 4, xp: '2 yrs',   description: 'Spring Boot microservices and enterprise patterns.',                                                           deps: [] },
  { id: 'sql',        name: 'SQL',              category: 'language', level: 5, xp: '3 yrs',   description: 'Complex queries, window functions, query optimisation, migrations.',                                           deps: [] },

  // ── Frontend ─────────────────────────────────────────────────────────
  { id: 'react',      name: 'React / Next.js',  category: 'frontend', level: 5, xp: '3 yrs',   description: 'App Router, RSC, Suspense, streaming. This portfolio runs on Next.js 15.',                                   deps: ['ts'] },
  { id: 'tailwind',   name: 'Tailwind CSS',     category: 'frontend', level: 5, xp: '2 yrs',   description: 'Utility-first styling, custom design systems, dark mode.',                                                    deps: ['ts'] },
  { id: 'framer',     name: 'Framer Motion',    category: 'frontend', level: 4, xp: '1 yr',    description: 'Spring physics, layout animations, gesture-driven UI.',                                                       deps: ['react'] },

  // ── Backend ───────────────────────────────────────────────────────────
  { id: 'node',       name: 'Node.js',          category: 'backend',  level: 5, xp: '3 yrs',   description: 'REST APIs, event-driven services, WebSockets.',                                                               deps: ['ts'] },
  { id: 'fastapi',    name: 'FastAPI',          category: 'backend',  level: 5, xp: '2 yrs',   description: 'Async Python APIs. Primary backend for all AI/ML services. Pydantic schemas.',                               deps: ['python'] },
  { id: 'flask',      name: 'Flask',            category: 'backend',  level: 4, xp: '2 yrs',   description: 'RESTful Python APIs, ML model serving, blueprint architecture.',                                              deps: ['python'] },
  { id: 'postgres',   name: 'PostgreSQL',       category: 'backend',  level: 5, xp: '3 yrs',   description: 'Schema design, indexing, full-text search, row-level security.',                                             deps: ['sql'] },
  { id: 'redis',      name: 'Redis',            category: 'backend',  level: 3, xp: '1 yr',    description: 'Caching layers, pub/sub messaging, session storage.',                                                         deps: ['postgres'] },
  { id: 'spring',     name: 'Spring Boot',      category: 'backend',  level: 4, xp: '2 yrs',   description: 'Microservices, dependency injection, JPA/Hibernate.',                                                        deps: ['java'] },

  // ── Cloud / DevOps ────────────────────────────────────────────────────
  { id: 'aws',        name: 'AWS',              category: 'cloud',    level: 5, xp: '2 yrs',   description: 'EC2, S3, Lambda, RDS, VPC, ALB, ASG, KMS, IAM. Production-grade multi-AZ architecture.',                    deps: ['node'] },
  { id: 'gcp',        name: 'GCP',              category: 'cloud',    level: 4, xp: '1.5 yrs', description: 'Cloud Run, Pub/Sub, Firestore, Vertex AI. Serverless event-driven pipelines at 1000+ RPM.',                 deps: ['python'] },
  { id: 'docker',     name: 'Docker',           category: 'cloud',    level: 4, xp: '2 yrs',   description: 'Multi-stage builds, Compose orchestration, optimised images.',                                               deps: ['node'] },
  { id: 'k8s',        name: 'Kubernetes',       category: 'cloud',    level: 3, xp: '1 yr',    description: 'Deployments, services, ingress, resource limits, rolling updates.',                                           deps: ['docker'] },
  { id: 'terraform',  name: 'Terraform',        category: 'cloud',    level: 4, xp: '1.5 yrs', description: 'IaC for AWS. Modules, state management, remote backends. 99.9% uptime achieved.',                           deps: ['aws'] },
  { id: 'cicd',       name: 'CI / CD',          category: 'cloud',    level: 4, xp: '2 yrs',   description: 'GitHub Actions, automated testing, zero-downtime deploy pipelines.',                                         deps: ['docker'] },
  { id: 'prometheus', name: 'Observability',    category: 'cloud',    level: 3, xp: '1 yr',    description: 'Prometheus + Grafana dashboards, CloudWatch alarms, distributed tracing.',                                   deps: ['aws'] },

  // ── AI / ML Engineering ───────────────────────────────────────────────
  { id: 'rag',        name: 'RAG Pipelines',    category: 'ai',       level: 5, xp: '1.5 yrs', description: 'Hybrid retrieval: vector + BM25 + Cohere reranking. 87.5% Hit@1 on OpenCodeIntel.',                         deps: ['python', 'postgres'] },
  { id: 'langchain',  name: 'LangChain',        category: 'ai',       level: 5, xp: '1.5 yrs', description: 'Chains, agents, memory, tools. Used for agentic code-intelligence pipelines.',                              deps: ['python'] },
  { id: 'openai',     name: 'OpenAI API',       category: 'ai',       level: 5, xp: '2 yrs',   description: 'GPT-4o, embeddings, function calling, structured outputs. Both completion and embedding APIs.',              deps: ['python', 'ts'] },
  { id: 'pgvector',   name: 'pgvector',         category: 'ai',       level: 5, xp: '1.5 yrs', description: 'Vector similarity search directly in Postgres. IVFFlat + HNSW indexing for sub-50ms retrieval.',            deps: ['postgres', 'rag'] },
  { id: 'mcp',        name: 'MCP Protocol',     category: 'ai',       level: 4, xp: '1 yr',    description: 'Model Context Protocol. Built MCP servers that give Claude semantic code-search tools.',                    deps: ['langchain', 'ts'] },
  { id: 'embeddings', name: 'Embeddings',       category: 'ai',       level: 5, xp: '1.5 yrs', description: 'OpenAI, Voyage AI, Cohere. Embedding models, reranking, semantic similarity at scale.',                    deps: ['openai'] },
  { id: 'treesitter', name: 'Tree-sitter',      category: 'ai',       level: 4, xp: '1 yr',    description: 'AST parsing across 8 languages for code intelligence. Extracts functions, classes, symbols.',               deps: ['python'] },
  { id: 'llmeval',    name: 'LLM Evaluation',   category: 'ai',       level: 4, xp: '1 yr',    description: 'Hit@k, MRR, NDCG metrics. Built eval pipelines to systematically measure retrieval quality.',               deps: ['rag'] },
  { id: 'vertexai',   name: 'Vertex AI',        category: 'ai',       level: 3, xp: '1 yr',    description: 'Model deployment, batch prediction, and managed endpoints on GCP.',                                          deps: ['gcp'] },

  // ── Tools ─────────────────────────────────────────────────────────────
  { id: 'git',        name: 'Git',              category: 'tool',     level: 5, xp: '4 yrs',   description: 'Rebasing, bisect, worktrees, hooks. Git is muscle memory.',                                                  deps: ['ts'] },
  { id: 'graphql',    name: 'GraphQL',          category: 'tool',     level: 3, xp: '1 yr',    description: 'Schema-first design, Apollo Client, DataLoader.',                                                             deps: ['node'] },
  { id: 'posthog',    name: 'PostHog',          category: 'tool',     level: 4, xp: '1 yr',    description: 'Product analytics, feature flags, session replay. Powers this portfolio.',                                   deps: ['react'] },
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
