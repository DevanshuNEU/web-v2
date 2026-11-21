// Pixel art as data: one character per pixel, '.' is clear, every other
// character is a palette key. Authored with a scratch generator, then
// committed as plain grids: edit the rows here directly.
//
// Chapter 3 enemies, facing right (the engine mirrors), anchor bottom
// centre. The sim kinds do not change: the renderer picks these for the
// campus, library and tracks themes. scooter (the walker, 16 x 16): a
// riderless rogue e-scooter, its headlight glaring like an eye under a
// hooded brow, a teal deck light pooling on the ground; roll 4 (tyres turn,
// the stem nods), squashed 1 (folded flat, a spark). ticketDrone (the
// flyer, 16 x 16): a small quadcopter that prints parking tickets, a slip
// feeding out of its slot and a flashing amber beacon; hover 2 (rotors and
// the beacon blink), dive 1 (the beacon and lens turn red, the slip
// flutters long), dead 1 (rotors stopped, smoke, the slip torn).
//
// CAMPUS_ENEMY_GLOW lists the keys that glow: C D deck light, W T
// headlight, S amber, R red, and the halos J H I K *.
import type { Palette, SpriteSet } from './types';

export type ScooterAnim = 'roll' | 'squashed';
export type FlyerAnim = 'hover' | 'dive' | 'dead';

export const CAMPUS_ENEMY_PALETTE: Palette = {
  0: '#07060e',
  j: '#11131e',
  k: '#1d2131',
  l: '#30364b',
  m: '#4a536e',
  n: '#7a86a4',
  o: '#c0cade',
  a: '#0b0b11',
  b: '#1b1b25',
  u: '#3a3a50',
  v: '#5e5e7a',
  w: '#9898b2',
  e: '#d2d2e2',
  f: '#c8662a',
  F: '#7a3a16',
  x: '#ece6d4',
  y: '#b6ae9a',
  z: '#6e6a60',
  C: '#5ff0d0',
  D: '#d8fff4',
  W: '#fffbe8',
  T: '#ffe2a0',
  S: '#ffb347',
  U: '#6e421c',
  R: '#ff4a4a',
  P: '#6a1420',
  J: 'rgba(95,240,208,0.32)',
  H: 'rgba(95,240,208,0.14)',
  I: 'rgba(255,226,160,0.34)',
  K: 'rgba(255,179,71,0.32)',
  '*': 'rgba(255,74,74,0.34)',
  q: 'rgba(200,210,235,0.45)',
  g: 'rgba(120,116,150,0.45)',
};

/** Keys of CAMPUS_ENEMY_PALETTE that glow. */
export const CAMPUS_ENEMY_GLOW = 'CDWTSRJHIK*';

