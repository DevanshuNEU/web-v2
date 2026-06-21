'use client';

/**
 * ProjectsApp - the flagship, recruiter-facing repo browser, art-directed.
 *
 * Composition (design-taste-frontend, variance ~9 / motion ~7 / density ~4,
 * strictly monochrome): a numbered editorial INDEX on the left and a poster-
 * scale DETAIL stage on the right. Project names are set in huge Newsreader
 * serif; everything else is tiny uppercase mono metadata and hairlines. Status
 * is a mono uppercase word (never a colored badge); language is a grayscale dot
 * plus label; stars are mono numerals from the LIVE GitHub API. Each project
 * carries a deterministic B&W "fingerprint" - a seeded pen-plotter mark
 * (Plotter + strokeSet) derived from its repo name - which is hard-gated on the
 * mono palette and on reduced motion by the primitive itself.
 *
 * Window-dynamic: the app lives inside `.app-content` (container-type:
 * inline-size). Type scales off the WINDOW via the cqi-aware editorial/text
 * utilities; LAYOUT re-proportions off the WINDOW via the scoped @container
 * rules in the inline <style> below. Small window = a single focused column,
 * tight and quiet. Maximized = a dramatic asymmetric two-column stage with
 * generous negative space and large kinetic serif. The index rail widens, the
 * fingerprint appears, and the metadata opens up only when the window is wide.
 *
 * Motion (emil-design-eng): the index staggers in ONCE on mount (never on
 * scroll - a windowed inner scroll container makes in-view triggers unreliable).
 * Selecting a project cross-fades the detail stage with a small ease-out
 * transform (transform + opacity only). Hover is a graphite tint; pressable
 * elements scale to 0.98 on :active. Everything collapses to instant under
 * reduced motion.
 *
 * PRESERVED behavior: All/Featured/Personal/Org filtering, the list -> detail
 * interaction, live data fetch with loading + fallback states, every piece of
 * repo metadata (language, stars, forks, updated, topics, tech, description,
 * story, achievements, status, org) and all links, plus the mobile push view.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Github,
  ExternalLink,
  Star,
  GitFork,
  Loader2,
  Code,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import type { EnrichedRepo } from '@/app/api/github/repos/route';
import { projectMeta } from '@/data/projectMeta';
import MobilePushView, { useMobileNavigation } from '@/components/mobile/ui/MobilePushView';
import IconTile from '@/components/mobile/ui/IconTile';
import MobileSection from '@/components/mobile/ui/MobileSection';
import { useIsMono } from '@/hooks/usePalette';
import { Hairline, MetaLabel } from '@/components/editorial';
import { Plotter } from '@/components/signature';
import { strokeSet } from '@/lib/signature/plotter';
import { reveal, withReduced, INSTANT } from '@/lib/motion';

// Neutral graphite used for language dots / icon tiles in mono. The language
// NAME and status WORD carry meaning, so hue is decorative here.
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

type Filter = 'all' | 'featured' | 'personal' | 'org';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'featured', label: 'Featured' },
  { key: 'personal', label: 'Personal' },
  { key: 'org', label: 'Org' },
  { key: 'all', label: 'All' },
];

function applyFilter(repos: EnrichedRepo[], filter: Filter): EnrichedRepo[] {
  return repos.filter(r => {
    if (filter === 'featured') return r.featured;
    if (filter === 'personal') return r.category === 'personal' || r.category === 'meta';
    if (filter === 'org') return r.category === 'org';
    return true;
  });
}

/** Stable 32-bit seed from a repo name, so each project's fingerprint is its own. */
function seedFromName(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Scoped, window-dynamic layout CSS.
//
// I can only edit this file, so the @container rules that re-proportion the
// LAYOUT off the WINDOW (not the viewport) live here, scoped under a root data
// attribute so they never leak. The parent `.app-content` is the query
// container (container-type: inline-size), exactly the mechanism About Me uses
// in globals.css. Type scaling is handled by the cqi-aware .editorial-hero /
// .editorial-head / .text-* / .font-mono-meta utilities; these rules handle
// rail width, the asymmetric column split, the fingerprint visibility, and the
// negative space that opens up only when the window is wide.
// ---------------------------------------------------------------------------

const SCOPED_CSS = `
[data-projects-root] {
  /* defaults = NARROW window: one quiet, focused column */
  --pj-rail-w: 13rem;
  --pj-stage-pad: 1.5rem;
  --pj-stage-gap: 1.25rem;
}
[data-projects-index] {
  width: var(--pj-rail-w);
}
[data-projects-stage] {
  padding: var(--pj-stage-pad);
}
[data-projects-stage-head] {
  display: flex;
  flex-direction: column;
  gap: var(--pj-stage-gap);
}
/* Fingerprint is a wide-window indulgence: hidden when the window is narrow so
   the content column stays focused and legible. */
[data-projects-fingerprint] { display: none; }

/* MID window: rail relaxes, stage breathes a little. */
@container (min-width: 680px) {
  [data-projects-root] {
    --pj-rail-w: 15rem;
    --pj-stage-pad: 2.25rem;
    --pj-stage-gap: 1.75rem;
  }
}

/* WIDE / maximized window: a dramatic asymmetric stage. The serif goes large
   (via .editorial-hero cqi), the metadata column splits off to the right, the
   fingerprint appears, and negative space opens up. */
@container (min-width: 920px) {
  [data-projects-root] {
    --pj-rail-w: 18rem;
    --pj-stage-pad: 3.5rem 4rem;
    --pj-stage-gap: 2.5rem;
  }
  /* Asymmetric two-column header: oversized serif name left, mono meta right. */
  [data-projects-stage-head] {
    display: grid;
    grid-template-columns: minmax(0, 1.85fr) minmax(13rem, 0.85fr);
    gap: 3rem;
    align-items: end;
  }
  [data-projects-fingerprint] {
    display: block;
  }
}
`;

// ---------------------------------------------------------------------------
// Status - mono uppercase word (no colored badge).
// ---------------------------------------------------------------------------

function StatusLabel({ status }: { status: string }) {
  const mono = useIsMono();
  const label =
    { active: 'Active', completed: 'Completed', experimental: 'Experimental' }[status] ?? status;

  // Mono register: the WORD carries the state, framed by a hairline box, no hue.
  // Color register keeps a faint tinted box for legibility parity.
  const tint = mono
    ? ''
    : { active: 'text-green-600 dark:text-green-400', completed: 'text-blue-600 dark:text-blue-400', experimental: 'text-amber-600 dark:text-amber-400' }[status] ?? '';

  return (
    <span className="inline-flex items-center gap-2 border border-border px-2 py-0.5">
      <span aria-hidden className={`h-1.5 w-1.5 ${mono ? 'bg-text' : 'bg-current'} ${tint}`} />
      <MetaLabel className={tint || undefined}>{label}</MetaLabel>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Language - grayscale dot + label (mono) / hued dot (color).
// ---------------------------------------------------------------------------

function LangLabel({ lang }: { lang: string }) {
  const mono = useIsMono();
  const color = mono ? MONO_LANG : (LANG_COLORS[lang] ?? MONO_LANG);
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <MetaLabel>{lang}</MetaLabel>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Index row - numbered editorial entry. The signature interaction lives here:
// a sliding graphite marker (shared layoutId) glides to the active row, hover
// is a graphite tint, the row presses on :active. Mono numerals for the star
// count come straight from the live API.
// ---------------------------------------------------------------------------

const INDEX_MARKER_ID = 'projects-index-active';

function IndexEntry({
  number,
  repo,
  active,
  reduced,
  onSelect,
}: {
  number: string;
  repo: EnrichedRepo;
  active: boolean;
  reduced: boolean | null;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid="index-row"
      aria-current={active ? 'true' : undefined}
      className={`group relative flex w-full items-baseline gap-3 px-3 py-3 text-left
                  transition-[transform,background-color] duration-150 ease-out
                  hover:bg-black/[0.035] dark:hover:bg-white/[0.05]
                  active:scale-[0.985]
                  focus-visible:outline-none focus-visible:bg-black/[0.05] dark:focus-visible:bg-white/[0.07]
                  ${active ? 'bg-black/[0.045] dark:bg-white/[0.06]' : ''}`}
    >
      {/* Sliding active marker - a thin graphite bar that glides between rows. */}
      {active && (
        <motion.span
          layoutId={INDEX_MARKER_ID}
          aria-hidden
          className="absolute left-0 top-1/2 h-[1.4em] w-[2px] -translate-y-1/2 bg-text"
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40, mass: 0.6 }}
        />
      )}

      <MetaLabel
        className={`shrink-0 w-7 justify-start tabular-nums transition-opacity
                    ${active ? 'opacity-100' : 'opacity-45 group-hover:opacity-75'}`}
      >
        {number}
      </MetaLabel>

      <span className="flex-1 min-w-0">
        <span
          className={`block font-display leading-tight truncate text-[clamp(1.05rem,2.6cqi,1.5rem)]
                      transition-colors
                      ${active ? 'text-text' : 'text-text-secondary group-hover:text-text'}`}
        >
          {repo.displayName}
        </span>
        {repo.tagline && (
          <span className="mt-1 block truncate text-text-secondary text-[clamp(0.66rem,1.3cqi,0.78rem)] leading-tight">
            {repo.tagline}
          </span>
        )}
      </span>

      {repo.stars > 0 && (
        <span className="shrink-0 self-center inline-flex items-center gap-1 font-mono-meta text-text-secondary tabular-nums">
          <Star size={9} className="opacity-70" /> {repo.stars}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Index column - filter tabs (mono uppercase) + numbered, ruled list.
// ---------------------------------------------------------------------------

function IndexColumn({
  repos,
  filter,
  setFilter,
  selected,
  onSelect,
  reduced,
}: {
  repos: EnrichedRepo[];
  filter: Filter;
  setFilter: (f: Filter) => void;
  selected: string | null;
  onSelect: (name: string) => void;
  reduced: boolean | null;
}) {
  const filtered = applyFilter(repos, filter);

  return (
    <nav
      data-projects-index
      aria-label="Projects index"
      className="shrink-0 flex flex-col h-full border-r border-border app-sidebar overflow-hidden"
    >
      {/* Masthead + filter tabs */}
      <div className="px-3 pt-4 pb-3 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <MetaLabel as="p">Index</MetaLabel>
          <MetaLabel className="text-text-secondary/60 tabular-nums">
            {String(filtered.length).padStart(2, '0')}
          </MetaLabel>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className="group relative font-mono-meta transition-opacity active:scale-[0.97]
                         focus-visible:outline-none"
              aria-pressed={filter === f.key}
            >
              <span className={filter === f.key ? 'text-text' : 'text-text-secondary/55 group-hover:text-text-secondary'}>
                {f.label}
              </span>
              {/* Active underline - a hairline that snaps under the live tab. */}
              <span
                aria-hidden
                className={`absolute -bottom-1 left-0 right-0 h-px bg-text origin-left transition-transform duration-200 ease-out
                            ${filter === f.key ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'}`}
              />
            </button>
          ))}
        </div>
      </div>

      <Hairline />

      {/* Numbered, ruled list. Reveals once on mount with a stagger (never on
          scroll - windowed scroll container). */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MetaLabel className="text-text-secondary/60">No projects in this filter</MetaLabel>
          </div>
        ) : (
          <motion.div
            key={filter}
            variants={reveal.container(reduced)}
            initial="hidden"
            animate="show"
            className="flex flex-col"
          >
            {filtered.map((repo, i) => (
              <motion.div key={repo.name} variants={reveal.item(reduced)}>
                <IndexEntry
                  number={String(i + 1).padStart(2, '0')}
                  repo={repo}
                  active={selected === repo.name}
                  reduced={reduced}
                  onSelect={() => onSelect(repo.name)}
                />
                <Hairline />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Link buttons - shared by detail + mobile. Pressable, transform-only motion.
// ---------------------------------------------------------------------------

function ProjectLinks({ repo, size = 'desktop' }: { repo: EnrichedRepo; size?: 'desktop' | 'mobile' }) {
  const pad = size === 'mobile' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-[clamp(0.72rem,1.4cqi,0.8rem)]';
  if (!repo.htmlUrl && !repo.homepage) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {repo.htmlUrl && (
        <a
          href={repo.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 border border-border text-text font-medium
                      transition-[transform,border-color] duration-150 ease-out
                      hover:border-text/40 active:scale-[0.98] ${pad}`}
        >
          <Github size={13} /> GitHub
        </a>
      )}
      {repo.homepage && (
        <a
          href={repo.homepage}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 bg-text text-bg font-medium
                      transition-transform duration-150 ease-out active:scale-[0.98] ${pad}`}
        >
          <ExternalLink size={13} /> Live Demo
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail stage - the poster. Oversized serif name, mono metadata, per-project
// plotter fingerprint, then the editorial body (description, story, tech,
// results). Cross-fades on selection with a small ease-out transform.
// ---------------------------------------------------------------------------

function DetailStage({ repo, number, reduced }: { repo: EnrichedRepo; number: string; reduced: boolean | null }) {
  const allTech = useMemo(
    () => Array.from(new Set([...repo.extraTech, ...repo.topics])),
    [repo.extraTech, repo.topics],
  );
  const seed = useMemo(() => seedFromName(repo.name), [repo.name]);
  const orgLabel = repo.org === 'OpenCodeIntel' ? 'OpenCodeIntel' : '@DevanshuNEU';
  const updated = new Date(repo.updatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <motion.div
      key={repo.name}
      // Selecting a project is list-navigation frequency, so the cross-fade
      // stays snappy and under the 300ms UI ceiling. Full transform strings keep
      // this on the GPU so it never drops frames while the new repo's data and
      // fingerprint paint. Per-state transitions make the exit snappier than the
      // enter (asymmetric: fast where the system responds).
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
      className="flex-1 overflow-y-auto"
    >
      <div data-projects-stage>
        {/* ── Poster header ── asymmetric grid (wide) / stacked (narrow) ── */}
        <header data-projects-stage-head>
          {/* Left: kicker + oversized serif name + tagline */}
          <div className="flex flex-col gap-4 min-w-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <MetaLabel className="text-text-secondary/60 tabular-nums">{number}</MetaLabel>
              <StatusLabel status={repo.status} />
              <MetaLabel className="text-text-secondary/70">{orgLabel}</MetaLabel>
            </div>

            <h2 className="editorial-hero text-text break-words text-balance">
              {repo.displayName}
            </h2>

            {repo.tagline && (
              <p className="text-text-secondary leading-snug text-pretty text-[clamp(1rem,2.4cqi,1.35rem)] max-w-[42ch]">
                {repo.tagline}
              </p>
            )}
          </div>

          {/* Right: fingerprint (wide only) + mono spec stack */}
          <div className="flex flex-col gap-4">
            <div
              data-projects-fingerprint
              aria-hidden
              className="aspect-square w-full border border-border"
            >
              {/* Deterministic per-repo plotter mark; mono + reduced-motion gated
                  inside the primitive. animate draws the strokes on once. */}
              <Plotter
                generator={(s) => strokeSet(s, 7)}
                seed={seed}
                strokeWidth={1.1}
                animate
                className="opacity-90"
              />
            </div>

            <dl className="flex flex-col">
              <Hairline />
              {repo.language && (
                <>
                  <div className="flex items-center justify-between gap-3 py-2">
                    <MetaLabel className="text-text-secondary/55">Language</MetaLabel>
                    <LangLabel lang={repo.language} />
                  </div>
                  <Hairline />
                </>
              )}
              {repo.stars > 0 && (
                <>
                  <div className="flex items-center justify-between gap-3 py-2">
                    <MetaLabel className="text-text-secondary/55">Stars</MetaLabel>
                    <span className="inline-flex items-center gap-1.5 font-mono-meta text-text tabular-nums">
                      <Star size={11} className="opacity-70" /> {repo.stars}
                    </span>
                  </div>
                  <Hairline />
                </>
              )}
              {repo.forks > 0 && (
                <>
                  <div className="flex items-center justify-between gap-3 py-2">
                    <MetaLabel className="text-text-secondary/55">Forks</MetaLabel>
                    <span className="inline-flex items-center gap-1.5 font-mono-meta text-text tabular-nums">
                      <GitFork size={11} className="opacity-70" /> {repo.forks}
                    </span>
                  </div>
                  <Hairline />
                </>
              )}
              <div className="flex items-center justify-between gap-3 py-2">
                <MetaLabel className="text-text-secondary/55">Updated</MetaLabel>
                <MetaLabel className="text-text tabular-nums">{updated}</MetaLabel>
              </div>
              <Hairline />
            </dl>
          </div>
        </header>

        {/* Links sit on the editorial baseline below the header. */}
        <div className="mt-8">
          <ProjectLinks repo={repo} />
        </div>

        {/* ── Body ── ruled editorial blocks, generous spacing, no cards ── */}
        <div className="mt-12 flex flex-col gap-12 max-w-[68ch]">
          {repo.description && (
            <section className="flex flex-col gap-4">
              <MetaLabel as="p" className="text-text-secondary/55">Overview</MetaLabel>
              <Hairline />
              <p className="text-text-secondary leading-relaxed text-pretty text-base">
                {repo.description}
              </p>
            </section>
          )}

          {repo.story.length > 0 && (
            <section className="flex flex-col gap-4">
              <MetaLabel as="p" className="text-text-secondary/55">The Story</MetaLabel>
              <Hairline />
              <div className="flex flex-col gap-4 text-text-secondary leading-relaxed text-pretty text-base">
                {repo.story.map((para, i) => <p key={i}>{para}</p>)}
              </div>
            </section>
          )}

          {allTech.length > 0 && (
            <section className="flex flex-col gap-4">
              <MetaLabel as="p" className="text-text-secondary/55">Built With</MetaLabel>
              <Hairline />
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {allTech.map(tech => (
                  <li key={tech}>
                    <MetaLabel className="text-text">{tech}</MetaLabel>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {repo.achievements.length > 0 && (
            <section className="flex flex-col gap-4">
              <MetaLabel as="p" className="text-text-secondary/55">Key Results</MetaLabel>
              <Hairline />
              <dl className="flex flex-col">
                {repo.achievements.map((a, i) => (
                  <div key={i}>
                    <div className="flex items-baseline gap-5 py-4">
                      <dd className="shrink-0 w-28 font-display text-text leading-none tabular-nums text-[clamp(1.6rem,4.5cqi,2.5rem)]">
                        {a.metric}
                      </dd>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <dt className="text-text font-medium text-sm leading-snug text-balance">{a.label}</dt>
                        <p className="text-text-secondary text-pretty text-[clamp(0.74rem,1.5cqi,0.85rem)] leading-snug">{a.detail}</p>
                      </div>
                    </div>
                    {i < repo.achievements.length - 1 && <Hairline />}
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Empty state - composed, editorial.
// ---------------------------------------------------------------------------

function EmptyStage() {
  return (
    <div className="flex-1 flex items-center justify-center p-10">
      <div className="flex flex-col items-center gap-3 text-center max-w-xs">
        <FolderOpen size={28} className="text-text-secondary/40" />
        <p className="editorial-head text-text text-[clamp(1.25rem,4cqi,1.75rem)] leading-tight">
          Pick a project
        </p>
        <MetaLabel className="text-text-secondary/60">
          They are all my favorites
        </MetaLabel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static fallback from projectMeta (always works, no API needed).
// ---------------------------------------------------------------------------

function buildStaticRepos(): EnrichedRepo[] {
  return Object.entries(projectMeta).map(([name, meta]) => ({
    name,
    displayName: meta.displayName,
    tagline: meta.tagline,
    description: meta.descriptionOverride ?? meta.tagline,
    htmlUrl: `https://github.com/DevanshuNEU/${name}`,
    homepage: null,
    language: meta.extraTech?.[0] ?? null,
    stars: 0,
    forks: 0,
    topics: meta.extraTech ?? [],
    updatedAt: new Date().toISOString(),
    featured: meta.featured,
    category: meta.category,
    status: meta.status,
    story: meta.story,
    achievements: meta.achievements,
    extraTech: meta.extraTech ?? [],
    org: (meta.category === 'org' ? 'OpenCodeIntel' : 'DevanshuNEU') as 'DevanshuNEU' | 'OpenCodeIntel',
  }));
}

// ---------------------------------------------------------------------------
// Mobile - project detail content (no motion wrapper, lives inside push view).
// ---------------------------------------------------------------------------

function ProjectDetailMobile({ repo }: { repo: EnrichedRepo }) {
  const allTech = Array.from(new Set([...repo.extraTech, ...repo.topics]));
  const updated = new Date(repo.updatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div className="overflow-y-auto pb-6">
      {/* Poster header */}
      <div className="px-5 pt-5 pb-5 border-b border-border flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusLabel status={repo.status} />
          <MetaLabel className="text-text-secondary/70">
            {repo.org === 'OpenCodeIntel' ? 'OpenCodeIntel' : '@DevanshuNEU'}
          </MetaLabel>
        </div>
        <h2 className="editorial-head text-text text-[2rem] leading-tight break-words text-balance">{repo.displayName}</h2>
        {repo.tagline && <p className="text-text-secondary text-sm leading-snug text-pretty">{repo.tagline}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1">
          {repo.language && <LangLabel lang={repo.language} />}
          {repo.stars > 0 && (
            <span className="inline-flex items-center gap-1.5 font-mono-meta text-text tabular-nums">
              <Star size={11} className="opacity-70" /> {repo.stars}
            </span>
          )}
          {repo.forks > 0 && (
            <span className="inline-flex items-center gap-1.5 font-mono-meta text-text tabular-nums">
              <GitFork size={11} className="opacity-70" /> {repo.forks}
            </span>
          )}
          <MetaLabel className="text-text-secondary/70 tabular-nums">{updated}</MetaLabel>
        </div>
        <div className="mt-2">
          <ProjectLinks repo={repo} size="mobile" />
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-9">
        {repo.description && (
          <section className="flex flex-col gap-3">
            <MetaLabel as="p" className="text-text-secondary/55">Overview</MetaLabel>
            <Hairline />
            <p className="text-text-secondary text-sm leading-relaxed text-pretty">{repo.description}</p>
          </section>
        )}
        {repo.story.length > 0 && (
          <section className="flex flex-col gap-3">
            <MetaLabel as="p" className="text-text-secondary/55">The Story</MetaLabel>
            <Hairline />
            <div className="flex flex-col gap-3 text-text-secondary text-sm leading-relaxed text-pretty">
              {repo.story.map((para, i) => <p key={i}>{para}</p>)}
            </div>
          </section>
        )}
        {allTech.length > 0 && (
          <section className="flex flex-col gap-3">
            <MetaLabel as="p" className="text-text-secondary/55">Built With</MetaLabel>
            <Hairline />
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {allTech.map(tech => (
                <li key={tech}><MetaLabel className="text-text">{tech}</MetaLabel></li>
              ))}
            </ul>
          </section>
        )}
        {repo.achievements.length > 0 && (
          <section className="flex flex-col gap-3">
            <MetaLabel as="p" className="text-text-secondary/55">Key Results</MetaLabel>
            <Hairline />
            <dl className="flex flex-col">
              {repo.achievements.map((a, i) => (
                <div key={i}>
                  <div className="flex items-baseline gap-4 py-3">
                    <dd className="shrink-0 w-20 font-display text-text leading-none tabular-nums text-2xl">{a.metric}</dd>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <dt className="text-text font-medium text-[13px] leading-snug text-balance">{a.label}</dt>
                      <p className="text-text-secondary text-[11px] leading-snug text-pretty">{a.detail}</p>
                    </div>
                  </div>
                  {i < repo.achievements.length - 1 && <Hairline />}
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile - project list root view.
// ---------------------------------------------------------------------------

function ProjectListMobile({ repos }: { repos: EnrichedRepo[] }) {
  const nav = useMobileNavigation();
  const mono = useIsMono();
  const [filter, setFilter] = useState<Filter>('featured');

  const filtered = applyFilter(repos, filter);

  const openDetail = (repo: EnrichedRepo) => {
    nav.push({
      id: repo.name,
      title: repo.displayName,
      element: <ProjectDetailMobile repo={repo} />,
    });
  };

  return (
    <div className="h-full overflow-y-auto pb-4">
      {/* Filter tabs - mono uppercase, underline marker. */}
      <div className="px-4 pt-3 pb-3 flex items-center gap-5 overflow-x-auto hide-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className="group relative flex-shrink-0 font-mono-meta active:scale-[0.97]"
            aria-pressed={filter === f.key}
          >
            <span className={filter === f.key ? 'text-text' : 'text-text-secondary/55'}>{f.label}</span>
            <span
              aria-hidden
              className={`absolute -bottom-1 left-0 right-0 h-px bg-text origin-left transition-transform duration-200 ease-out
                          ${filter === f.key ? 'scale-x-100' : 'scale-x-0'}`}
            />
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <FolderOpen size={28} className="text-text-secondary/40" />
          <MetaLabel className="text-text-secondary/60">No projects in this filter</MetaLabel>
        </div>
      ) : (
        <MobileSection inset>
          {filtered.map((repo, i) => {
            const langColor = mono ? MONO_LANG : (repo.language ? (LANG_COLORS[repo.language] ?? MONO_LANG) : MONO_LANG);
            return (
              <button
                key={repo.name}
                onClick={() => openDetail(repo)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-black/5 dark:active:bg-white/5 transition-colors"
              >
                <span className="font-mono-meta text-text-secondary/50 w-6 shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <IconTile color={langColor} icon={<Code size={14} />} />
                <span className="flex-1 min-w-0">
                  <span className="block font-display text-text text-[17px] leading-tight truncate">{repo.displayName}</span>
                  <span className="block text-text-secondary text-[13px] leading-tight truncate mt-0.5">{repo.tagline}</span>
                </span>
                {repo.stars > 0 && (
                  <span className="inline-flex items-center gap-0.5 font-mono-meta text-text-secondary shrink-0 tabular-nums">
                    <Star size={11} className="opacity-70" /> {repo.stars}
                  </span>
                )}
                <ChevronRight size={18} strokeWidth={2.2} className="text-text-secondary/40 flex-shrink-0" />
              </button>
            );
          })}
        </MobileSection>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ProjectsApp({ variant }: { variant?: 'desktop' | 'mobile' } = {}) {
  const [repos, setRepos] = useState<EnrichedRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('featured');
  const reduced = useReducedMotion();

  useEffect(() => {
    fetch('/api/github/repos')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: EnrichedRepo[]) => {
        const resolved = Array.isArray(data) && data.length > 0 ? data : buildStaticRepos();
        setRepos(resolved);
        const first = resolved.find(r => r.featured);
        if (first) setSelected(first.name);
        setLoading(false);
      })
      .catch(() => {
        const fallback = buildStaticRepos();
        setRepos(fallback);
        const first = fallback.find(r => r.featured);
        if (first) setSelected(first.name);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center gap-3 text-text-secondary">
        <Loader2 size={16} className="animate-spin" />
        <MetaLabel>Fetching repos from GitHub</MetaLabel>
      </div>
    );
  }

  // Mobile - iOS push-navigation list -> detail
  if (variant === 'mobile') {
    return (
      <MobilePushView
        rootView={{
          id: 'projects-list',
          title: 'Projects',
          element: <ProjectListMobile repos={repos} />,
        }}
      />
    );
  }

  // Desktop - editorial index + poster stage
  const selectedRepo = repos.find(r => r.name === selected) ?? null;
  // The detail kicker number reflects the project's position within the active
  // filter view (matches the index numbering the recruiter just scanned). If the
  // selection is no longer in the active filter (e.g. the filter changed while a
  // detail was open), fall back to its position in the full list rather than
  // mislabeling it with another row's ordinal.
  const filteredView = applyFilter(repos, filter);
  const selectedNumber = (() => {
    if (!selectedRepo) return '00';
    const inFilter = filteredView.findIndex(r => r.name === selectedRepo.name);
    const idx = inFilter !== -1 ? inFilter : repos.findIndex(r => r.name === selectedRepo.name);
    return String((idx === -1 ? 0 : idx) + 1).padStart(2, '0');
  })();

  return (
    <div data-projects-root className="h-full flex overflow-hidden bg-surface/20">
      {/* Scoped, window-dynamic layout CSS (see SCOPED_CSS notes). */}
      <style>{SCOPED_CSS}</style>

      <IndexColumn
        repos={repos}
        filter={filter}
        setFilter={setFilter}
        selected={selected}
        onSelect={setSelected}
        reduced={reduced}
      />

      <AnimatePresence mode="wait">
        {selectedRepo ? (
          <DetailStage key={selectedRepo.name} repo={selectedRepo} number={selectedNumber} reduced={reduced} />
        ) : (
          <EmptyStage key="empty" />
        )}
      </AnimatePresence>
    </div>
  );
}
