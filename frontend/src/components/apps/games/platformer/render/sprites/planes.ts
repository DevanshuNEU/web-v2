// Pixel art as data: one character per pixel, '.' is clear, every other
// character is a palette key. Authored with a scratch generator, then
// committed as plain grids: edit the rows here directly.
//
// Small far-background planes, 24 x 10, nose to the right (mirror for
// left), anchor the centre. approach: nose a touch down, gear down, the
// landing light on; depart: climbing, gear up; taxi: level on the ground.
// Two frames each: the red beacon on, then off (fps 2). LANDING_LIGHT is a
// 3 x 3 bright dot for the landing light seen head on, anchor its centre.
// Neutral on purpose: used over every harbor level.
import type { Palette, SpriteSet } from './types';

export type PlaneAnim = 'approach' | 'depart' | 'taxi';

export const PLANES_PALETTE: Palette = {
  a: '#0e1024',
  b: '#181c38',
  c: '#252b50',
  d: '#353d68',
  e: '#4f5a8a',
  P: '#4a1420',
  R: '#ff3b3b',
  Z: '#3fe07a',
  W: '#ffffff',
  T: '#ffd88a',
  H: 'rgba(255,255,255,0.35)',
  '*': 'rgba(255,59,59,0.32)',
};

/** Keys of PLANES_PALETTE that glow. */
export const PLANES_GLOW = 'RZWTH*';

export const PLANES: SpriteSet<PlaneAnim> = {
  size: { w: 24, h: 10 },
  anchor: { x: 12, y: 5 },
  palette: PLANES_PALETTE,
  anims: {
    approach: {
      fps: 2,
      loop: true,
      frames: [
        [
          '.ed.....................',
          '.dce....................',
          '.dcce.......*...........',
          'Wcccdee.....R...........',
          'abcccTceeeeeeeeeee......',
          '.abbbbbccTcTcccTcceeee..',
          '..aaaaabbbbbbbbbbbTccdde',
          '.......aabbbbaZaaabbbcWH',
          '.........aaaa.....aaabH.',
          '..........a.........a...',
        ],
        [
          '.ed.....................',
          '.dce....................',
          '.dcce...................',
          'Wcccdee.....P...........',
          'abcccTceeeeeeeeeee......',
          '.abbbbbccTcTcccTcceeee..',
          '..aaaaabbbbbbbbbbbTccdde',
          '.......aabbbbaZaaabbbcWH',
          '.........aaaa.....aaabH.',
          '..........a.........a...',
        ],
      ],
    },
    depart: {
      fps: 2,
      loop: true,
      frames: [
        [
          '........................',
          '........................',
          '..d.........*...........',
          '.ece........R...eeeeee.e',
          '.dcce....eeeeeeeccTccdWH',
          '.dccdeeeeTcTcccTbbbbbcc.',
          'WccccTcccbbbbbbbaaaaab..',
          'abbbbbbbbbbbbaZa........',
          '.aaaaaaaaaaaa...........',
          '........................',
        ],
        [
          '........................',
          '........................',
          '..d.....................',
          '.ece........P...eeeeee.e',
          '.dcce....eeeeeeeccTccdWH',
          '.dccdeeeeTcTcccTbbbbbcc.',
          'WccccTcccbbbbbbbaaaaab..',
          'abbbbbbbbbbbbaZa........',
          '.aaaaaaaaaaaa...........',
          '........................',
        ],
      ],
    },
    taxi: {
      fps: 2,
      loop: true,
      frames: [
        [
          '........................',
          '.ed.....................',
          '.dce........*...........',
          '.dcce.......R...........',
          'Wcccdeeeeeeeeeeeeeeeee..',
          'abcccTcccTcTcccTccTccdde',
          '.abbbbbbbbbbbbbbbbbbbcTd',
          '..aaaaaaabbbbaZaaaaaab..',
          '.........aaaa.......a...',
          '..........a.........a...',
        ],
        [
          '........................',
          '.ed.....................',
          '.dce....................',
          '.dcce.......P...........',
          'Wcccdeeeeeeeeeeeeeeeee..',
          'abcccTcccTcTcccTccTccdde',
          '.abbbbbbbbbbbbbbbbbbbcTd',
          '..aaaaaaabbbbaZaaaaaab..',
          '.........aaaa.......a...',
          '..........a.........a...',
        ],
      ],
    },
  },
};

export const LANDING_LIGHT: SpriteSet<'idle'> = {
  size: { w: 3, h: 3 },
  anchor: { x: 1, y: 1 },
  palette: PLANES_PALETTE,
  anims: {
    idle: {
      fps: 0,
      loop: false,
      frames: [
        [
          '.H.',
          'HWH',
          '.H.',
        ],
      ],
    },
  },
};
