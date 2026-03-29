'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────────── */
/* Data                                                                */
/* ─────────────────────────────────────────────────────────────────── */

interface Skill {
  id: string;
  name: string;
  category: 'language' | 'frontend' | 'backend' | 'cloud' | 'ai' | 'tool';
  level: number;   // 1–5
  xp: string;
  description: string;
  deps: string[];  // prerequisite skill ids
}

const SKILLS: Skill[] = [
  // ── Languages ──────────────────────────────────────────────────────
  { id: 'ts',         name: 'TypeScript',       category: 'language', level: 5, xp: '3 yrs',   description: 'Primary language for all frontend and Node.js work. Strict mode always on.', deps: [] },
  { id: 'python',     name: 'Python',           category: 'language', level: 5, xp: '4 yrs',   description: 'ML pipelines, Flask APIs, scripts, and data engineering.', deps: [] },
  { id: 'java',       name: 'Java',             category: 'language', level: 4, xp: '2 yrs',   description: 'Spring Boot microservices and enterprise patterns.', deps: [] },
  { id: 'sql',        name: 'SQL',              category: 'language', level: 5, xp: '3 yrs',   description: 'Complex queries, window functions, query optimisation, migrations.', deps: [] },

  // ── Frontend ───────────────────────────────────────────────────────
  { id: 'react',      name: 'React / Next.js',  category: 'frontend', level: 5, xp: '3 yrs',   description: 'App Router, RSC, Suspense, streaming. This portfolio runs on Next.js 15.', deps: ['ts'] },
  { id: 'tailwind',   name: 'Tailwind CSS',     category: 'frontend', level: 5, xp: '2 yrs',   description: 'Utility-first styling, custom design systems, dark mode.', deps: ['ts'] },
  { id: 'framer',     name: 'Framer Motion',    category: 'frontend', level: 4, xp: '1 yr',    description: 'Spring physics, layout animations, gesture-driven UI.', deps: ['react'] },

  // ── Backend ────────────────────────────────────────────────────────
  { id: 'node',       name: 'Node.js',          category: 'backend',  level: 5, xp: '3 yrs',   description: 'REST APIs, event-driven services, WebSockets.', deps: ['ts'] },
  { id: 'fastapi',    name: 'FastAPI',          category: 'backend',  level: 5, xp: '2 yrs',   description: 'Async Python APIs. Primary backend for all AI/ML services. Pydantic schemas.', deps: ['python'] },
  { id: 'flask',      name: 'Flask',            category: 'backend',  level: 4, xp: '2 yrs',   description: 'RESTful Python APIs, ML model serving, blueprint architecture.', deps: ['python'] },
  { id: 'postgres',   name: 'PostgreSQL',       category: 'backend',  level: 5, xp: '3 yrs',   description: 'Schema design, indexing, full-text search, row-level security.', deps: ['sql'] },
  { id: 'redis',      name: 'Redis',            category: 'backend',  level: 3, xp: '1 yr',    description: 'Caching layers, pub/sub messaging, session storage.', deps: ['postgres'] },
  { id: 'spring',     name: 'Spring Boot',      category: 'backend',  level: 4, xp: '2 yrs',   description: 'Microservices, dependency injection, JPA/Hibernate.', deps: ['java'] },

  // ── Cloud / DevOps ─────────────────────────────────────────────────
  { id: 'aws',        name: 'AWS',              category: 'cloud',    level: 5, xp: '2 yrs',   description: 'EC2, S3, Lambda, RDS, VPC, ALB, ASG, KMS, IAM. Production-grade multi-AZ architecture.', deps: ['node'] },
  { id: 'gcp',        name: 'GCP',              category: 'cloud',    level: 4, xp: '1.5 yrs', description: 'Cloud Run, Pub/Sub, Firestore, Vertex AI. Serverless event-driven pipelines at 1000+ RPM.', deps: ['python'] },
  { id: 'docker',     name: 'Docker',           category: 'cloud',    level: 4, xp: '2 yrs',   description: 'Multi-stage builds, Compose orchestration, optimised images.', deps: ['node'] },
  { id: 'k8s',        name: 'Kubernetes',       category: 'cloud',    level: 3, xp: '1 yr',    description: 'Deployments, services, ingress, resource limits, rolling updates.', deps: ['docker'] },
  { id: 'terraform',  name: 'Terraform',        category: 'cloud',    level: 4, xp: '1.5 yrs', description: 'IaC for AWS. Modules, state management, remote backends. 99.9% uptime achieved.', deps: ['aws'] },
  { id: 'cicd',       name: 'CI / CD',          category: 'cloud',    level: 4, xp: '2 yrs',   description: 'GitHub Actions, automated testing, zero-downtime deploy pipelines.', deps: ['docker'] },
  { id: 'prometheus', name: 'Observability',    category: 'cloud',    level: 3, xp: '1 yr',    description: 'Prometheus + Grafana dashboards, CloudWatch alarms, distributed tracing.', deps: ['aws'] },

  // ── AI / ML Engineering ────────────────────────────────────────────
  { id: 'rag',        name: 'RAG Pipelines',    category: 'ai',       level: 5, xp: '1.5 yrs', description: 'Hybrid retrieval: vector + BM25 + Cohere reranking. 87.5% Hit@1 on OpenCodeIntel.', deps: ['python', 'postgres'] },
  { id: 'langchain',  name: 'LangChain',        category: 'ai',       level: 5, xp: '1.5 yrs', description: 'Chains, agents, memory, tools. Used for agentic code-intelligence pipelines.', deps: ['python'] },
  { id: 'openai',     name: 'OpenAI API',       category: 'ai',       level: 5, xp: '2 yrs',   description: 'GPT-4o, embeddings, function calling, structured outputs. Both completion and embedding APIs.', deps: ['python', 'ts'] },
  { id: 'pgvector',   name: 'pgvector',         category: 'ai',       level: 5, xp: '1.5 yrs', description: 'Vector similarity search directly in Postgres. IVFFlat + HNSW indexing for sub-50ms retrieval.', deps: ['postgres', 'rag'] },
  { id: 'mcp',        name: 'MCP Protocol',     category: 'ai',       level: 4, xp: '1 yr',    description: 'Model Context Protocol. Built MCP servers that give Claude semantic code-search tools.', deps: ['langchain', 'ts'] },
  { id: 'embeddings', name: 'Embeddings',       category: 'ai',       level: 5, xp: '1.5 yrs', description: 'OpenAI, Voyage AI, Cohere. Embedding models, reranking, semantic similarity at scale.', deps: ['openai'] },
  { id: 'treesitter', name: 'Tree-sitter',      category: 'ai',       level: 4, xp: '1 yr',    description: 'AST parsing across 8 languages for code intelligence. Extracts functions, classes, symbols.', deps: ['python'] },
  { id: 'llmeval',    name: 'LLM Evaluation',   category: 'ai',       level: 4, xp: '1 yr',    description: 'Hit@k, MRR, NDCG metrics. Built eval pipelines to systematically measure retrieval quality.', deps: ['rag'] },
  { id: 'vertexai',   name: 'Vertex AI',        category: 'ai',       level: 3, xp: '1 yr',    description: 'Model deployment, batch prediction, and managed endpoints on GCP.', deps: ['gcp'] },

  // ── Tools ──────────────────────────────────────────────────────────
  { id: 'git',        name: 'Git',              category: 'tool',     level: 5, xp: '4 yrs',   description: 'Rebasing, bisect, worktrees, hooks. Git is muscle memory.', deps: ['ts'] },
  { id: 'graphql',    name: 'GraphQL',          category: 'tool',     level: 3, xp: '1 yr',    description: 'Schema-first design, Apollo Client, DataLoader.', deps: ['node'] },
  { id: 'posthog',    name: 'PostHog',          category: 'tool',     level: 4, xp: '1 yr',    description: 'Product analytics, feature flags, session replay. Powers this portfolio.', deps: ['react'] },
];

