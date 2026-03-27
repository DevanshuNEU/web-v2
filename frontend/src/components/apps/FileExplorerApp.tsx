'use client';

/**
 * FileExplorerApp — macOS Finder-style project browser
 *
 * Projects as "files", categories as folders. Click a project to see
 * a full detail panel with tech stack, links, and description.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder, FolderOpen, FileCode2, ExternalLink, Github,
  ChevronRight, Star, GitFork, ArrowLeft,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface Project {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  category: string;
  tech: string[];
  github?: string;
  live?: string;
  stars?: number;
  status: 'production' | 'active' | 'archived' | 'wip';
  highlight?: boolean;
}

const PROJECTS: Project[] = [
  {
    id: 'devos',
    name: 'devOS',
    description: 'Interactive desktop OS portfolio built with Next.js 15',
    longDescription: 'A full desktop OS simulator built as a portfolio. Features windowed apps, a dock with magnification, animated boot sequence, real PostHog analytics, dark/light mode, and custom wallpapers. Built entirely with Next.js 15, React 19, Zustand, and Framer Motion.',
    category: 'Frontend',
    tech: ['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Zustand', 'PostHog'],
    github: 'https://github.com/DevanshuNEU/portfolio',
    live: 'https://devanshuchicholikar.me',
    stars: 12,
    status: 'production',
    highlight: true,
  },
  {
    id: 'financial-copilot',
    name: 'Financial Copilot',
    description: 'AI-powered financial intelligence platform for students',
    longDescription: 'AI financial assistant for international students. Parses bank statements, categorizes spending, flags unusual charges, and provides natural-language budgeting advice. Integrates with Plaid for real-time balance data and OpenAI for conversational finance.',
    category: 'Full Stack',
    tech: ['React', 'FastAPI', 'PostgreSQL', 'OpenAI', 'Plaid API', 'Docker', 'AWS'],
    github: 'https://github.com/DevanshuNEU/financial-copilot',
    stars: 28,
    status: 'active',
    highlight: true,
  },
  {
    id: 'securescale',
    name: 'SecureScale',
    description: 'Production-grade AWS infrastructure with Terraform + Vault',
    longDescription: 'Multi-tier AWS infrastructure built with Terraform. Includes auto-scaling ECS clusters, RDS with automated failover, HashiCorp Vault for secrets management, centralized CloudWatch logging, and a complete CI/CD pipeline via GitHub Actions.',
    category: 'Cloud / DevOps',
    tech: ['Terraform', 'AWS', 'ECS', 'RDS', 'Vault', 'GitHub Actions', 'CloudWatch'],
    github: 'https://github.com/DevanshuNEU/securescale',
    stars: 19,
    status: 'production',
    highlight: true,
  },
  {
    id: 'saar',
    name: 'Saar',
    description: 'Auto-generate CLAUDE.md from codebase static analysis',
    longDescription: 'CLI tool that analyzes a codebase and auto-generates a structured CLAUDE.md context file for Claude. Parses imports, exports, function signatures, and comments to build a semantic map that helps AI assistants understand repo structure instantly.',
    category: 'Tools / CLI',
    tech: ['Python', 'AST Parsing', 'TypeScript', 'Click', 'Tree-sitter'],
    github: 'https://github.com/DevanshuNEU/saar',
    stars: 41,
    status: 'active',
    highlight: true,
  },
  {
    id: 'opencodeIntel',
    name: 'OpenCodeIntel',
    description: 'Code intelligence platform with semantic search',
    longDescription: 'A code intelligence platform that indexes repositories and provides semantic search, call graph analysis, and dependency visualization. Uses tree-sitter for parsing and a vector database for semantic similarity search across large codebases.',
    category: 'Tools / CLI',
    tech: ['Python', 'Tree-sitter', 'PostgreSQL', 'pgvector', 'FastAPI', 'React'],
    github: 'https://github.com/OpenCodeIntel',
    stars: 8,
    status: 'wip',
  },
  {
    id: 'distributed-kv',
    name: 'Distributed KV Store',
    description: 'Raft-based distributed key-value store from scratch',
    longDescription: 'Implementation of a linearizable distributed key-value store using the Raft consensus algorithm. Supports leader election, log replication, membership changes, and snapshotting. Written in Go with a gRPC transport layer.',
    category: 'Systems',
    tech: ['Go', 'Raft', 'gRPC', 'protobuf'],
    github: 'https://github.com/DevanshuNEU/distributed-kv',
    stars: 6,
    status: 'archived',
  },
  {
    id: 'ml-pipeline',
    name: 'ML Feature Pipeline',
    description: 'Real-time ML feature engineering on streaming data',
    longDescription: 'Stream processing pipeline for real-time ML feature computation. Consumes Kafka events, computes rolling window features, and serves them via a low-latency feature store. Used to power an online recommendation model.',
    category: 'Data / ML',
    tech: ['Python', 'Apache Kafka', 'Redis', 'pandas', 'scikit-learn', 'Docker'],
    github: 'https://github.com/DevanshuNEU/ml-pipeline',
    stars: 11,
    status: 'archived',
  },
];

const CATEGORIES = ['All', 'Frontend', 'Full Stack', 'Cloud / DevOps', 'Tools / CLI', 'Systems', 'Data / ML'];

const STATUS_COLORS: Record<Project['status'], string> = {
  production: '#10b981',
  active:     '#06b6d4',
  wip:        '#f59e0b',
  archived:   '#6b7280',
};

const STATUS_LABELS: Record<Project['status'], string> = {
  production: 'Production',
  active:     'Active',
  wip:        'In Progress',
  archived:   'Archived',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FileIcon({ project, selected }: { project: Project; selected: boolean }) {
  return (
    <div className={`
      flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer select-none
      transition-all duration-150 group
      ${selected
        ? 'bg-accent/20 ring-1 ring-accent/50'
        : 'hover:bg-white/5 active:bg-white/10'
      }
    `}>
      <div className="relative">
        <FileCode2
          size={44}
          strokeWidth={1}
          className={selected ? 'text-accent' : 'text-text-secondary group-hover:text-text transition-colors'}
        />
        {project.highlight && (
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent" />
        )}
      </div>
      <span className={`text-xs text-center leading-tight max-w-[72px] break-words ${
        selected ? 'text-accent font-medium' : 'text-text-secondary group-hover:text-text transition-colors'
      }`}>
        {project.name}
      </span>
    </div>
  );
}

function DetailPanel({ project, onBack }: { project: Project; onBack: () => void }) {
  const statusColor = STATUS_COLORS[project.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', damping: 22, stiffness: 200 }}
      className="h-full flex flex-col overflow-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-5 border-b border-white/10">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-text-secondary hover:text-text"
        >
          <ArrowLeft size={16} />
        </button>
        <FileCode2 size={22} className="text-accent" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-text text-base truncate">{project.name}</h2>
          <p className="text-xs text-text-secondary truncate">{project.category}</p>
        </div>
        <div
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: `${statusColor}20`, color: statusColor }}
        >
          {STATUS_LABELS[project.status]}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-5 space-y-5 overflow-auto">
        <p className="text-sm text-text-secondary leading-relaxed">
          {project.longDescription}
        </p>

        {/* Tech stack */}
        <div>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Tech Stack</h3>
          <div className="flex flex-wrap gap-1.5">
            {project.tech.map(t => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-md text-xs font-medium bg-accent/10 text-accent border border-accent/20"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        {project.stars && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <Star size={14} className="text-amber-400" />
              <span>{project.stars} stars</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <GitFork size={14} />
              <span>{Math.floor(project.stars / 4)} forks</span>
            </div>
          </div>
        )}

        {/* Links */}
        <div className="flex gap-2 pt-1">
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-xs font-medium text-text"
            >
              <Github size={13} />
              GitHub
            </a>
          )}
          {project.live && (
            <a
              href={project.live}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 transition-colors text-xs font-medium text-accent"
            >
              <ExternalLink size={13} />
              Live Site
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function FileExplorerApp() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selected, setSelected] = useState<Project | null>(null);

  const filtered = activeCategory === 'All'
    ? PROJECTS
    : PROJECTS.filter(p => p.category === activeCategory);

  const handleSelect = (project: Project) => {
    setSelected(prev => prev?.id === project.id ? null : project);
  };

  return (
    <div className="h-full flex bg-surface/20 overflow-hidden">

      {/* Sidebar */}
      <div className="w-44 flex-shrink-0 border-r border-white/10 glass-subtle flex flex-col overflow-hidden">
        <div className="p-3 pt-4">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-2 mb-2">
            Favorites
          </p>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            const count = cat === 'All'
              ? PROJECTS.length
              : PROJECTS.filter(p => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSelected(null); }}
                className={`
                  w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all text-xs
                  ${isActive ? 'bg-accent/20 text-accent font-medium' : 'text-text-secondary hover:bg-white/5 hover:text-text'}
                `}
              >
                {isActive ? <FolderOpen size={13} /> : <Folder size={13} />}
                <span className="flex-1 truncate">{cat}</span>
                <span className={`text-xs tabular-nums ${isActive ? 'text-accent/70' : 'text-text-secondary/50'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 glass-subtle flex-shrink-0">
          <span className="text-text-secondary text-xs">Finder</span>
          <ChevronRight size={12} className="text-text-secondary/40" />
          <span className="text-text text-xs font-medium">{activeCategory}</span>
          <div className="ml-auto text-xs text-text-secondary">
            {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* File grid + Detail panel */}
        <div className="flex-1 flex overflow-hidden">

          {/* File grid */}
          <div className={`flex-1 overflow-auto p-4 transition-all ${selected ? 'max-w-[55%]' : 'w-full'}`}>
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-wrap gap-1 content-start"
            >
              {filtered.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04, type: 'spring', damping: 18, stiffness: 250 }}
                  onClick={() => handleSelect(project)}
                >
                  <FileIcon project={project} selected={selected?.id === project.id} />
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Detail panel */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '45%', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                className="border-l border-white/10 overflow-hidden flex-shrink-0 bg-surface/30"
              >
                <DetailPanel project={selected} onBack={() => setSelected(null)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status bar */}
        <div className="flex-shrink-0 px-4 py-2 border-t border-white/10 glass-subtle">
          <p className="text-xs text-text-secondary text-center">
            {selected
              ? `${selected.name} · ${selected.tech.length} technologies`
              : `${filtered.length} projects · Double-click to open, single-click to preview`
            }
          </p>
        </div>
      </div>
    </div>
  );
}
