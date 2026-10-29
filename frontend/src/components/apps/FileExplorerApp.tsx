'use client';

/**
 * FileExplorerApp - "Finder", in the Instrument editorial register.
 *
 * A Finder-style browser over the same projects the Projects app shows. The
 * files come from data/projectMeta.ts (read-only here), never from a second
 * copy, so the two apps cannot drift. Folders are views by status; a project
 * opens a preview pane with its links and an "Open in Projects" action.
 *
 * Live data: GitHub stars AND primary language come from /api/github/repos.
 * Stars are never hardcoded; the spec line just omits a cell when absent.
 *
 * Window-responsive: the layout keys off the window (container queries on
 * .app-content), never the viewport. Under 720px the folder rail becomes a
 * chip row; under 860px the preview replaces the list (with Back) instead of
 * squeezing in beside it. The preview pane is its own query container, so
 * its title sizes to the pane and never clips.
 *
 * Animation contract: content reveals ONCE on mount, never on scroll. A
 * sliding marker glides between rows; all of it collapses to instant under
 * reduced motion.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { Hairline, MetaLabel } from '@/components/editorial';
import { reveal, withReduced, spring } from '@/lib/motion';
import MobilePushView, { useMobileNavigation } from '@/components/mobile/ui/MobilePushView';
import { projectMeta, getAllProjectKeys, type ProjectMeta } from '@/data/projectMeta';
import { useOSStore } from '@/store/osStore';
import type { EnrichedRepo } from '@/app/api/github/repos/route';

// ---------------------------------------------------------------------------
// Data - derived from projectMeta, the source the Projects app reads.
// ---------------------------------------------------------------------------

interface Project {
  /** projectMeta key (the GitHub repo name). */
  id: string;
  name: string;
  description: string;
  longDescription: string;
  tech: string[];
  github?: string;
  live?: string;
  /** Label for the live link when it is not a website (a walkthrough, a package page). */
  liveLabel?: string;
  /** Public repo with the data behind the headline numbers. */
  research?: string;
  status: ProjectMeta['status'];
  featured: boolean;
}

// Pull the repo name out of a github.com URL so we can match against the API.
function ghName(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/github\.com\/[^/]+\/([^/?#]+)/);
  return m ? m[1].toLowerCase() : null;
}

function toProject(key: string, meta: ProjectMeta): Project {
  return {
    id: key,
    name: meta.displayName,
    description: meta.tagline,
    longDescription: meta.descriptionOverride ?? meta.story[0] ?? meta.tagline,
    tech: meta.extraTech ?? [],
    github: meta.repoUrl,
    live: meta.liveUrl,
    liveLabel: meta.liveLabel,
    research: meta.researchUrl,
    status: meta.status,
    featured: meta.featured,
  };
}

/** Every project, in the Projects app's display order (featured first). */
const PROJECTS: Project[] = getAllProjectKeys().map((key) => toProject(key, projectMeta[key]));

// Folders are views over the same files. Status words match the Projects app.
const STATUS_LABELS: Record<Project['status'], string> = {
  active: 'Active',
  completed: 'Completed',
  experimental: 'Experimental',
};

interface Folder {
  id: string;
  label: string;
  match: (p: Project) => boolean;
}

const ALL_FOLDERS: Folder[] = [
  { id: 'all', label: 'All projects', match: () => true },
  { id: 'featured', label: 'Featured', match: (p) => p.featured },
  { id: 'active', label: STATUS_LABELS.active, match: (p) => p.status === 'active' },
  { id: 'completed', label: STATUS_LABELS.completed, match: (p) => p.status === 'completed' },
  { id: 'experimental', label: STATUS_LABELS.experimental, match: (p) => p.status === 'experimental' },
];

/** Only folders that hold something. */
const FOLDERS = ALL_FOLDERS.filter((f) => PROJECTS.some(f.match));

function filesIn(folderId: string): Project[] {
  const folder = FOLDERS.find((f) => f.id === folderId) ?? FOLDERS[0];
  return PROJECTS.filter(folder.match);
}

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
    cells.push(`${meta.stars} ${meta.stars === 1 ? 'star' : 'stars'}`);
  }
  cells.push(STATUS_LABELS[project.status]);
  return cells;
}

