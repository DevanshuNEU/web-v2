'use client';

/**
 * ProjectsApp - the recruiter-facing project browser.
 *
 * An index of projects on the left and a detail stage on the right. The
 * stage leads with what a recruiter scans for: role and status, the name,
 * the tagline, then the headline numbers and the links (live site, source,
 * research data). The long write-up (overview, how it works, stack) follows.
 *
 * Data: the list is projectMeta, and only projectMeta (the curated set). It
 * renders at once from the bundled data; /api/github/repos only adds live
 * GitHub numbers (stars, forks, language, last update) to those entries when
 * it resolves. Raw GitHub repos with no metadata are never listed, so no repo
 * gets a status it did not earn; "More on GitHub" links to the rest.
 *
 * Window-dynamic: layout keys off the WINDOW through container queries (the
 * scoped <style> below), never the viewport. Under a 640px window the index
 * becomes a one-line scrolling strip above a full-width stage. The stage is
 * its own query container (`pjstage`), so the project name is sized against
 * the column it sits in and never breaks mid-word.
 *
 * Motion: the index staggers in once on mount; selecting a project
 * cross-fades the stage (transform + opacity only). Instant under reduced
 * motion.
 */

import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Github, ExternalLink, Star, GitFork, ChevronRight, FileText, Database } from 'lucide-react';
import type { EnrichedRepo } from '@/app/api/github/repos/route';
import { projectMeta, getAllProjectKeys, type Achievement, type ProjectMeta } from '@/data/projectMeta';
import MobilePushView, { useMobileNavigation } from '@/components/mobile/ui/MobilePushView';
import MobileSection from '@/components/mobile/ui/MobileSection';
import { useIsMono } from '@/hooks/usePalette';
import { Hairline, MetaLabel } from '@/components/editorial';
import { reveal, withReduced, INSTANT } from '@/lib/motion';

// Neutral graphite used for language dots in mono. The language NAME carries
// the meaning, so hue is decorative here.
const MONO_LANG = '#8b8b8b';

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Go: '#00ADD8',
  Java: '#b07219',
  CSS: '#563d7c',
  HTML: '#e34c26',
  Shell: '#89e051',
};

const GITHUB_REPOS_URL = 'https://github.com/DevanshuNEU?tab=repositories';

/** How many results lead the stage, right under the tagline. */
const HEADLINE_RESULTS = 3;

// ---------------------------------------------------------------------------
// Data - projectMeta first, live GitHub numbers merged in when they arrive.
// ---------------------------------------------------------------------------

interface Project {
  /** projectMeta key; also the GitHub repo name. */
  name: string;
  slug: string;
  displayName: string;
  tagline: string;
  description: string | null;
  role?: string;
  status: ProjectMeta['status'];
  featured: boolean;
  story: string[];
  achievements: Achievement[];
  tech: string[];
  repoUrl: string | null;
  liveUrl: string | null;
  liveLabel?: string;
  researchUrl?: string;
  language: string | null;
  stars: number;
  forks: number;
  /** Last GitHub update. Null until GitHub says so (and always for private code). */
  updatedAt: string | null;
}

/** Case-insensitive dedupe that keeps the first spelling. */
function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter(t => {
    const k = t.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function buildStaticProjects(): Project[] {
  return getAllProjectKeys().map(name => {
    const meta = projectMeta[name];
    return {
      name,
      slug: meta.slug,
      displayName: meta.displayName,
      tagline: meta.tagline,
      description: meta.descriptionOverride ?? null,
      role: meta.role,
      status: meta.status,
      featured: meta.featured,
      story: meta.story,
      achievements: meta.achievements,
      tech: dedupe(meta.extraTech ?? []),
      repoUrl: meta.repoUrl ?? null,
      liveUrl: meta.liveUrl ?? null,
      liveLabel: meta.liveLabel,
      researchUrl: meta.researchUrl,
      language: null,
      stars: 0,
      forks: 0,
      updatedAt: null,
    };
  });
}

/**
 * True when an API row came from GitHub, not from the route's projectMeta
 * fallback. GitHub timestamps are whole seconds ("...:29Z"); the fallback
 * stamps `new Date().toISOString()` (milliseconds), which would read as
 * "updated today" for code that is not public.
 */
function isGitHubRow(r: EnrichedRepo): boolean {
  return Boolean(r.htmlUrl) && /:\d\dZ$/.test(r.updatedAt);
}

function mergeLive(projects: Project[], rows: EnrichedRepo[]): Project[] {
  const byName = new Map(rows.filter(isGitHubRow).map(r => [r.name.toLowerCase(), r]));
  return projects.map(p => {
    const live = byName.get(p.name.toLowerCase());
    if (!live) return p;
    return {
      ...p,
      description: p.description ?? live.description,
      repoUrl: p.repoUrl ?? live.htmlUrl,
      liveUrl: live.homepage ?? p.liveUrl,
      liveLabel: live.homepage ? live.liveLabel : p.liveLabel,
      language: live.language,
      stars: live.stars,
      forks: live.forks,
      updatedAt: live.updatedAt,
    };
  });
}

type Filter = 'featured' | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'featured', label: 'Featured' },
  { key: 'all', label: 'All' },
];

