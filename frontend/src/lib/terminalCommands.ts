/**
 * Terminal command registry
 *
 * Each command returns one of:
 *   - string[]  — plain text lines
 *   - { type: 'action'; action: string; payload?: string }  — triggers an OS action
 *   - { type: 'special'; id: string }  — renders a custom component in the terminal
 */

import type { AppType } from '../../../shared/types';

export type CommandResult =
  | string[]
  | { type: 'action'; action: 'openWindow'; payload: AppType }
  | { type: 'action'; action: 'toggleTheme' }
  | { type: 'special'; id: 'matrix' | 'hire' | 'confetti' };

export type TerminalContext = {
  openWindow: (appType: AppType) => void;
  toggleTheme: () => void;
  currentTheme: 'light' | 'dark';
};

export type CommandHandler = (args: string[], ctx: TerminalContext) => CommandResult;

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

  about: () => [
    '┌──────────────────────────────────────────┐',
    '│  Devanshu Chicholikar                    │',
    '│  Software Engineer                       │',
    '├──────────────────────────────────────────┤',
    '│  MS Software Engineering                 │',
    '│  Northeastern University                 │',
    '│  Graduating: December 2026               │',
    '│  Location: Boston, MA                    │',
    '└──────────────────────────────────────────┘',
    '',
    '  Currently: Open to co-op + full-time roles.',
    '  Specialties: full-stack, distributed systems,',
    '              cloud infra, building cool things.',
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
    '  mail  chicholikar.d@northeastern.edu',
    '  link  linkedin.com/in/devanshuchicholikar',
    '  code  github.com/DevanshuNEU',
    '  web   opencodeintel.com',
    '',
    '  Or just open the Ping Me app and send a message.',
    '  (The contact form actually sends email now.)',
    '',
  ],

  hire: (args) => {
    if (args[0] === 'devanshu') {
      return { type: 'special', id: 'hire' };
    }
    return [
      `hire: unknown person '${args[0] ?? '(nobody)'}'`,
      "Did you mean: hire devanshu",
      '',
    ];
  },

  open: (args, ctx) => {
    const appMap: Record<string, AppType> = {
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
    const app = appMap[args[0]?.toLowerCase() ?? ''];
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
    '  GitHub: github.com/DevanshuNEU',
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
    '     /           \\      Theme:  Glass morphism',
    '    |  devOS v2.0 |     Icons:  Lucide',
    '     \\___________/      Memory: Too much Zustand',
    '',
    '  [TypeScript] [Python] [AWS] [Docker] [Terraform]',
    '',
  ],

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
    '  chicholikar.d@northeastern.edu',
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