/** Mono run of spec cells. Gaps, not middots, so a wrap never strands a dot. */
function SpecLine({ cells, className }: { cells: string[]; className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className ?? ''}`}>
      {cells.map((cell) => (
        <MetaLabel key={cell} className="text-text-secondary">{cell}</MetaLabel>
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
      className="group inline-flex items-center
                 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
    >
      <MetaLabel className="text-text transition-colors">
        {label}
      </MetaLabel>
      <ExternalLink size={12} aria-hidden className="ml-1.5 text-text-secondary transition-colors group-hover:text-text" />
      <span className="sr-only">(opens in a new tab)</span>
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
        aria-pressed={active}
        className="group relative flex w-full flex-col gap-1.5 px-3 py-4 text-left
                   transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]
                   hover:bg-black/[0.025] dark:hover:bg-white/[0.04]
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
            className={`font-display text-lg leading-tight text-text [text-wrap:balance] transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]
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
  onOpenProjects,
}: {
  project: Project;
  metaByName: RepoMetaMap;
  reduced: boolean | null;
  /** Open the Projects app (desktop only). */
  onOpenProjects?: () => void;
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
        <h2 className="font-display text-text editorial-head leading-[1.02] text-[clamp(1.75rem,9cqi,3rem)] [overflow-wrap:normal] [text-wrap:balance]">
          {project.name}
        </h2>
        <p className="max-w-[60ch] text-base leading-snug text-text-secondary">{project.description}</p>
        <Hairline />
        <SpecLine cells={cells} />
        {onOpenProjects && (
          <button
            type="button"
            onClick={onOpenProjects}
            className="mt-1 inline-flex self-start border border-text px-3.5 py-2 font-mono-meta text-text
                       transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]
                       hover:bg-text hover:text-bg active:scale-[0.97]"
          >
            Open in Projects
          </button>
        )}
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
      {project.tech.length > 0 && (
      <motion.div variants={reveal.item(reduced)} className="flex flex-col gap-3">
        <MetaLabel as="p">Stack</MetaLabel>
        <Hairline />
        <ul className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
          {project.tech.map((t) => (
            <li key={t} className="font-mono text-[0.8125rem] leading-snug text-text">
              {t}
            </li>
          ))}
        </ul>
      </motion.div>
      )}

      {/* Links - quiet editorial, hairline-separated from the body above. */}
      {(project.github || project.live) && (
        <motion.div variants={reveal.item(reduced)} className="flex flex-col gap-3">
          <MetaLabel as="p">Links</MetaLabel>
          <Hairline />
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {project.github && <EditorialLink href={project.github} label="GitHub" />}
            {project.live && <EditorialLink href={project.live} label={project.liveLabel ?? 'Live site'} />}
            {project.research && <EditorialLink href={project.research} label="Research Data" />}
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
  onOpenProjects,
}: {
  project: Project;
  metaByName: RepoMetaMap;
  reduced: boolean | null;
  onBack: () => void;
  onOpenProjects: () => void;
}) {
  return (
    // Its own query container: the title's cqi size measures this pane, not
    // the whole window, so it never clips in a split layout.
    <div className="flex h-full flex-col overflow-hidden [container-type:inline-size]">
      <div className="app-toolbar flex shrink-0 items-center gap-3 border-b px-5 py-3">
        <button
          type="button"
          onClick={onBack}
          className="group inline-flex items-center
                     transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
          aria-label="Close preview"
        >
          <MetaLabel className="text-text-secondary transition-colors group-hover:text-text">
            Close
          </MetaLabel>
        </button>
        <span aria-hidden className="font-mono-meta text-text-tertiary">
          /
        </span>
        <MetaLabel className="min-w-0 truncate text-text">{project.name}</MetaLabel>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-7">
        <DetailBody project={project} metaByName={metaByName} reduced={reduced} onOpenProjects={onOpenProjects} />
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
      aria-pressed={active}
      className="group relative flex w-full items-center gap-3 px-4 py-2 text-left
                 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]
                 active:scale-[0.99]"
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
                    ${active ? 'font-semibold text-text' : 'text-text-secondary group-hover:text-text'}
                    ${reduced ? '' : '[@media(hover:hover)and(pointer:fine)]:group-hover:translate-x-0.5'}`}
      >
        {label}
      </span>
      <span className={`font-mono-meta shrink-0 tabular-nums ${active ? 'text-text' : 'text-text-secondary'}`}>
        {count}
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
  const [activeFolder, setActiveFolder] = useState(FOLDERS[0].id);
  const [selected, setSelected] = useState<Project | null>(null);

  const filtered = useMemo(() => filesIn(activeFolder), [activeFolder]);
  const folderLabel = FOLDERS.find((f) => f.id === activeFolder)?.label ?? FOLDERS[0].label;

  // Escape closes the preview, like Quick Look.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

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

  // Selecting is idempotent: clicking the open file again keeps it open.
  const handleSelect = (project: Project) => setSelected(project);

  const handleFolder = (id: string) => {
    setActiveFolder(id);
    setSelected(null);
  };

  const openProjects = () => useOSStore.getState().openWindow('projects');

  return (
    <div className="flex h-full overflow-hidden bg-bg">
      {/* Folder rail: only when the window is wide enough to spare it. */}
      <nav
        aria-label="Folders"
        className="hidden w-48 shrink-0 flex-col overflow-y-auto border-r border-border [@container(min-width:720px)]:flex"
      >
        <div className="px-4 py-5">
          <MetaLabel as="p">Folders</MetaLabel>
        </div>
        <Hairline />
        <div className="flex flex-col py-2">
          {FOLDERS.map((f) => (
            <FolderRow
              key={f.id}
              label={f.label}
              count={filesIn(f.id).length}
              active={activeFolder === f.id}
              reduced={reduced}
              onClick={() => handleFolder(f.id)}
            />
          ))}
        </div>
      </nav>

      {/* Main column. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Narrow windows: the folders become a chip row. */}
        <div className="[@container(min-width:720px)]:hidden">
          <FolderChips active={activeFolder} reduced={reduced} onChange={handleFolder} />
        </div>

        {/* Breadcrumb toolbar reflecting the current folder. */}
        <div className="app-toolbar flex shrink-0 items-center gap-3 border-b px-5 py-3">
          <MetaLabel className="text-text-secondary">Finder</MetaLabel>
          <span aria-hidden className="font-mono-meta text-text-tertiary">
            /
          </span>
          <MetaLabel className="min-w-0 truncate text-text">{folderLabel}</MetaLabel>
          <span className="ml-auto shrink-0">
            <MetaLabel className="text-text-secondary tabular-nums">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
            </MetaLabel>
          </span>
        </div>

        {/* File list + preview. Side by side from 860px; below that the
            preview replaces the list, and Close returns to it. */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div
            className={`min-w-0 overflow-y-auto px-3 py-2
                        ${selected ? 'hidden [@container(min-width:860px)]:block [@container(min-width:860px)]:basis-1/2' : 'basis-full'}`}
          >
            <motion.div
              key={activeFolder}
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
                className="flex min-w-0 basis-full flex-col overflow-hidden [@container(min-width:860px)]:basis-1/2 [@container(min-width:860px)]:border-l [@container(min-width:860px)]:border-border"
              >
                <DetailPanel
                  project={selected}
                  metaByName={metaByName}
                  reduced={reduced}
                  onBack={() => setSelected(null)}
                  onOpenProjects={openProjects}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Folder chips - narrow windows and the phone. Scrolls sideways with an edge
// fade so the hidden folders read as "more this way".
// ---------------------------------------------------------------------------

const CHIP_MARKER_ID = 'finder-chip-active';

function FolderChips({
  active,
  reduced,
  onChange,
}: {
  active: string;
  reduced: boolean | null;
  onChange: (id: string) => void;
}) {
  return (
    <nav
      aria-label="Folders"
      className="hide-scrollbar flex shrink-0 gap-5 overflow-x-auto border-b border-border px-5
                 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)]"
    >
      {FOLDERS.map((f) => {
        const isActive = active === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            aria-pressed={isActive}
            data-testid="finder-folder-chip"
            className="group relative flex min-h-[44px] shrink-0 items-center
                       transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
          >
            <MetaLabel className={isActive ? 'font-semibold text-text' : 'text-text-secondary group-hover:text-text'}>
              {f.label}
            </MetaLabel>
            {isActive && (
              <motion.span
                layoutId={CHIP_MARKER_ID}
                aria-hidden
                className="absolute bottom-2 left-0 right-0 h-px bg-text"
                transition={withReduced(spring.window, reduced)}
              />
            )}
          </button>
        );
      })}
      {/* Room past the last chip so the fade never covers it at the end. */}
      <span aria-hidden className="w-6 shrink-0" />
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Mobile - folder chips + hairline file rows, push to an editorial detail.
// ---------------------------------------------------------------------------

function FinderMobileRoot({
  metaByName,
  reduced,
}: {
  metaByName: RepoMetaMap;
  reduced: boolean | null;
}) {
  const nav = useMobileNavigation();
  const [activeFolder, setActiveFolder] = useState(FOLDERS[0].id);
  const filtered = filesIn(activeFolder);

  const openDetail = (project: Project) => {
    nav.push({
      id: project.id,
      title: project.name,
      element: (
        <div className="overflow-y-auto px-5 py-6 [container-type:inline-size]">
          <DetailBody project={project} metaByName={metaByName} reduced={reduced} />
        </div>
      ),
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      <FolderChips active={activeFolder} reduced={reduced} onChange={setActiveFolder} />

      {/* File rows - reveal once on mount, re-stagger on folder change. */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <motion.div
          key={activeFolder}
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
