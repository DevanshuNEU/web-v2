/**
 * devOS Personality Copy System
 *
 * Centralized witty, self-aware developer humor.
 * Every string a visitor reads should sound like the same person wrote it.
 * Rules: no em dashes, no corporate speak, no hedging.
 */

// ---------------------------------------------------------------------------
// Loading Messages
// ---------------------------------------------------------------------------

export const loadingMessages = [
  'Compiling personality...',
  'Fetching opinions...',
  'Reticulating splines...',
  'npm install confidence',
  'Warming up the servers...',
  'Parsing semicolons...',
  'Resolving merge conflicts with reality...',
  'Loading pixels with intent...',
  'Optimizing for vibes...',
  'Hydrating components...',
  'Deploying charm...',
  'Initializing caffeine dependency...',
  'git push --force-with-lease feelings...',
  'Checking types. Finding feelings...',
  'Making it scale...',
];

export function getRandomLoadingMessage(): string {
  return loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
}

// ---------------------------------------------------------------------------
// Boot Sequence Messages
// ---------------------------------------------------------------------------

export const bootMessages = [
  { text: 'devOS v2.0 starting up...', delay: 0 },
  { text: 'Loading kernel modules... done', delay: 400 },
  { text: 'Initializing display server... done', delay: 800 },
  { text: 'Checking for bugs... found 3, keeping them as features', delay: 1200 },
  { text: 'Mounting file system... done', delay: 1600 },
  { text: 'Initializing opinions... strongly held', delay: 2000 },
  { text: 'npm install confidence... success', delay: 2400 },
  { text: 'Starting window manager... done', delay: 2800 },
  { text: 'Welcome to devOS.', delay: 3200 },
];

// ---------------------------------------------------------------------------
// Toast Messages
// ---------------------------------------------------------------------------

export const toastMessages = {
  themeDark: 'Dark mode. Very mysterious.',
  themeLight: 'Light mode. Welcome back to the light side.',
  accentChanged: 'New accent color. Same great developer.',
  wallpaperChanged: 'Fresh wallpaper. Fresh perspective.',
  contactSent: "Message sent! I'll get back to you faster than a hot reload.",
  contactError: 'Something went wrong. Even my code has bad days.',
  copiedToClipboard: 'Copied. Ctrl+C is my cardio.',
  appAlreadyOpen: 'Already open. I admire the enthusiasm.',
};

// ---------------------------------------------------------------------------
// Empty States
// ---------------------------------------------------------------------------

export const emptyStates = {
  noAppsRunning: "Desktop's looking clean. Too clean.",
  noProjectSelected: "Pick a project. They're all my favorites. Don't tell the others.",
  noSearchResults: 'Nothing found. Try a different search, or blame the algorithm.',
  noNotifications: 'All clear. Suspiciously quiet.',
  terminalWelcome: "devOS terminal. Type 'help' if lost. No judgment.",
};

// ---------------------------------------------------------------------------
// Notification Messages
// ---------------------------------------------------------------------------

export const notifications = {
  welcome: {
    title: 'Welcome to devOS',
    body: "Double-click an icon to get started. Or admire the wallpaper. Both are valid.",
  },
  idleNudge: {
    title: 'Still here?',
    body: 'Open the terminal. Type `hire devanshu`. See what happens.',
  },
  terminalTip: {
    title: 'Psst.',
    body: 'The terminal has hidden commands. `secret` is just the start.',
  },
  projectsHint: {
    title: 'Fun fact',
    body: "Every project here is open source. Star them. Fork them. I'm not picky.",
  },
};

// ---------------------------------------------------------------------------
// App Labels
// ---------------------------------------------------------------------------

export const appLabels: Record<string, { title: string; windowTitle: string; description: string }> = {
  'about-me': {
    title: 'About Me',
    windowTitle: 'About Me.app',
    description: 'The person behind the pixels',
  },
  'projects': {
    title: 'Projects',
    windowTitle: 'Projects.app',
    description: 'Things I shipped',
  },
  'skills-dashboard': {
    title: 'Skill Tree',
    windowTitle: 'Skill Tree.app',
    description: 'XP earned over the years',
  },
  'analytics': {
    title: 'Analytics',
    windowTitle: 'Analytics.app',
    description: "What you did here. Transparent, I promise.",
  },
  'contact': {
    title: 'Ping Me',
    windowTitle: 'Contact.app',
    description: "Let's talk",
  },
  'terminal': {
    title: 'Terminal',
    windowTitle: 'Terminal.app',
    description: 'For the CLI-curious',
  },
  'games': {
    title: 'Arcade',
    windowTitle: 'Arcade.app',
    description: 'Procrastination station',
  },
  'display-options': {
    title: 'Preferences',
    windowTitle: 'Preferences.app',
    description: 'Make it yours',
  },
  'file-explorer': {
    title: 'Finder',
    windowTitle: 'Finder.app',
    description: 'Browse my repos',
  },
  'resume': {
    title: 'Resume',
    windowTitle: 'Resume.pdf - Preview',
    description: 'The formal version of me',
  },
  'changelog': {
    title: 'Changelog',
    windowTitle: 'Changelog.app',
    description: 'What changed and when',
  },
};

// ---------------------------------------------------------------------------
// 404 / BSOD Copy
// ---------------------------------------------------------------------------

export const bsodCopy = {
  title: 'devOS has encountered a problem and needs to restart.',
  errorCode: 'PORTFOLIO_PAGE_NOT_FOUND (0x00000404)',
  description: 'The page you were looking for moved to a parallel universe.',
  technicalInfo: 'If this keeps happening, try turning it off and on again. Or just go home.',
  buttonText: 'Reboot to Desktop',
};

// ---------------------------------------------------------------------------
// Skill Tree Quips
// ---------------------------------------------------------------------------

export const skillQuips: Record<string, string> = {
  'TypeScript': 'Types are just trust issues with your code.',
  'Python': 'Indentation as syntax? Bold move. I respect it.',
  'Java': 'AbstractSingletonProxyFactoryBean.java',
  'SQL': "SELECT confidence FROM skills WHERE name = 'SQL';",
  'React': 'useState(happy)',
  'Next.js': 'The framework that does everything. Literally.',
  'Tailwind CSS': 'className="text-sm font-medium text-actually-readable"',
  'Framer Motion': 'Making things move so you know the site is alive.',
  'Node.js': 'JavaScript on the server. What could go wrong?',
  'Express': "app.get('/job', (req, res) => res.send('hired'))",
  'Flask': 'Micro framework. Macro results.',
  'PostgreSQL': 'The database that does what you actually mean.',
  'AWS': "Someone else's computer. Professionally.",
  'Docker': 'Works on my machine. Now it works on yours too.',
  'Terraform': 'Infrastructure as code. Destroy with one command.',
  'Kubernetes': 'Container orchestration. Over-engineering, elegantly.',
  'CI/CD': 'Push and pray. But automatically.',
  'Git': 'git commit -m "fixed it for real this time"',
  'Go': 'if err != nil { return err } // repeat 47 times',
};
