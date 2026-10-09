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
  /** Label for the live link when it is not a website (a walkthrough, a package page). */
  liveLabel?: string;
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
    id: 'opencodeintel',
    name: 'OpenCodeIntel',
    description: 'Code-search platform for AI coding agents: web app, REST API and MCP server',
    longDescription: 'A code-search platform that gives AI coding agents real context on a codebase: a web app, a REST API and a 12-tool MCP server. Tree-sitter splits code into function-level chunks (Python, JavaScript, TypeScript); search fuses BM25 and vector results with reciprocal rank fusion, then reranks with a cross-encoder. 94% Hit@1 on a 665-query research eval across 14 open-source codebases. On production, p50 641ms for a cold search and 242ms for cached repeats.',
    category: 'AI / Agents',
    tech: ['Python', 'FastAPI', 'FastMCP', 'tree-sitter', 'Pinecone', 'Cohere', 'Supabase', 'Redis', 'React'],
    github: 'https://github.com/OpenCodeIntel/opencodeintel',
    live: 'https://opencodeintel.com',
    status: 'active',
    highlight: true,
  },
  {
    id: 'overhear',
    name: 'Overhear',
    description: 'QA analyst for voice agents: grades every call against the clinic database',
    longDescription: 'Grades every call a Retell healthcare-scheduling agent takes against the clinic\'s real database. Code replays the agent\'s tool calls to decide the facts (3 of 7 rubric dimensions, 50% of the score); an LLM-as-a-judge scores the rest. On a 39-call golden dataset it caught 23 of 23 planted failures, macro-F1 0.89, with 0.99 self-consistency across 3 repeat runs. Built in 7 days, 132 tests.',
    category: 'AI / Agents',
    tech: ['Next.js', 'TypeScript', 'Retell', 'Claude API', 'Postgres', 'Drizzle', 'Vitest'],
    github: 'https://github.com/DevanshuNEU/overhear',
    status: 'active',
    highlight: true,
  },
  {
    id: 'callbudget',
    name: 'CallBudget',
    description: 'Pharmacy stock prediction as Bayesian active sensing under a calling budget',
    longDescription: 'Treats the search for a shortage drug as a calling-budget problem: a HistGradientBoosting model ranks pharmacies by predicted stock, a Claude-driven voice agent calls the likeliest first (a simulated pharmacist on real pharmacy data), and calibrated abstention keeps false "in stock" answers at 0%, down from 10%. Expected calls to find fell from 4.3 to 2.3 (47%) on 19 Boston pharmacies. Ships as a FastMCP server; 100% public data, zero PHI.',
    category: 'AI / Agents',
    tech: ['Python', 'scikit-learn', 'FastMCP', 'Pipecat', 'Deepgram', 'Optuna', 'DuckDB', 'Claude API'],
    github: 'https://github.com/DevanshuNEU/callbudget',
    live: 'https://www.loom.com/share/0231954a438c4b3ab011fd21f4f41bf2',
    liveLabel: 'Walkthrough',
    status: 'active',
    highlight: true,
  },
  {
    id: 'saar-extension',
    name: 'Saar',
    description: 'Chrome extension that meters Claude.ai tokens and cost in real time',
    longDescription: 'A Chrome extension, published on the Chrome Web Store, that tracks Claude.ai token usage and cost in real time, entirely in the browser. A page-context script reads exact token counts from the streaming responses, a content script draws a Shadow-DOM overlay, and a service worker runs a BPE tokenizer. 1,808 Vitest tests across 63 files.',
    category: 'Dev Tools',
    tech: ['TypeScript', 'WXT', 'Chrome MV3', 'React', 'Vitest', 'Playwright'],
    github: 'https://github.com/OpenCodeIntel/lco',
    live: 'https://getsaar.com',
    status: 'active',
    highlight: true,
  },
  {
    id: 'saar-cli',
    name: 'saar CLI',
    description: 'Writes AGENTS.md, CLAUDE.md and .cursorrules from static analysis',
    longDescription: 'A Python CLI on PyPI (22 releases) that statically analyzes a codebase (package manager, logging, auth patterns) and generates the context files coding agents read: AGENTS.md, CLAUDE.md and .cursorrules.',
    category: 'Dev Tools',
    tech: ['Python', 'Static analysis', 'CLI', 'PyPI'],
    github: 'https://github.com/OpenCodeIntel/saar',
    live: 'https://pypi.org/project/saar/',
    liveLabel: 'PyPI',
    status: 'active',
  },
  {
    id: 'devos',
    name: 'Portfolio OS',
    description: 'A desktop operating system in a browser tab, built with Next.js 15',
    longDescription: 'A full desktop OS simulator built as a portfolio: windowed apps, a dock with magnification, an animated boot sequence, a real terminal, an iOS-style phone shell on mobile, dark/light mode and custom wallpapers. Built with Next.js 15, React 19, Zustand and Framer Motion.',
    category: 'Frontend',
    tech: ['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Zustand', 'PostHog'],
    github: 'https://github.com/DevanshuNEU/web-v2',
    live: 'https://www.devanshuchicholikar.com',
    status: 'production',
    highlight: true,
  },
  {
    id: 'financial-copilot',
    name: 'Financial Copilot',
    description: 'AI expense tracker with budgets, insights and a daily safe-to-spend figure',
    longDescription: 'An AI expense tracker (ExpenseSink): automatic categorization, category budgets, dashboards, AI spending insights, week-over-week comparisons and a daily safe-to-spend figure. React 18 and TypeScript with Recharts on the front end; Supabase Edge Functions (Deno), Postgres and Supabase Auth behind it; deployed on Vercel.',
    category: 'Full Stack',
    tech: ['React 18', 'TypeScript', 'Tailwind CSS', 'Recharts', 'Supabase', 'PostgreSQL', 'Vercel'],
    github: 'https://github.com/DevanshuNEU/financial-copilot',
    status: 'production',
    highlight: true,
  },
  {
    id: 'securescale',
    name: 'SecureScale',
    description: 'Multi-AZ AWS infrastructure as modular Terraform',
    longDescription: 'Multi-AZ AWS infrastructure (VPC, ALB, auto-scaling groups, RDS, S3 with KMS) as modular Terraform with least-privilege IAM, Packer-built AMIs, GitHub Actions and CloudWatch monitoring. Provisioning went from 2 hours to 10 minutes, cloud spend dropped 30%, at 99.9% uptime.',
    category: 'Cloud / DevOps',
    tech: ['AWS', 'Terraform', 'Packer', 'Lambda', 'RDS', 'KMS', 'GitHub Actions', 'CloudWatch'],
    status: 'production',
    highlight: true,
  },
  {
    id: 'mem-machines',
    name: 'Mem Machines',
    description: 'Serverless ingestion on GCP Cloud Run, Pub/Sub and Firestore',
    longDescription: 'An event-driven, serverless data ingestion pipeline on GCP: messages land in Pub/Sub, Cloud Run workers process them, results land in Firestore. Multi-tenant isolation and automatic PII redaction on the way in.',
    category: 'Cloud / DevOps',
    tech: ['Python', 'GCP Cloud Run', 'Pub/Sub', 'Firestore', 'Docker'],
    github: 'https://github.com/DevanshuNEU/mem-machines',
    status: 'archived',
  },
  {
    id: 'tool-crowding',
    name: 'Tool Crowding',
    description: 'Harness measuring whether agents pick the wrong MCP tool as more servers load',
    longDescription: 'A pre-registered harness for measuring MCP tool-selection interference in LLM agents: 345 tests, a 199-tool synthetic corpus and a 144-trial factorial design locked before any data. Every trial is cache-cold (per-trial nonce plus a hard-halt assertion on a cache hit). Status: harness built, 19 exploratory trials run, pilot not run yet.',
    category: 'Research',
    tech: ['Python', 'MCP', 'pytest', 'Anthropic API'],
    github: 'https://github.com/DevanshuNEU/tool-crowding',
    status: 'wip',
  },
  {
    id: 'ibm-watsonx-hackathon',
    name: 'watsonx Test Forge',
    description: 'Hackathon: auto-generate Journey Success test cases for IBM watsonx agents',
    longDescription: 'IBM watsonx Orchestrate hackathon project. Multi-tool agent that reads deployed agent specs and generates Journey Success test cases (happy path, edge, failure). Lifecycle: list_deployed_agents, get_agent_spec, generate_test_case, upload_test_case. Built on IBM ADK + watsonx Orchestrate MCP server with Bob IDE. 4 tools, 13 tests passing.',
    category: 'AI / Agents',
    tech: ['Python', 'IBM watsonx ADK', 'Pydantic', 'pytest'],
    status: 'archived',
  },
];

