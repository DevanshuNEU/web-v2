/**
 * Story mode's words: the cards between levels and the captions on the
 * memories. These are the generic lines that ship in the repo; a device that
 * holds the crown code gets personal lines from the server, passed in as
 * `overrides` (same ids), which replace these one by one.
 *
 * Season 1 is her trip from Austin to Boston and home: Austin, the trip,
 * Northeastern, Boston nights (with the gorilla), Jamaica Plain, the concert,
 * then the season boss. Ids: cards `card-<chapter>-intro` (before a
 * chapter's first level), `card-<level>` (after it), `card-boss` (after the
 * gorilla, level id `4-boss`), `card-season-boss`, `card-ending`; captions
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
  'card-2-intro': 'The terminal sleeps.\nRain runs down the glass.\nWalls are for climbing.',
  'card-2-1': 'The board says boarding.\nA window seat, a blanket,\nthe engines start to hum.',
  'card-2-2': 'You dreamed of clouds.\nYou wake to Boston, gold\non black. Wheels down.',
  // Chapter 3, Northeastern
  'chapter-3': 'Northeastern',
  'card-3-intro': 'Boston at last, and late.\nRed brick, cold air.\nThe fastest way is a dash.',
  'card-3-1': 'The trolley sighs away.\nThe library is lit up,\nlike it never sleeps.',
  'card-3-2': 'Quiet floors, warm lamps.\nA window full of campus.\nThe tracks shine below.',
  'card-3-3': 'The bridge over the tracks.\nThe city glows ahead.\nKeep going.',
  // Chapter 4, Boston nights, and the gorilla
  'chapter-4': 'Boston nights',
  'card-4-intro': 'Back Bay after dark.\nBrick, iron, warm windows.\nAwnings make good springs.',
  'card-4-1': 'The street ends in trees.\nThe river smells close.\nFog is rolling in.',
  'card-4-2': 'Oars in the fog, a bridge\nlit up like a necklace.\nThe sky starts to pale.',
  'card-4-3': 'Planes over the harbor,\nthe sky gone pink and gold.\nOne more stop by the sea.',
  'card-4-4': 'Sand in your shoes,\ngulls on every rail.\nThe bridge is waking up.',
  'card-boss': 'Someone old and loud\nstands in the way.\nYou do not look away.',
  // Chapter 5, Jamaica Plain
  'chapter-5': 'Jamaica Plain',
  'card-5-intro': 'Morning on the pond.\nGeese, rowboats, old trees.\nHome is close now.',
  'card-5-1': 'Leaves on the water.\nA bench in the sun.',
  'card-5-2': 'A porch light, still on.\nThe door opens.',
  // Chapter 6, the concert, then the season boss
  'chapter-6': 'The concert',
  'card-6-intro': 'A stadium hums at night.\nThe show cannot start\nuntil you get there.',
  'card-6-1': 'The lights come up.\nSo does the crowd.',
  'chapter-7': 'Season end',
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
  'mem-2-1-a': 'Coffee at the gate.',
  'mem-2-1-b': 'Every board said delayed.',
  'mem-2-1-c': 'A text that said land safe.',
  'mem-2-2-a': 'A window seat, saved.',
  'mem-2-2-b': 'Clouds like a blanket.',
  'mem-2-2-c': 'Falling asleep mid sentence.',
  'mem-3-1-a': 'String lights on the Common.',
  'mem-3-1-b': 'Riding the Green Line home.',
  'mem-3-1-c': 'Coffee on the library steps.',
  'mem-3-2-a': 'Notes in two colors of pen.',
  'mem-3-2-b': 'Studying until it got light.',
  'mem-3-2-c': 'A quiet corner, two chairs.',
  'mem-3-3-a': 'Waiting for the last train.',
  'mem-3-3-b': 'Every signal turned green.',
  'mem-3-3-c': 'The city from the bridge.',
  'mem-4-1-a': 'Sitting on a stoop till two.',
  'mem-4-1-b': 'Hot chocolate, two spoons.',
  'mem-4-1-c': 'A secret garden on a roof.',
  'mem-4-2-a': 'Bare feet over the dock.',
  'mem-4-2-b': 'Sails like folded paper.',
  'mem-4-2-c': 'An echo under the bridge.',
  'mem-4-3-a': 'Lobster rolls, too many.',
  'mem-4-3-b': 'The whole harbor at once.',
  'mem-4-3-c': 'Boats with tiny lights.',
  'mem-4-4-a': 'A sand castle with a moat.',
  'mem-4-4-b': 'Fries stolen by a gull.',
  'mem-4-4-c': 'The tide coming in.',
  'mem-5-1-a': 'Geese with no manners.',
  'mem-5-1-b': 'Leaves the color of fire.',
  'mem-5-1-c': 'A lap around the pond.',
  'mem-5-2-a': 'Keys on the hook.',
  'mem-5-2-b': 'A kettle on the stove.',
  'mem-5-2-c': 'The light left on.',
  'mem-6-1-a': 'Matching wristbands.',
  'mem-6-1-b': 'Singing every word wrong.',
  'mem-6-1-c': 'The last song, together.',
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
  if (levelId === 'boss' || /^\d+-boss$/.test(levelId)) return 'card-boss';
  if (levelId === 'secret') return 'card-ending';
  return `card-${levelId}`;
}

export function memoryCaptionId(memoryId: string): string {
  return `mem-${memoryId}`;
}