function applyFilter(projects: Project[], filter: Filter): Project[] {
  return filter === 'featured' ? projects.filter(p => p.featured) : projects;
}

/** Short label for the index: "Live", "PyPI", "Walkthrough"; null when nothing is live. */
function liveMarker(p: Project): string | null {
  if (!p.liveUrl) return null;
  return p.liveLabel ?? 'Live';
}

// ---------------------------------------------------------------------------
// Scoped, window-dynamic layout CSS.
//
// `.app-content` (the window body) is the nearest query container for the
// root and the index, so unnamed @container rules key off the WINDOW. The
// stage scroller is a named container (`pjstage`) so the stage can size its
// name, stats and padding against its own column.
// ---------------------------------------------------------------------------

const SCOPED_CSS = `
[data-projects-root] { display: flex; flex-direction: column; }
[data-projects-root] [data-projects-index] {
  width: 100%;
  border-bottom: 1px solid rgb(var(--color-border));
}
[data-pj-list] {
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}
[data-pj-list]::-webkit-scrollbar { display: none; }
[data-pj-list] > * { flex: 0 0 auto; scroll-snap-align: start; }
[data-pj-name] { white-space: nowrap; }
[data-pj-tagline], [data-pj-row-extra], [data-pj-row-rule], [data-pj-more] { display: none; }

[data-projects-stage-scroll] { container: pjstage / inline-size; }
[data-projects-stage] { padding: 1.25rem 1.25rem 2.5rem; }
/* Narrow stage: one result per row, number left. Wider: a row of columns. */
[data-pj-stats] { display: flex; flex-direction: column; }
[data-pj-stat] {
  display: grid;
  grid-template-columns: 6.5rem minmax(0, 1fr);
  column-gap: 1rem;
  row-gap: 0.25rem;
  padding: 0.75rem 0;
  border-top: 1px solid rgb(var(--color-border));
}
[data-pj-stat] > :first-child { grid-row: span 2; font-size: 1.5rem; }

@container (min-width: 640px) {
  [data-projects-root] { flex-direction: row; }
  [data-projects-root] [data-projects-index] {
    width: 15rem;
    height: 100%;
    border-bottom: 0;
    border-right: 1px solid rgb(var(--color-border));
  }
  [data-pj-list] {
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    scroll-snap-type: none;
    flex: 1 1 auto;
    min-height: 0;
  }
  [data-pj-list] > * { flex: 0 0 auto; }
  [data-pj-name] { white-space: normal; }
  [data-pj-tagline], [data-pj-row-rule], [data-pj-more] { display: block; }
  [data-pj-row-extra] { display: flex; }
}
@container (min-width: 920px) {
  [data-projects-root] [data-projects-index] { width: 18rem; }
}

@container pjstage (min-width: 520px) {
  [data-pj-stats] {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 1.25rem 1.5rem;
  }
  [data-pj-stat] { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.75rem 0 0; }
  [data-pj-stat] > :first-child { font-size: clamp(1.6rem, 4.5cqi, 2.25rem); }
}
@container pjstage (min-width: 560px) {
  [data-projects-stage] { padding: 2rem 2.25rem 3rem; }
}
@container pjstage (min-width: 820px) {
  [data-projects-stage] { padding: 3rem 3.5rem 4rem; }
}
`;

// ---------------------------------------------------------------------------
// Status - a word in a hairline box. In the color palette the whole label
// takes the tint (dot and word), in both light and dark.
// ---------------------------------------------------------------------------

