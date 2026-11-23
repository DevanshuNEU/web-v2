/**
 * Which chapters this version ships. A level can be built (its data and art
 * exist) before its chapter is released; until then the map shows the
 * chapter as Coming soon and the story ends after the last released level.
 * Raise this when a chapter has passed its phone checkpoint.
 */

import type { StoryEntry } from '../sim/story';

export const RELEASED_CHAPTERS = 4;

/** Built and in a released chapter. */
export function released(e: StoryEntry): boolean {
  return e.built && e.world <= RELEASED_CHAPTERS;
}
