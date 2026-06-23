/**
 * Terminal command registry
 *
 * Each command returns one of:
 *   - string[]  — plain text lines
 *   - { type: 'action'; action: string; payload?: string }  — triggers an OS action
 *   - { type: 'special'; id: string }  — renders a custom component in the terminal
 */

import { runRecruiterTour } from './recruiterTour';
import type { AppType } from '../../../shared/types';

export type CommandResult =
  | string[]
  | { type: 'action'; action: 'openWindow'; payload: AppType }
  | { type: 'action'; action: 'openAssistant'; payload: string }
  | { type: 'action'; action: 'toggleTheme' }
  | { type: 'special'; id: 'matrix' | 'hire' };

export type TerminalContext = {
  openWindow: (appType: AppType) => void;
  toggleTheme: () => void;
  currentTheme: 'light' | 'dark';
};

export type CommandHandler = (args: string[], ctx: TerminalContext) => CommandResult;

/**
 * Single source of truth for contact details. The `contact`, `secret`,
 * `github`, and `about` handlers reference this so the canonical email and
 * links never drift between commands.
 */
export const CONTACT = {
  email: 'chicholikar.d@northeastern.edu',
  linkedin: 'linkedin.com/in/devanshuchicholikar',
  github: 'github.com/DevanshuNEU',
  web: 'opencodeintel.com',
} as const;

/** Aliases accepted by the `open` command, mapped to their app windows. */
export const OPEN_APP_ALIASES: Record<string, AppType> = {
  'about': 'about-me',
  'about-me': 'about-me',
  'projects': 'projects',
  'skills': 'skills-dashboard',
  'skill-tree': 'skills-dashboard',
  'analytics': 'analytics',
  'contact': 'contact',
  'ping': 'contact',
  'terminal': 'terminal',
  'games': 'games',
  'arcade': 'games',
  'settings': 'display-options',
  'preferences': 'display-options',
  'finder': 'file-explorer',
  'files': 'file-explorer',
  'resume': 'resume',
  'changelog': 'changelog',
};

/** Valid arguments to the `theme` command. */
export const THEME_ARGS = ['dark', 'light'] as const;