const CAT_COLOR: Record<Skill['category'], string> = {
  language: '#818cf8',   // indigo
  frontend: '#22d3ee',   // cyan
  backend:  '#34d399',   // emerald
  cloud:    '#fbbf24',   // amber
  ai:       '#c084fc',   // violet — stands out as the "new power"
  tool:     '#f472b6',   // pink
};

const CAT_LABEL: Record<Skill['category'], string> = {
  language: 'Language',
  frontend: 'Frontend',
  backend:  'Backend',
  cloud:    'Cloud / DevOps',
  ai:       'AI / ML Eng',
  tool:     'Tools',
};

const LEVEL_LABEL = ['', 'Beginner', 'Familiar', 'Proficient', 'Advanced', 'Expert'];

const CATEGORIES = ['all', 'ai', 'cloud', 'backend', 'frontend', 'language', 'tool'] as const;
type FilterCat = typeof CATEGORIES[number];

/* ─────────────────────────────────────────────────────────────────── */
/* Arc progress ring                                                   */
/* ─────────────────────────────────────────────────────────────────── */

const R = 20;
const CX = 26;
const CY = 26;
const CIRC = 2 * Math.PI * R; // 125.7

function ArcRing({ level, color, delay }: { level: number; color: string; delay: number }) {
  const offset = CIRC * (1 - level / 5);
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" style={{ overflow: 'visible' }}>
      {/* Subtle outer glow ring */}
      <circle cx={CX} cy={CY} r={R + 3} fill="none" strokeWidth="1" stroke={color} strokeOpacity="0.08" />
      {/* Track */}
      <circle cx={CX} cy={CY} r={R} fill="none" strokeWidth="3.5" stroke="rgba(255,255,255,0.07)" />
      {/* Filled arc */}
      <motion.circle
        cx={CX} cy={CY} r={R}
        fill="none"
        strokeWidth="3.5"
        stroke={color}
        strokeLinecap="round"
        strokeDasharray={CIRC}
        initial={{ strokeDashoffset: CIRC }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: `${CX}px ${CY}px`, transform: 'rotate(-90deg)' }}
      />
      {/* Center percentage */}
      <text
        x={CX} y={CY + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="10"
        fontWeight="700"
        fill={color}
      >
        {level * 20}%
      </text>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Skill card                                                          */
/* ─────────────────────────────────────────────────────────────────── */

interface CardState {
  mode: 'normal' | 'active' | 'related' | 'dim';
}

function SkillCard({
  skill, cardState, idx, onHover, onLeave,
}: {
  skill: Skill;
  cardState: CardState;
  idx: number;
  onHover: (s: Skill) => void;
  onLeave: () => void;
}) {
  const color = CAT_COLOR[skill.category];
  const { mode } = cardState;

  const opacity   = mode === 'dim' ? 0.28 : 1;
  const elevation = mode === 'active' ? -8 : mode === 'related' ? -4 : 0;
  const scale     = mode === 'active' ? 1.04 : mode === 'related' ? 1.01 : mode === 'dim' ? 0.97 : 1;

  const borderColor = mode === 'active'  ? `${color}90`
                    : mode === 'related' ? `${color}50`
                    : 'rgba(255,255,255,0.08)';

  const shadow = mode === 'active'
    ? `0 16px 40px ${color}30, 0 0 0 1px ${color}50`
    : mode === 'related'
    ? `0 8px 24px ${color}18, 0 0 0 1px ${color}30`
    : '0 2px 8px rgba(0,0,0,0.12)';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity, y: elevation, scale, transition: { duration: 0.25, ease: 'easeOut' } }}
      exit={{ opacity: 0, scale: 0.85, y: 10, transition: { duration: 0.18 } }}
      transition={{ delay: idx * 0.035, type: 'spring', damping: 20, stiffness: 200 }}
      onMouseEnter={() => onHover(skill)}
      onMouseLeave={onLeave}
      className="relative rounded-2xl overflow-hidden cursor-default select-none"
      style={{ border: `1px solid ${borderColor}`, boxShadow: shadow }}
    >
      {/* Gradient background tint from category color */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 20% 20%, ${color}12 0%, transparent 65%)` }}
      />

      {/* Top accent line */}
      <div className="relative h-[3px] w-full" style={{ background: color, opacity: mode === 'dim' ? 0.4 : 1 }} />

      {/* Active glow pulse */}
      {mode === 'active' && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          animate={{ opacity: [0.06, 0.14, 0.06] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: color }}
        />
      )}

      {/* Card body */}
      <div className="relative p-4">
        <div className="flex items-start gap-3 mb-3">
          {/* Arc ring */}
          <div className="flex-shrink-0">
            <ArcRing level={skill.level} color={color} delay={idx * 0.04} />
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0 pt-1">
            <h3
              className="font-bold leading-tight text-[14px] transition-colors"
              style={{ color: mode === 'active' ? color : 'rgb(var(--color-text))' }}
            >
              {skill.name}
            </h3>
            <p className="text-[10px] text-text-secondary mt-0.5 font-medium">
              {skill.xp}
            </p>
            {/* Level dots */}
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map(i => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: idx * 0.035 + i * 0.05, type: 'spring', stiffness: 400 }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: i <= skill.level ? color : 'rgba(255,255,255,0.1)' }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Category + level label */}
        <div className="flex items-center justify-between mb-2.5">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: `${color}15`, color }}
          >
            {CAT_LABEL[skill.category]}
          </span>
          <span className="text-[10px] text-text-secondary font-medium">
            {LEVEL_LABEL[skill.level]}
          </span>
        </div>

        {/* Description */}
        <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2">
          {skill.description}
        </p>

        {/* Dependency hint when related */}
        {(mode === 'related') && skill.deps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 pt-2 border-t flex items-center gap-1"
            style={{ borderColor: `${color}20` }}
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-[10px]" style={{ color }}>prerequisite</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Main                                                                */
/* ─────────────────────────────────────────────────────────────────── */

export default function SkillsDashboardApp() {
  const [filter, setFilter]   = useState<FilterCat>('all');
  const [hovered, setHovered] = useState<Skill | null>(null);

  const visible = filter === 'all'
    ? SKILLS
    : SKILLS.filter(s => s.category === filter);

  const getCardState = (skill: Skill): CardState => {
    if (!hovered) return { mode: 'normal' };
    if (skill.id === hovered.id) return { mode: 'active' };
    // Is this skill a prerequisite of the hovered skill?
    if (hovered.deps.includes(skill.id)) return { mode: 'related' };
    // Does the hovered skill unlock this one?
    if (skill.deps.includes(hovered.id)) return { mode: 'related' };
    return { mode: 'dim' };
  };

  /* Category stats */
  const catStats = (['ai', 'cloud', 'backend', 'frontend', 'language', 'tool'] as Skill['category'][]).map(cat => {
    const skills = SKILLS.filter(s => s.category === cat);
    const avg = skills.reduce((a, b) => a + b.level, 0) / skills.length;
    return { cat, count: skills.length, avg };
  });

  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent">

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-white/8 dark:border-white/6">

        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-text">Skills</h1>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {SKILLS.length} skills across 6 domains · hover to trace dependency chains
            </p>
          </div>

          {/* Category legend */}
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {(['ai', 'cloud', 'backend', 'frontend', 'language', 'tool'] as Skill['category'][]).map(cat => (
              <div key={cat} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: CAT_COLOR[cat] }} />
                <span className="text-[10px] text-text-secondary hidden sm:block">{CAT_LABEL[cat]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => {
            const isActive = filter === cat;
            const color = cat === 'all' ? 'rgb(var(--color-accent))' : CAT_COLOR[cat as Skill['category']];
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all capitalize"
                style={{
                  background: isActive ? color : 'rgba(255,255,255,0.06)',
                  color: isActive ? 'white' : 'rgb(var(--color-text-secondary))',
                  boxShadow: isActive ? `0 2px 8px ${color}40` : 'none',
                  border: `1px solid ${isActive ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {cat === 'all' ? 'All' : CAT_LABEL[cat as Skill['category']]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Card grid ── */}
      <div className="flex-1 overflow-auto p-5">
        <motion.div
          layout
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
        >
          <AnimatePresence mode="popLayout">
            {visible.map((skill, idx) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                cardState={getCardState(skill)}
                idx={idx}
                onHover={setHovered}
                onLeave={() => setHovered(null)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Footer stat bar ── */}
      <div className="flex-shrink-0 px-5 py-3 border-t border-white/8 dark:border-white/6 flex gap-5 flex-wrap">
        {catStats.map(({ cat, count, avg }) => {
          const color = CAT_COLOR[cat];
          return (
            <div key={cat} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-[11px] text-text-secondary">{count} {CAT_LABEL[cat]}</span>
              {/* Mini avg bar */}
              <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(avg / 5) * 100}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
