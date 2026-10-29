'use client';

/**
 * HelpApp - "New here?"
 *
 * Two modes share one editorial register:
 *
 *   • Walkthrough - a step-by-step intro. Serif step titles, a "Step 2 of 6"
 *     counter, hairline dividers, a bordered Next and quiet Back / Skip links.
 *     Skip and Done both mark it seen, Esc leaves it (without closing the
 *     window), ArrowLeft / ArrowRight step through, and each step change moves
 *     focus to the step heading so screen readers hear it.
 *
 *   • Reference - one scrolling document. When the window is at least 640px
 *     wide a sticky index rail sits beside it and marks the section in view
 *     (aria-current); narrower windows (and the phone) get a row of section
 *     links above the document instead. Every switch keys off the app's own
 *     query container (`.help-app`, see the C block in globals.css).
 *
 * The walkthrough is a different thing from the Option+T "Quick tour"
 * (lib/recruiterTour.ts), which opens About Me, Projects and Resume.
 *
 * Every claim about the UI here is checked against the code: the dock, the
 * desktop icons, app names (data/copy.ts via getAppLabel), the Option+digit
 * map, and the mobile switch (DesktopHome: browser viewport below 768px).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EditorialSection, MetaLabel, Hairline } from '@/components/editorial';
import { reveal } from '@/lib/motion';
import { appRegistry, getAppLabel } from '@/lib/appRegistry';
import { getDockApps } from '@/lib/mobileAppRegistry';
import type { AppType } from '../../../../shared/types';

type Mode = 'reference' | 'tour';

export const TOUR_SEEN_KEY = 'devos.helpTourSeen';

const markTourSeen = () => {
  try { localStorage.setItem(TOUR_SEEN_KEY, '1'); } catch { /* storage unavailable */ }
};

/** "A, B, C and D" */
const listJoin = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

// ---------------------------------------------------------------------------
// Walkthrough steps.
// ---------------------------------------------------------------------------

export interface TourStep {
  title: string;
  body: string;
  chips?: string[];
}

const label = (t: AppType) => getAppLabel(t).title;

export const TOUR_STEPS_DESKTOP: TourStep[] = [
  {
    title: 'Welcome to devOS',
    body: "This isn't a regular portfolio. It's an interactive OS: windows, a dock, a launchpad, even a terminal. Two minutes here and you'll know your way around.",
  },
  {
    title: 'Command palette',
    body: 'Press ⌘K (or /) from anywhere to jump to any app, project or skill, or to ask my AI a question.',
    chips: ['⌘ K'],
  },
  {
    title: 'Right-click the desktop',
    body: 'Quick actions: search, open apps, jump to the terminal, change the theme, reload.',
    chips: ['right-click'],
  },
  {
    title: 'The dock and windows',
    body: 'The dock at the bottom holds the main apps. Drag a window by its title bar, and drag any edge or corner to resize it. The three dots at top left close, minimize and maximize it. The grid icon opens the launchpad: every app, with search.',
    chips: ['launchpad'],
  },
  {
    title: 'Ask and make it yours',
    body: `The round chat button at the bottom right asks my AI. In ${label('display-options')}, switch the palette (Fun or Mono) or flip between light and dark.`,
  },
  {
    title: "You're set",
    body: `Help stays on the desktop (the life-ring icon, top left) and in the launchpad. Start with ${label('about-me')}.`,
  },
];

const mobileDockLabels = () => listJoin(getDockApps().map((a) => a.label));

export const TOUR_STEPS_MOBILE: TourStep[] = [
  {
    title: 'Welcome',
    body: `This portfolio works like a phone. The dock holds ${mobileDockLabels()}. Swipe left for more apps and search.`,
  },
  {
    title: 'Swipe to the App Library',
    body: 'Swipe between home pages. Past the last page is the App Library: every app in one grid, with search at the top.',
    chips: ['swipe ←'],
  },
  {
    title: 'Search or ask',
    body: 'The App Library search finds any app, project or skill, or asks my AI.',
    chips: ['search'],
  },
  {
    title: 'Open and close',
    body: 'Tap a tile to open it full screen. Pull down from the top, or tap Done, to close it.',
    chips: ['pull down'],
  },
  {
    title: 'DevAI and settings',
    body: 'Open DevAI to chat with my AI. In Settings, switch the palette (Fun or Mono) or flip between light and dark.',
  },
  {
    title: "You're set",
    body: 'Help lives in the App Library if you want to come back. Start with About Me.',
  },
];