function StatusLabel({ status }: { status: Project['status'] }) {
  const mono = useIsMono();
  const label = { active: 'Active', completed: 'Completed', experimental: 'Experimental' }[status];
  const tint = mono
    ? 'text-text-secondary'
    : {
        active: 'text-green-700 dark:text-green-400',
        completed: 'text-blue-700 dark:text-blue-400',
        experimental: 'text-amber-700 dark:text-amber-400',
      }[status];

  return (
    <span className={`inline-flex items-center gap-2 border border-border px-2 py-0.5 ${tint}`}>
      <span aria-hidden className={`h-1.5 w-1.5 ${mono ? 'bg-text' : 'bg-current'}`} />
      <MetaLabel className="[color:inherit]">{label}</MetaLabel>
    </span>
  );
}

function LangLabel({ lang }: { lang: string }) {
  const mono = useIsMono();
  const color = mono ? MONO_LANG : (LANG_COLORS[lang] ?? MONO_LANG);
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="font-mono text-[13px] text-text">{lang}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Index row. A sliding graphite bar marks the active row; hover is a graphite
// tint. In the narrow strip only the name shows.
// ---------------------------------------------------------------------------

const INDEX_MARKER_ID = 'projects-index-active';

function IndexEntry({
  project,
  active,
  reduced,
  onSelect,
}: {
  project: Project;
  active: boolean;
  reduced: boolean | null;
  onSelect: () => void;
}) {
  const live = liveMarker(project);
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid="index-row"
      aria-current={active ? 'true' : undefined}
      className={`group relative flex w-full flex-col px-4 py-3 text-left
                  transition-[transform,background-color] duration-150 ease-out
                  hover:bg-black/[0.035] dark:hover:bg-white/[0.05]
                  active:scale-[0.985] focus-visible:-outline-offset-2
                  ${active ? 'bg-black/[0.05] dark:bg-white/[0.07]' : ''}`}
    >
      {active && (
        <motion.span
          layoutId={INDEX_MARKER_ID}
          aria-hidden
          className="absolute left-0 top-3 h-[1.3em] w-[2px] bg-text"
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40, mass: 0.6 }}
        />
      )}

      <span
        data-pj-name
        className={`block font-display leading-tight [overflow-wrap:normal] text-[clamp(1rem,2cqi,1.25rem)]
                    transition-colors
                    ${active ? 'text-text' : 'text-text-secondary group-hover:text-text'}`}
      >
        {project.displayName}
      </span>
      {project.tagline && (
        <span data-pj-tagline className="mt-1 line-clamp-2 text-[13px] leading-snug text-text-secondary">
          {project.tagline}
        </span>
      )}
      {(live || project.stars > 0) && (
        <span data-pj-row-extra className="mt-1.5 items-center gap-3 text-[12px] leading-none">
          {live && <span className="font-medium text-text">{live}</span>}
          {project.stars > 0 && (
            <span className="inline-flex items-center gap-1 font-mono text-text-secondary tabular-nums">
              <Star size={10} aria-hidden /> {project.stars}
              <span className="sr-only"> GitHub stars</span>
            </span>
          )}
        </span>
      )}
    </button>
  );
}

function FilterTabs({
  filter,
  onFilter,
  size = 'desktop',
}: {
  filter: Filter;
  onFilter: (f: Filter) => void;
  size?: 'desktop' | 'mobile';
}) {
  const pad = size === 'mobile' ? 'min-h-[44px] px-1 text-[15px]' : 'py-1.5 text-[13px]';
  return (
    <div role="group" aria-label="Filter projects" className="flex items-center gap-5">
      {FILTERS.map(f => {
        const on = filter === f.key;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onFilter(f.key)}
            aria-pressed={on}
            className={`group relative inline-flex items-center font-medium transition-colors active:scale-[0.97] ${pad}
                        ${on ? 'text-text' : 'text-text-secondary hover:text-text'}`}
          >
            {f.label}
            <span
              aria-hidden
              className={`absolute bottom-0.5 left-0 right-0 h-px bg-text origin-left transition-transform duration-200 ease-out
                          ${on ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'}`}
            />
          </button>
        );
      })}
    </div>
  );
}

