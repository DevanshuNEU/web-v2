/**
 * 4-boss, The Ex-Bestie: the gorilla on the cable-stayed bridge in the
 * morning (theme zakim). An arena of its own, fought by ../boss.ts.
 *
 *   Approach (columns 0 to 9): the deck, a lamp, a coin arc, and the
 *       Cannoli Shield (v) right at the entrance.
 *   Left tower (10, 11): stone above a doorway; the entry gate (z) in it
 *       shuts behind her when the fight starts. The checkpoint (K) is the
 *       arena door (column 12): a death restarts the fight there.
 *   Arena (12 to 41, 30 columns): the deck. A cable (/) runs down from each
 *       tower, one tile every two columns, from row 6 at the tower to row 10
 *       (left 13 to 22, right 32 to 41), with coins up each; their tops are
 *       his perches in phase 3, and she can hop up them. Debris spots (:) at
 *       17, 23, 30 and 36 on row 0. The gorilla (Y) waits at 30.
 *   Right tower (42, 43) with the exit gate (Z), shut until he is beaten.
 *   Exit (44 to 55): the deck on toward the city, a coin arc, the goal.
 */

import type { LevelDef } from '../levels';

export const BOSS_LEVEL: Readonly<Record<'4-boss', LevelDef>> = {
  '4-boss': {
    id: 5, label: 'Chapter 4, Boston nights', name: 'The Ex-Bestie', theme: 'zakim', sky: 'morning', par: 75,
    rows: [
      '..........XX.....:.....:......:.....:.....XX............',
      '..........XX..............................XX............',
      '..........XX..............................XX............',
      '..........XX..............................XX............',
      '..........XX..............................XX............',
      '..........XX..o.........................o.XX............',
      '..........XX.//.o.....................o.//XX........G...',
      '..........XX...//.o.................o.//..XX............',
      '.....oo....z.....//.................//....Z....oo.......',
      '....o..o...z.......//.............//......Z...o..o......',
      '...........z.........//.........//........Z.............',
      '..P..T..v..zK.................Y...........Z..T..........',
      '========================================================',
      '########################################################',
    ],
  },
};