// Back-compat alias for data tests / external consumers: the desktop set is
// the canonical walkthrough.
export const TOUR_STEPS = TOUR_STEPS_DESKTOP;

// ---------------------------------------------------------------------------
// Apps glossary.
// ---------------------------------------------------------------------------

export const APPS_IN_HELP: AppType[] = [
  'about-me',
  'projects',
  'resume',
  'contact',
  'github-activity',
  'skills-dashboard',
  'analytics',
  'browser',
  'terminal',
  'file-explorer',
  'changelog',
  'games',
  'display-options',
];

// ---------------------------------------------------------------------------
// Shortcut / gesture rows. `gesture` rows render as plain text, not keycaps.
// ---------------------------------------------------------------------------

type Shortcut = { keys: string[]; description: string; gesture?: boolean };

/** Option+1..4, mirrored from hooks/useKeyboardShortcuts.ts (APP_BY_DIGIT). */
export const OPTION_DIGIT_APPS: AppType[] = ['about-me', 'projects', 'skills-dashboard', 'contact'];

export const SHORTCUTS_DESKTOP: Shortcut[] = [
  { keys: ['⌘ K'], description: 'Open the command palette (or press /)' },
  { keys: ['right-click'], description: 'Open the desktop context menu', gesture: true },
  { keys: ['drag title bar'], description: 'Move a window', gesture: true },
  { keys: ['drag an edge'], description: 'Resize a window', gesture: true },
  { keys: ['window buttons'], description: 'Close, minimize or maximize (the dots at top left)', gesture: true },
  { keys: ['Esc'], description: 'Close the launchpad, the palette or the focused window' },
  { keys: ['⌥ T'], description: `Quick tour of ${label('about-me')}, ${label('projects')} and ${label('resume')}. Esc stops it` },
  { keys: ['⌥ 1-4'], description: `Open ${OPTION_DIGIT_APPS.map(label).join(', ')}` },
  { keys: ['⌥ W'], description: 'Close the focused window' },
  { keys: ['⌥ Tab'], description: 'Switch between open windows. Add Shift to go back' },
  { keys: ['⌃ `'], description: 'Switch windows on Windows and Linux, where the OS keeps Alt+Tab' },
];

/** Where the Option shortcuts fire (lib/shortcuts.ts allowsOptionShortcut). */
export const OPTION_SHORTCUT_NOTE =
  'The ⌥ shortcuts also work while you type in a one-line field, such as the Terminal prompt or a search box. In a multi-line field, such as the contact message or the chat box, ⌥ types its character instead.';

export const SHORTCUTS_MOBILE: Shortcut[] = [
  { keys: ['swipe ←'], description: 'Move between home pages and to the App Library', gesture: true },
  { keys: ['tap'], description: 'Open an app full screen', gesture: true },
  { keys: ['pull down'], description: 'Close the open app', gesture: true },
  { keys: ['search'], description: 'Find an app or ask my AI', gesture: true },
];

// Back-compat alias for data tests / external consumers.
export const SHORTCUTS = SHORTCUTS_DESKTOP;

// ---------------------------------------------------------------------------
// Reference sections - single source for both the rail and the document.
// ---------------------------------------------------------------------------

type SectionId = 'overview' | 'apps' | 'shortcuts' | 'mobile' | 'credits';

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'overview',  label: 'Overview'   },
  { id: 'apps',      label: 'Apps'       },
  { id: 'shortcuts', label: 'Shortcuts'  },
  { id: 'mobile',    label: 'On a phone' },
  { id: 'credits',   label: 'Credits'    },
];

const SECTION_DOM_ID = (id: SectionId) => `help-section-${id}`;

// ---------------------------------------------------------------------------
// KeyCap - a real key in the house kbd style. Never breaks inside the key.
// ---------------------------------------------------------------------------

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="shrink-0 whitespace-nowrap border border-border px-2 py-0.5 font-mono text-[0.8125rem] text-text">
      {children}
    </kbd>
  );
}

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function KeyOrGesture({ row }: { row: Shortcut }) {
  if (row.gesture) {
    return <span className="text-sm text-text">{sentence(row.keys.join(' '))}</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {row.keys.map((k, i) => (
        <KeyCap key={`${k}-${i}`}>{k}</KeyCap>
      ))}
    </span>
  );
}

// Text-link control used by Back / Skip: 44px tall so it is thumb-sized.
const TEXT_CTRL =
  'inline-flex min-h-[44px] items-center px-3 text-sm text-text-secondary transition-[color,transform] duration-150 ' +
  'ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-text active:scale-[0.97] motion-reduce:active:scale-100';

