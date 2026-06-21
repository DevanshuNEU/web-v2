'use client';

/**
 * FileExplorerApp - "Finder", reskinned into the Instrument editorial register.
 *
 * A Finder-style project browser, monochrome and restraint-first. Categories
 * are folders (a left index rail on desktop, scrollable chips on mobile);
 * projects are "files" laid out as hairline-divided index rows. Selecting a
 * file opens a detail pane: serif title, a mono spec line (language / stars /
 * status), hairline-divided sections, and quiet editorial links (text +
 * hairline, never filled buttons).
 *
 * Live data: GitHub stars AND primary language come from /api/github/repos
 * (the same source the app already used). Stars are never hardcoded; the mono
 * spec line just omits a cell when the live value is absent.
 *
 * Animation contract (shared with AboutMeApp / ResumeApp): content reveals
 * ONCE on mount via a staggered container, never on scroll - a windowed inner
 * scroll container makes in-view triggers unreliable. Micro-interactions:
 *   - a sliding selection marker (layoutId) glides between folder rows and
 *     between file rows, like the resume rail;
 *   - the detail pane re-runs a quiet staggered "opening" reveal, keyed on the
 *     selected file, so loading a file feels alive;
 *   - each folder shows a live mono item count.
 * All of it collapses to instant under reduced motion; browsing stays fully
 * usable with motion off.
 *
 * Strictly three-tone (text / text-secondary / bg + border). Status is a mono
 * uppercase label (ACTIVE / COMPLETED / EXPERIMENTAL), never a colored badge.
 * No language hue dots, no glass cards, no accent pills.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Hairline, MetaLabel } from '@/components/editorial';
import { reveal, withReduced, spring } from '@/lib/motion';
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
  {
    id: 'callbudget',
    name: 'CallBudget',
    description: 'Pharmacy stock prediction as Bayesian active sensing under a calling budget',
    longDescription: 'Reframes specialty-medication search as an optimization problem: a HistGradientBoosting model ranks pharmacies by predicted stock, a voice agent navigates IVRs and hold, and calibrated abstention suppresses false-positive-in-stock answers. 47% reduction in expected calls (4.3 to 2.3). Ships as an MCP server. Built on 19 Boston pharmacies, Adderall XR 20mg shortage, 100% public data.',
    category: 'Data / ML',
    tech: ['Python', 'scikit-learn', 'DuckDB', 'FastMCP', 'Pipecat', 'Deepgram', 'Optuna', 'Claude API'],
    github: 'https://github.com/DevanshuNEU/callbudget',
    status: 'active',
    highlight: true,
  },
  {
    id: 'tool-crowding',
    name: 'Tool Crowding',
    description: 'Pre-registered benchmark measuring MCP discrimination interference on code retrieval',
    longDescription: 'Open-methodology benchmark that measures whether adding more MCP servers degrades code retrieval (pass@1). Uses padded-N=1 controls to isolate interference from prompt-length effects. Pre-registered before data collection with 10 binding design docs. Exploratory probes found a task-framing x agent-persona interaction not reported by prior art. Currently paused - frontier API costs add up fast. Harness is ready; sweep resumes when the budget does.',
    category: 'Data / ML',
    tech: ['Python', 'pytest', 'Anthropic API', 'Claude Sonnet/Opus'],
    github: 'https://github.com/DevanshuNEU/tool-crowding',
    status: 'wip',
  },
  {
    id: 'parsewave-terminal-bench',
    name: 'Terminal-Bench',
    description: 'Contract work: calibrated LLM debugging benchmarks for ParseWave',
    longDescription: 'Freelance work for ParseWave. Authored a benchmark suite of systems debugging tasks calibrated to 0-2/5 agent pass rate - hard enough to measure real reliability, not just catch obvious bugs. Harbor format throughout: oracle/nop baselines, anti-cheat measures, preflight checks. Three tasks shipped: nginx-502, fd-leak-emfile, concurrent-ledger.',
    category: 'Tools / CLI',
    tech: ['Python', 'pytest', 'Go', 'Nginx', 'PostgreSQL'],
    status: 'archived',
  },
  {
    id: 'entire-external-agents',
    name: 'External Agents',
    description: 'OSS contribution to entire.io: external agent protocol for Entire CLI',
    longDescription: 'Open-source contribution to entire.io. External agent binaries that extend Entire CLI with AI coding agent integration via a subcommand interface over stdin/stdout. Any agent (Kiro, Amp, Cursor, Claude Code) hooks into Entire checkpoint/rewind/lifecycle events. Two production agents shipped; lifecycle harness auto-discovers all agents; 3-layer test coverage.',
    category: 'Tools / CLI',
    tech: ['Go', 'bash', 'Python', 'Entire CLI'],
    github: 'https://github.com/DevanshuNEU/external-agents-fork',
    status: 'archived',
  },
  {
    id: 'ibm-watsonx-hackathon',
    name: 'watsonx Test Forge',
    description: 'Hackathon: auto-generate Journey Success test cases for IBM watsonx agents',
    longDescription: 'IBM watsonx Orchestrate hackathon project. Multi-tool agent that reads deployed agent specs and generates Journey Success test cases (happy path, edge, failure). Lifecycle: list_deployed_agents, get_agent_spec, generate_test_case, upload_test_case. Built on IBM ADK + watsonx Orchestrate MCP server with Bob IDE. 4 tools, 13 tests passing.',
    category: 'Full Stack',
    tech: ['Python', 'IBM watsonx ADK', 'Pydantic', 'pytest'],
    status: 'archived',
  },
];

const CATEGORIES = ['All', 'Frontend', 'Full Stack', 'Cloud / DevOps', 'Tools / CLI', 'Systems', 'Data / ML'];

// The local status enum maps to the three editorial labels. No color anywhere;
// the label IS the signal.
const STATUS_LABELS: Record<Project['status'], string> = {
  production: 'COMPLETED',
  active: 'ACTIVE',
  wip: 'EXPERIMENTAL',
  archived: 'COMPLETED',
};

// ---------------------------------------------------------------------------
// Live data shape - stars + primary language keyed by lowercased repo name.
// Both come from /api/github/repos. Absent values just drop their spec cell.
// ---------------------------------------------------------------------------

interface RepoMeta {
  stars: number;
  language: string | null;
}

type RepoMetaMap = Record<string, RepoMeta>;

function repoMetaFor(project: Project, metaByName: RepoMetaMap): RepoMeta | undefined {
  const byId = metaByName[project.id.toLowerCase()];
  if (byId) return byId;
  const gh = ghName(project.github);
  return gh ? metaByName[gh] : undefined;
}

/** Build the mono spec cells for a project from local + live data. */
function specCells(project: Project, metaByName: RepoMetaMap): string[] {
  const meta = repoMetaFor(project, metaByName);
  // Primary language: live language if present, else the project's lead tech.
  const language = meta?.language ?? project.tech[0];
  const cells: string[] = [];
  if (language) cells.push(language);
  if (meta && meta.stars > 0) {
    cells.push(`${meta.stars} ${meta.stars === 1 ? 'STAR' : 'STARS'}`);
  }
  cells.push(STATUS_LABELS[project.status]);
  return cells;
}

