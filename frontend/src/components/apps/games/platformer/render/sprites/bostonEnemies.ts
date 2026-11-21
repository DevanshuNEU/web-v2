// Pixel art as data: one character per pixel, '.' is clear, every other
// character is a palette key. Authored with a scratch generator, then
// committed as plain grids: edit the rows here directly.
//
// Chapter 4 enemies, facing right (the engine mirrors), anchor bottom
// centre. The renderer picks these for the newbury, river, harbor and beach
// themes. Comic menace: not cute, not scary.
//
// pigeon (the walker, 16 x 12): a fat city pigeon, chest out, iridescent
// neck, an orange glare under a scowling brow. hop 4 frames, fps 8, loop:
// crouch, spring, aloft (wing flapped, dust kicked), land; the sim hops
// every 1.2 s, so play the cycle once per hop (or map the hop's phase to the
// frame) and hold frame 0 between hops. squashed 1 (flattened, feathers and
// a dazed star).
//
// gull (the flyer, 16 x 16): a herring gull, white head, grey mantle, black
// wingtips with a white mirror, a yellow beak with the red spot, a pale
// glaring eye under a heavy brow. hover 2 frames, fps 6, loop (wings up,
// wings down); swoop 2 frames, fps 10, loop (wings swept back, beak open,
// talons out, speed lines); dead 1 (on its back, x eyes, feathers).
//
// BOSTON_ENEMY_GLOW lists the keys that glow: m n the pigeon's eye, y the
// gull's eye, z A the dazed star.
import type { Palette, SpriteSet } from './types';

export type PigeonAnim = 'hop' | 'squashed';
export type GullAnim = 'hover' | 'swoop' | 'dead';

export const BOSTON_ENEMY_PALETTE: Palette = {
  0: '#08070e',
  a: '#22222e',
  b: '#3a3a4c',
  c: '#5a5a70',
  d: '#7e7e96',
  e: '#a4a4ba',
  f: '#2e7a5a',
  g: '#5ac08a',
  h: '#6a3a8a',
  i: '#a070c8',
  j: '#c86a7a',
  k: '#8a3a4a',
  l: '#2a2028',
  m: '#ff7a2a',
  n: '#ffd27a',
  o: '#f4f2ee',
  p: '#c8c6d0',
  q: '#8a8ca4',
  r: '#a8aac0',
  s: '#5a5c74',
  t: '#14141c',
  u: '#f0c040',
  v: '#a07818',
  w: '#e04a3a',
  x: '#e89a8a',
  y: '#fff2a0',
  z: '#fff6c0',
  A: 'rgba(255,246,192,0.40)',
  B: 'rgba(244,242,238,0.55)',
  C: 'rgba(200,198,208,0.45)',
};

/** Keys of BOSTON_ENEMY_PALETTE that glow. */
export const BOSTON_ENEMY_GLOW = 'mnyzA';

const pigeon: SpriteSet<PigeonAnim> = {
  size: { w: 16, h: 12 },
  anchor: { x: 8, y: 12 },
  palette: BOSTON_ENEMY_PALETTE,
  anims: {
    hop: {
      fps: 8,
      loop: true,
      frames: [
        [
          '................',
          '................',
          '..........bbbb..',
          '.........bcadcb.',
          '.........cdmdcjl',
          '........hgdddc..',
          '...bbbbfigccb...',
          '.bcdddddeeedcb..',
          'bcddaeeaeedddcb.',
          'abcccdddddddcb..',
          '.abbbbbbbbbbba..',
          '.....jk...jk....',
        ],
        [
          '................',
          '..........bbbb..',
          '.........bcadcb.',
          '.........cdmdcjl',
          '........hgdddc..',
          '...bbbbfigccb...',
          '.bcdddddeeedcb..',
          'bcddaeeaeedddcb.',
          'abcccdddddddcb..',
          '.abbbbbbbbbbba..',
          '.....j....j.....',
          '....jk....jk....',
        ],
        [
          '..........bbbb..',
          '.........bcadcb.',
          '.........cdmdcjl',
          '..cdd...hgdddc..',
          '...cddbfigccb...',
          '.bcdddddeeedcb..',
          'bcddddeeeedddcb.',
          'abcccdddddddcb..',
          '.abbbbbbbbbbba..',
          '.....kk..kk.....',
          '................',
          '.B...........B..',
        ],
        [
          '................',
          '................',
          '................',
          '..........bbbb..',
          '.........bcadcb.',
          '........hgdmdcjl',
          '..bbbbbfigddc...',
          'bcddddddeeedccb.',
          'bcdaeeaeeedddcbb',
          'abbbbbbbbbbbbba.',
          '.....jk...jk....',
          '....jjk..jjk....',
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
          '......z.........',
          '....e...A..d....',
          '..........e.....',
          '...d............',
          '................',
          '................',
          '...........bb...',
          '..bbbbbbbbhgcjl.',
          '.bcddeaeaeddddc.',
          '..jj.abbbbbb.jj.',
        ],
      ],
    },
  },
};

const gull: SpriteSet<GullAnim> = {
  size: { w: 16, h: 16 },
  anchor: { x: 8, y: 16 },
  palette: BOSTON_ENEMY_PALETTE,
  anims: {
    hover: {
      fps: 6,
      loop: true,
      frames: [
        [
          '................',
          '.ot.............',
          '.ttss...........',
          '..tssr..........',
          '...srrs.........',
          '....qrrs........',
          '.....qrrs...oo..',
          '......qrrr.oooo.',
          '.......qrroosyo.',
          '..ppoooooooooouu',
          '.tsqqrrrroooopwv',
          'tsqqqqqqqoopp...',
          '..ppppppppp.....',
          '....x..x........',
          '................',
          '................',
        ],
        [
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '............oo..',
          '...........oooo.',
          '...........osyo.',
          '..ppoooooooooouu',
          '.tsqqrrrroooopwv',
          'tsqqqrrrqqopp...',
          '..pqqrrrqpp.....',
          '...tssqrrq.x....',
          '....ottss.......',
        ],
      ],
    },
    swoop: {
      fps: 10,
      loop: true,
      frames: [
        [
          'ot..............',
          'tts.............',
          '.srs............',
          '..qrs...........',
          '...qrrs.........',
          'B...pqrr..oo....',
          '.....ppooooooo..',
          '..B...poooooosy.',
          '.......poooooouu',
          '........ppoookwv',
          '..........pp.wu.',
          '...........x.x..',
          '................',
          '................',
          '................',
          '................',
        ],
        [
          '................',
          '................',
          'ot..............',
          'tts.rs..........',
          '.srrqrrs........',
          'B..pqqrr..oo....',
          '.....ppooooooo..',
          '..B...poooooosy.',
          '.......poooooouu',
          '........ppoookwv',
          '..........pp.wu.',
          '..........x.x...',
          '................',
          '................',
          '................',
          '................',
        ],
      ],
    },
    dead: {
      fps: 0,
      loop: false,
      frames: [
        [
          '................',
          '........A.......',
          '.......z..A.....',
          '....o.......p...',
          '...........o....',
          '..p.............',
          '................',
          '................',
          '.....x...x......',
          '......x.x.......',
          '............oo..',
          '..ppooooooooxox.',
          '.tsqqrrrrooooouv',
          '..tsqqqqqqoopp..',
          '....ppppppp.....',
          '................',
        ],
      ],
    },
  },
};

export const BOSTON_ENEMIES: {
  pigeon: SpriteSet<PigeonAnim>;
  gull: SpriteSet<GullAnim>;
} = { pigeon, gull };
