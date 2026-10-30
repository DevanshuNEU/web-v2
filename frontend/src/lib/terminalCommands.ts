/**
 * Terminal command registry
 *
 * Each command returns one of:
 *   - string[]  — plain text lines
 *   - { type: 'action'; action: string; payload?: string }  — triggers an OS action
 *   - { type: 'special'; id: string }  — renders a custom component in the terminal
 */

import { runRecruiterTour, isRecruiterTourRunning } from './recruiterTour';
import { opinions } from '@/data/aboutMe';
import type { AppType } from '../../../shared/types';

export type CommandResult =
  | string[]
  /** ASCII art: shown as-is, hidden from screen readers, which read `alt`. */
  | { type: 'art'; lines: string[]; alt: string }
  | { type: 'action'; action: 'openWindow'; payload: AppType }
  | { type: 'action'; action: 'openAssistant'; payload: string }
  | { type: 'action'; action: 'toggleTheme' }
  | { type: 'special'; id: 'matrix' | 'hire' };

export type TerminalContext = {
  openWindow: (appType: AppType) => void;
  toggleTheme: () => void;
  currentTheme: 'light' | 'dark';
  /** Current palette, so neofetch reports the real one. */
  palette?: 'mono' | 'color';
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
  'help': 'help',
  'browser': 'browser',
  'activity': 'github-activity',
  'github': 'github-activity',
};

/** `open` aliases that start a chat with the AI instead of opening a window. */
export const OPEN_CHAT_ALIASES = ['devai', 'chat', 'ai'] as const;

/** One name per app for the `open` error list (first alias wins). */
export function openAppNames(): string[] {
  const seen = new Set<AppType>();
  const names: string[] = [];
  for (const [name, app] of Object.entries(OPEN_APP_ALIASES)) {
    if (seen.has(app)) continue;
    seen.add(app);
    names.push(name);
  }
  return [...names, OPEN_CHAT_ALIASES[0]];
}

/** Rows of the `help` list: [command, description]. */
export const HELP_ROWS: [string, string][] = [
  ['about', 'Who I am'],
  ['projects', "What I've built"],
  ['skills', 'Things I know'],
  ['opinions', 'Strongly held'],
  ['contact', 'How to reach me'],
  ['hire devanshu', 'A very good idea'],
  ['ask <q>', 'Ask my AI a question'],
  ['tour', 'Quick tour of the portfolio'],
  ['open <app>', 'Open an app'],
  ['theme <mode>', 'dark or light'],
  ['github', 'My GitHub stats'],
  ['neofetch', 'System info'],
  ['matrix', 'Full screen. Do the thing'],
  ['cowsay <msg>', 'Classic'],
  ['secret', '???'],
  ['clear', 'Start fresh'],
];

/** Plain-text equivalent of the neofetch art, for screen readers. */
const NEOFETCH_ALT = (palette: string) =>
  `devOS v2.0 system info: host Next.js 15, kernel React 19, shell Terminal.app, theme ${palette}, icons Lucide and Phosphor.`;