// Bordered primary control (Next / Done / Start the walkthrough).
const PRIMARY_CTRL =
  'inline-flex min-h-[44px] items-center gap-2 border border-text px-4 text-sm font-medium text-text ' +
  'transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ' +
  'hover:bg-text hover:text-bg active:scale-[0.97] motion-reduce:active:scale-100';

// ===========================================================================
// Walkthrough view
// ===========================================================================

function TourView({ steps, onExit }: { steps: TourStep[]; onExit: () => void }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const current = steps[step];
  const total = steps.length;
  const isLast = step === total - 1;

  // Skip, Done and Esc all end here, so the walkthrough never comes back
  // uninvited.
  const exitTour = useCallback(() => {
    markTourSeen();
    onExit();
  }, [onExit]);

  const next = () => (isLast ? exitTour() : setStep((s) => s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  // Focus the step heading on mount and on every step change: screen readers
  // announce the new step, and Esc / arrows land on this view.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      // Leave the walkthrough, not the window: stop the global Esc handler.
      e.preventDefault();
      e.stopPropagation();
      exitTour();
      return;
    }
    const t = e.target as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); back(); }
  };

  const counter = `Step ${step + 1} of ${total}`;

  return (
    <div
      role="region"
      aria-label={`Walkthrough, step ${step + 1} of ${total}`}
      onKeyDown={onKeyDown}
      className="help-tour h-full flex flex-col bg-bg text-text"
    >
      {/* Header: kicker + Skip. */}
      <div className="help-tour-bar flex items-center justify-between shrink-0">
        <MetaLabel as="p">Walkthrough</MetaLabel>
        <button type="button" onClick={exitTour} className={`${TEXT_CTRL} -mr-3`}>
          Skip
        </button>
      </div>
      <Hairline />

      {/* Step body. Keyed by step so each step remounts and the stagger replays
          on advance/back - never a scroll-triggered reveal. */}
      <div className="flex-1 overflow-y-auto">
        <div className="help-tour-body mx-auto flex min-h-full max-w-xl flex-col justify-center">
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

            <motion.h2
              ref={headingRef}
              tabIndex={-1}
              variants={reveal.item(reduced)}
              className="font-display text-[clamp(1.75rem,6cqi,3rem)] leading-tight text-text outline-none [text-wrap:balance]"
            >
              {current.title}
            </motion.h2>

            <motion.div variants={reveal.item(reduced)}>
              <Hairline />
            </motion.div>

            <motion.p
              variants={reveal.item(reduced)}
              className="max-w-[60ch] text-lg leading-relaxed text-text-secondary"
            >
              {current.body}
            </motion.p>

            {current.chips && current.chips.length > 0 && (
              <motion.div variants={reveal.item(reduced)} className="flex flex-wrap items-center gap-1.5">
                {current.chips.map((chip) => (
                  <KeyCap key={chip}>{chip}</KeyCap>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Footer: Back / progress ticks / Next. Back is hidden on step 1 (kept
          in the layout so Next never jumps). */}
      <Hairline />
      <div className="help-tour-bar flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={back}
          aria-hidden={step === 0 || undefined}
          tabIndex={step === 0 ? -1 : undefined}
          className={`${TEXT_CTRL} -ml-3 ${step === 0 ? 'invisible' : ''}`}
        >
          Back
        </button>

        {/* Hairline step ticks - monochrome, current filled, rest hairline. */}
        <div className="flex items-center gap-1.5" aria-hidden>
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-px w-4 transition-colors ${i === step ? 'bg-text' : 'bg-border'}`}
            />
          ))}
        </div>

        <button type="button" onClick={next} className={PRIMARY_CTRL}>
          {isLast ? 'Done' : 'Next'}
        </button>
      </div>
    </div>
  );
}

// ===========================================================================
// Reference section bodies
// ===========================================================================

function OverviewBody({
  variant,
  onStartTour,
  tourLength,
}: {
  variant: 'desktop' | 'mobile';
  onStartTour: () => void;
  tourLength: number;
}) {
  return (
    <div className="flex max-w-[68ch] flex-col gap-6">
      <p className="text-lg leading-relaxed text-text-secondary">
        {variant === 'mobile'
          ? 'This portfolio is built like a phone: a home screen, a dock, an App Library and a set of apps you can tap around in.'
          : 'This portfolio is built as a desktop OS: windows, a dock, a launchpad and a set of apps you can click around in.'}{' '}
        Everything worth knowing lives inside one of those apps.
      </p>
      <p className="leading-relaxed text-text-secondary">
        Start with <span className="text-text">{label('about-me')}</span> for the story,
        then <span className="text-text">{label('projects')}</span> for the things I
        shipped. The rest is optional.
      </p>
      <button type="button" onClick={onStartTour} className={`${PRIMARY_CTRL} w-fit`}>
        Start the walkthrough ({tourLength} steps)
      </button>
    </div>
  );
}

function AppsBody({ variant }: { variant: 'desktop' | 'mobile' }) {
  const apps: AppType[] = variant === 'mobile' ? [...APPS_IN_HELP, 'dev-ai'] : APPS_IN_HELP;
  return (
    <div className="flex flex-col">
      <p className="mb-6 max-w-[68ch] leading-relaxed text-text-secondary">
        {variant === 'mobile'
          ? 'Every app and what it is for. Tap a tile on the home screen, or find it in the App Library.'
          : 'Every app and what it is for. The dock holds the main ones; the launchpad (the grid icon in the dock) has them all.'}
      </p>
      <Hairline />
      <dl className="flex flex-col">
        {apps.map((appType) => {
          if (!appRegistry[appType]) return null;
          const l = getAppLabel(appType);
          return (
            <React.Fragment key={appType}>
              <div className="help-gloss-row py-3.5">
                <dt className="font-display text-[1.0625rem] leading-snug text-text">{l.title}</dt>
                <dd className="text-sm leading-snug text-text-secondary">{l.description}</dd>
              </div>
              <Hairline />
            </React.Fragment>
          );
        })}
        {variant === 'desktop' && (
          <>
            <div className="help-gloss-row py-3.5">
              <dt className="font-display text-[1.0625rem] leading-snug text-text">Chat with my AI</dt>
              <dd className="text-sm leading-snug text-text-secondary">
                The round chat button at the bottom right. It answers from my resume and project notes.
              </dd>
            </div>
            <Hairline />
          </>
        )}
      </dl>
    </div>
  );
}

function ShortcutsBody({ variant }: { variant: 'desktop' | 'mobile' }) {
  const rows = variant === 'mobile' ? SHORTCUTS_MOBILE : SHORTCUTS_DESKTOP;
  const intro =
    variant === 'mobile'
      ? 'Mostly taps and swipes. A few gestures behave like iOS.'
      : '⌘K and right-click do most of the work. Windows behave like macOS.';
  return (
    <div className="flex max-w-[60ch] flex-col">
      <p className="mb-6 leading-relaxed text-text-secondary">{intro}</p>
      <Hairline />
      <dl className="flex flex-col">
        {rows.map((row) => (
          <React.Fragment key={row.description}>
            <div className="help-key-row py-3">
              <dt><KeyOrGesture row={row} /></dt>
              <dd className="text-sm leading-snug text-text-secondary">{row.description}</dd>
            </div>
            <Hairline />
          </React.Fragment>
        ))}
      </dl>
      {variant === 'desktop' && (
        <p className="mt-4 text-sm leading-relaxed text-text-secondary">{OPTION_SHORTCUT_NOTE}</p>
      )}
    </div>
  );
}

function MobileBody() {
  return (
    <div className="flex max-w-[68ch] flex-col gap-4">
      <p className="leading-relaxed text-text-secondary">
        On a phone the desktop becomes a home screen of app tiles, with a status bar
        at the top and a dock at the bottom. Tap an app to open it full screen; pull
        down or tap Done to close it.
      </p>
      <p className="leading-relaxed text-text-secondary">
        Same content, sized for thumbs. Try it on your phone, or make your browser
        window narrower than 768px.
      </p>
    </div>
  );
}

function CreditsBody() {
  return (
    <div className="flex max-w-[68ch] flex-col gap-4">
      <p className="leading-relaxed text-text-secondary">
        Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion and
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
        </a>
        . Fork it, break it, learn from it.
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
  variant,
  tourLength,
  onStartTour,
}: {
  id: SectionId;
  variant: 'desktop' | 'mobile';
  tourLength: number;
  onStartTour: () => void;
}) {
  switch (id) {
    case 'overview':  return <OverviewBody variant={variant} onStartTour={onStartTour} tourLength={tourLength} />;
    case 'apps':      return <AppsBody variant={variant} />;
    case 'shortcuts': return <ShortcutsBody variant={variant} />;
    case 'mobile':    return <MobileBody />;
    case 'credits':   return <CreditsBody />;
  }
}

// ===========================================================================
// Reference view - one scroll root; a sticky rail in wide windows, a row of
// section links in narrow ones.
// ===========================================================================

function ReferenceView({
  variant,
  tourLength,
  onStartTour,
}: {
  variant: 'desktop' | 'mobile';
  tourLength: number;
  onStartTour: () => void;
}) {
  const reduced = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<SectionId>('overview');

  const scrollTo = useCallback(
    (id: SectionId) => {
      const root = scrollRef.current;
      if (!root) return;
      const target = root.querySelector<HTMLElement>(`#${SECTION_DOM_ID(id)}`);
      if (!target) return;
      const top = target.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 24;
      root.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
      setActive(id);
    },
    [reduced],
  );

  // Track the section in view: the last one whose top has crossed the upper
  // 40% of the scroll root.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<SectionId>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.section as SectionId;
          if (e.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        const first = SECTIONS.find((s) => visible.has(s.id));
        if (first) setActive(first.id);
      },
      { root, rootMargin: '0px 0px -60% 0px' },
    );
    root.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={scrollRef} className="help-app h-full overflow-y-auto bg-bg text-text">
      <div className="help-shell mx-auto w-full max-w-6xl">
        {/* Index rail (wide windows only): sticky, marks the section in view. */}
        <nav aria-label="Help sections" className="help-rail">
          <div className="flex flex-col py-2">
            {SECTIONS.map(({ id, label: l }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                aria-current={active === id ? 'true' : undefined}
                data-testid="index-row"
                className={`flex w-full items-center border-l py-2 pl-3 pr-2 text-left font-display transition-colors ${
                  active === id
                    ? 'border-text text-text'
                    : 'border-transparent text-text-secondary hover:text-text'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <Hairline />
          <div className="py-4">
            <button type="button" onClick={onStartTour} className={TEXT_CTRL + ' -ml-3'}>
              Start the walkthrough &rarr;
            </button>
          </div>
        </nav>

        <div className="help-doc flex min-w-0 flex-col gap-14">
          {/* Masthead. */}
          <motion.div
            variants={reveal.container(reduced)}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-3"
          >
            <motion.h1
              variants={reveal.item(reduced)}
              className="font-display text-[clamp(2.25rem,8cqi,4.5rem)] leading-[1.02] text-text"
            >
              New here?
            </motion.h1>
            <motion.p
              variants={reveal.item(reduced)}
              className="max-w-[60ch] text-lg leading-relaxed text-text-secondary"
            >
              Start with {label('about-me')}, then {label('projects')}. Everything else is optional.
            </motion.p>
          </motion.div>

          {/* Narrow windows: section links in place of the rail. */}
          <nav aria-label="Help sections" className="help-chips -mt-6 flex gap-x-5 gap-y-1 overflow-x-auto">
            {SECTIONS.map(({ id, label: l }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                className="inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap text-sm text-text-secondary underline decoration-border underline-offset-4 hover:text-text"
              >
                {l}
              </button>
            ))}
          </nav>

          {/* Sections reveal once on mount with a stagger (never on scroll). */}
          <motion.div
            className="flex flex-col gap-14"
            variants={reveal.container(reduced)}
            initial="hidden"
            animate="show"
          >
            {SECTIONS.map(({ id, label: l }) => (
              <motion.div
                key={id}
                id={SECTION_DOM_ID(id)}
                data-section={id}
                variants={reveal.item(reduced)}
              >
                <EditorialSection title={l} className="help-section">
                  <SectionBody
                    id={id}
                    variant={variant}
                    tourLength={tourLength}
                    onStartTour={onStartTour}
                  />
                </EditorialSection>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
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

  // First-ever open defaults to the walkthrough.
  useEffect(() => {
    try {
      const seen = localStorage.getItem(TOUR_SEEN_KEY);
      if (!seen) setMode('tour');
    } catch {
      // localStorage unavailable - stay on reference.
    }
  }, []);

  const steps = variant === 'mobile' ? TOUR_STEPS_MOBILE : TOUR_STEPS_DESKTOP;

  return (
    <div className="help-root h-full">
      {mode === 'tour' ? (
        <TourView steps={steps} onExit={() => setMode('reference')} />
      ) : (
        <ReferenceView
          variant={variant}
          tourLength={steps.length}
          onStartTour={() => setMode('tour')}
        />
      )}
    </div>
  );
}
