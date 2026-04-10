/**
 * Spotlight Search Index
 *
 * Builds a flat, searchable list of items from all portfolio data sources.
 * Consumed by the Spotlight component for fuzzy search.
 *
 * Categories:
 *   app      — devOS apps (open a window)
 *   project  — portfolio projects (open Projects app and select)
 *   skill    — technical skills (open Skills Dashboard)
 *   command  — terminal commands (open Terminal)
 *
 * To add new searchable content, add entries to the appropriate section below
 * or add a new category. The Spotlight component renders whatever's here.
 */

import type { AppType } from '../../../shared/types';
import { appRegistry, getAppLabel } from './appRegistry';
import { projectMeta } from '@/data/projectMeta';
import portfolioData from '@/data/portfolio.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpotlightCategory = 'app' | 'project' | 'skill' | 'command';

export interface SpotlightItem {
  id: string;
  category: SpotlightCategory;
  title: string;
  subtitle: string;
  /** What to do when the user selects this item */
  action: SpotlightAction;
  /** Keywords that boost match score (not shown in UI) */
  keywords?: string[];
}

export type SpotlightAction =
  | { type: 'openApp';     appType: AppType }
  | { type: 'openTerminal'; command: string }
  | { type: 'openProjects' };   // opens Projects app (project detail handled by app)

// ---------------------------------------------------------------------------
// Index builders
// ---------------------------------------------------------------------------

function buildAppItems(): SpotlightItem[] {
  return (Object.keys(appRegistry) as AppType[]).map(appType => {
    const label = getAppLabel(appType);
    return {
      id:       `app:${appType}`,
      category: 'app',
      title:    label.title,
      subtitle: label.description,
      action:   { type: 'openApp', appType },
      keywords: [appType, label.windowTitle],
    };
  });
}

function buildProjectItems(): SpotlightItem[] {
  return Object.entries(projectMeta).map(([name, meta]) => ({
    id:       `project:${name}`,
    category: 'project',
    title:    meta.displayName,
    subtitle: meta.tagline,
    action:   { type: 'openProjects' },
    keywords: [...(meta.extraTech ?? []), meta.status, meta.category, name],
  }));
}

function buildSkillItems(): SpotlightItem[] {
  const items: SpotlightItem[] = [];
  const categories = portfolioData.skills?.categories ?? [];

  for (const cat of categories) {
    for (const skill of cat.skills ?? []) {
      items.push({
        id:       `skill:${skill.name}`,
        category: 'skill',
        title:    skill.name,
        subtitle: `${cat.name} · ${(skill as { experience?: string }).experience ?? ''}`,
        action:   { type: 'openApp', appType: 'skills-dashboard' },
        keywords: [cat.name],
      });
    }
  }
  return items;
}

function buildCommandItems(): SpotlightItem[] {
  // Curated list of the most useful/interesting terminal commands
  const commands: Array<{ cmd: string; description: string }> = [
    { cmd: 'help',           description: 'Show all available commands' },
    { cmd: 'about',          description: 'Who I am' },
    { cmd: 'projects',       description: 'List what I\'ve built' },
    { cmd: 'skills',         description: 'Technical skills overview' },
    { cmd: 'hire devanshu',  description: 'A very good idea' },
    { cmd: 'tour',           description: 'Start the recruiter tour' },
    { cmd: 'neofetch',       description: 'System info, devOS style' },
    { cmd: 'matrix',         description: 'Do the thing' },
    { cmd: 'secret',         description: '???' },
    { cmd: 'github',         description: 'GitHub stats and links' },
  ];

  return commands.map(({ cmd, description }) => ({
    id:       `cmd:${cmd}`,
    category: 'command',
    title:    cmd,
    subtitle: description,
    action:   { type: 'openTerminal', command: cmd },
    keywords: [],
  }));
}

// ---------------------------------------------------------------------------
// Full index (built once, reused on every search)
// ---------------------------------------------------------------------------

let _index: SpotlightItem[] | null = null;

export function getSpotlightIndex(): SpotlightItem[] {
  if (!_index) {
    _index = [
      ...buildAppItems(),
      ...buildProjectItems(),
      ...buildSkillItems(),
      ...buildCommandItems(),
    ];
  }
  return _index;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Fuzzy-ish search: scores each item against the query using substring match
 * on title, subtitle, and keywords. Returns top results grouped by category,
 * capped at maxPerCategory per group.
 */
export function searchSpotlight(
  query: string,
  maxPerCategory = 3
): SpotlightItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const index = getSpotlightIndex();

  // Score each item
  const scored = index.map(item => {
    const title    = item.title.toLowerCase();
    const subtitle = item.subtitle.toLowerCase();
    const keywords = (item.keywords ?? []).join(' ').toLowerCase();

    let score = 0;

    // Exact title match = highest score
    if (title === q)                score += 100;
    // Title starts with query
    else if (title.startsWith(q))   score += 60;
    // Title contains query
    else if (title.includes(q))     score += 40;
    // Subtitle contains query
    if (subtitle.includes(q))       score += 20;
    // Keywords contain query
    if (keywords.includes(q))       score += 10;

    return { item, score };
  });

  // Filter out zero-score items, sort descending
  const matches = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // Group by category, cap each group
  const counts: Partial<Record<SpotlightCategory, number>> = {};
  const results: SpotlightItem[] = [];

  for (const { item } of matches) {
    const count = counts[item.category] ?? 0;
    if (count < maxPerCategory) {
      results.push(item);
      counts[item.category] = count + 1;
    }
  }

  return results;
}
