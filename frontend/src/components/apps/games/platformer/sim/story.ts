/**
 * Story mode's running order: one row per level, in play order. `world` is
 * the chapter. Chapters 1 (Austin), 2 (the trip), 3 (Northeastern) and 4
 * (Boston nights, all but the gorilla) are built; the rest are placeholders
 * until their levels exist. Built is not released: ui/release.ts decides
 * which chapters ship. `cardId` names
 * the story card the view shows after the level (see story/text.ts).
 */

import type { LevelDef, WorldTheme } from './levels';
import { AUSTIN } from './story/austin';
import { TRIP } from './story/trip';
import { CAMPUS } from './story/campus';
import { BOSTON } from './story/boston';

export interface StoryEntry {
  id: string;
  world: number;
  /** Level number in its world (the gorilla is the 5th of world 4). */
  level: number;
  name: string;
  theme: WorldTheme;
  cardId: string;
  /** False until the level is made. */
  built: boolean;
}

const entry = (id: string, world: number, level: number, name: string, theme: WorldTheme, built = false, cardId = `card-${id}`): StoryEntry =>
  ({ id, world, level, name, theme, cardId, built });

/** Season 1: her trip from Austin to Boston, then home. Chapters 1 to 4 are built, the gorilla aside. */
export const STORY: readonly StoryEntry[] = [
  entry('1-1', 1, 1, 'First Steps on Congress', 'austin', true),
  entry('1-2', 1, 2, 'Sixth Street', 'austin', true),
  entry('1-3', 1, 3, 'Bat Bridge', 'austin', true),
  // Chapter 2, the trip (wall jump shrine in 2-1).
  entry('2-1', 2, 1, 'Departures', 'airport', true),
  entry('2-2', 2, 2, 'Red-Eye', 'clouds', true),
  // Chapter 3, Northeastern (dash shrine in 3-1).
  entry('3-1', 3, 1, 'Huntington Avenue', 'campus', true),
  entry('3-2', 3, 2, 'Snell After Midnight', 'library', true),
  entry('3-3', 3, 3, 'Over the Tracks', 'tracks', true),
  // Chapter 4, Boston nights, and the gorilla.
  entry('4-1', 4, 1, 'Newbury Street', 'newbury', true),
  entry('4-2', 4, 2, 'The Charles', 'river', true),
  entry('4-3', 4, 3, 'Seaport Sunrise', 'harbor', true),
  entry('4-4', 4, 4, 'Revere Beach', 'beach', true),
  entry('4-boss', 4, 5, 'The Ex-Bestie', 'rooftops', false, 'card-boss'),
  // Chapter 5, Jamaica Plain.
  entry('5-1', 5, 1, 'Jamaica Pond', 'rooftops'),
  entry('5-2', 5, 2, 'Home', 'rooftops'),
  // Chapter 6, the concert, then the season boss.
  entry('6-1', 6, 1, 'The Headliner', 'stars'),
  entry('season-boss', 7, 1, 'Job Hunting', 'stars'),
];

const BUILT: Readonly<Record<string, LevelDef>> = { ...AUSTIN, ...TRIP, ...CAMPUS, ...BOSTON };

/** The level data of a built story level. */
export function storyLevelDef(id: string): LevelDef {
  const def = BUILT[id];
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
