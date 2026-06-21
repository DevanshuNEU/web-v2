/**
 * App Intents - behavior-free capability manifest.
 *
 * This is a STATIC declaration of what each devOS app can be asked to do.
 * It contains no behavior: no handlers, no functions that act, no store
 * wiring. A future command-palette or assistant executor reads this manifest
 * to discover the available intents per app and resolve them to real actions
 * at that layer. Adding an intent here only declares a capability; it does not
 * implement one.
 *
 * Intent kinds:
 *   open      - open the app's window
 *   filter    - narrow what the app shows (declares param names, not values)
 *   focus     - bring a specific item inside the app into view
 *   ask-about - ground the concierge/assistant on this app's data
 *
 * Every app implicitly supports 'open' and 'ask-about' (the concierge already
 * grounds on app data). Richer per-app intents are seeded incrementally, so it
 * is fine that not every AppType has an entry yet.
 *
 * The shape mirrors the register of SpotlightAction in spotlightIndex.ts
 * (namespaced ids, plain data) without importing from it.
 */

import type { AppType } from '../../../shared/types';

export type AppIntentKind = 'open' | 'filter' | 'focus' | 'ask-about';

export interface AppIntent {
  /** The app this intent belongs to. Must equal its key in appIntents. */
  appType: AppType;
  /** What category of capability this intent declares. */
  kind: AppIntentKind;
  /** Stable, namespaced id, e.g. 'projects.filter.tech'. Unique across the manifest. */
  id: string;
  /** Human label, surfaceable in a command palette later. */
  label: string;
  /** Declared param NAMES only, e.g. ['tech']. No values, no behavior. */
  params?: string[];
}

export const appIntents: Partial<Record<AppType, AppIntent[]>> = {
  'about-me': [
    { appType: 'about-me', kind: 'open', id: 'about-me.open', label: 'Open About Me' },
    { appType: 'about-me', kind: 'ask-about', id: 'about-me.ask-about', label: 'Ask about Devanshu' },
  ],
  'projects': [
    { appType: 'projects', kind: 'open', id: 'projects.open', label: 'Open Projects' },
    { appType: 'projects', kind: 'ask-about', id: 'projects.ask-about', label: 'Ask about the projects' },
    { appType: 'projects', kind: 'filter', id: 'projects.filter.tech', label: 'Filter projects by technology', params: ['tech'] },
    { appType: 'projects', kind: 'focus', id: 'projects.focus.project', label: 'Focus a specific project', params: ['projectId'] },
  ],
  'resume': [
    { appType: 'resume', kind: 'open', id: 'resume.open', label: 'Open Resume' },
    { appType: 'resume', kind: 'ask-about', id: 'resume.ask-about', label: 'Ask about the resume' },
  ],
  'contact': [
    { appType: 'contact', kind: 'open', id: 'contact.open', label: 'Open Contact' },
    { appType: 'contact', kind: 'ask-about', id: 'contact.ask-about', label: 'Ask how to get in touch' },
  ],
  'github-activity': [
    { appType: 'github-activity', kind: 'open', id: 'github-activity.open', label: 'Open GitHub Activity' },
    { appType: 'github-activity', kind: 'ask-about', id: 'github-activity.ask-about', label: 'Ask about GitHub activity' },
  ],
  'analytics': [
    { appType: 'analytics', kind: 'open', id: 'analytics.open', label: 'Open Analytics' },
    { appType: 'analytics', kind: 'ask-about', id: 'analytics.ask-about', label: 'Ask about the analytics' },
  ],
  'skills-dashboard': [
    { appType: 'skills-dashboard', kind: 'open', id: 'skills-dashboard.open', label: 'Open Skills Dashboard' },
    { appType: 'skills-dashboard', kind: 'ask-about', id: 'skills-dashboard.ask-about', label: 'Ask about the skills' },
    { appType: 'skills-dashboard', kind: 'filter', id: 'skills-dashboard.filter.category', label: 'Filter skills by category', params: ['category'] },
  ],
  'help': [
    { appType: 'help', kind: 'open', id: 'help.open', label: 'Open Help' },
    { appType: 'help', kind: 'ask-about', id: 'help.ask-about', label: 'Ask about this portfolio' },
  ],
  'changelog': [
    { appType: 'changelog', kind: 'open', id: 'changelog.open', label: 'Open Changelog' },
    { appType: 'changelog', kind: 'ask-about', id: 'changelog.ask-about', label: 'Ask what changed' },
  ],
  'display-options': [
    { appType: 'display-options', kind: 'open', id: 'display-options.open', label: 'Open Preferences' },
    { appType: 'display-options', kind: 'ask-about', id: 'display-options.ask-about', label: 'Ask about settings' },
  ],
  'terminal': [
    { appType: 'terminal', kind: 'open', id: 'terminal.open', label: 'Open Terminal' },
    { appType: 'terminal', kind: 'ask-about', id: 'terminal.ask-about', label: 'Ask about the terminal' },
  ],
  'file-explorer': [
    { appType: 'file-explorer', kind: 'open', id: 'file-explorer.open', label: 'Open Finder' },
    { appType: 'file-explorer', kind: 'ask-about', id: 'file-explorer.ask-about', label: 'Ask about the projects' },
    { appType: 'file-explorer', kind: 'filter', id: 'file-explorer.filter.category', label: 'Filter by category', params: ['category'] },
  ],
  'games': [
    { appType: 'games', kind: 'open', id: 'games.open', label: 'Open Arcade' },
    { appType: 'games', kind: 'ask-about', id: 'games.ask-about', label: 'Ask about the arcade' },
  ],
};
