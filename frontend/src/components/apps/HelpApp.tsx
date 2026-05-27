'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LifeBuoy,
  Sparkles,
  LayoutGrid,
  Keyboard,
  Smartphone,
  Heart,
  ChevronRight,
  ChevronLeft,
  X,
  PlayCircle,
} from 'lucide-react';
import { appRegistry, getAppLabel } from '@/lib/appRegistry';
import { getIconColors } from '@/lib/iconColors';
import type { AppType } from '../../../../shared/types';

type Mode = 'reference' | 'tour';
type Section = 'welcome' | 'apps' | 'shortcuts' | 'mobile' | 'credits';

const TOUR_SEEN_KEY = 'devos.helpTourSeen';

// ---------------------------------------------------------------------------
// Tour steps
// ---------------------------------------------------------------------------

interface TourStep {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  body: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: Sparkles,
    iconColor: 'amber',
    title: 'Welcome to devOS',
    body: "This isn't a regular portfolio. It's a desktop OS — windows, a dock, a launchpad, even a terminal. Everything's interactive. Spend two minutes here and you'll know your way around.",
  },
  {
    icon: LayoutGrid,
    iconColor: 'blue',
    title: 'The dock at the bottom',
    body: "Those icons along the bottom edge are your starting points. Hover for a peek, click to open. About Me, Projects, Activity, Terminal, Resume, Contact, and this Help app are all pinned there.",
  },
  {
    icon: Sparkles,
    iconColor: 'purple',
    title: 'Launchpad has everything',
    body: "Click the grid icon (leftmost in the dock) to see every app — including ones not pinned, like Skill Tree, Analytics, Finder, Changelog, and Arcade. Search bar at the top filters as you type.",
  },
  {
    icon: LayoutGrid,
    iconColor: 'green',
    title: 'Windows behave like macOS',
    body: "Drag a window by its title bar. The three buttons on the top-left close (red), minimize (yellow), and maximize (green). Multiple apps can stay open at once — click any window to bring it forward.",
  },
  {
    icon: Smartphone,
    iconColor: 'pink',
    title: 'On a phone? It morphs',
    body: "Open this on a mobile browser and the whole desktop becomes a pocket OS — a home screen with rounded app tiles, a status bar, and an iOS-style dock. Same content, designed for thumbs.",
  },
  {
    icon: Heart,
    iconColor: 'red',
    title: 'You’re set',
    body: "Close this when you’re ready. The lifebuoy icon (this app) is always in the dock if you want to come back. Now go open About Me — start there.",
  },
];

// ---------------------------------------------------------------------------
// Apps list (curated descriptions for the Help reference)
// ---------------------------------------------------------------------------

