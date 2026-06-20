'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Github,
  ExternalLink,
  Star,
  GitFork,
  TrendingUp,
  Code,
  Sparkles,
  Calendar,
  ChevronRight,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import type { EnrichedRepo } from '@/app/api/github/repos/route';
import { projectMeta } from '@/data/projectMeta';
import MobilePushView, { useMobileNavigation } from '@/components/mobile/ui/MobilePushView';
import IconTile from '@/components/mobile/ui/IconTile';
import MobileSection from '@/components/mobile/ui/MobileSection';
import { useIsMono } from '@/hooks/usePalette';

// Neutral graphite used for language dots / hero tint in mono. The language
// NAME label and status text carry meaning, so hue is decorative here.
const MONO_LANG = '#8b8b8b';

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const mono = useIsMono();
  const config = {
    active: { label: 'Active', className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    completed: { label: 'Completed', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    experimental: { label: 'Experimental', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  }[status] ?? { label: status, className: 'bg-surface/50 text-text-secondary' };

  // In mono the status WORD carries the state; neutral chip, no hue.
  const className = mono ? 'bg-white/[0.06] text-text font-semibold border border-text/10' : config.className;

  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${className}`}>
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Language dot
// ---------------------------------------------------------------------------

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

function LangDot({ lang }: { lang: string }) {
  const mono = useIsMono();
  const color = mono ? MONO_LANG : (LANG_COLORS[lang] ?? '#8b8b8b');
  return (
    <span className="flex items-center gap-1.5 text-xs text-text-secondary">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {lang}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Left sidebar — repo list
// ---------------------------------------------------------------------------

type Filter = 'all' | 'featured' | 'personal' | 'org';

function Sidebar({
  repos,
  selected,
  onSelect,
}: {
  repos: EnrichedRepo[];
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>('featured');

  const filters: { key: Filter; label: string }[] = [
    { key: 'featured', label: 'Featured' },
    { key: 'personal', label: 'Personal' },
    { key: 'org', label: 'OpenCodeIntel' },
    { key: 'all', label: 'All' },
  ];

  const filtered = repos.filter(r => {
    if (filter === 'featured') return r.featured;
    if (filter === 'personal') return r.category === 'personal' || r.category === 'meta';
    if (filter === 'org') return r.category === 'org';
    return true;
  });

  return (
    <div className="w-56 flex-shrink-0 app-sidebar flex flex-col h-full">
      {/* Filter chips */}
      <div className="p-3 border-b border-white/10 flex flex-wrap gap-1">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150
              ${filter === f.key
                ? 'bg-accent text-white'
                : 'bg-surface/50 text-text-secondary hover:bg-surface/80 hover:text-text'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Repo list */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-xs text-text-secondary/60 text-center">
            No projects in this filter.
          </div>
        ) : (
          filtered.map(repo => (
            <button
              key={repo.name}
              onClick={() => onSelect(repo.name)}
              className={`w-full text-left px-3 py-2.5 transition-all duration-150 flex items-start gap-2 group
                ${selected === repo.name
                  ? 'bg-accent/10 border-r-2 border-accent'
                  : 'hover:bg-surface/40'
                }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-xs font-semibold truncate
                    ${selected === repo.name ? 'text-accent' : 'text-text'}`}>
                    {repo.displayName}
                  </span>
                  {repo.stars > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-text-secondary/70 flex-shrink-0">
                      <Star size={9} />
                      {repo.stars}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-text-secondary/70 truncate leading-tight">
                  {repo.tagline}
                </p>
              </div>
              <ChevronRight size={12} className={`flex-shrink-0 mt-0.5 transition-opacity
                ${selected === repo.name ? 'opacity-100 text-accent' : 'opacity-0 group-hover:opacity-40'}`} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right panel — project detail
// ---------------------------------------------------------------------------

function ProjectDetail({ repo }: { repo: EnrichedRepo }) {
  const mono = useIsMono();
  const allTech = Array.from(new Set([...repo.extraTech, ...repo.topics]));
  const langColor = mono ? MONO_LANG : (repo.language ? (LANG_COLORS[repo.language] ?? '#6366f1') : '#6366f1');

  return (
    <motion.div
      key={repo.name}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex-1 overflow-auto"
    >
      {/* Hero header — full-bleed gradient from language color */}
      <div
        className="relative px-6 pt-6 pb-5 border-b border-white/10"
        style={{
          background: `linear-gradient(135deg, ${langColor}30 0%, ${langColor}10 50%, transparent 100%)`,
        }}
      >
        {/* Status + org row */}
        <div className="flex items-center gap-2 mb-3">
          <StatusBadge status={repo.status} />
          <span className="text-[10px] text-text-secondary px-2 py-0.5 rounded-full bg-surface/30 border border-white/10">
            {repo.org === 'OpenCodeIntel' ? 'OpenCodeIntel org' : '@DevanshuNEU'}
          </span>
        </div>

        {/* Project name */}
        <h2 className="font-display text-3xl text-text tracking-tight leading-tight mb-1">
          {repo.displayName}
        </h2>
        <p className="text-base text-text-secondary mb-4 leading-snug">{repo.tagline}</p>

        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-text-secondary mb-4 flex-wrap">
          {repo.language && <LangDot lang={repo.language} />}
          {repo.stars > 0 && (
            <span className="flex items-center gap-1 font-medium">
              <Star size={12} className={mono ? 'text-text-secondary' : 'text-amber-400'} /> {repo.stars}
            </span>
          )}
          {repo.forks > 0 && (
            <span className="flex items-center gap-1">
              <GitFork size={11} /> {repo.forks}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {new Date(repo.updatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* CTA buttons */}
        <div className="flex gap-2">
          {repo.htmlUrl && (
            <a
              href={repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-subtle
                         border border-white/20 hover:border-accent/50 text-text text-xs font-medium
                         transition-all hover:scale-[1.02]"
            >
              <Github size={13} /> GitHub
            </a>
          )}
          {repo.homepage && (
            <a
              href={repo.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         bg-accent text-white text-xs font-medium
                         hover:bg-accent/90 transition-all hover:scale-[1.02]"
            >
              <ExternalLink size={13} /> Live Demo
            </a>
          )}
        </div>
      </div>

      {/* Scrollable content below the hero */}
      <div className="p-5 space-y-4">

      {/* Story */}
      {repo.story.length > 0 && (
        <div className="glass-subtle rounded-xl p-5 border border-white/10">
          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            The Story
          </h3>
          <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
            {repo.story.map((para, i) => <p key={i}>{para}</p>)}
          </div>
        </div>
      )}

      {/* Tech stack */}
      {allTech.length > 0 && (
        <div className="glass-subtle rounded-xl p-5 border border-white/10">
          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <Code size={14} className="text-accent" />
            Built With
          </h3>
          <div className="flex flex-wrap gap-2">
            {allTech.map(tech => (
              <span
                key={tech}
                className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-xs font-medium
                           border border-accent/20 hover:bg-accent/20 transition-colors cursor-default"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {repo.achievements.length > 0 && (
        <div className="glass-subtle rounded-xl p-5 border border-white/10">
          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-accent" />
            Key Results
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {repo.achievements.map((a, i) => (
              <div
                key={i}
                className="relative overflow-hidden p-3 rounded-lg glass-subtle border-t-2 border-accent/40 border border-accent/20"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/8 to-transparent pointer-events-none rounded-lg" />
                <div className="relative">
                  <div className="text-2xl font-bold text-accent mb-0.5">{a.metric}</div>
                  <div className="text-xs font-semibold text-text mb-0.5">{a.label}</div>
                  <div className="text-[11px] text-text-secondary">{a.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>{/* end scrollable content */}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-xs">
        <div className="mb-3 text-text-secondary/50"><FolderOpen size={36} /></div>
        <p className="text-sm font-medium text-text mb-1">Pick a project</p>
        <p className="text-xs text-text-secondary">
          {"They're all my favorites. Don't tell the others."}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static fallback from projectMeta (always works, no API needed)
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
// Mobile — project detail content (no motion wrapper, lives inside push view)
// ---------------------------------------------------------------------------

function ProjectDetailMobile({ repo }: { repo: EnrichedRepo }) {
  const mono = useIsMono();
  const allTech = Array.from(new Set([...repo.extraTech, ...repo.topics]));
  const langColor = mono ? MONO_LANG : (repo.language ? (LANG_COLORS[repo.language] ?? '#6366f1') : '#6366f1');

  return (
    <div className="overflow-y-auto pb-6">
      {/* Hero header */}
      <div
        className="px-5 pt-5 pb-4 border-b border-white/10"
        style={{ background: `linear-gradient(135deg, ${langColor}30 0%, ${langColor}10 50%, transparent 100%)` }}
      >
        <div className="flex items-center gap-2 mb-2">
          <StatusBadge status={repo.status} />
          <span className="text-[10px] text-text-secondary px-2 py-0.5 rounded-full bg-surface/30 border border-white/10">
            {repo.org === 'OpenCodeIntel' ? 'OpenCodeIntel org' : '@DevanshuNEU'}
          </span>
        </div>
        <h2 className="font-display text-2xl text-text tracking-tight leading-tight mb-1">{repo.displayName}</h2>
        <p className="text-sm text-text-secondary mb-3 leading-snug">{repo.tagline}</p>
        <div className="flex items-center gap-3 text-xs text-text-secondary mb-4 flex-wrap">
          {repo.language && <LangDot lang={repo.language} />}
          {repo.stars > 0 && (
            <span className="flex items-center gap-1 font-medium">
              <Star size={12} className={mono ? 'text-text-secondary' : 'text-amber-400'} /> {repo.stars}
            </span>
          )}
          {repo.forks > 0 && <span className="flex items-center gap-1"><GitFork size={11} /> {repo.forks}</span>}
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {new Date(repo.updatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="flex gap-2">
          {repo.htmlUrl && (
            <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass-subtle border border-white/20 text-text text-sm font-medium active:opacity-70 transition-opacity">
              <Github size={14} /> GitHub
            </a>
          )}
          {repo.homepage && (
            <a href={repo.homepage} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium active:opacity-70 transition-opacity">
              <ExternalLink size={14} /> Live Demo
            </a>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {repo.story.length > 0 && (
          <div className="glass-subtle rounded-xl p-4 border border-white/10">
            <h3 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
              <Sparkles size={14} className="text-accent" /> The Story
            </h3>
            <div className="space-y-2 text-sm text-text-secondary leading-relaxed">
              {repo.story.map((para, i) => <p key={i}>{para}</p>)}
            </div>
          </div>
        )}
        {allTech.length > 0 && (
          <div className="glass-subtle rounded-xl p-4 border border-white/10">
            <h3 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
              <Code size={14} className="text-accent" /> Built With
            </h3>
            <div className="flex flex-wrap gap-2">
              {allTech.map(tech => (
                <span key={tech} className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-xs font-medium border border-accent/20">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}
        {repo.achievements.length > 0 && (
          <div className="glass-subtle rounded-xl p-4 border border-white/10">
            <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-accent" /> Key Results
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {repo.achievements.map((a, i) => (
                <div key={i} className="relative overflow-hidden p-3 rounded-lg glass-subtle border-t-2 border-accent/40 border border-accent/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/8 to-transparent pointer-events-none rounded-lg" />
                  <div className="relative">
                    <div className="text-xl font-bold text-accent mb-0.5">{a.metric}</div>
                    <div className="text-xs font-semibold text-text mb-0.5">{a.label}</div>
                    <div className="text-[11px] text-text-secondary">{a.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile — project list root view
// ---------------------------------------------------------------------------

function ProjectListMobile({ repos }: { repos: EnrichedRepo[] }) {
  const nav = useMobileNavigation();
  const mono = useIsMono();
  const [filter, setFilter] = useState<Filter>('featured');

  const filters: { key: Filter; label: string }[] = [
    { key: 'featured', label: 'Featured' },
    { key: 'personal', label: 'Personal' },
    { key: 'org', label: 'Org' },
    { key: 'all', label: 'All' },
  ];

  const filtered = repos.filter(r => {
    if (filter === 'featured') return r.featured;
    if (filter === 'personal') return r.category === 'personal' || r.category === 'meta';
    if (filter === 'org') return r.category === 'org';
    return true;
  });

  const openDetail = (repo: EnrichedRepo) => {
    nav.push({
      id: repo.name,
      title: repo.displayName,
      element: <ProjectDetailMobile repo={repo} />,
    });
  };

  return (
    <div className="h-full overflow-y-auto pb-4">
      {/* Filter chips */}
      <div className="px-4 pt-3 pb-3 flex items-center gap-2 overflow-x-auto hide-scrollbar">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              filter === f.key
                ? 'bg-accent text-white'
                : 'bg-black/5 dark:bg-white/8 text-text-secondary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Project rows */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-secondary/50 gap-2">
          <FolderOpen size={32} />
          <p className="text-sm">No projects in this filter.</p>
        </div>
      ) : (
        <MobileSection inset>
          {filtered.map(repo => {
            const langColor = mono ? MONO_LANG : (repo.language ? (LANG_COLORS[repo.language] ?? '#6366f1') : '#6366f1');
            return (
              <button
                key={repo.name}
                onClick={() => openDetail(repo)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-black/5 dark:active:bg-white/5 transition-colors"
              >
                <IconTile color={langColor} icon={<Code size={14} />} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[16px] text-text font-medium leading-tight truncate">{repo.displayName}</span>
                  <span className="block text-[13px] text-text-secondary leading-tight truncate mt-0.5">{repo.tagline}</span>
                </span>
                {repo.stars > 0 && (
                  <span className="flex items-center gap-0.5 text-[12px] text-text-secondary/60 flex-shrink-0">
                    <Star size={11} className={mono ? 'text-text-secondary/70' : 'text-amber-400/70'} /> {repo.stars}
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
        <Loader2 size={18} className="animate-spin text-accent" />
        <span className="text-sm">Fetching repos from GitHub...</span>
      </div>
    );
  }

  // Mobile — iOS push-navigation list → detail
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

  // Desktop — sidebar + detail pane
  const selectedRepo = repos.find(r => r.name === selected) ?? null;

  return (
    <div className="h-full flex overflow-hidden bg-surface/20">
      <Sidebar repos={repos} selected={selected} onSelect={setSelected} />
      <AnimatePresence mode="wait">
        {selectedRepo ? (
          <ProjectDetail key={selectedRepo.name} repo={selectedRepo} />
        ) : (
          <EmptyState key="empty" />
        )}
      </AnimatePresence>
    </div>
  );
}