export const commandRegistry: Record<string, CommandHandler> = {
  help: () => [
    '╔═══════════════════════════════════════════╗',
    '║         devOS Terminal  :: help            ║',
    '╠═══════════════════════════════════════════╣',
    '║  about         Who I am                   ║',
    '║  projects      What I\'ve built             ║',
    '║  skills        Things I know               ║',
    '║  contact       How to reach me             ║',
    '║  hire devanshu A very good idea            ║',
    '║  ask <q>       Open the assistant and ask   ║',
    '║  tour          Recruiter guided tour       ║',
    '║  open <app>    Open an app window          ║',
    '║  theme <mode>  dark | light                ║',
    '║  github        My GitHub stats             ║',
    '║  neofetch      System info                 ║',
    '║  matrix        Do the thing                ║',
    '║  cowsay <msg>  Classic                     ║',
    '║  secret        ???                         ║',
    '║  clear         Start fresh                 ║',
    '╚═══════════════════════════════════════════╝',
    '',
  ],

  ask: (args) => {
    const q = args.join(' ').trim();
    if (!q) {
      return [
        'Usage: ask <your question>',
        '  e.g. ask what did he build with MCP',
        '',
      ];
    }
    return { type: 'action', action: 'openAssistant', payload: q };
  },

  about: () => [
    '┌──────────────────────────────────────────┐',
    '│  Devanshu Chicholikar                    │',
    '│  Software Engineer                       │',
    '├──────────────────────────────────────────┤',
    '│  MS Software Engineering                 │',
    '│  Northeastern University                 │',
    '│  Graduated: May 2026                     │',
    '│  Location: Boston, MA                    │',
    '└──────────────────────────────────────────┘',
    '',
    '  Currently: Open to founding-engineer + AI-engineer roles.',
    '  Specialties: MCP servers, code intelligence,',
    '              AI dev tools, RAG, full-stack.',
    '',
    '  Type `hire devanshu` if you\'re a recruiter.',
    '  (Seriously, try it.)',
    '',
  ],

  projects: () => [
    'Things I\'ve shipped:',
    '',
    '  ->  Financial Copilot   OCR/NLP receipt automation',
    '  ->  Mem Machines        Serverless GCP pipelines, 1000+ RPM',
    '  ->  OpenCodeIntel       Code intelligence platform (11 stars)',
    '  ->  Saar                Auto-generates CLAUDE.md :: getsaar.com',
    '  ->  ModerationKit       AI content moderation API',
    '  ->  ModerKit Extension  Browser extension with persistent memory',
    '  ->  TestPulse AI        Playwright test intelligence dashboard',
    '  ->  Windborne           Weather visualization platform',
    '  ->  Campus Resources    Student resource directory',
    '  ->  SecureScale         99.9% uptime AWS infra with Terraform',
    '  ->  devOS               You\'re looking at it',
    '',
    '  Double-click the Projects icon to explore them.',
    '',
  ],

  skills: () => [
    'Technical skills:',
    '',
    '  Languages     TypeScript  Python  Java  Go  SQL',
    '  Frontend      React  Next.js  Tailwind  Framer Motion',
    '  Backend       Node.js  Flask  Express  PostgreSQL',
    '  Cloud         AWS  GCP  Terraform  Docker  Kubernetes',
    '  Observability Prometheus  CloudWatch  CI/CD  GitHub Actions',
    '',
    '  Open the Skill Tree app for the RPG version of this list.',
    '  (It\'s better.)',
    '',
  ],

  contact: () => [
    'Let\'s connect:',
    '',
    `  mail  ${CONTACT.email}`,
    `  link  ${CONTACT.linkedin}`,
    `  code  ${CONTACT.github}`,
    `  web   ${CONTACT.web}`,
    '',
    '  Or just open the Ping Me app and send a message.',
    '  (The contact form actually sends email now.)',
    '',
  ],

  hire: (args) => {
    if (args[0] === 'devanshu') {
      // Fire-and-forget: notify Devanshu via email that someone ran this command.
      // No await — visitor sees the animation instantly; backend handles it async.
      fetch('/api/notify-hire', { method: 'POST' }).catch(() => {/* silent */});
      return { type: 'special', id: 'hire' };
    }
    return [
      `hire: unknown person '${args[0] ?? '(nobody)'}'`,
      "Did you mean: hire devanshu",
      '',
    ];
  },

  open: (args, ctx) => {
    const app = OPEN_APP_ALIASES[args[0]?.toLowerCase() ?? ''];
    if (!app) {
      return [
        `open: no app named '${args[0] ?? '(nothing)'}'`,
        '',
        'Available apps: about, projects, skills, contact, terminal,',
        '               games, settings, finder, resume, changelog',
        '',
      ];
    }
    ctx.openWindow(app);
    return [`Opening ${args[0]}...`, ''];
  },

  theme: (args, ctx) => {
    const mode = args[0]?.toLowerCase();
    if (mode !== 'dark' && mode !== 'light') {
      return [
        `Usage: theme <dark|light>`,
        `Current theme: ${ctx.currentTheme}`,
        '',
      ];
    }
    if (mode === ctx.currentTheme) {
      return [`Already in ${mode} mode. Nothing to do.`, ''];
    }
    ctx.toggleTheme();
    return [
      mode === 'dark'
        ? 'Switched to dark mode. Very mysterious.'
        : 'Switched to light mode. Welcome back to the light side.',
      '',
    ];
  },

  github: () => [
    `  GitHub: ${CONTACT.github}`,
    '  Org:    github.com/OpenCodeIntel',
    '',
    '  Personal repos: ~18  |  Org repos: 3',
    '  Top languages: TypeScript, Python, JavaScript',
    '',
    '  Open the Finder app to browse repos interactively.',
    '',
  ],

  neofetch: () => [
    '         .---.          devanshu@devOS',
    '        /     \\         ──────────────',
    '       | o   o |        OS:     devOS v2.0',
    '       |   ∆   |        Host:   Next.js 15',
    '        \\ ___ /         Kernel: React 19',
    '      ___/   \\___       Shell:  Terminal.app',
    '     /           \\      Theme:  Monochrome',
    '    |  devOS v2.0 |     Icons:  Lucide + Phosphor',
    '     \\___________/      Memory: Too much Zustand',
    '',
    '  [TypeScript] [Python] [AWS] [Docker] [Terraform]',
    '',
  ],

  // Recruiter tour — auto-opens About Me → Projects → Resume in sequence
  tour: () => {
    runRecruiterTour();
    return [
      'Starting recruiter tour...',
      'About Me → Projects → Resume  (watch the desktop)',
      '',
      '  Shortcut: Cmd+Shift+T  anytime.',
      '',
    ];
  },

  matrix: () => ({ type: 'special', id: 'matrix' }),

  cowsay: (args) => {
    const msg = args.join(' ') || 'Hire me?';
    const border = '─'.repeat(msg.length + 2);
    return [
      ` ┌${border}┐`,
      ` │ ${msg} │`,
      ` └${border}┘`,
      '    \\',
      '     \\  ^__^',
      '      \\ (oo)\\_______',
      '        (__)\\       )\\/\\',
      '            ||----w |',
      '            ||     ||',
      '',
    ];
  },

  secret: () => [
    '[ secret unlocked ]',
    '',
    '  Since you\'re curious enough to try random commands,',
    '  you\'re probably the kind of person I\'d love to work with.',
    '',
    '  Fun fact: This entire portfolio was built with an',
    '  unreasonable amount of attention to detail,',
    '  powered by chai and late-night coding sessions.',
    '',
    '  The dock magnification? Yes, I built that.',
    '  The BSOD 404 page? Also me.',
    '  The boot sequence with fake POST messages? Guilty.',
    '',
    '  Reach out. Let\'s build something cool together.',
    `  ${CONTACT.email}`,
    '',
  ],

  whoami: () => [
    'guest@devOS',
    'Role: Visitor',
    'Access: Read-only (for now)',
    '',
    'Pro tip: `hire devanshu` upgrades you to admin.',
    '',
  ],

  ls: () => [
    'README.md    about/    projects/    skills/    contact.txt    secret.txt',
    '',
  ],

  pwd: () => ['/home/guest/devOS', ''],

  date: () => [new Date().toLocaleString(), ''],

  echo: (args) => [args.join(' '), ''],

  sudo: () => ['Nice try. You need to get hired first.', ''],

  vim: () => ['vim: command not found', 'Just kidding. But seriously, use VS Code.', ''],

  exit: () => ['You can close the window. This isn\'t a real terminal. Almost.', ''],
};