function IndexColumn({
  projects,
  filter,
  onFilter,
  selected,
  onSelect,
  reduced,
}: {
  projects: Project[];
  filter: Filter;
  onFilter: (f: Filter) => void;
  selected: string | null;
  onSelect: (name: string) => void;
  reduced: boolean | null;
}) {
  const filtered = applyFilter(projects, filter);

  return (
    <nav
      data-projects-index
      aria-label="Projects"
      className="shrink-0 flex flex-col overflow-hidden bg-black/[0.025] dark:bg-white/[0.03]"
    >
      <div className="px-4 pt-2.5 pb-1.5">
        <FilterTabs filter={filter} onFilter={onFilter} />
      </div>

      <motion.div
        key={filter}
        data-pj-list
        variants={reveal.container(reduced)}
        initial="hidden"
        animate="show"
      >
        {filtered.map(p => (
          <motion.div key={p.name} variants={reveal.item(reduced)}>
            <IndexEntry
              project={p}
              active={selected === p.name}
              reduced={reduced}
              onSelect={() => onSelect(p.name)}
            />
            <div data-pj-row-rule><Hairline /></div>
          </motion.div>
        ))}
        <a
          data-pj-more
          href={GITHUB_REPOS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-4 text-[13px] text-text-secondary underline underline-offset-4 hover:text-text focus-visible:-outline-offset-2"
        >
          More on GitHub
        </a>
      </motion.div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Links - live site first (filled), then source, research data, page.
// ---------------------------------------------------------------------------

function ProjectLinks({ project, size = 'desktop' }: { project: Project; size?: 'desktop' | 'mobile' }) {
  const pad = size === 'mobile' ? 'min-h-[44px] px-4 text-[15px]' : 'min-h-[36px] px-3 text-[14px]';
  const outline = `inline-flex items-center gap-2 border border-border text-text font-medium
                   transition-[transform,border-color] duration-150 ease-out
                   hover:border-text/40 active:scale-[0.98] ${pad}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {project.liveUrl && (
        <a
          href={project.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 bg-text text-bg font-medium
                      transition-transform duration-150 ease-out active:scale-[0.98] ${pad}`}
        >
          <ExternalLink size={14} aria-hidden /> {project.liveLabel ?? 'Live site'}
        </a>
      )}
      {project.repoUrl && (
        <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className={outline}>
          <Github size={14} aria-hidden /> GitHub
        </a>
      )}
      {project.researchUrl && (
        <a href={project.researchUrl} target="_blank" rel="noopener noreferrer" className={outline}>
          <Database size={14} aria-hidden /> Research data
        </a>
      )}
      <a href={`/projects/${project.slug}`} target="_blank" rel="noopener" className={outline}>
        <FileText size={14} aria-hidden /> Open as page
      </a>
      {!project.repoUrl && <span className="px-1 text-[14px] text-text-secondary">Code not public</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail content - shared by the desktop stage and the phone push view.
// ---------------------------------------------------------------------------

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[15px] font-medium leading-snug text-text">{children}</h3>
      <Hairline />
    </div>
  );
}

function StatRow({ results }: { results: Achievement[] }) {
  return (
    <ul data-pj-stats aria-label="Key results">
      {results.map(a => (
        <li key={a.label} data-pj-stat>
          <span className="font-display text-text leading-[1.05] tabular-nums">{a.metric}</span>
          <span className="text-[14px] font-medium leading-snug text-text text-balance">{a.label}</span>
          <span className="text-[13px] leading-snug text-text-secondary text-pretty">{a.detail}</span>
        </li>
      ))}
    </ul>
  );
}

