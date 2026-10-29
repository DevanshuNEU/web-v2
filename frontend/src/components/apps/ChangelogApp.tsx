'use client';

/**
 * ChangelogApp - devOS release history, newest first.
 *
 * Each release is a disclosure (WAI accordion pattern): an h2 holding a
 * button with the codename, version, date and change count, and a chevron
 * that turns when open. The summary sits under the button, so the button's
 * accessible name stays short. Open, the changes are grouped under one small
 * sub-head per kind ("New", "Fixed", "Faster") instead of a label per row.
 *
 * Layout keys off the window through the `.dapp` query container; desktop and
 * phone share one tree. The latest release is open by default. The list
 * reveals once on mount, and the open/close height tween is instant under
 * reduced motion. Monochrome: text and secondary text only.
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Hairline } from '@/components/editorial';
import { reveal, withReduced } from '@/lib/motion';
import {
  RELEASES,
  CHANGE_TYPES,
  type ChangeType,
  type Release,
} from '@/data/changelog';

/** Sub-head per kind of change, in the order they are listed. */
const GROUP_LABEL: Record<ChangeType, string> = {
  release: 'Release',
  feature: 'New',
  fix: 'Fixed',
  perf: 'Faster',
  refactor: 'Under the hood',
};

function isMajor(version: string): boolean {
  return /^\d+\.0\.0$/.test(version);
}

// ---------------------------------------------------------------------------
// Release entry
// ---------------------------------------------------------------------------

function ReleaseEntry({
  release,
  isLatest,
  expanded,
  onToggle,
  reduced,
}: {
  release: Release;
  isLatest: boolean;
  expanded: boolean;
  onToggle: () => void;
  reduced: boolean | null;
}) {
  const panelId = `changelog-changes-${release.version}`;
  const buttonId = `changelog-button-${release.version}`;
  const groups = CHANGE_TYPES.map((type) => ({
    type,
    items: release.changes.filter((c) => c.type === type),
  })).filter((g) => g.items.length > 0);
  const count = release.changes.length;

  return (
    <div className="flex flex-col">
      <h2 className="m-0">
        <button
          id={buttonId}
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          data-testid="release-row"
          className="dapp-row group flex w-full items-start gap-4 px-1 pt-5 pb-2 text-left"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="font-display text-text text-[clamp(1.375rem,3.5cqi,1.75rem)] leading-tight">
              {release.codename}
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
              <span className="font-[family-name:var(--font-geist-mono)] text-text">v{release.version}</span>
              <span>{release.date}</span>
              <span>
                {count} {count === 1 ? 'change' : 'changes'}
              </span>
              {isLatest && (
                <span className="rounded-full border border-border px-2 py-px text-xs text-text">Latest</span>
              )}
              {!isLatest && isMajor(release.version) && (
                <span className="rounded-full border border-border px-2 py-px text-xs">Major</span>
              )}
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden
            className={`mt-2 shrink-0 text-text-secondary transition-transform duration-200 motion-reduce:transition-none ${
              expanded ? 'rotate-180' : ''
            } [@media(hover:hover)and(pointer:fine)]:group-hover:text-text`}
          />
        </button>
      </h2>

      <p className="px-1 pb-5 max-w-[62ch] text-[0.9375rem] leading-relaxed text-text-secondary">
        {release.summary}
      </p>

      <motion.div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        initial={false}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        transition={withReduced(
          {
            height: { duration: 0.24, ease: [0.23, 1, 0.32, 1] },
            opacity: { duration: expanded ? 0.2 : 0.12, ease: [0.23, 1, 0.32, 1] },
          },
          reduced,
        )}
        style={{ overflow: 'hidden' }}
        // Collapsed content must not take focus or be read.
        inert={!expanded}
      >
        <div className="flex flex-col gap-5 px-1 pb-6">
          {groups.map((g) => (
            <div key={g.type} className="flex flex-col gap-1.5">
              <h3 className="text-sm font-medium text-text">{GROUP_LABEL[g.type]}</h3>
              <ul className="flex flex-col">
                {g.items.map((change, i) => (
                  <li
                    key={i}
                    className="relative py-1.5 pl-4 text-[0.9375rem] leading-relaxed text-text-secondary
                               before:absolute before:left-0 before:top-[1.05em] before:h-1 before:w-1
                               before:rounded-full before:bg-text-secondary before:content-['']"
                  >
                    {change.text}
                  </li>
                ))}
              </ul>
            </div>
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

export default function ChangelogApp({ variant = 'desktop' }: ChangelogAppProps = {}) {
  const { trackSectionView } = useAnalytics();
  const reduced = useReducedMotion();
  // Latest release open by default.
  const [expanded, setExpanded] = useState<string>(RELEASES[0].version);
  const first = RELEASES[RELEASES.length - 1];

  const handleToggle = (version: string) => {
    const next = expanded === version ? '' : version;
    setExpanded(next);
    if (next) trackSectionView(`Changelog: v${version}`, 'changelog');
  };

  return (
    <div className="dapp h-full overflow-y-auto bg-transparent" data-variant={variant}>
      <motion.div
        variants={reveal.container(reduced)}
        initial="hidden"
        animate="show"
        className="dapp-col dapp-col--read flex flex-col gap-8"
      >
        <motion.header variants={reveal.item(reduced)} className="flex flex-col gap-3">
          <h1 className="dapp-title">Changelog</h1>
          <p className="dapp-lede">
            {RELEASES.length} releases since {first.date}. Latest: v{RELEASES[0].version},{' '}
            {RELEASES[0].date}.
          </p>
        </motion.header>

        <div className="flex flex-col">
          <Hairline />
          {RELEASES.map((release, idx) => (
            <motion.div key={release.version} variants={reveal.item(reduced)}>
              <ReleaseEntry
                release={release}
                isLatest={idx === 0}
                expanded={expanded === release.version}
                onToggle={() => handleToggle(release.version)}
                reduced={reduced}
              />
              <Hairline />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