const APPS_IN_HELP: AppType[] = [
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
// Shortcut rows
// ---------------------------------------------------------------------------

const SHORTCUTS: { keys: string[]; description: string }[] = [
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
// Tour view
// ---------------------------------------------------------------------------

function TourView({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState(0);
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const Icon = current.icon;
  const colors = getIconColors(current.iconColor);

  const next = () => {
    if (isLast) {
      try { localStorage.setItem(TOUR_SEEN_KEY, '1'); } catch { /* ignore */ }
      onExit();
    } else {
      setStep((s) => s + 1);
    }
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-black/6 dark:border-white/6 flex-shrink-0">
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <PlayCircle size={14} />
          Tour
          <span className="text-text-secondary/60">
            · Step {step + 1} of {TOUR_STEPS.length}
          </span>
        </div>
        <button
          onClick={onExit}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-text-secondary hover:text-text transition-colors"
          aria-label="Skip tour"
        >
          <X size={16} />
        </button>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="max-w-md text-center space-y-5"
          >
            <div
              className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: colors.gradient, boxShadow: `0 12px 32px ${colors.shadow}` }}
            >
              <Icon size={40} className="text-white" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-semibold text-text leading-tight">
              {current.title}
            </h2>
            <p className="text-text-secondary leading-relaxed">
              {current.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 pb-3 flex-shrink-0">
        {TOUR_STEPS.map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === step ? 'bg-accent' : 'bg-black/15 dark:bg-white/15'
            }`}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-black/6 dark:border-white/6 flex-shrink-0">
        <button
          onClick={back}
          disabled={step === 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm text-text-secondary hover:text-text hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft size={14} />
          Back
        </button>
        <button
          onClick={onExit}
          className="px-3 py-1.5 rounded-md text-sm text-text-secondary hover:text-text transition-colors"
        >
          Skip
        </button>
        <button
          onClick={next}
          className="flex items-center gap-1 px-4 py-1.5 rounded-md text-sm font-medium bg-accent text-white hover:opacity-90 transition-opacity"
        >
          {isLast ? 'Done' : 'Next'}
          {!isLast && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reference view
// ---------------------------------------------------------------------------

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'welcome',   label: 'Welcome',   icon: Sparkles  },
  { id: 'apps',      label: 'Apps',      icon: LayoutGrid },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard  },
  { id: 'mobile',    label: 'Mobile',    icon: Smartphone },
  { id: 'credits',   label: 'Credits',   icon: Heart     },
];

function ReferenceView({ onStartTour }: { onStartTour: () => void }) {
  const [section, setSection] = useState<Section>('welcome');

  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-48 flex-shrink-0 app-sidebar flex flex-col">
        <div className="p-3 border-b border-black/6 dark:border-white/6">
          <button
            onClick={onStartTour}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-medium bg-accent text-white hover:opacity-90 transition-opacity"
          >
            <PlayCircle size={14} />
            Take the tour
          </button>
        </div>
        <nav className="flex-1 p-2">
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] text-left transition-colors mb-0.5 ${
                  active
                    ? 'bg-accent/12 text-accent'
                    : 'text-text-secondary hover:text-text hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {section === 'welcome'   && <WelcomePane onStartTour={onStartTour} />}
        {section === 'apps'      && <AppsPane />}
        {section === 'shortcuts' && <ShortcutsPane />}
        {section === 'mobile'    && <MobilePane />}
        {section === 'credits'   && <CreditsPane />}
      </div>
    </div>
  );
}

function WelcomePane({ onStartTour }: { onStartTour: () => void }) {
  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: getIconColors('amber').gradient,
            boxShadow: `0 10px 24px ${getIconColors('amber').shadow}`,
          }}
        >
          <LifeBuoy size={28} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-text leading-tight">
            New here?
          </h1>
          <p className="text-text-secondary text-sm mt-0.5">
            Two minutes and you’ll know what every icon does.
          </p>
        </div>
      </div>
      <p className="text-text-secondary leading-relaxed">
        This portfolio is built as a desktop OS — windows, a dock, a launchpad, and a
        bunch of apps you can actually click around in. Everything you’d want to know
        about me lives inside one of those apps.
      </p>
      <p className="text-text-secondary leading-relaxed">
        Start with <span className="text-text">About Me</span> for the story, then
        check <span className="text-text">Projects</span> for the things I shipped. The
        rest is bonus.
      </p>
      <button
        onClick={onStartTour}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:opacity-90 transition-opacity"
      >
        <PlayCircle size={16} />
        Start the 6-step tour
      </button>
    </div>
  );
}

function AppsPane() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-text mb-1">Apps</h2>
      <p className="text-text-secondary text-sm mb-5">
        Every app and what it’s for. Click an icon in the dock or launchpad to open one.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {APPS_IN_HELP.map((appType) => {
          const reg = appRegistry[appType];
          if (!reg) return null;
          const label = getAppLabel(appType);
          const colors = getIconColors(reg.iconColor);
          const Icon = reg.icon;
          return (
            <div
              key={appType}
              className="flex items-start gap-3 p-3 rounded-lg border border-black/6 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02]"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: colors.gradient }}
              >
                <Icon size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-text leading-tight">
                  {label.title}
                </p>
                <p className="text-[12px] text-text-secondary leading-snug mt-0.5">
                  {label.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShortcutsPane() {
  return (
    <div className="max-w-xl">
      <h2 className="text-xl font-semibold text-text mb-1">How to drive it</h2>
      <p className="text-text-secondary text-sm mb-5">
        Mostly clicks. A couple of gestures behave just like macOS.
      </p>
      <div className="rounded-lg border border-black/6 dark:border-white/8 overflow-hidden">
        {SHORTCUTS.map((row, i) => (
          <div
            key={row.description}
            className={`flex items-center justify-between px-4 py-2.5 text-sm ${
              i % 2 === 0 ? 'bg-black/[0.02] dark:bg-white/[0.02]' : ''
            }`}
          >
            <div className="flex items-center gap-1.5">
              {row.keys.map((k) => (
                <kbd
                  key={k}
                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-black/8 dark:bg-white/8 text-text-secondary border border-black/6 dark:border-white/10"
                >
                  {k}
                </kbd>
              ))}
            </div>
            <span className="text-text-secondary">{row.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobilePane() {
  return (
    <div className="max-w-xl space-y-3">
      <h2 className="text-xl font-semibold text-text">On a phone</h2>
      <p className="text-text-secondary leading-relaxed">
        The whole desktop morphs into a pocket OS. Home screen of rounded app tiles, a
        status bar at the top, an iOS-style dock at the bottom. Tap an app, swipe to go
        back, or pull down to dismiss.
      </p>
      <p className="text-text-secondary leading-relaxed">
        Every app has a mobile layout designed for the smaller screen — same content,
        just sized for thumbs. Try it on your phone, or shrink this window down below
        768px to see the switch live.
      </p>
    </div>
  );
}

function CreditsPane() {
  return (
    <div className="max-w-xl space-y-3 text-sm">
      <h2 className="text-xl font-semibold text-text">Built with</h2>
      <p className="text-text-secondary leading-relaxed">
        Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion, and Zustand. Icons
        from Lucide and Phosphor. Deployed on Vercel.
      </p>
      <p className="text-text-secondary leading-relaxed">
        Made by Devanshu Chicholikar in Boston. The source is on{' '}
        <a
          href="https://github.com/DevanshuNEU"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          GitHub
        </a>{' '}
        — fork it, break it, learn from it.
      </p>
      <p className="text-text-secondary/70 italic leading-relaxed pt-2">
        “I made a portfolio that runs an OS so I could justify spending six months on
        a portfolio.”
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export default function HelpApp() {
  const [mode, setMode] = useState<Mode>('reference');

  // Default to tour on first ever open
  useEffect(() => {
    try {
      const seen = localStorage.getItem(TOUR_SEEN_KEY);
      if (!seen) setMode('tour');
    } catch {
      // localStorage unavailable — stay on reference
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-surface text-text">
      {mode === 'tour' ? (
        <TourView onExit={() => setMode('reference')} />
      ) : (
        <ReferenceView onStartTour={() => setMode('tour')} />
      )}
    </div>
  );
}
