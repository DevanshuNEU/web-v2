/**
 * Story mode's words: the cards between levels and the captions on the
 * memories. These are the generic lines that ship in the repo; a device that
 * holds the crown code gets personal lines from the server, passed in as
 * `overrides` (same ids), which replace these one by one.
 *
 * Season 1 is her trip from Austin to Boston. Ids: cards
 * `card-<chapter>-intro` (before a chapter's first level), `card-<level>`
 * (after it), `card-boss`, `card-season-boss`, `card-ending`; captions
 * `mem-<memory id>`; chapter titles `chapter-<n>`; names
 * `boss-gorilla-name`, `concert-headliner-name`. Cards are 2 or 3 lines,
 * captions one; every line fits the pixel font on a phone (28 characters).
 */

export const STORY_TEXT: Readonly<Record<string, string>> = {
  // Chapter 1, Austin at night
  'chapter-1': 'Austin',
  'card-1-intro': 'A bag by the door.\nA ticket on the phone.\nBoston is a long way off.',
  'card-1-1': 'The roofs know your feet.\nEvery jump, a little\ncloser to the airport.',
  'card-1-2': 'Sixth Street hums below.\nYou keep your eyes on\nthe bright line ahead.',
  'card-1-3': 'The bats rise like smoke.\nThe city waves goodbye.\nThe shuttle is waiting.',
  // Chapter 2, the trip
  'chapter-2': 'The trip',
  'card-2-intro': 'Gate after gate,\nthe night gets longer.\nYou learn to climb.',
  'card-2-1': 'The terminal sleeps.\nYou do not.',
  'card-2-2': 'Clouds under the wing.\nSomewhere, he is awake too.',
  // Chapter 3, Boston
  'chapter-3': 'Boston',
  'card-3-intro': 'Cold air, old bricks.\nThe river shines black.\nYou learn to move fast.',
  'card-3-1': 'The streets bend in circles.\nYou find your own way.',
  'card-3-2': 'The Charles keeps\nthe lights of the city.',
  'card-3-3': 'Salt in the wind.\nAlmost there.',
  'card-boss': 'Someone old and loud\nstands in the way.\nYou do not look away.',
  // Chapter 4, the concert
  'chapter-4': 'The concert',
  'card-4-intro': 'A stadium hums at night.\nThe show cannot start\nuntil you get there.',
  'card-4-1': 'The lights come up.\nSo does the crowd.',
  'card-season-boss': 'Every inbox in the world\nrises into one shape.\nIt will be back.',
  'card-ending': 'The night was long.\nYou made it anyway.',

  // Names: public here, personal on a crowned device
  'boss-gorilla-name': 'The Ex-Bestie',
  'concert-headliner-name': 'The Headliner',

  // Memory captions, one line each
  'mem-1-1-a': 'The first hello.',
  'mem-1-1-b': 'Tacos at two in the morning.',
  'mem-1-1-c': 'A song we both knew.',
  'mem-1-2-a': 'Laughing at nothing.',
  'mem-1-2-b': 'Two straws, one drink.',
  'mem-1-2-c': 'Dancing badly, on purpose.',
  'mem-1-3-a': 'Watching the bats fly out.',
  'mem-1-3-b': 'A late walk by the lake.',
  'mem-1-3-c': 'The night we stayed up.',
  'mem-2-1-a': 'A window seat, saved.',
  'mem-2-1-b': 'Coffee at the gate.',
  'mem-2-1-c': 'A text that said land safe.',
  'mem-2-2-a': 'Clouds like a blanket.',
  'mem-2-2-b': 'A movie with no sound.',
  'mem-2-2-c': 'Falling asleep mid sentence.',
  'mem-3-1-a': 'The first cold breath.',
  'mem-3-1-b': 'Two hands, one pocket.',
  'mem-3-1-c': 'Snow that did not stick.',
  'mem-3-2-a': 'A bench by the river.',
  'mem-3-2-b': 'Rowers at sunrise.',
  'mem-3-2-c': 'The long way home.',
  'mem-3-3-a': 'Lobster rolls, too many.',
  'mem-3-3-b': 'Boats with tiny lights.',
  'mem-3-3-c': 'A promise by the water.',
  'mem-4-1-a': 'Matching wristbands.',
  'mem-4-1-b': 'Singing every word wrong.',
  'mem-4-1-c': 'The last song, together.',
};

/** The line for an id: a personal override when there is one, else the generic line, else ''. */
export function storyText(id: string, overrides?: Readonly<Record<string, unknown>> | null): string {
  const o = overrides?.[id];
  if (typeof o === 'string' && o.trim()) return o.trim();
  return STORY_TEXT[id] ?? '';
}

/** The card shown before a level: a world's intro before its first level, else none. */
export function cardIdBefore(levelId: string): string | null {
  const m = /^(\d+)-1$/.exec(levelId);
  return m ? `card-${m[1]}-intro` : null;
}

/** The card shown after a level. */
export function cardIdAfter(levelId: string): string {
  if (levelId === 'boss') return 'card-boss';
  if (levelId === 'secret') return 'card-ending';
  return `card-${levelId}`;
}

export function memoryCaptionId(memoryId: string): string {
  return `mem-${memoryId}`;
}
