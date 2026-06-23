/**
 * Spotlight presentation maps — shared by the desktop command surface
 * (os/Spotlight.tsx) and the mobile one (mobile/MobileSpotlight.tsx).
 *
 * The index in `spotlightIndex.ts` carries the data; these maps carry how each
 * category reads in the editorial-mono command surface (label, action tag,
 * glyph) plus the curated idle "Jump to" set. Keeping them here means the two
 * surfaces can never drift out of sync.
 */

import type { SpotlightCategory } from './spotlightIndex';

export const CATEGORY_LABEL: Record<SpotlightCategory, string> = {
  app: 'Apps', project: 'Projects', skill: 'Skills', command: 'Commands',
};

export const CATEGORY_TAG: Record<SpotlightCategory, string> = {
  app: 'OPEN', project: 'OPEN', skill: 'VIEW', command: 'RUN',
};

export const GLYPH: Record<SpotlightCategory, string> = {
  app: '▸', project: '▸', skill: '▸', command: '›',
};

/** Category render order — search results group under headers in this order. */
export const CATEGORY_ORDER: SpotlightCategory[] = ['app', 'project', 'skill', 'command'];

/** Curated idle suggestions, looked up from the live index by id. */
export const SUGGESTED_IDS = [
  'app:about-me',
  'app:projects',
  'app:skills-dashboard',
  'cmd:hire devanshu',
  'app:terminal',
];
