/**
 * Changelog data - single source of truth for devOS release history.
 *
 * Consumed by:
 *   - ChangelogApp.tsx (desktop + mobile editorial release index)
 *
 * Releases are ordered newest-first; the first entry is the latest release.
 * Each release carries a semantic version, a human date, a serif codename,
 * a one-line summary, and a list of typed changes.
 *
 * Change types are rendered as uppercase mono labels (FEATURE / FIX / PERF /
 * REFACTOR / RELEASE), never colored chips or icons. The editorial house
 * language is strictly monochrome.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChangeType = 'feature' | 'fix' | 'perf' | 'refactor' | 'release';

export interface ChangeEntry {
  type: ChangeType;
  text: string;
}

export interface Release {
  /** Semantic version, e.g. "2.2.0". Rendered with a leading "v". */
  version: string;
  /** Human-readable release date, e.g. "May 2026". */
  date: string;
  /** Serif codename for the release, e.g. "Pocket". */
  codename: string;
  /** One-line summary of the release. */
  summary: string;
  /** Typed change entries shipped in this release. */
  changes: ChangeEntry[];
  /** Marks a major / milestone release for a restrained mono tag. */
  highlight?: boolean;
}

// ---------------------------------------------------------------------------
// Change-type labels - uppercase mono, no color, no icon.
// ---------------------------------------------------------------------------

export const CHANGE_TYPES: ChangeType[] = [
  'feature',
  'fix',
  'perf',
  'refactor',
  'release',
];

export const CHANGE_TYPE_LABEL: Record<ChangeType, string> = {
  feature:  'Feature',
  fix:      'Fix',
  perf:     'Perf',
  refactor: 'Refactor',
  release:  'Release',
};

// ---------------------------------------------------------------------------
// Releases - newest first.
// ---------------------------------------------------------------------------

export const RELEASES: Release[] = [
  {
    version: '2.2.0',
    date: 'May 2026',
    codename: 'Pocket',
    summary:
      'Sprint 4. devOS gets a phone. Full iOS-style mobile shell with native-feeling apps, gestures, and live GitHub data.',
    highlight: true,
    changes: [
      { type: 'feature', text: 'PhoneShell + LockScreen: iOS-style mobile shell with paged home screen, dock, and swipe-up unlock' },
      { type: 'feature', text: 'Mobile primitives: MobileBottomSheet, MobilePushView (with iOS edge-swipe-back), MobileListRow, MobileSection, MobileSegmented' },
      { type: 'feature', text: 'Native mobile variants for Projects, Resume, Contact, File Explorer, Terminal, and Games' },
      { type: 'feature', text: 'GitHub Activity app: live contribution heatmap, recent events, and active repos backed by /api/github/activity' },
      { type: 'feature', text: 'Visible "Done" button in open apps + system-back gesture closes the app instead of leaving the page' },
      { type: 'feature', text: 'Fluid type tokens (clamp-based) so heroes scale smoothly from 360px Android to desktop' },
      { type: 'feature', text: 'File Explorer star counts now stream live from /api/github/repos: no more stale snapshots' },
      { type: 'refactor', text: 'ErrorBoundary wraps each mobile app host so a single crash does not blank the shell' },
    ],
  },
  {
    version: '2.1.0',
    date: 'Mar 2026',
    codename: 'Constellation',
    summary:
      "Sprint 3 lands. New apps, skill tree, file explorer, and a changelog you're reading right now.",
    highlight: true,
    changes: [
      { type: 'feature', text: 'RPG Skill Tree with SVG node graph, animated connections, and level indicators' },
      { type: 'feature', text: 'File Explorer with macOS Finder layout, project detail panels, and category filtering' },
      { type: 'feature', text: 'Resume app with section navigation, timeline experience view, and download link' },
      { type: 'feature', text: "Changelog app. Meta. You're reading v2.1.0 in v2.1.0." },
      { type: 'refactor', text: 'All Zustand store subscriptions migrated to granular selectors for React 19 compatibility' },
      { type: 'fix', text: 'AnalyticsApp infinite render loop resolved with polling pattern via getState()' },
      { type: 'perf', text: 'WindowManager defers analytics tracking out of React commit phase via setTimeout' },
    ],
  },
  {
    version: '2.0.0',
    date: 'Feb 2026',
    codename: 'Horizon',
    summary:
      'Complete rebuild from v1. New architecture, new design system, new everything.',
    highlight: true,
    changes: [
      { type: 'release', text: 'devOS v2: full ground-up rebuild in Next.js 15 with React 19 and App Router' },
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
      { type: 'feature', text: 'What Excites Me section: actual opinions, not buzzwords' },
      { type: 'feature', text: 'Currently section with real-time status from Notion' },
      { type: 'refactor', text: 'Projects section rebuilt with filterable grid and modal details' },
    ],
  },
  {
    version: '1.0.0',
    date: 'Jun 2025',
    codename: 'Launch',
    summary: "It's alive. First public release. Definitely no bugs.",
    changes: [
      { type: 'release', text: 'Initial public release of devanshuchicholikar.com' },
      { type: 'feature', text: 'Static portfolio with About, Projects, Skills, and Contact sections' },
      { type: 'feature', text: 'Responsive layout with Tailwind CSS' },
      { type: 'feature', text: 'GitHub Actions CI/CD pipeline to Vercel' },
    ],
  },
];