/** Mono run of spec cells separated by middots. */
function SpecLine({ cells, className }: { cells: string[]; className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-1 gap-y-1 ${className ?? ''}`}>
      {cells.map((cell, i) => (
        <React.Fragment key={cell}>
          {i > 0 && (
            <span aria-hidden className="font-mono-meta opacity-40">
              &middot;
            </span>
          )}
          <MetaLabel className="text-text-secondary">{cell}</MetaLabel>
        </React.Fragment>
      ))}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Quiet editorial link - text + a hairline that grows on hover. Never a button.
// ---------------------------------------------------------------------------

function EditorialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center focus-visible:outline-none"
    >
      <MetaLabel className="text-text-secondary transition-colors group-hover:text-text">
        {label}
      </MetaLabel>
      <span
        aria-hidden
        className="ml-2 block h-px w-4 origin-left scale-x-100 bg-text/40 transition-transform duration-200 group-hover:scale-x-150"
      />
    </a>
  );
}

// ---------------------------------------------------------------------------
// File row - a hairline-divided index row: serif name + description over a mono
// spec line, with a sliding active marker shared via layoutId.
// ---------------------------------------------------------------------------

const FILE_MARKER_ID = 'finder-file-active';

function FileRow({
  project,
  metaByName,
  active,
  reduced,
  onClick,
}: {
  project: Project;
  metaByName: RepoMetaMap;
  active: boolean;
  reduced: boolean | null;
  onClick: () => void;
}) {
  const cells = specCells(project, metaByName);
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onClick}
        data-testid="finder-file-row"
        aria-current={active ? 'true' : undefined}
        className="group relative flex w-full flex-col gap-1.5 px-3 py-4 text-left
                   transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.04]
                   focus-visible:outline-none focus-visible:bg-black/[0.05] dark:focus-visible:bg-white/[0.07]"
      >
        {/* Sliding selection marker: a thin graphite bar pinned to the row's
            left edge. layoutId makes it glide between rows. */}
        {active && (
          <motion.span
            layoutId={FILE_MARKER_ID}
            aria-hidden
            className="absolute left-0 top-3 bottom-3 w-[2px] bg-text"
            transition={withReduced(
              { type: 'spring', stiffness: 520, damping: 40, mass: 0.6 },
              reduced,
            )}
          />
        )}

        <div className="flex items-baseline justify-between gap-4">
          <h3
            className={`font-display text-lg leading-tight truncate transition-transform
                        ${active ? 'text-text' : 'text-text group-hover:text-text'}
                        ${reduced ? '' : 'group-hover:translate-x-0.5'}`}
          >
            {project.name}
          </h3>
        </div>

        <p className="max-w-[60ch] text-sm leading-snug text-text-secondary">
          {project.description}
        </p>

        <SpecLine cells={cells} className="mt-1" />
      </button>
      <Hairline />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail pane - serif title, mono spec line, hairline-divided sections, quiet
// links. The whole body re-runs a quiet staggered reveal keyed on the selected
// file id, so opening a file feels alive (collapses to instant under reduced).
// ---------------------------------------------------------------------------

function DetailBody({
  project,
  metaByName,
  reduced,
}: {
  project: Project;
  metaByName: RepoMetaMap;
  reduced: boolean | null;
}) {
  const cells = specCells(project, metaByName);

  return (
    <motion.div
      key={project.id}
      variants={reveal.container(reduced)}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-7"
    >
      {/* Title block. */}
      <motion.div variants={reveal.item(reduced)} className="flex flex-col gap-3">
        <MetaLabel as="p" className="text-text-secondary">
          {project.category}
        </MetaLabel>
        <h2 className="font-display text-text editorial-head leading-[0.95]">
          {project.name}
        </h2>
        <Hairline />
        <SpecLine cells={cells} />
      </motion.div>

      {/* Overview. */}
      <motion.div variants={reveal.item(reduced)} className="flex flex-col gap-3">
        <MetaLabel as="p">Overview</MetaLabel>
        <Hairline />
        <p className="max-w-[64ch] text-sm leading-relaxed text-text-secondary">
          {project.longDescription}
        </p>
      </motion.div>

      {/* Tech - a mono run, no pills. */}
      <motion.div variants={reveal.item(reduced)} className="flex flex-col gap-3">
        <MetaLabel as="p">Stack</MetaLabel>
        <Hairline />
        <p className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
          {project.tech.map((t, i) => (
            <React.Fragment key={t}>
              {i > 0 && (
                <span aria-hidden className="font-mono-meta opacity-40">
                  &middot;
                </span>
              )}
              <span className="font-mono text-[13px] leading-snug text-text">{t}</span>
            </React.Fragment>
          ))}
        </p>
      </motion.div>

      {/* Links - quiet editorial, hairline-separated from the body above. */}
      {(project.github || project.live) && (
        <motion.div variants={reveal.item(reduced)} className="flex flex-col gap-3">
          <MetaLabel as="p">Links</MetaLabel>
          <Hairline />
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {project.github && <EditorialLink href={project.github} label="GitHub" />}
            {project.live && <EditorialLink href={project.live} label="Live Site" />}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Desktop detail pane - quiet header (back control + breadcrumb) + body.
// ---------------------------------------------------------------------------

function DetailPanel({
  project,
  metaByName,
  reduced,
  onBack,
}: {
  project: Project;
  metaByName: RepoMetaMap;
  reduced: boolean | null;
  onBack: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="app-toolbar flex shrink-0 items-center gap-3 border-b px-5 py-3">
        <button
          type="button"
          onClick={onBack}
          className="group inline-flex items-center focus-visible:outline-none"
          aria-label="Close detail"
        >
          <MetaLabel className="text-text-secondary transition-colors group-hover:text-text">
            Close
          </MetaLabel>
        </button>
        <span aria-hidden className="font-mono-meta opacity-40">
          /
        </span>
        <MetaLabel className="min-w-0 truncate text-text">{project.name}</MetaLabel>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-7">
        <DetailBody project={project} metaByName={metaByName} reduced={reduced} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Folder rail row (desktop sidebar) - mono label + live count + sliding marker.
// ---------------------------------------------------------------------------

const FOLDER_MARKER_ID = 'finder-folder-active';

function FolderRow({
  label,
  count,
  active,
  reduced,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  reduced: boolean | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="finder-folder-row"
      aria-current={active ? 'true' : undefined}
      className="group relative flex w-full items-center gap-3 px-4 py-2 text-left focus-visible:outline-none"
    >
      {active && (
        <motion.span
          layoutId={FOLDER_MARKER_ID}
          aria-hidden
          className="absolute left-0 top-1/2 h-[1.1em] w-[2px] -translate-y-1/2 bg-text"
          transition={withReduced(
            { type: 'spring', stiffness: 520, damping: 40, mass: 0.6 },
            reduced,
          )}
        />
      )}
      <span
        className={`font-mono-meta min-w-0 flex-1 truncate transition-transform
                    ${active ? 'text-text' : 'text-text-secondary group-hover:text-text'}
                    ${reduced ? '' : 'group-hover:translate-x-0.5'}`}
      >
        {label}
      </span>
      <span
        className={`font-mono-meta shrink-0 tabular-nums transition-opacity
                    ${active ? 'opacity-100' : 'opacity-40 group-hover:opacity-70'}`}
      >
        {String(count).padStart(2, '0')}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Live data hook - stars + language map from the GitHub repos API.
// ---------------------------------------------------------------------------

function useRepoMeta(): RepoMetaMap {
  const [metaByName, setMetaByName] = useState<RepoMetaMap>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/github/repos')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: EnrichedRepo[]) => {
        if (cancelled || !Array.isArray(data)) return;
        const map: RepoMetaMap = {};
        for (const r of data) {
          map[r.name.toLowerCase()] = { stars: r.stars, language: r.language };
        }
        setMetaByName(map);
      })
      .catch(() => {
        /* leave the map empty - the spec line just drops the live cells. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return metaByName;
}

// ---------------------------------------------------------------------------
// Main app - desktop default, mobile branch.
// ---------------------------------------------------------------------------

export default function FileExplorerApp({ variant }: { variant?: 'desktop' | 'mobile' } = {}) {
  const reduced = useReducedMotion();
  const metaByName = useRepoMeta();
  const [activeCategory, setActiveCategory] = useState('All');
  const [selected, setSelected] = useState<Project | null>(null);

  const filtered = useMemo(
    () =>
      activeCategory === 'All'
        ? PROJECTS
        : PROJECTS.filter((p) => p.category === activeCategory),
    [activeCategory],
  );

  const countFor = (cat: string) =>
    cat === 'All' ? PROJECTS.length : PROJECTS.filter((p) => p.category === cat).length;

  if (variant === 'mobile') {
    return (
      <MobilePushView
        rootView={{
          id: 'finder-root',
          title: 'Finder',
          element: <FinderMobileRoot metaByName={metaByName} reduced={reduced} />,
        }}
      />
    );
  }

  const handleSelect = (project: Project) =>
    setSelected((prev) => (prev?.id === project.id ? null : project));

  const handleCategory = (cat: string) => {
    setActiveCategory(cat);
    setSelected(null);
  };

  return (
    <div className="flex h-full overflow-hidden bg-bg">
      {/* Folder rail. */}
      <nav
        aria-label="Project categories"
        className="hidden w-48 shrink-0 flex-col overflow-y-auto border-r border-border md:flex"
      >
        <div className="px-4 py-5">
          <MetaLabel as="p">Folders</MetaLabel>
        </div>
        <Hairline />
        <div className="flex flex-col py-2">
          {CATEGORIES.map((cat) => (
            <FolderRow
              key={cat}
              label={cat}
              count={countFor(cat)}
              active={activeCategory === cat}
              reduced={reduced}
              onClick={() => handleCategory(cat)}
            />
          ))}
        </div>
      </nav>

      {/* Main column. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Breadcrumb toolbar reflecting the current folder. */}
        <div className="app-toolbar flex shrink-0 items-center gap-3 border-b px-5 py-3">
          <MetaLabel className="text-text-secondary">Finder</MetaLabel>
          <span aria-hidden className="font-mono-meta opacity-40">
            /
          </span>
          <MetaLabel className="text-text">{activeCategory}</MetaLabel>
          <span className="ml-auto">
            <MetaLabel className="text-text-secondary tabular-nums">
              {filtered.length} {filtered.length === 1 ? 'Item' : 'Items'}
            </MetaLabel>
          </span>
        </div>

        {/* File list + detail pane. */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* File list - reveals once on mount, re-staggers on category change. */}
          <div
            className={`min-w-0 overflow-y-auto px-3 py-2 transition-[flex-basis] duration-300
                        ${selected ? 'hidden basis-1/2 lg:block' : 'basis-full'}`}
          >
            <motion.div
              key={activeCategory}
              variants={reveal.container(reduced)}
              initial="hidden"
              animate="show"
              className="flex flex-col"
            >
              <Hairline />
              {filtered.map((project) => (
                <motion.div key={project.id} variants={reveal.item(reduced)}>
                  <FileRow
                    project={project}
                    metaByName={metaByName}
                    active={selected?.id === project.id}
                    reduced={reduced}
                    onClick={() => handleSelect(project)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Detail pane. */}
          <AnimatePresence>
            {selected && (
              <motion.div
                key="detail"
                initial={reduced ? false : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, x: 16 }}
                transition={withReduced(spring.window, reduced)}
                className="flex min-w-0 basis-full flex-col overflow-hidden border-l border-border lg:basis-1/2"
              >
                <DetailPanel
                  project={selected}
                  metaByName={metaByName}
                  reduced={reduced}
                  onBack={() => setSelected(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status bar. */}
        <div className="app-toolbar flex shrink-0 items-center justify-center border-t px-5 py-2">
          <MetaLabel className="text-text-secondary">
            {selected
              ? `${selected.name} / ${selected.tech.length} Technologies`
              : `${filtered.length} ${filtered.length === 1 ? 'Project' : 'Projects'} / Select To Preview`}
          </MetaLabel>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile - category chips + hairline file rows, push to an editorial detail.
// ---------------------------------------------------------------------------

const MOBILE_CHIP_MARKER_ID = 'finder-mobile-chip-active';

function FinderMobileRoot({
  metaByName,
  reduced,
}: {
  metaByName: RepoMetaMap;
  reduced: boolean | null;
}) {
  const nav = useMobileNavigation();
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered =
    activeCategory === 'All'
      ? PROJECTS
      : PROJECTS.filter((p) => p.category === activeCategory);

  const openDetail = (project: Project) => {
    nav.push({
      id: project.id,
      title: project.name,
      element: (
        <div className="overflow-y-auto px-5 py-6">
          <DetailBody project={project} metaByName={metaByName} reduced={reduced} />
        </div>
      ),
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      {/* Folder chips - mono, with a sliding underline marker. */}
      <div className="hide-scrollbar flex gap-5 overflow-x-auto border-b border-border px-5 py-3">
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              aria-current={active ? 'true' : undefined}
              className="group relative shrink-0 py-1 focus-visible:outline-none"
            >
              <MetaLabel
                className={active ? 'text-text' : 'text-text-secondary'}
              >
                {cat}
              </MetaLabel>
              {active && (
                <motion.span
                  layoutId={MOBILE_CHIP_MARKER_ID}
                  aria-hidden
                  className="absolute -bottom-0.5 left-0 right-0 h-px bg-text"
                  transition={withReduced(spring.window, reduced)}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* File rows - reveal once on mount, re-stagger on category change. */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <motion.div
          key={activeCategory}
          variants={reveal.container(reduced)}
          initial="hidden"
          animate="show"
          className="flex flex-col"
        >
          <Hairline />
          {filtered.map((project) => (
            <motion.div key={project.id} variants={reveal.item(reduced)}>
              <FileRow
                project={project}
                metaByName={metaByName}
                active={false}
                reduced={reduced}
                onClick={() => openDetail(project)}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
