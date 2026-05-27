'use client';

/**
 * FileExplorerApp — macOS Finder-style project browser
 *
 * Projects as "files", categories as folders. Click a project to see
 * a full detail panel with tech stack, links, and description.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder, FolderOpen, FileCode2, ExternalLink, Github,
  ChevronRight, Star, ArrowLeft,
} from 'lucide-react';
import MobilePushView, { useMobileNavigation } from '@/components/mobile/ui/MobilePushView';
import type { EnrichedRepo } from '@/app/api/github/repos/route';

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
  status: 'production' | 'active' | 'archived' | 'wip';
  highlight?: boolean;
}

// Pull the repo name out of a github.com URL so we can match against the API.
function ghName(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/github\.com\/[^/]+\/([^/?#]+)/);
  return m ? m[1].toLowerCase() : null;
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
    live: 'https://devanshuchicholikar.com',
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

const CATEGORY_ICON_COLORS: Record<string, { bg: string; icon: string }> = {
  'Frontend':      { bg: '#06b6d4', icon: '#ffffff' },
  'Full Stack':    { bg: '#6366f1', icon: '#ffffff' },
  'Cloud / DevOps':{ bg: '#f59e0b', icon: '#ffffff' },
  'Tools / CLI':   { bg: '#10b981', icon: '#ffffff' },
  'Systems':       { bg: '#ef4444', icon: '#ffffff' },
  'Data / ML':     { bg: '#ec4899', icon: '#ffffff' },
  'Other':         { bg: '#8b5cf6', icon: '#ffffff' },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FileIcon({ project, selected }: { project: Project; selected: boolean }) {
  const palette = CATEGORY_ICON_COLORS[project.category] ?? CATEGORY_ICON_COLORS['Other'];
  const statusColor = STATUS_COLORS[project.status];

  return (
    <div className={`
      flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer select-none
      transition-all duration-150
      ${selected
        ? 'bg-accent/15 ring-1 ring-accent/40'
        : 'hover:bg-black/5 dark:hover:bg-white/5 active:scale-95'}
    `}>
      {/* Colored icon block — macOS app icon style */}
      <div className="relative">
        <div
          className="w-12 h-12 rounded-[11px] flex items-center justify-center shadow-sm"
          style={{
            background: `linear-gradient(145deg, ${palette.bg}dd, ${palette.bg}99)`,
            boxShadow: `0 2px 8px ${palette.bg}50, inset 0 1px 1px rgba(255,255,255,0.3)`,
          }}
        >
          <FileCode2 size={22} strokeWidth={1.5} style={{ color: palette.icon }} />
        </div>
        {/* Status dot */}
        <div
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface"
          style={{ background: statusColor }}
          title={STATUS_LABELS[project.status]}
        />
        {/* Highlight star */}
        {project.highlight && (
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-surface flex items-center justify-center">
            <span style={{ fontSize: 6, color: 'white', lineHeight: 1 }}>★</span>
          </div>
        )}
      </div>
      <span className={`text-[11px] text-center leading-tight max-w-[68px] break-words ${
        selected ? 'text-accent font-semibold' : 'text-text-secondary'
      }`}>
        {project.name}
      </span>
    </div>
  );
}