const CATEGORIES = ['All', 'AI / Agents', 'Dev Tools', 'Full Stack', 'Frontend', 'Cloud / DevOps', 'Research'];

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
      className="group inline-flex items-center focus-visible:outline-none
                 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
    >
      <MetaLabel className="text-text-secondary transition-colors group-hover:text-text">
        {label}
      </MetaLabel>
      <span
        aria-hidden
        className="ml-2 block h-px w-4 origin-left scale-x-100 bg-text/40 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)and(pointer:fine)]:group-hover:scale-x-150"
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
                   transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]
                   hover:bg-black/[0.025] dark:hover:bg-white/[0.04]
                   focus-visible:outline-none focus-visible:bg-black/[0.05] dark:focus-visible:bg-white/[0.07]
                   active:scale-[0.99]"
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
            className={`font-display text-lg leading-tight truncate transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]
                        ${active ? 'text-text' : 'text-text group-hover:text-text'}
                        ${reduced ? '' : '[@media(hover:hover)and(pointer:fine)]:group-hover:translate-x-0.5'}`}
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
              <span
                className="font-mono leading-snug text-text"
                style={{ fontSize: 'clamp(0.72rem, 1.55cqi, 0.8125rem)' }}
              >
                {t}
              </span>
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
            {project.live && <EditorialLink href={project.live} label={project.liveLabel ?? 'Live Site'} />}
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
          className="group inline-flex items-center focus-visible:outline-none
                     transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
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
      className="group relative flex w-full items-center gap-3 px-4 py-2 text-left
                 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]
                 focus-visible:outline-none active:scale-[0.99]"
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
        className={`font-mono-meta min-w-0 flex-1 truncate transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]
                    ${active ? 'text-text' : 'text-text-secondary group-hover:text-text'}
                    ${reduced ? '' : '[@media(hover:hover)and(pointer:fine)]:group-hover:translate-x-0.5'}`}
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
            className={`min-w-0 overflow-y-auto px-3 py-2 transition-[flex-basis] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]
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
                initial={reduced ? false : { opacity: 0, transform: 'translateX(16px)' }}
                animate={{ opacity: 1, transform: 'translateX(0px)' }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, transform: 'translateX(16px)' }}
                transition={withReduced(
                  { duration: 0.22, ease: [0.23, 1, 0.32, 1] },
                  reduced,
                )}
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
              className="group relative shrink-0 py-1 focus-visible:outline-none
                         transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
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