function ProjectDetail({ project, size = 'desktop' }: { project: Project; size?: 'desktop' | 'mobile' }) {
  const headline = project.achievements.slice(0, HEADLINE_RESULTS);
  const more = project.achievements.slice(HEADLINE_RESULTS);
  const updated = project.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;
  const hasSpecs = Boolean(project.language || project.stars > 0 || project.forks > 0 || updated);

  return (
    <div data-projects-stage>
      <header className="flex flex-col gap-4 max-w-[60rem]">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {project.role && <span className="text-[14px] font-medium text-text">{project.role}</span>}
          <StatusLabel status={project.status} />
        </p>

        <h2
          className="font-display font-normal text-text leading-[1.02] tracking-[-0.01em]
                     [overflow-wrap:normal] [hyphens:none] text-balance text-[clamp(1.75rem,8.5cqi,4.5rem)]"
        >
          {project.displayName}
        </h2>

        {project.tagline && (
          <p className="text-text-secondary leading-snug text-pretty text-[clamp(1.0625rem,2.6cqi,1.35rem)] max-w-[46ch]">
            {project.tagline}
          </p>
        )}

        {headline.length > 0 && (
          <div className="mt-2">
            <StatRow results={headline} />
          </div>
        )}

        <div className="mt-2">
          <ProjectLinks project={project} size={size} />
        </div>

        {hasSpecs && (
          <dl className="mt-1 flex flex-wrap gap-x-8 gap-y-3">
            {project.language && (
              <div className="flex flex-col gap-1">
                <dt className="text-[13px] text-text-secondary">Language</dt>
                <dd><LangLabel lang={project.language} /></dd>
              </div>
            )}
            {project.stars > 0 && (
              <div className="flex flex-col gap-1">
                <dt className="text-[13px] text-text-secondary">GitHub stars</dt>
                <dd className="inline-flex items-center gap-1.5 font-mono text-[13px] text-text tabular-nums">
                  <Star size={12} aria-hidden /> {project.stars}
                </dd>
              </div>
            )}
            {project.forks > 0 && (
              <div className="flex flex-col gap-1">
                <dt className="text-[13px] text-text-secondary">Forks</dt>
                <dd className="inline-flex items-center gap-1.5 font-mono text-[13px] text-text tabular-nums">
                  <GitFork size={12} aria-hidden /> {project.forks}
                </dd>
              </div>
            )}
            {updated && (
              <div className="flex flex-col gap-1">
                <dt className="text-[13px] text-text-secondary">Updated</dt>
                <dd className="font-mono text-[13px] text-text tabular-nums">{updated}</dd>
              </div>
            )}
          </dl>
        )}
      </header>

      <div className="mt-12 flex flex-col gap-10 max-w-[68ch]">
        {more.length > 0 && (
          <section className="flex flex-col gap-4">
            <SectionHead>More results</SectionHead>
            <ul className="flex flex-col">
              {more.map((a, i) => (
                <li key={a.label} className={`flex items-baseline gap-x-5 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                  <span className="shrink-0 w-[6.5rem] font-display text-text leading-[1.05] tabular-nums text-[clamp(1.35rem,3.4cqi,1.75rem)]">
                    {a.metric}
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-1">
                    <span className="text-[15px] font-medium leading-snug text-text">{a.label}</span>
                    <span className="text-[14px] leading-snug text-text-secondary text-pretty">{a.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {project.description && (
          <section className="flex flex-col gap-4">
            <SectionHead>Overview</SectionHead>
            <p className="text-text-secondary leading-relaxed text-pretty text-[16px]">{project.description}</p>
          </section>
        )}

        {project.story.length > 0 && (
          <section className="flex flex-col gap-4">
            <SectionHead>How it works</SectionHead>
            <div className="flex flex-col gap-4 text-text-secondary leading-relaxed text-pretty text-[16px]">
              {project.story.map((para, i) => <p key={i}>{para}</p>)}
            </div>
          </section>
        )}

        {project.tech.length > 0 && (
          <section className="flex flex-col gap-4">
            <SectionHead>Stack</SectionHead>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {project.tech.map(t => (
                <li key={t} className="font-mono text-[13px] text-text">{t}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function DetailStage({ project, reduced }: { project: Project; reduced: boolean | null }) {
  return (
    <motion.div
      key={project.name}
      // List-navigation frequency: snappy, under the 300ms UI ceiling, and the
      // exit is faster than the enter.
      initial={reduced ? false : { opacity: 0, transform: 'translateY(8px)' }}
      animate={{
        opacity: 1,
        transform: 'translateY(0px)',
        transition: withReduced({ duration: 0.24, ease: [0.23, 1, 0.32, 1] }, reduced),
      }}
      exit={
        reduced
          ? { opacity: 0, transition: INSTANT }
          : { opacity: 0, transform: 'translateY(-5px)', transition: { duration: 0.16, ease: [0.23, 1, 0.32, 1] } }
      }
      data-projects-stage-scroll
      className="flex-1 min-h-0 min-w-0 overflow-y-auto"
    >
      <ProjectDetail project={project} />
    </motion.div>
  );
}

function EmptyStage() {
  return (
    <div className="flex-1 flex items-center justify-center p-10">
      <p className="text-[15px] text-text-secondary">Pick a project from the list.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone - list root view and the pushed detail.
// ---------------------------------------------------------------------------

function ProjectDetailMobile({ project }: { project: Project }) {
  return (
    <div data-projects-stage-scroll className="h-full overflow-y-auto pb-6">
      <ProjectDetail project={project} size="mobile" />
    </div>
  );
}

function ProjectListMobile({ projects }: { projects: Project[] }) {
  const nav = useMobileNavigation();
  const mono = useIsMono();
  const [filter, setFilter] = useState<Filter>('featured');
  const filtered = applyFilter(projects, filter);

  const openDetail = (p: Project) => {
    nav.push({ id: p.name, title: p.displayName, element: <ProjectDetailMobile project={p} /> });
  };

  return (
    <div className="h-full overflow-y-auto pb-4">
      <div className="px-4 pt-1 pb-1">
        <FilterTabs filter={filter} onFilter={setFilter} size="mobile" />
      </div>

      <MobileSection>
        {filtered.map(p => {
          const live = liveMarker(p);
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => openDetail(p)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                          ${mono ? 'active:bg-text/[0.06]' : 'active:bg-accent/10'}`}
            >
              <span className="flex-1 min-w-0">
                <span className="block font-display text-text text-[18px] leading-tight">{p.displayName}</span>
                <span className="mt-0.5 line-clamp-2 text-text-secondary text-[14px] leading-snug">{p.tagline}</span>
                {(live || p.stars > 0) && (
                  <span className="mt-1.5 flex items-center gap-3 text-[12px] leading-none">
                    {live && <span className="font-medium text-text">{live}</span>}
                    {p.stars > 0 && (
                      <span className="inline-flex items-center gap-1 font-mono text-text-secondary tabular-nums">
                        <Star size={10} aria-hidden /> {p.stars}
                        <span className="sr-only"> GitHub stars</span>
                      </span>
                    )}
                  </span>
                )}
              </span>
              <ChevronRight size={18} strokeWidth={2.2} aria-hidden className="text-text-tertiary flex-shrink-0" />
            </button>
          );
        })}
      </MobileSection>

      <p className="px-4 pt-4">
        <a href={GITHUB_REPOS_URL} target="_blank" rel="noopener noreferrer" className="text-[14px] text-text-secondary underline underline-offset-4">
          More on GitHub
        </a>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ProjectsApp({ variant }: { variant?: 'desktop' | 'mobile' } = {}) {
  const [projects, setProjects] = useState<Project[]>(buildStaticProjects);
  const [selected, setSelected] = useState<string | null>(() => projects.find(p => p.featured)?.name ?? null);
  const [filter, setFilter] = useState<Filter>('featured');
  const reduced = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/github/repos')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((rows: EnrichedRepo[]) => {
        if (!cancelled && Array.isArray(rows)) setProjects(prev => mergeLive(prev, rows));
      })
      // The bundled data is already on screen; live numbers are a bonus.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the stage in step with the list: a filter that hides the selected
  // project selects the first one it shows.
  const changeFilter = (next: Filter) => {
    setFilter(next);
    const list = applyFilter(projects, next);
    if (!list.some(p => p.name === selected)) setSelected(list[0]?.name ?? null);
  };

  if (variant === 'mobile') {
    return (
      <>
        <style>{SCOPED_CSS}</style>
        <MobilePushView
          rootView={{ id: 'projects-list', title: 'Projects', element: <ProjectListMobile projects={projects} /> }}
        />
      </>
    );
  }

  const selectedProject = projects.find(p => p.name === selected) ?? null;

  return (
    <div data-projects-root className="h-full overflow-hidden bg-bg">
      <style>{SCOPED_CSS}</style>

      <IndexColumn
        projects={projects}
        filter={filter}
        onFilter={changeFilter}
        selected={selected}
        onSelect={setSelected}
        reduced={reduced}
      />

      <AnimatePresence mode="wait">
        {selectedProject ? (
          <DetailStage key={selectedProject.name} project={selectedProject} reduced={reduced} />
        ) : (
          <EmptyStage key="empty" />
        )}
      </AnimatePresence>
    </div>
  );
}