function DetailPanel({
  project,
  onBack,
  starsByName,
}: {
  project: Project;
  onBack: () => void;
  starsByName: Record<string, number>;
}) {
  const statusColor = STATUS_COLORS[project.status];
  const stars =
    starsByName[project.id.toLowerCase()] ??
    (ghName(project.github) ? starsByName[ghName(project.github)!] : undefined);

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
        {stars && stars > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <Star size={14} className="text-amber-400" />
              <span>{stars} stars</span>
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
// Mobile — category + file grid root, push to detail
// ---------------------------------------------------------------------------

function FileGridMobile({ starsByName }: { starsByName: Record<string, number> }) {
  const nav = useMobileNavigation();
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? PROJECTS
    : PROJECTS.filter(p => p.category === activeCategory);

  const openDetail = (project: Project) => {
    nav.push({
      id: project.id,
      title: project.name,
      element: <DetailPanelMobile project={project} starsByName={starsByName} />,
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Category chips */}
      <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto hide-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-accent text-white'
                : 'bg-black/5 dark:bg-white/8 text-text-secondary'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* File grid */}
      <div className="px-3 pb-4 grid grid-cols-4 gap-1">
        {filtered.map(project => (
          <button key={project.id} onClick={() => openDetail(project)} className="text-left">
            <FileIcon project={project} selected={false} />
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailPanelMobile({
  project,
  starsByName,
}: {
  project: Project;
  starsByName: Record<string, number>;
}) {
  const statusColor = STATUS_COLORS[project.status];
  const stars =
    starsByName[project.id.toLowerCase()] ??
    (ghName(project.github) ? starsByName[ghName(project.github)!] : undefined);

  return (
    <div className="overflow-y-auto pb-6">
      {/* Hero */}
      <div className="px-5 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-start gap-4 mb-3">
          <div
            className="w-14 h-14 rounded-[13px] flex-shrink-0 flex items-center justify-center shadow-sm"
            style={{
              background: `linear-gradient(145deg, ${CATEGORY_ICON_COLORS[project.category]?.bg ?? '#6366f1'}dd, ${CATEGORY_ICON_COLORS[project.category]?.bg ?? '#6366f1'}99)`,
            }}
          >
            <FileCode2 size={24} strokeWidth={1.5} style={{ color: CATEGORY_ICON_COLORS[project.category]?.icon ?? '#fff' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-text leading-tight">{project.name}</h2>
            <p className="text-xs text-text-secondary mt-0.5">{project.category}</p>
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${statusColor}20`, color: statusColor }}>
              {STATUS_LABELS[project.status]}
            </span>
          </div>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">{project.longDescription}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Tech */}
        <div>
          <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-2">Tech Stack</p>
          <div className="flex flex-wrap gap-1.5">
            {project.tech.map(t => (
              <span key={t} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-accent/10 text-accent border border-accent/20">{t}</span>
            ))}
          </div>
        </div>

        {/* Stars */}
        {stars && stars > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-text-secondary">
            <Star size={14} className="text-amber-400" />
            <span>{stars} stars on GitHub</span>
          </div>
        )}

        {/* Links */}
        <div className="flex gap-2">
          {project.github && (
            <a href={project.github} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass-subtle border border-white/20 text-text text-sm font-medium active:opacity-70 transition-opacity">
              <Github size={14} /> GitHub
            </a>
          )}
          {project.live && (
            <a href={project.live} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium active:opacity-70 transition-opacity">
              <ExternalLink size={14} /> Live
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function FileExplorerApp({ variant }: { variant?: 'desktop' | 'mobile' } = {}) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selected, setSelected] = useState<Project | null>(null);
  const [starsByName, setStarsByName] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/github/repos')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: EnrichedRepo[]) => {
        if (cancelled || !Array.isArray(data)) return;
        const map: Record<string, number> = {};
        for (const r of data) map[r.name.toLowerCase()] = r.stars;
        setStarsByName(map);
      })
      .catch(() => { /* leave map empty — UI just hides star block */ });
    return () => { cancelled = true; };
  }, []);

  if (variant === 'mobile') {
    return (
      <MobilePushView
        rootView={{
          id: 'finder-root',
          title: 'Finder',
          element: <FileGridMobile starsByName={starsByName} />,
        }}
      />
    );
  }

  const filtered = activeCategory === 'All'
    ? PROJECTS
    : PROJECTS.filter(p => p.category === activeCategory);

  const handleSelect = (project: Project) => {
    setSelected(prev => prev?.id === project.id ? null : project);
  };

  return (
    <div className="h-full flex bg-surface/20 overflow-hidden">

      {/* Sidebar */}
      <div className="w-44 flex-shrink-0 app-sidebar flex flex-col overflow-hidden">
        <div className="px-3 pt-4 pb-2 border-b border-black/6 dark:border-white/6">
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">
            Favorites
          </p>
        </div>
        <div className="flex-1 p-2 pt-2 space-y-0.5 overflow-auto">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            const count = cat === 'All'
              ? PROJECTS.length
              : PROJECTS.filter(p => p.category === cat).length;
            const palette = cat === 'All' ? null : CATEGORY_ICON_COLORS[cat];
            return (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSelected(null); }}
                className={`app-nav-item ${isActive ? 'active' : ''}`}
                style={isActive && palette ? { background: `${palette.bg}18`, color: palette.bg } : undefined}
              >
                {isActive
                  ? <FolderOpen size={13} style={{ flexShrink: 0, color: palette?.bg }} />
                  : <Folder size={13} style={{ flexShrink: 0 }} />
                }
                <span className="flex-1 truncate text-[12px]">{cat}</span>
                <span className="text-[10px] tabular-nums opacity-50">{count}</span>
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
                <DetailPanel project={selected} onBack={() => setSelected(null)} starsByName={starsByName} />
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
