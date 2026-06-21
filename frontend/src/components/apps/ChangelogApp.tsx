'use client';

/**
 * ChangelogApp - devOS version history as a numbered editorial release index.
 *
 * Releases render as a hairline-ruled, newest-first timeline: each entry pairs
 * a mono metadata line ("v2.2.0 / May 2026 / POCKET") with a serif codename
 * title and a one-line summary. Clicking a release toggles its change list,
 * which renders as hairline-divided rows tagged with a small uppercase mono
 * type label (FEATURE / FIX / PERF / REFACTOR / RELEASE) instead of colored
 * icon chips. The latest release carries a restrained mono "LATEST" tag, not a
 * pulsing colored dot.
 *
 * Motion: the release list reveals once on mount via a staggered container
 * (never on scroll - this app lives in a windowed inner scroll container where
 * scroll-triggered reveals do not fire reliably). The expand/collapse of a
 * change list is a local height animation, collapsed to instant under reduced
 * motion. Desktop and mobile share the same data and the same editorial shape.
 *
 * Strictly monochrome: three tones only (text / text-secondary / bg+border).
 * No glass, no accent, no gradient, no colored type labels.
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { Hairline, MetaLabel } from '@/components/editorial';
import { reveal, withReduced } from '@/lib/motion';
import {
  RELEASES,
  CHANGE_TYPE_LABEL,
  type Release,
} from '@/data/changelog';

// ---------------------------------------------------------------------------
// Change row - hairline-divided line with a fixed-width uppercase mono type
// label and the change text. No icon, no color.
// ---------------------------------------------------------------------------

function ChangeRow({
  type,
  text,
  first,
}: {
  type: Release['changes'][number]['type'];
  text: string;
  first: boolean;
}) {
  return (
    <>
      {!first && <Hairline />}
      <div className="flex items-baseline gap-4 py-2.5">
        <MetaLabel className="shrink-0 w-20 justify-start opacity-70">
          {CHANGE_TYPE_LABEL[type]}
        </MetaLabel>
        <span className="flex-1 min-w-0 text-sm text-text-secondary leading-relaxed">
          {text}
        </span>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Release entry - the numbered editorial index row + collapsible change list.
//
// The header is a single full-width button: a mono spec line (version / date /
// CODENAME) with an optional "LATEST" tag, a serif codename title, and the
// summary. Below it, the change list expands/collapses with a height tween
// (instant under reduced motion). A trailing hairline rules between releases.
// ---------------------------------------------------------------------------

function ReleaseEntry({
  release,
  number,
  isLatest,
  expanded,
  onToggle,
  reduced,
}: {
  release: Release;
  number: string;
  isLatest: boolean;
  expanded: boolean;
  onToggle: () => void;
  reduced: boolean | null;
}) {
  const panelId = `changelog-changes-${release.version}`;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        data-testid="release-row"
        className="group w-full text-left flex flex-col gap-2 py-5
                   focus-visible:outline-none"
      >
        {/* Mono spec line: NN / vX.Y.Z / DATE / CODENAME, with tags. */}
        <span className="flex flex-wrap items-center gap-x-1 gap-y-1">
          <MetaLabel className="opacity-50">{number}</MetaLabel>
          <span aria-hidden className="font-mono-meta opacity-50">&middot;</span>
          <MetaLabel>v{release.version}</MetaLabel>
          <span aria-hidden className="font-mono-meta opacity-50">&middot;</span>
          <MetaLabel className="opacity-70">{release.date}</MetaLabel>
          <span aria-hidden className="font-mono-meta opacity-50">&middot;</span>
          <MetaLabel className="opacity-70">{release.codename}</MetaLabel>

          {isLatest && (
            <MetaLabel className="ml-1 border border-border px-1.5 py-0.5">
              Latest
            </MetaLabel>
          )}
          {release.highlight && !isLatest && (
            <MetaLabel className="ml-1 border border-border px-1.5 py-0.5 opacity-70">
              Major
            </MetaLabel>
          )}
        </span>

        {/* Serif codename title. */}
        <span className="editorial-head text-text text-[clamp(1.5rem,5cqi,2.25rem)] leading-tight">
          {release.codename}
        </span>

        {/* Summary. */}
        <span
          className={`text-sm leading-relaxed transition-colors
                      ${expanded ? 'text-text' : 'text-text-secondary group-hover:text-text'}`}
        >
          {release.summary}
        </span>
      </button>

      {/* Collapsible change list - height tween, instant under reduced motion. */}
      <motion.div
        id={panelId}
        initial={false}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        transition={withReduced({ duration: 0.25, ease: [0.4, 0, 0.2, 1] }, reduced)}
        style={{ overflow: 'hidden' }}
      >
        <div className="pb-5">
          {release.changes.map((change, i) => (
            <ChangeRow
              key={i}
              type={change.type}
              text={change.text}
              first={i === 0}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------

interface ChangelogAppProps {
  variant?: 'desktop' | 'mobile';
}

export default function ChangelogApp({ variant = 'desktop' }: ChangelogAppProps) {
  const trackEvent = useAnalyticsStore((state) => state.trackEvent);
  const reduced = useReducedMotion();
  // Latest release expanded by default.
  const [expanded, setExpanded] = useState<string>(RELEASES[0].version);

  const handleToggle = (version: string) => {
    const next = expanded === version ? '' : version;
    setExpanded(next);
    if (next) {
      trackEvent('section_view', `Changelog: v${version}`, { version });
    }
  };

  const header = (
    <motion.div
      variants={reveal.container(reduced)}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-2"
    >
      <motion.div variants={reveal.item(reduced)}>
        <MetaLabel as="p">Changelog</MetaLabel>
      </motion.div>
      <motion.h1
        variants={reveal.item(reduced)}
        className="editorial-head text-text"
      >
        Release History
      </motion.h1>
      <motion.div variants={reveal.item(reduced)}>
        <MetaLabel as="p" className="opacity-70">
          {RELEASES.length} releases &middot; always shipping
        </MetaLabel>
      </motion.div>
    </motion.div>
  );

  // Numbered release index. Reveals once on mount with a stagger (never on
  // scroll); shared verbatim by the desktop and mobile layouts below.
  const index = (
    <motion.div
      className="flex flex-col"
      variants={reveal.container(reduced)}
      initial="hidden"
      animate="show"
    >
      <Hairline />
      {RELEASES.map((release, idx) => {
        const isLatest = idx === 0;
        const number = String(idx + 1).padStart(2, '0');
        return (
          <motion.div key={release.version} variants={reveal.item(reduced)}>
            <ReleaseEntry
              release={release}
              number={number}
              isLatest={isLatest}
              expanded={expanded === release.version}
              onToggle={() => handleToggle(release.version)}
              reduced={reduced}
            />
            <Hairline />
          </motion.div>
        );
      })}
    </motion.div>
  );

  if (variant === 'mobile') {
    return (
      <div className="h-full overflow-y-auto bg-bg">
        <div
          className="flex flex-col gap-8 pb-12 pt-8"
          style={{ paddingLeft: 'var(--sp-hero-pad)', paddingRight: 'var(--sp-hero-pad)' }}
        >
          {header}
          {index}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-10 sm:py-12 flex flex-col gap-12">
        {header}
        {index}
      </div>
    </div>
  );
}