/** Lookup a command (case-insensitive). Returns null if not found. */
export function resolveCommand(input: string): {
  handler: CommandHandler;
  args: string[];
  baseCmd: string;
} | null {
  const [baseCmd, ...args] = input.trim().toLowerCase().split(/\s+/);
  const handler = commandRegistry[baseCmd];
  if (!handler) return null;
  return { handler, args, baseCmd };
}

/** Every registered command name, in registry order. */
export const commandNames = Object.keys(commandRegistry);

/**
 * Curated, recruiter-pointed suggestions surfaced as the rotating empty-state
 * hint on the input line. Not the full command list on purpose.
 */
export const TERMINAL_SUGGESTIONS = [
  'hire devanshu',
  'tour',
  'projects',
  'about',
  'secret',
];

/** Longest common prefix shared by every string in the list. */
function longestCommonPrefix(items: string[]): string {
  if (items.length === 0) return '';
  let prefix = items[0];
  for (let i = 1; i < items.length; i++) {
    const candidate = items[i];
    let j = 0;
    while (j < prefix.length && j < candidate.length && prefix[j] === candidate[j]) {
      j++;
    }
    prefix = prefix.slice(0, j);
    if (prefix === '') break;
  }
  return prefix;
}

/**
 * Resolve completion state for an input token. Pure string logic over a fixed
 * pool of candidate names. Never invokes a handler.
 *
 *   - candidates: pool entries that start with `token` (case-insensitive)
 *   - commonPrefix: longest common prefix of candidates (for Tab-to-fill)
 *   - ghost: case-SENSITIVE remainder of the first candidate that exactly
 *     `startsWith(token)`, else '' (lowercase typing gets a ghost, mismatched
 *     case does not — avoids showing a ghost that wouldn't actually complete)
 */
function completeToken(token: string, pool: string[]): {
  ghost: string;
  candidates: string[];
  commonPrefix: string;
} {
  const lower = token.toLowerCase();
  const candidates = pool.filter((name) => name.toLowerCase().startsWith(lower));
  const commonPrefix = longestCommonPrefix(candidates);
  let ghost = '';
  for (const candidate of candidates) {
    if (candidate.startsWith(token)) {
      ghost = candidate.slice(token.length);
      break;
    }
  }
  return { ghost, candidates, commonPrefix };
}

/**
 * Pure, testable autocomplete helper for the terminal input line.
 *
 * Tokenizes like `resolveCommand` (leading whitespace stripped, split on runs
 * of whitespace) and returns the ghost suffix, the candidate pool, and the
 * longest common prefix. Handles command-name completion and arg completion
 * for `open <app>` and `theme <mode>`. Returns empty state for everything else.
 */
export function getCompletions(input: string): {
  ghost: string;
  candidates: string[];
  commonPrefix: string;
} {
  const empty = { ghost: '', candidates: [], commonPrefix: '' };
  if (input.trim() === '') return empty;

  const parts = input.replace(/^\s+/, '').split(/\s+/);

  // Single token, no trailing space → complete the command name.
  if (parts.length === 1) {
    return completeToken(parts[0], commandNames);
  }

  // Two tokens → arg completion for `open` / `theme` only.
  if (parts.length === 2) {
    const base = parts[0].toLowerCase();
    const arg = parts[1];
    if (base === 'open') {
      return completeToken(arg, Object.keys(OPEN_APP_ALIASES));
    }
    if (base === 'theme') {
      return completeToken(arg, [...THEME_ARGS]);
    }
  }

  return empty;
}
