/**
 * Story mode's running order: one row per level, in play order. `world` is
 * the chapter. Chapter 1 (Austin) is built; the rest are placeholders until
 * their levels exist. `cardId` names the story card the view shows before
 * the level.
 */

import type { LevelDef, WorldTheme } from './levels';
import { AUSTIN } from './story/austin';

export interface StoryEntry {
  id: string;
  world: number;
  /** Level number in its world (the boss is the 4th of world 3). */
  level: number;
  name: string;
  theme: WorldTheme;
  cardId: string;
  /** False until the level is made. */
  built: boolean;
}

const entry = (id: string, world: number, level: number, name: string, theme: WorldTheme, built = false): StoryEntry =>
  ({ id, world, level, name, theme, cardId: `card-${id}`, built });

/** Season 1: her trip from Austin to Boston. Only chapter 1 is built. */
export const STORY: readonly StoryEntry[] = [
  entry('1-1', 1, 1, 'First Steps on Congress', 'austin', true),
  entry('1-2', 1, 2, 'Sixth Street', 'austin', true),
  entry('1-3', 1, 3, 'Bat Bridge', 'austin', true),
  // Chapter 2, the trip (wall jump shrine). Themes are placeholders until their tilesets exist.
  entry('2-1', 2, 1, 'Departures', 'sky'),
  entry('2-2', 2, 2, 'The Flight', 'sky'),
  // Chapter 3, Boston (dash shrine), and the boss.
  entry('3-1', 3, 1, 'Back Bay', 'rooftops'),
  entry('3-2', 3, 2, 'The Charles', 'rooftops'),
  entry('3-3', 3, 3, 'Seaport', 'rooftops'),
  entry('3-boss', 3, 4, 'The Ex-Bestie', 'rooftops'),
  // Chapter 4, the concert, then the season boss.
  entry('4-1', 4, 1, 'The Headliner', 'stars'),
  entry('season-boss', 5, 1, 'Job Hunting', 'stars'),
];

/** The level data of a built story level. */
export function storyLevelDef(id: string): LevelDef {
  const def = (AUSTIN as Readonly<Record<string, LevelDef>>)[id];
  if (!def) throw new Error(`story level ${id} is not built yet`);
  return def;
}

export function storyEntry(id: string): StoryEntry {
  const e = STORY.find(s => s.id === id);
  if (!e) throw new Error(`no story level ${id}`);
  return e;
}

/** The level after `id` in story order, or null after the last. */
export function nextStoryId(id: string): string | null {
  const i = STORY.findIndex(s => s.id === id);
  return i >= 0 && i + 1 < STORY.length ? STORY[i + 1].id : null;
}