const scooter: SpriteSet<ScooterAnim> = {
  size: { w: 16, h: 16 },
  anchor: { x: 8, y: 16 },
  palette: CAMPUS_ENEMY_PALETTE,
  anims: {
    roll: {
      fps: 12,
      loop: true,
      frames: [
        [
          '................',
          '........knnnnn..',
          '........kl.nmkk.',
          '...........nmWWI',
          '...........nmTlI',
          '..........lnm...',
          '..........Snm...',
          '..........lnm...',
          '..........lnm...',
          'mnnoooooooonn...',
          'l.Rmmmmmmmmmm...',
          '.mkkkkkkkkkkkla.',
          'alnlaCCDDCCalnla',
          'anona......anona',
          'alnla......alnla',
          '.aaaHJJJJJJHaam.',
        ],
        [
          '................',
          '................',
          '.........knnnnn.',
          '.........kl.nmkk',
          '............nmWW',
          '............nmTl',
          '..........l.nm..',
          '..........Snm...',
          '..........lnm...',
          '..........lnm...',
          'mnnoooooooonn...',
          'laRmmmmmmmmmmaa.',
          'alkkkkkkkkkkklla',
          'anonaCCDDCCanona',
          'alnla......mlnla',
          '.aaaHJJJJJJHaaa.',
        ],
        [
          '................',
          '........knnnnn..',
          '........kl.nmkk.',
          '...........nmWWI',
          '...........nmTlI',
          '..........lnm...',
          '..........Snm...',
          '..........lnm...',
          '..........lnm...',
          'mnnoooooooonn...',
          'l.Rmmmmmmmmmm...',
          '.akkkkkkkkkkkla.',
          'alnlaCCDDCCalnla',
          'anona......anona',
          'alnla......alnla',
          '.aamHJJJJJJHaaa.',
        ],
        [
          '................',
          '................',
          '........knnnnn..',
          '........kl.nmkk.',
          '...........nmWWI',
          '...........nmTlI',
          '..........lnm...',
          '..........Snm...',
          '..........lnm...',
          '..........lnm...',
          'mnnoooooooonn...',
          'laRmmmmmmmmmmaa.',
          'alkkkkkkkkkkkllm',
          'anonaCCDDCCanona',
          'mlnla......alnla',
          '.aaaHJJJJJJHaaa.',
        ],
      ],
    },
    squashed: {
      fps: 0,
      loop: false,
      frames: [
        [
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '....W...........',
          '...I.T..........',
          '...mmmmmmmmmmmkU',
          '.nnnnnnnnnnnnnmk',
          '.lllllJllPlllll.',
          '.abbaaaaaaaabba.',
        ],
      ],
    },
  },
};

const ticketDrone: SpriteSet<FlyerAnim> = {
  size: { w: 16, h: 16 },
  anchor: { x: 8, y: 16 },
  palette: CAMPUS_ENEMY_PALETTE,
  anims: {
    hover: {
      fps: 8,
      loop: true,
      frames: [
        [
          '................',
          '................',
          'wqqqw......wqqqw',
          '..l....KK....l..',
          '..m...KSSK...m..',
          '...uueeeeeeuu...',
          '....ewwwwwjS....',
          '....wwwwwwjk....',
          '....ffffffFF....',
          '....wwwwwwvu....',
          '....vvvvvvuu....',
          '.....uukkuu.....',
          '......xxxy......',
          '......xzzy......',
          '................',
          '................',
        ],
        [
          '................',
          '................',
          'qwwwqq....qqwwwq',
          '..l..........l..',
          '..m....UU....m..',
          '...uueeeeeeuu...',
          '....ewwwwwjS....',
          '....wwwwwwjk....',
          '....ffffffFF....',
          '....wwwwwwvu....',
          '....vvvvvvuu....',
          '.....uukkuu.....',
          '......xxxy......',
          '......xzzy......',
          '......xxxy......',
          '................',
        ],
      ],
    },
    dive: {
      fps: 0,
      loop: false,
      frames: [
        [
          '................',
          '................',
          'qwwwqq..........',
          '..l.......qqwwwq',
          '..m....**....l..',
          '...uuuuRR*...m..',
          '.....eeeeeeuu...',
          '....ewwwwwjR....',
          '....wwwwwwjk....',
          '....ffffffFF....',
          '....wwwwwwvu....',
          '....vvvvvvuu....',
          '.....uukkuu.....',
          '......xxxy......',
          '......xzzy......',
          '......xxxy......',
        ],
      ],
    },
    dead: {
      fps: 0,
      loop: false,
      frames: [
        [
          '.......g........',
          '......g.........',
          '.....g....g.....',
          '.........g......',
          '.vl....UU...vl..',
          '..mv.eeeeee..mv.',
          '...uewwwwwzju...',
          '....wwwwwwjz....',
          '....ffffffFF....',
          '....wwwwwwvu....',
          '....vvvvvvuu....',
          '.....uukkuu.....',
          '......xxxy......',
          '................',
          '................',
          '................',
        ],
      ],
    },
  },
};

export const CAMPUS_ENEMIES: {
  scooter: SpriteSet<ScooterAnim>;
  ticketDrone: SpriteSet<FlyerAnim>;
} = { scooter, ticketDrone };
