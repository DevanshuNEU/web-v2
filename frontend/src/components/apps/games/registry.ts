/**
 * The arcade's game list. The launcher renders it in this order and the root
 * routes by `id`. `board` names the global leaderboard a game posts to.
 */

import type { ArcadeGame } from './leaderboard/api';

export type GameId = 'launcher' | 'boards' | 'platformer' | 'snake' | 'stacker' | 'merge' | 'tetris' | 'typeracer';
export type PlayableId = Exclude<GameId, 'launcher' | 'boards'>;

export interface GameCard {
  id: PlayableId;
  title: string;
  subtitle: string;
  controls: string;
  controlsMobile: string;
  /** localStorage key for the best score on this device. */
  hsKey: string;
  hsLabel: string;
  board?: ArcadeGame;
}

export const GAMES: readonly GameCard[] = [
  {
    id: 'platformer',
    title: 'Baguettino Run',
    subtitle: 'A buff baguette, three worlds, one flag.',
    controls: 'Arrows or A and D to run. Space or W to jump.',
    controlsMobile: 'Left thumb runs, right thumb jumps',
    hsKey: 'devos-platformer-hs',
    hsLabel: 'pts',
    board: 'platformer',
  },
  {
    id: 'snake',
    title: 'Sigma Snake',
    subtitle: 'Eat the memes. Do not eat yourself.',
    controls: 'Arrow keys or WASD. Space pauses.',
    controlsMobile: 'Swipe anywhere to steer',
    hsKey: 'devos-snake-hs',
    hsLabel: 'pts',
    board: 'snake',
  },
  {
    id: 'stacker',
    title: 'Aura Tower',
    subtitle: 'Stack the cursed slabs as high as your aura allows.',
    controls: 'Space or click to drop.',
    controlsMobile: 'Tap anywhere to drop',
    hsKey: 'devos-stacker-hs',
    hsLabel: 'floors',
    board: 'stacker',
  },
  {
    id: 'merge',
    title: 'Brainrot Evolution',
    subtitle: 'Merge two of a kind until the Moon Gigachad shows up.',
    controls: 'Arrow keys or WASD to slide.',
    controlsMobile: 'Swipe to slide',
    hsKey: 'devos-merge-hs',
    hsLabel: 'pts',
    board: 'merge',
  },
  {
    id: 'tetris',
    title: 'Tetris',
    subtitle: "The programmer's meditation",
    controls: 'Arrows move and rotate. Space drops. P pauses.',
    controlsMobile: 'Tap controls',
    hsKey: 'devos-tetris-hs',
    hsLabel: 'pts',
  },
  {
    id: 'typeracer',
    title: 'Type Racer',
    subtitle: 'Code faster than your linter',
    controls: 'Type the snippet. The timer starts on your first key.',
    controlsMobile: 'Tap to type',
    hsKey: 'devos-typeracer-hs',
    hsLabel: 'WPM',
  },
];

export const BOARD_GAMES = GAMES.filter((g): g is GameCard & { board: ArcadeGame } => !!g.board);