/** Levenshtein distance, capped early: only small distances matter here. */
function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** The closest command name within edit distance 2 (less for short words), or null. */
export function suggestCommand(input: string): string | null {
  const word = input.trim().toLowerCase().split(/\s+/)[0] ?? '';
  if (!word) return null;
  // Short words get less slack, so "x" does not suggest "ls".
  let bestD = Math.min(2, Math.floor(word.length / 2)) + 1;
  let best: string | null = null;
  for (const name of Object.keys(commandRegistry)) {
    const d = editDistance(word, name);
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
}

/** Valid arguments to the `theme` command. */
export const THEME_ARGS = ['dark', 'light'] as const;

export const commandRegistry: Record<string, CommandHandler> = {
  help: () => [
    'Commands',
    '',
    ...HELP_ROWS.map(([cmd, desc]) => `  ${cmd.padEnd(16)}${desc}`),
    '',
    '  Tab completes a command. On an empty line, Tab moves focus out.',
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
    'Devanshu Chicholikar',
    'Software, AI, Forward Deployed Engineer',
    '',
    '  Education    MS Software Engineering Systems, Northeastern University',
    '  Graduated    May 2026',
    '  Location     Boston, MA',
    '  Currently    Open to Software Engineer, AI Engineer and Forward Deployed Engineer roles',
    '  Specialties  MCP servers, code intelligence, AI dev tools, RAG, full-stack',
    '',
    '  Type `hire devanshu` if you\'re a recruiter.',
    '  (Seriously, try it.)',
    '',
  ],

  projects: () => [
    'Things I\'ve shipped:',
    '',
    '  ->  OpenCodeIntel       Code search for AI coding agents (web, API, MCP)',
    '  ->  Overhear            QA analyst for voice agents, LLM-as-a-judge evals',
    '  ->  CallBudget          Finds a hard-to-find drug in fewer calls',
    '  ->  Saar                Claude.ai token and cost meter :: getsaar.com',
    '  ->  saar CLI            Writes AGENTS.md and CLAUDE.md :: PyPI',
    '  ->  Portfolio OS        You\'re looking at it',
    '  ->  Financial Copilot   AI expense tracker',
    '  ->  SecureScale         99.9% uptime AWS infra with Terraform',
    '  ->  Mem Machines        Serverless GCP ingestion pipeline',
    '',
    '  Type open projects for details.',
    '',
  ],

  opinions: () => [
    'Initializing opinions... strongly held',
    '',
    ...opinions.map(line => `  ->  ${line}`),
    '',
    '  Disagree? `ask` the assistant. It argues back.',
    '',
  ],

  skills: () => [
    'Technical skills:',
    '',
    '  Languages     TypeScript  Python  Java  Go  SQL',
    '  Frontend      React  Next.js  Tailwind  Framer Motion',
    '  Backend       Node.js  Flask  Express  PostgreSQL',
    '  Cloud         AWS  GCP  Terraform  Docker  Kubernetes',
    '  AI            MCP  RAG  Evals  LLM-as-a-judge  Voice agents',
    '  Observability CloudWatch  Sentry  CI/CD  GitHub Actions',
    '',
    '  Type open skills for the interactive version.',
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
    '  Or type open ping to send a message.',
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
    const name = args[0]?.toLowerCase() ?? '';
    if ((OPEN_CHAT_ALIASES as readonly string[]).includes(name)) {
      return { type: 'action', action: 'openAssistant', payload: '' };
    }
    const app = OPEN_APP_ALIASES[name];
    if (!app) {
      return [
        `open: no app named '${args[0] ?? '(nothing)'}'`,
        '',
        `Available apps: ${openAppNames().join(', ')}`,
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
        : 'Switched to light mode. Welcome back to the light side. (The terminal stays dark.)',
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
    '  Type open finder to browse the repos.',
    '',
  ],

  neofetch: (_args, ctx) => {
    const palette = ctx.palette === 'color' ? 'Color' : 'Mono';
    return {
      type: 'art',
      alt: NEOFETCH_ALT(palette),
      lines: [
        '         .---.          devanshu@devOS',
        '        /     \\         --------------',
        '       | o   o |        OS:     devOS v2.0',
        '       |   ^   |        Host:   Next.js 15',
        '        \\ ___ /         Kernel: React 19',
        '      ___/   \\___       Shell:  Terminal.app',
        `     /           \\      Theme:  ${palette}`,
        '    |  devOS v2.0 |     Icons:  Lucide + Phosphor',
        '     \\___________/      Memory: Too much Zustand',
        '',
        '  [TypeScript] [Python] [AWS] [Docker] [Terraform]',
        '',
      ],
    };
  },

  // Quick tour: About Me, Projects, Resume, one window at a time. Running it
  // again stops it.
  tour: () => {
    const wasRunning = isRecruiterTourRunning();
    runRecruiterTour();
    if (wasRunning) return ['Quick tour stopped.', ''];
    return [
      'Starting the quick tour: About Me, Projects, Resume.',
      'Press Esc or Option+T to stop.',
      '',
    ];
  },

  matrix: () => ({ type: 'special', id: 'matrix' }),

  cowsay: (args) => {
    const msg = args.join(' ') || 'Hire me?';
    const border = '─'.repeat(msg.length + 2);
    return { type: 'art', alt: `A cow says: ${msg}`, lines: [
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
    ] };
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

  cat: (args, ctx) => {
    const file = (args[0] ?? '').toLowerCase().replace(/\/$/, '');
    if (!file) return ['Usage: cat <file>   (try: cat README.md)', ''];
    if (file === 'readme.md') return commandRegistry.help([], ctx);
    if (file === 'contact.txt') return commandRegistry.contact([], ctx);
    if (file === 'secret.txt') return commandRegistry.secret([], ctx);
    if (file === 'about' || file === 'projects' || file === 'skills') {
      return [`cat: ${file}/: Is a directory. Try: ${file}`, ''];
    }
    return [`cat: ${args[0]}: No such file`, ''];
  },

  pwd: () => ['/home/guest/devOS', ''],

  date: () => [new Date().toLocaleString(), ''],

  echo: (args) => [args.join(' '), ''],

  sudo: () => ['Nice try. You need to get hired first.', ''],

  vim: () => ['vim: command not found', 'Just kidding. But seriously, use VS Code.', ''],

  exit: () => ['Nothing to exit here. Close the window from the dots at top left.', ''],
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
