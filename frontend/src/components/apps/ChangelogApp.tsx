'use client';

/**
 * ChangelogApp — devOS Version History
 *
 * Animated changelog with version badges, dates, and personality.
 * Every release tells a story.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Wrench, Zap, Bug, Package } from 'lucide-react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type ChangeType = 'feature' | 'fix' | 'perf' | 'refactor' | 'release';

interface ChangeEntry {
  type: ChangeType;
  text: string;
}

interface Release {
  version: string;
  date: string;
  codename: string;
  summary: string;
  changes: ChangeEntry[];
  highlight?: boolean;
}

const RELEASES: Release[] = [
  {
    version: '2.1.0',
    date: 'Mar 2026',
    codename: 'Constellation',
    summary: 'Sprint 3 lands. New apps, skill tree, file explorer, and a changelog you\'re reading right now.',
    highlight: true,
    changes: [
      { type: 'feature', text: 'RPG Skill Tree with SVG node graph, animated connections, and level indicators' },
      { type: 'feature', text: 'File Explorer with macOS Finder layout, project detail panels, and category filtering' },
      { type: 'feature', text: 'Resume app with section navigation, timeline experience view, and download link' },
      { type: 'feature', text: 'Changelog app. Meta. You\'re reading v2.1.0 in v2.1.0.' },
      { type: 'refactor', text: 'All Zustand store subscriptions migrated to granular selectors for React 19 compatibility' },
      { type: 'fix', text: 'AnalyticsApp infinite render loop resolved with polling pattern via getState()' },
      { type: 'perf', text: 'WindowManager defers analytics tracking out of React commit phase via setTimeout' },
    ],
  },
  {
    version: '2.0.0',
    date: 'Feb 2026',
    codename: 'Horizon',
    summary: 'Complete rebuild from v1. New architecture, new design system, new everything.',
    highlight: true,
    changes: [
      { type: 'release', text: 'devOS v2 — full ground-up rebuild in Next.js 15 with React 19 and App Router' },
      { type: 'feature', text: 'Desktop OS simulator with draggable, resizable windows and Cmd+W shortcuts' },
      { type: 'feature', text: 'macOS-style dock with spring physics magnification effect' },
      { type: 'feature', text: 'Boot sequence animation with terminal-style log lines' },
      { type: 'feature', text: 'PostHog analytics with transparent live dashboard in Analytics.app' },
      { type: 'feature', text: 'Snake game with responsive canvas and high score persistence' },
      { type: 'feature', text: 'Desktop wallpapers with picker, including the posthog-clean default' },
      { type: 'feature', text: 'Notification center with idle-triggered welcome toast' },
      { type: 'feature', text: 'Dark/light mode with system preference detection and animated transitions' },
      { type: 'feature', text: 'Contact form with Resend email delivery and real validation' },
    ],
  },
  {
    version: '1.3.2',
    date: 'Nov 2025',
    codename: 'Patchwork',
    summary: 'Mostly fixes. The kind of release you do at 11pm on a Tuesday.',
    changes: [
      { type: 'fix', text: 'Resume section scroll position no longer resets when switching tabs' },
      { type: 'fix', text: 'Project cards now show correct tech stacks (the Java one was lying)' },
      { type: 'perf', text: 'Reduced bundle size by 18KB by tree-shaking unused Lucide icons' },
      { type: 'fix', text: 'Mobile viewport no longer overflows on Safari 17' },
    ],
  },
  {
    version: '1.3.0',
    date: 'Oct 2025',
    codename: 'Velocity',
    summary: 'Performance pass. The site got fast. Like, actually fast.',
    changes: [
      { type: 'perf', text: 'Migrated to Next.js 15 with React Server Components for static sections' },
      { type: 'perf', text: 'Added route-level code splitting. First meaningful paint dropped by 40%' },
      { type: 'feature', text: 'Added dynamic OG image generation for social sharing' },
      { type: 'feature', text: 'Structured data (JSON-LD) for SEO and Google rich results' },
    ],
  },
  {
    version: '1.2.0',
    date: 'Aug 2025',
    codename: 'Reflection',
    summary: 'About Me got a proper redesign. Less wall of text, more human.',
    changes: [
      { type: 'feature', text: 'About Me redesigned with sidebar navigation and section-based layout' },
      { type: 'feature', text: 'What Excites Me section — actual opinions, not buzzwords' },
      { type: 'feature', text: 'Currently section with real-time status from Notion' },
      { type: 'refactor', text: 'Projects section rebuilt with filterable grid and modal details' },
    ],
  },
  {
    version: '1.0.0',
    date: 'Jun 2025',
    codename: 'Launch',
    summary: 'It\'s alive. First public release. Definitely no bugs.',
    changes: [
      { type: 'release', text: 'Initial public release of devanshuchicholikar.me' },
      { type: 'feature', text: 'Static portfolio with About, Projects, Skills, and Contact sections' },
      { type: 'feature', text: 'Responsive layout with Tailwind CSS' },
      { type: 'feature', text: 'GitHub Actions CI/CD pipeline to Vercel' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<ChangeType, { icon: React.ElementType; label: string; color: string }> = {
  feature:  { icon: Sparkles, label: 'New',      color: '#6366f1' },
  fix:      { icon: Bug,      label: 'Fix',      color: '#f59e0b' },
  perf:     { icon: Zap,      label: 'Perf',     color: '#10b981' },
  refactor: { icon: Wrench,   label: 'Refactor', color: '#06b6d4' },
  release:  { icon: Package,  label: 'Release',  color: '#ec4899' },
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function ChangelogApp() {
  const [expanded, setExpanded] = useState<string>(RELEASES[0].version);

  return (
    <div className="h-full flex flex-col bg-surface/20 overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5 glass-subtle border-b border-white/10">
        <h1 className="text-xl font-bold text-text">Changelog</h1>
        <p className="text-text-secondary text-xs mt-0.5">
          {RELEASES.length} releases · devOS is always shipping
        </p>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-0">
          {RELEASES.map((release, idx) => {
            const isExpanded = expanded === release.version;
            const isLatest = idx === 0;

            return (
              <div key={release.version} className="relative flex gap-4">
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <motion.div
                    className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0 z-10"
                    style={{
                      background: isLatest ? 'var(--color-accent)' : isExpanded ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
                      boxShadow: isLatest ? '0 0 10px var(--color-accent)' : 'none',
                    }}
                    animate={isLatest ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  />
                  {idx < RELEASES.length - 1 && (
                    <div className="w-px flex-1 bg-white/10 mt-2 mb-0 min-h-[40px]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  {/* Version header */}
                  <button
                    onClick={() => setExpanded(isExpanded ? '' : release.version)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold font-mono text-sm ${isLatest ? 'text-accent' : 'text-text'}`}>
                          v{release.version}
                        </span>
                        {isLatest && (
                          <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-medium">
                            Latest
                          </span>
                        )}
                        {release.highlight && !isLatest && (
                          <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-text-secondary text-xs">
                            Major
                          </span>
                        )}
                      </div>
                      <span className="text-text-secondary text-xs italic">"{release.codename}"</span>
                      <span className="text-text-secondary text-xs ml-auto">{release.date}</span>
                    </div>
                    <p className={`text-sm leading-relaxed transition-colors ${
                      isExpanded ? 'text-text' : 'text-text-secondary group-hover:text-text'
                    }`}>
                      {release.summary}
                    </p>
                  </button>

                  {/* Expandable change list */}
                  <motion.div
                    initial={false}
                    animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="mt-3 space-y-1.5">
                      {release.changes.map((change, i) => {
                        const cfg = TYPE_CONFIG[change.type];
                        const Icon = cfg.icon;
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-start gap-2.5 py-1.5 px-3 rounded-lg bg-white/4 hover:bg-white/6 transition-colors"
                          >
                            <span
                              className="flex items-center gap-1 text-xs font-medium flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded"
                              style={{ background: `${cfg.color}15`, color: cfg.color }}
                            >
                              <Icon size={10} />
                              {cfg.label}
                            </span>
                            <span className="text-xs text-text-secondary leading-relaxed">{change.text}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
