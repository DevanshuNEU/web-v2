'use client';

/**
 * HelpApp - "Help / Welcome to devOS"
 *
 * Two modes share one editorial register:
 *
 *   • Tour - a typeset, step-by-step walkthrough. Serif step titles, a mono
 *     "STEP 02 / 06" counter, hairline dividers, and quiet text-link controls
 *     (Back / Skip / Next). Each step reveals once on mount; advancing remounts
 *     the step (keyed by index) so the stagger replays without any scroll trigger.
 *
 *   • Reference - a numbered editorial document. Desktop pins a numbered index
 *     rail (click to jump); mobile drops the rail for a single scroll. The apps
 *     glossary is a hairline-divided two-column list; shortcuts are a clean
 *     mono key table with hairline rules.
 *
 * Tour-seen state persists in localStorage; first-ever open defaults to the
 * tour, and it is always skippable.
 *
 * Strictly monochrome: three-tone discipline (text / text-secondary / border).
 * No medallions, gradients, colored pills, or pulses. Reveals are mount-based
 * and collapse to instant under reduced motion via the shared `reveal` tokens.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  EditorialSection,
  MetaLabel,
  Hairline,
} from '@/components/editorial';
import { reveal } from '@/lib/motion';
import { appRegistry, getAppLabel } from '@/lib/appRegistry';
import type { AppType } from '../../../../shared/types';

type Mode = 'reference' | 'tour';

const TOUR_SEEN_KEY = 'devos.helpTourSeen';

// ---------------------------------------------------------------------------
// Tour steps - small mono glyph (single character), serif title, plain body.
// No icon medallions; the glyph is a quiet typographic marker only.
// ---------------------------------------------------------------------------

export interface TourStep {
  glyph: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    glyph: '✳',
    title: 'Welcome to devOS',
    body: "This isn't a regular portfolio. It's a desktop OS / windows, a dock, a launchpad, even a terminal. Everything is interactive. Spend two minutes here and you'll know your way around.",
  },
  {
    glyph: '▭',
    title: 'The dock at the bottom',
    body: 'Those icons along the bottom edge are your starting points. Hover for a peek, click to open. About Me, Projects, Activity, Terminal, Resume, Contact, and this Help app are all pinned there.',
  },
  {
    glyph: '⊞',
    title: 'Launchpad has everything',
    body: 'Click the grid icon (leftmost in the dock) to see every app / including ones not pinned, like Skill Tree, Analytics, Finder, Changelog, and Arcade. The search bar at the top filters as you type.',
  },
  {
    glyph: '◰',
    title: 'Windows behave like macOS',
    body: 'Drag a window by its title bar. The three buttons on the top-left close, minimize, and maximize. Multiple apps can stay open at once / click any window to bring it forward.',
  },
  {
    glyph: '▢',
    title: 'On a phone? It morphs',
    body: 'Open this on a mobile browser and the whole desktop becomes a pocket OS / a home screen with rounded app tiles, a status bar, and an iOS-style dock. Same content, designed for thumbs.',
  },
  {
    glyph: '◆',
    title: "You're set",
    body: 'Close this whenever you are ready. The Help app is always in the dock if you want to come back. Now go open About Me / start there.',
  },
];

// ---------------------------------------------------------------------------
// Apps glossary - curated set surfaced in the reference.
// ---------------------------------------------------------------------------

export const APPS_IN_HELP: AppType[] = [
  'about-me',
  'projects',
  'github-activity',
  'skills-dashboard',
  'analytics',
  'contact',
  'terminal',
  'resume',
  'file-explorer',
  'changelog',
  'games',
  'display-options',
];

// ---------------------------------------------------------------------------
// Shortcut / gesture rows.
// ---------------------------------------------------------------------------

export const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ['Click dock icon'], description: 'Open an app' },
  { keys: ['Drag title bar'], description: 'Move a window' },
  { keys: ['Red dot'], description: 'Close window' },
  { keys: ['Yellow dot'], description: 'Minimize to dock' },
  { keys: ['Green dot'], description: 'Maximize / restore' },
  { keys: ['Click launchpad'], description: 'See every app' },
  { keys: ['Type in launchpad'], description: 'Filter apps by name' },
  { keys: ['Esc'], description: 'Close the Launchpad' },
];

// ---------------------------------------------------------------------------
// Reference sections - single source for both the rail and the document.
// ---------------------------------------------------------------------------

type SectionId = 'overview' | 'apps' | 'shortcuts' | 'mobile' | 'credits';

const SECTIONS = [
  { id: 'overview',  number: '01', label: 'Overview'   },
  { id: 'apps',      number: '02', label: 'Apps'       },
  { id: 'shortcuts', number: '03', label: 'Shortcuts'  },
  { id: 'mobile',    number: '04', label: 'On a Phone' },
  { id: 'credits',   number: '05', label: 'Credits'    },
] as const;

const SECTION_DOM_ID = (id: SectionId) => `help-section-${id}`;

// ===========================================================================
// Tour view
// ===========================================================================

function TourView({ onExit }: { onExit: () => void }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const current = TOUR_STEPS[step];
  const total = TOUR_STEPS.length;
  const isLast = step === total - 1;

  const next = () => {
    if (isLast) {
      try { localStorage.setItem(TOUR_SEEN_KEY, '1'); } catch { /* storage unavailable */ }
      onExit();
    } else {
      setStep((s) => s + 1);
    }
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const counter = `Step ${String(step + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

  return (
    <div className="h-full flex flex-col bg-bg text-text">
      {/* Header rail: mono kicker + quiet Skip link. */}
      <div className="flex items-center justify-between px-6 py-4 sm:px-10 shrink-0">
        <MetaLabel as="p">Tour</MetaLabel>
        <button
          type="button"
          onClick={onExit}
          className="font-mono-meta text-text-secondary hover:text-text transition-colors focus-visible:outline-none focus-visible:text-text"
        >
          Skip
        </button>
      </div>
      <Hairline />

      {/* Step body. Keyed by step so each step remounts and the stagger replays
          on advance/back - never a scroll-triggered reveal. */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex h-full max-w-xl flex-col justify-center px-6 py-10 sm:px-10">
          <motion.div
            key={step}
            variants={reveal.container(reduced)}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-6"
          >
            <motion.div variants={reveal.item(reduced)}>
              <MetaLabel as="p">{counter}</MetaLabel>
            </motion.div>

            <motion.div
              variants={reveal.item(reduced)}
              className="flex items-start gap-4"
            >
              <span
                aria-hidden
                className="font-display text-text/70 text-[2rem] leading-none select-none"
              >
                {current.glyph}
              </span>
              <h2 className="editorial-head text-text">{current.title}</h2>
            </motion.div>

            <motion.div variants={reveal.item(reduced)}>
              <Hairline />
            </motion.div>

            <motion.p
              variants={reveal.item(reduced)}
              className="max-w-[60ch] text-lg leading-relaxed text-text-secondary"
            >
              {current.body}
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Footer: progress count + quiet Back / Next text links. */}
      <Hairline />
      <div className="flex items-center justify-between px-6 py-4 sm:px-10 shrink-0">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="font-mono-meta text-text-secondary transition-colors hover:text-text disabled:opacity-30 disabled:hover:text-text-secondary focus-visible:outline-none focus-visible:text-text"
        >
          Back
        </button>

        {/* Hairline step ticks - monochrome, current filled, rest hairline. */}
        <div className="flex items-center gap-1.5" aria-hidden>
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-px w-5 transition-colors ${i === step ? 'bg-text' : 'bg-border'}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          className="font-mono-meta text-text transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:opacity-70"
        >
          {isLast ? 'Done' : 'Next'}
        </button>
      </div>
    </div>
  );
}

// ===========================================================================
// Reference section bodies
// ===========================================================================

function OverviewBody({ onStartTour }: { onStartTour: () => void }) {
  return (
    <div className="flex max-w-[68ch] flex-col gap-6">
      <p className="text-lg leading-relaxed text-text-secondary">
        This portfolio is built as a desktop OS / windows, a dock, a launchpad,
        and a set of apps you can click around in. Everything worth knowing
        lives inside one of those apps.
      </p>
      <p className="leading-relaxed text-text-secondary">
        Start with <span className="text-text">About Me</span> for the story,
        then <span className="text-text">Projects</span> for the things I
        shipped. The rest is bonus.
      </p>
      <button
        type="button"
        onClick={onStartTour}
        className="w-fit font-mono-meta text-text transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:opacity-70"
      >
        Take the {TOUR_STEPS.length}-step tour &rarr;
      </button>
    </div>
  );
}

function AppsBody() {
  return (
    <div className="flex flex-col">
      <p className="mb-6 max-w-[68ch] leading-relaxed text-text-secondary">
        Every app and what it is for. Click an icon in the dock or launchpad to
        open one.
      </p>
      <Hairline />
      {APPS_IN_HELP.map((appType) => {
        const reg = appRegistry[appType];
        if (!reg) return null;
        const label = getAppLabel(appType);
        return (
          <React.Fragment key={appType}>
            <div className="flex items-baseline gap-4 py-3.5">
              <span className="min-w-0 flex-1 font-display text-text text-[1.0625rem] leading-snug">
                {label.title}
              </span>
              <span className="flex-1 text-sm leading-snug text-text-secondary">
                {label.description}
              </span>
            </div>
            <Hairline />
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ShortcutsBody() {
  return (
    <div className="flex max-w-[60ch] flex-col">
      <p className="mb-6 leading-relaxed text-text-secondary">
        Mostly clicks. A couple of gestures behave just like macOS.
      </p>
      <Hairline />
      {SHORTCUTS.map((row) => (
        <React.Fragment key={row.description}>
          <div className="flex items-center justify-between gap-4 py-3">
            <span className="flex flex-wrap items-center gap-1.5">
              {row.keys.map((k) => (
                <kbd
                  key={k}
                  className="border border-border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-text-secondary"
                >
                  {k}
                </kbd>
              ))}
            </span>
            <span className="text-sm text-text-secondary">{row.description}</span>
          </div>
          <Hairline />
        </React.Fragment>
      ))}
    </div>
  );
}

function MobileBody() {
  return (
    <div className="flex max-w-[68ch] flex-col gap-4">
      <p className="leading-relaxed text-text-secondary">
        The whole desktop morphs into a pocket OS. A home screen of rounded app
        tiles, a status bar at the top, an iOS-style dock at the bottom. Tap an
        app, swipe to go back, or pull down to dismiss.
      </p>
      <p className="leading-relaxed text-text-secondary">
        Every app has a mobile layout designed for the smaller screen / same
        content, just sized for thumbs. Try it on your phone, or shrink this
        window below 768px to see the switch live.
      </p>
    </div>
  );
}

function CreditsBody() {
  return (
    <div className="flex max-w-[68ch] flex-col gap-4">
      <p className="leading-relaxed text-text-secondary">
        Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion, and
        Zustand. Icons from Lucide and Phosphor. Deployed on Vercel.
      </p>
      <p className="leading-relaxed text-text-secondary">
        Made by Devanshu Chicholikar in Boston. The source is on{' '}
        <a
          href="https://github.com/DevanshuNEU"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text underline decoration-border underline-offset-4 transition-colors hover:decoration-text"
        >
          GitHub
        </a>{' '}
        / fork it, break it, learn from it.
      </p>
      <p className="border-l border-border pl-4 leading-relaxed text-text-secondary italic">
        &ldquo;I made a portfolio that runs an OS so I could justify spending six
        months on a portfolio.&rdquo;
      </p>
    </div>
  );
}

function SectionBody({
  id,
  onStartTour,
}: {
  id: SectionId;
  onStartTour: () => void;
}) {
  switch (id) {
    case 'overview':  return <OverviewBody onStartTour={onStartTour} />;
    case 'apps':      return <AppsBody />;
    case 'shortcuts': return <ShortcutsBody />;
    case 'mobile':    return <MobileBody />;
    case 'credits':   return <CreditsBody />;
  }
}

// ===========================================================================
// Reference view - desktop (index rail) + mobile (single scroll)
// ===========================================================================

function ReferenceView({
  variant,
  onStartTour,
}: {
  variant: 'desktop' | 'mobile';
  onStartTour: () => void;
}) {
  const reduced = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback(
    (id: SectionId) => {
      const root = scrollRef.current;
      if (!root) return;
      const target = root.querySelector<HTMLElement>(`#${SECTION_DOM_ID(id)}`);
      if (!target) return;
      root.scrollTo({ top: target.offsetTop - 24, behavior: reduced ? 'auto' : 'smooth' });
    },
    [reduced],
  );

  const document = (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div
        className="mx-auto flex max-w-3xl flex-col gap-16 px-6 py-10 sm:px-10 sm:py-12"
        style={
          variant === 'mobile'
            ? { paddingLeft: 'var(--sp-hero-pad)', paddingRight: 'var(--sp-hero-pad)' }
            : undefined
        }
      >
        {/* Masthead - serif lede + quiet tour entry. */}
        <motion.div
          variants={reveal.container(reduced)}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3"
        >
          <motion.div variants={reveal.item(reduced)}>
            <MetaLabel as="p">Help / Welcome to devOS</MetaLabel>
          </motion.div>
          <motion.h1
            variants={reveal.item(reduced)}
            className="editorial-hero font-display text-text"
          >
            New here?
          </motion.h1>
          <motion.p
            variants={reveal.item(reduced)}
            className="max-w-[60ch] text-lg leading-relaxed text-text-secondary"
          >
            Two minutes and you will know what every icon does.
          </motion.p>
        </motion.div>

        {/* Sections reveal once on mount with a stagger (never on scroll): a
            windowed inner scroll container makes scroll-triggered reveals
            unreliable, so content must never depend on an in-view trigger. */}
        <motion.div
          className="flex flex-col gap-16"
          variants={reveal.container(reduced)}
          initial="hidden"
          animate="show"
        >
          {SECTIONS.map(({ id, number, label }) => (
            <motion.div
              key={id}
              id={SECTION_DOM_ID(id)}
              variants={reveal.item(reduced)}
            >
              <EditorialSection number={number} eyebrow={label} title={label}>
                <SectionBody id={id} onStartTour={onStartTour} />
              </EditorialSection>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );

  if (variant === 'mobile') {
    return <div className="h-full overflow-hidden bg-bg text-text flex flex-col">{document}</div>;
  }

  return (
    <div className="flex h-full overflow-hidden bg-bg text-text">
      {/* Index rail - mono numbered rows, click to jump. */}
      <nav
        aria-label="Help sections"
        className="hidden w-44 shrink-0 flex-col border-r border-border overflow-y-auto md:flex"
      >
        <div className="px-4 py-5">
          <MetaLabel as="p">Help</MetaLabel>
        </div>
        <Hairline />
        <div className="flex flex-col py-2">
          {SECTIONS.map(({ id, number, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollTo(id)}
              data-testid="index-row"
              className="group flex w-full items-center gap-3 px-4 py-2 text-left focus-visible:outline-none"
            >
              <span className="font-mono-meta shrink-0 opacity-50 transition-opacity group-hover:opacity-80">
                {number}
              </span>
              <span className="font-display min-w-0 flex-1 truncate text-text-secondary transition-colors group-hover:text-text">
                {label}
              </span>
            </button>
          ))}
        </div>
        <Hairline />
        <div className="px-4 py-4">
          <button
            type="button"
            onClick={onStartTour}
            className="font-mono-meta text-text transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:opacity-70"
          >
            Take the tour &rarr;
          </button>
        </div>
      </nav>

      {document}
    </div>
  );
}

// ===========================================================================
// Root
// ===========================================================================

interface HelpAppProps {
  variant?: 'desktop' | 'mobile';
}

export default function HelpApp({ variant = 'desktop' }: HelpAppProps) {
  const [mode, setMode] = useState<Mode>('reference');

  // First-ever open defaults to the tour.
  useEffect(() => {
    try {
      const seen = localStorage.getItem(TOUR_SEEN_KEY);
      if (!seen) setMode('tour');
    } catch {
      // localStorage unavailable - stay on reference.
    }
  }, []);

  return (
    <div className="h-full">
      {mode === 'tour' ? (
        <TourView onExit={() => setMode('reference')} />
      ) : (
        <ReferenceView variant={variant} onStartTour={() => setMode('tour')} />
      )}
    </div>
  );
}
