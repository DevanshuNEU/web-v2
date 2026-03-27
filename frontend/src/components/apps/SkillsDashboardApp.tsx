'use client';

/**
 * SkillsDashboardApp — RPG Skill Tree
 *
 * Visual skill tree with SVG connections, animated nodes, and category
 * color coding. Inspired by Path of Exile and RPG talent trees.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface SkillNode {
  id: string;
  name: string;
  category: 'language' | 'frontend' | 'backend' | 'cloud' | 'tool';
  level: number;      // 1–5
  xp: string;        // e.g. "3 yrs"
  description: string;
  deps: string[];     // ids of prerequisite nodes
  col: number;        // grid column (0-indexed)
  row: number;        // grid row (0-indexed)
}

const SKILLS: SkillNode[] = [
  // --- Languages (col 0) ---
  { id: 'ts',       name: 'TypeScript',     category: 'language', level: 5, xp: '3 yrs', description: 'Primary language for all frontend and Node.js work. Strict mode always on.',                       deps: [],          col: 0, row: 0 },
  { id: 'python',   name: 'Python',         category: 'language', level: 5, xp: '4 yrs', description: 'ML pipelines, Flask APIs, scripts, and data engineering.',                                         deps: [],          col: 0, row: 2 },
  { id: 'java',     name: 'Java',           category: 'language', level: 4, xp: '2 yrs', description: 'Spring Boot microservices and enterprise patterns.',                                                  deps: [],          col: 0, row: 4 },
  { id: 'sql',      name: 'SQL',            category: 'language', level: 5, xp: '3 yrs', description: 'Complex queries, window functions, query optimisation, migrations.',                                  deps: [],          col: 0, row: 6 },

  // --- Frontend (col 1) ---
  { id: 'react',    name: 'React / Next.js', category: 'frontend', level: 5, xp: '3 yrs', description: 'App Router, RSC, suspense, streaming. This portfolio runs on Next.js 15.',                        deps: ['ts'],      col: 1, row: 0 },
  { id: 'tailwind', name: 'Tailwind CSS',   category: 'frontend', level: 5, xp: '2 yrs', description: 'Utility-first styling, custom design systems, dark mode.',                                          deps: ['ts'],      col: 1, row: 1 },
  { id: 'framer',   name: 'Framer Motion',  category: 'frontend', level: 4, xp: '1 yr',  description: 'Spring physics, layout animations, gesture-driven UI.',                                              deps: ['react'],   col: 1, row: 2 }, // moved up

  // --- Backend (col 2) ---
  { id: 'node',     name: 'Node.js',        category: 'backend',  level: 5, xp: '3 yrs', description: 'REST APIs, event-driven services, WebSockets.',                                                      deps: ['ts'],      col: 2, row: 0 },
  { id: 'flask',    name: 'Flask',          category: 'backend',  level: 4, xp: '2 yrs', description: 'RESTful Python APIs, ML model serving, blueprint architecture.',                                      deps: ['python'],  col: 2, row: 2 },
  { id: 'postgres', name: 'PostgreSQL',     category: 'backend',  level: 5, xp: '3 yrs', description: 'Schema design, indexing, full-text search, row-level security.',                                     deps: ['sql'],     col: 2, row: 4 },
  { id: 'redis',    name: 'Redis',          category: 'backend',  level: 3, xp: '1 yr',  description: 'Caching layers, pub/sub messaging, session storage.',                                                 deps: ['postgres'], col: 2, row: 5 },
  { id: 'spring',   name: 'Spring Boot',    category: 'backend',  level: 4, xp: '2 yrs', description: 'Microservices, dependency injection, JPA/Hibernate.',                                                deps: ['java'],    col: 2, row: 3 },

  // --- Cloud (col 3) ---
  { id: 'aws',      name: 'AWS',            category: 'cloud',    level: 4, xp: '2 yrs', description: 'EC2, S3, Lambda, RDS, VPC, IAM — production-grade architecture.',                                   deps: ['node'],    col: 3, row: 0 },
  { id: 'docker',   name: 'Docker',         category: 'cloud',    level: 4, xp: '2 yrs', description: 'Multi-stage builds, Compose orchestration, optimised images.',                                       deps: ['node'],    col: 3, row: 1 },
  { id: 'terraform',name: 'Terraform',      category: 'cloud',    level: 4, xp: '1.5 yrs','description': 'IaC for AWS — modules, state management, remote backends.',                                       deps: ['aws'],     col: 3, row: 2 },
  { id: 'cicd',     name: 'CI/CD',          category: 'cloud',    level: 4, xp: '2 yrs', description: 'GitHub Actions, automated testing, deploy pipelines.',                                               deps: ['docker'],  col: 3, row: 3 },

  // --- Tools (col 4) ---
  { id: 'git',      name: 'Git',            category: 'tool',     level: 5, xp: '4 yrs', description: 'Rebasing, bisect, worktrees, hooks. Git is muscle memory.',                                          deps: ['ts'],      col: 4, row: 0 },
  { id: 'graphql',  name: 'GraphQL',        category: 'tool',     level: 3, xp: '1 yr',  description: 'Schema-first design, Apollo Client, DataLoader.',                                                    deps: ['node'],    col: 4, row: 1 },
  { id: 'posthog',  name: 'PostHog',        category: 'tool',     level: 4, xp: '1 yr',  description: 'Product analytics, feature flags, session replay. Powers this portfolio.',                           deps: ['react'],   col: 4, row: 2 },
];

const CATEGORY_COLORS: Record<SkillNode['category'], string> = {
  language: '#6366f1', // indigo
  frontend: '#06b6d4', // cyan
  backend:  '#10b981', // emerald
  cloud:    '#f59e0b', // amber
  tool:     '#ec4899', // pink
};

const CATEGORY_LABELS: Record<SkillNode['category'], string> = {
  language: 'Languages',
  frontend: 'Frontend',
  backend:  'Backend',
  cloud:    'Cloud / DevOps',
  tool:     'Tools',
};

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const NODE_W = 110;
const NODE_H = 44;
const COL_GAP = 160;
const ROW_GAP = 72;
const PAD = 24;

function nodeX(col: number) { return PAD + col * (NODE_W + COL_GAP); }
function nodeY(row: number) { return PAD + row * ROW_GAP; }
function nodeCX(col: number) { return nodeX(col) + NODE_W / 2; }
function nodeCY(row: number) { return nodeY(row) + NODE_H / 2; }

const SVG_W = nodeX(5) + PAD;
const SVG_H = nodeY(7) + NODE_H + PAD;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LevelDots({ level, color }: { level: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: i <= level ? color : 'rgba(255,255,255,0.15)' }}
        />
      ))}
    </div>
  );
}

function SkillTooltip({ skill, onClose }: { skill: SkillNode; onClose: () => void }) {
  const color = CATEGORY_COLORS[skill.category];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="absolute z-50 w-56 glass-heavy rounded-xl p-4 shadow-glass-xl border"
      style={{
        borderColor: `${color}40`,
        top: nodeCY(skill.row) - 20,
        left: nodeX(skill.col) + NODE_W + 12,
      }}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-text-secondary hover:text-text transition-colors"
      >
        <X size={12} />
      </button>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="font-bold text-text text-sm">{skill.name}</span>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <LevelDots level={skill.level} color={color} />
        <span className="text-xs text-text-secondary">{skill.xp}</span>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed">{skill.description}</p>
      <div className="mt-2 text-xs font-medium capitalize" style={{ color }}>
        {CATEGORY_LABELS[skill.category]}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const CATEGORIES = ['language', 'frontend', 'backend', 'cloud', 'tool'] as const;

export default function SkillsDashboardApp() {
  const [selected, setSelected] = useState<SkillNode | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [filter, setFilter] = useState<SkillNode['category'] | 'all'>('all');
  const svgRef = useRef<SVGSVGElement>(null);

  const visibleSkills = filter === 'all'
    ? SKILLS
    : SKILLS.filter(s => s.category === filter);

  const visibleIds = new Set(visibleSkills.map(s => s.id));

  // Build edges
  const edges: { from: SkillNode; to: SkillNode }[] = [];
  SKILLS.forEach(skill => {
    skill.deps.forEach(depId => {
      const dep = SKILLS.find(s => s.id === depId);
      if (dep && visibleIds.has(skill.id) && visibleIds.has(dep.id)) {
        edges.push({ from: dep, to: skill });
      }
    });
  });

  return (
    <div className="h-full flex flex-col bg-surface/20 overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 glass-subtle border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-text">Skill Tree</h1>
            <p className="text-text-secondary text-xs mt-0.5">
              {SKILLS.length} skills unlocked. Click any node to inspect.
            </p>
          </div>
          {/* Legend */}
          <div className="flex gap-3 flex-wrap justify-end">
            {CATEGORIES.map(cat => (
              <div key={cat} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />
                <span className="text-xs text-text-secondary">{CATEGORY_LABELS[cat]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-accent text-white'
                : 'bg-surface/50 text-text-secondary hover:text-text hover:bg-surface/80'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: filter === cat ? CATEGORY_COLORS[cat] : 'rgba(255,255,255,0.06)',
                color: filter === cat ? 'white' : 'var(--color-text-secondary)',
              }}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Tree canvas */}
      <div className="flex-1 overflow-auto p-4">
        <div style={{ position: 'relative', width: SVG_W, minWidth: SVG_W }}>
          <svg
            ref={svgRef}
            width={SVG_W}
            height={SVG_H}
            style={{ display: 'block', overflow: 'visible' }}
          >
            {/* Connection lines */}
            {edges.map(({ from, to }) => {
              const x1 = nodeCX(from.col);
              const y1 = nodeCY(from.row);
              const x2 = nodeX(to.col);
              const y2 = nodeCY(to.row);
              const mx = (x1 + x2) / 2;
              const isHighlit = hovered === from.id || hovered === to.id;
              const color = CATEGORY_COLORS[to.category];
              return (
                <motion.path
                  key={`${from.id}-${to.id}`}
                  d={`M ${x1 + NODE_W / 2} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={isHighlit ? color : 'currentColor'}
                  strokeOpacity={isHighlit ? 0.9 : 0.15}
                  strokeWidth={isHighlit ? 2 : 1.5}
                  strokeDasharray={isHighlit ? '0' : '4 3'}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                />
              );
            })}

            {/* Nodes */}
            {visibleSkills.map((skill, idx) => {
              const x = nodeX(skill.col);
              const y = nodeY(skill.row);
              const cx = x + NODE_W / 2;
              const cy = y + NODE_H / 2;
              const color = CATEGORY_COLORS[skill.category];
              const isHov = hovered === skill.id;
              const isSel = selected?.id === skill.id;

              return (
                <motion.g
                  key={skill.id}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', delay: idx * 0.04, damping: 16, stiffness: 200 }}
                  onMouseEnter={() => setHovered(skill.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(isSel ? null : skill)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Glow on hover */}
                  {(isHov || isSel) && (
                    <motion.ellipse
                      cx={cx} cy={cy} rx={NODE_W * 0.55} ry={NODE_H * 0.8}
                      fill={color}
                      opacity={0.15}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1.1 }}
                      transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1.2 }}
                    />
                  )}

                  {/* Node background */}
                  <rect
                    x={x} y={y}
                    width={NODE_W} height={NODE_H}
                    rx={10}
                    fill={isSel ? `${color}22` : isHov ? `${color}15` : 'rgba(255,255,255,0.05)'}
                    stroke={isSel ? color : isHov ? `${color}80` : 'rgba(255,255,255,0.15)'}
                    strokeWidth={isSel ? 2 : 1.5}
                  />

                  {/* Left accent bar */}
                  <rect x={x + 2} y={y + 8} width={3} height={NODE_H - 16} rx={2} fill={color} opacity={0.8} />

                  {/* Skill name */}
                  <text
                    x={x + 14} y={y + 16}
                    fontSize="11"
                    fontWeight="600"
                    fill="var(--color-text)"
                    dominantBaseline="middle"
                  >
                    {skill.name.length > 14 ? skill.name.slice(0, 13) + '…' : skill.name}
                  </text>

                  {/* XP badge */}
                  <text
                    x={x + 14} y={y + 30}
                    fontSize="9"
                    fill="var(--color-text-secondary)"
                    dominantBaseline="middle"
                  >
                    {skill.xp}
                  </text>

                  {/* Level dots */}
                  {[0,1,2,3,4].map(i => (
                    <circle
                      key={i}
                      cx={x + NODE_W - 16 + i * 6 - (4 * 6) / 2 + 3}
                      cy={y + NODE_H / 2}
                      r={2.5}
                      fill={i < skill.level ? color : 'rgba(255,255,255,0.12)'}
                    />
                  ))}
                </motion.g>
              );
            })}
          </svg>

          {/* Tooltip overlay (HTML, not SVG for better glass styling) */}
          <AnimatePresence>
            {selected && (
              <div
                className="pointer-events-none"
                style={{ position: 'absolute', inset: 0 }}
              >
                <div className="pointer-events-auto">
                  <SkillTooltip skill={selected} onClose={() => setSelected(null)} />
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer stat bar */}
      <div className="flex-shrink-0 px-6 py-3 glass-subtle border-t border-white/10 flex gap-6">
        {CATEGORIES.map(cat => {
          const count = SKILLS.filter(s => s.category === cat).length;
          const avgLevel = SKILLS.filter(s => s.category === cat).reduce((a, b) => a + b.level, 0) / count;
          return (
            <div key={cat} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />
              <span className="text-xs text-text-secondary">{count} skills</span>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-1 h-1 rounded-full"
                    style={{ background: i <= Math.round(avgLevel) ? CATEGORY_COLORS[cat] : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
