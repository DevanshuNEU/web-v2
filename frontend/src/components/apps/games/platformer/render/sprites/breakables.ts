// Pixel art as data: one character per pixel, '.' is clear, every other
// character is a palette key. Authored with a scratch generator, then
// committed as plain grids: edit the rows here directly.
//
// Breakables, in the rooftop palette. Anchors: crate and sign bottom centre
// (stand them on a roof), debris and shards centre (spin and toss them).
// crate: idle. crateDebris: 4 pieces (the crate's quarters, splintered),
// fps 0, pick one per piece. sign: a small neon 'LIVE' sign, idle (on,
// flicker) and broken. signShards: 4 glass and tube pieces, fps 0.
import { ROOFTOP_PALETTE } from './rooftop';
import type { SpriteSet } from './types';


const crate: SpriteSet<'idle'> = {
  size: { w: 16, h: 16 },
  anchor: { x: 8, y: 16 },
  palette: ROOFTOP_PALETTE,
  anims: {
    idle: {
      fps: 0,
      loop: false,
      frames: [
        [
          'vvvvvvvvvvvvvvvv',
          'vntuuuuuuuuuutnu',
          'vvtuuuuuusuuttts',
          'vvtuuutuuustvtts',
          'vvtuuuuuuutvutts',
          'vvttttttttvtttts',
          'vvtusuuutvuuutts',
          'vvtuusutvuuuutts',
          'vvtuustvuvuuutts',
          'vvtuutsuuuuuutts',
          'vvtttvttttttttts',
          'vvttvuuuuusuutts',
          'vvtvuuuuuuusutts',
          'vvtuuuuuuuusutts',
          'vnttttttttttttnt',
          'vsssssssssssssts',
        ],
      ],
    },
  },
};

const crateDebris: SpriteSet<'pieces'> = {
  size: { w: 8, h: 8 },
  anchor: { x: 4, y: 4 },
  palette: ROOFTOP_PALETTE,
  anims: {
    pieces: {
      fps: 0,
      loop: false,
      frames: [
        [
          'vvvvvvv.',
          'vntuuuu.',
          'vvtuuuuv',
          'vvtuuuti',
          'vvtuuuu.',
          'vvttttti',
          'vvtusuu.',
          'viviv...',
        ],
        [
          '.vvvvvvv',
          '.uuuutnu',
          'isuuttts',
          '.ustvtts',
          'iutvutts',
          'vtvtttts',
          '.vuuutts',
          '...ivivi',
        ],
        [
          'ivi.i...',
          'vvtuuts.',
          'vvtttvtv',
          'vvttvuui',
          'vvtvuuuv',
          'vvtuuuu.',
          'vntttttv',
          'vssssss.',
        ],
        [
          '...vi.iv',
          '.uuuutts',
          'itttttts',
          'vusuutts',
          'iuusutts',
          '.uusutts',
          'itttttnt',
          '.sssssts',
        ],
      ],
    },
  },
};

const sign: SpriteSet<'idle' | 'broken'> = {
  size: { w: 32, h: 16 },
  anchor: { x: 16, y: 16 },
  palette: ROOFTOP_PALETTE,
  anims: {
    idle: {
      fps: 6,
      loop: true,
      frames: [
        [
          '.......m................m.......',
          '.......l................l.......',
          '.233333333333333333333333333330.',
          '.21HHHHHHHHHHHHHHHHHHHHHHHHHH10.',
          '.2HCCCCCCCCCCCCCCCCCCCCCCCCCCH0.',
          '.2HCHHHGHHHHGGGHGHHHGHGGGGHHCH0.',
          '.2HCH1GNG11GNNNGNG1GNGNNNNGHCH0.',
          '.2HCH1GNG111GNGGNG1GNGNGGG1HCH0.',
          '.2HCH1GNG111GNG1GNGNGGNNNG1HCH0.',
          '.2HCH1GNGGG1GNG1GNGNGGNGGG1HCH0.',
          '.2HCH1GNNNNGNNNG1GNG1GNNNNGHCH0.',
          '.2HCHHHGGGGHGGGHHHGHHHGGGGHHCH0.',
          '.2HCCCCCCCCCCCCCCCCCCCCCCCCCCH0.',
          '.21HHHHHHHHHHHHHHHHHHHHHHHHHH10.',
          '.200000000000000000000000000000.',
          '................................',
        ],
        [
          '.......m................m.......',
          '.......l................l.......',
          '.233333333333333333333333333330.',
          '.211111111111111111111111111110.',
          '.21CCCCCCCCCCCCCCCCCCCCCCCCCC10.',
          '.21C111G1111GGG1111111GGGG11C10.',
          '.21C11GMG11GMMMGO111OGMMMMG1C10.',
          '.21C11GMG111GMG1O111OGMGGG11C10.',
          '.21C11GMG111GMG11O1O1GMMMG11C10.',
          '.21C11GMGGG1GMG11O1O1GMGGG11C10.',
          '.21C11GMMMMGMMMG11O11GMMMMG1C10.',
          '.21C111GGGG1GGG1111111GGGG11C10.',
          '.21CCCCCCCCCCCCCCCCCCCCCCCCCC10.',
          '.211111111111111111111111111110.',
          '.200000000000000000000000000000.',
          '................................',
        ],
      ],
    },
    broken: {
      fps: 0,
      loop: false,
      frames: [
        [
          '.......m................m.......',
          '.......l................l.......',
          '.233333333333333333333333333330.',
          '.211111111111111111111111111110.',
          '.21EEEEED111DEEE1EEEEEEEEEEEE10.',
          '.21E1DD1111111DD1111111DD111E10.',
          '.21E1H1O1111OOHHO111O1OHOO11E10.',
          '.21E111O11111OH1O111O1O11111110.',
          '.21E111O11111O111O1O11OOO111110.',
          '.211111O11111O111O1O11O11111E10.',
          '.21E111OOOH1OOO111O111OOOH11E10.',
          '.21E111111H1111111H1IT111H11E10.',
          '.21EEEEEEEEEEEEEEEEE11SEEEEEE10.',
          '.211111111111111111111111111110.',
          '.200000000000000000000000000000.',
          '................................',
        ],
      ],
    },
  },
};

const signShards: SpriteSet<'pieces'> = {
  size: { w: 8, h: 8 },
  anchor: { x: 4, y: 4 },
  palette: ROOFTOP_PALETTE,
  anims: {
    pieces: {
      fps: 0,
      loop: false,
      frames: [
        [
          '........',
          '.DD.....',
          '.DHH....',
          '..DHH...',
          '..DHHH..',
          '...DH...',
          '....D...',
          '........',
        ],
        [
          '........',
          '...N....',
          '..NMM...',
          '..MMG...',
          '...MGG..',
          '....G...',
          '........',
          '........',
        ],
        [
          '........',
          '.....D..',
          '....DH..',
          '...DHH..',
          '..CCCC..',
          '..EEEE..',
          '........',
          '........',
        ],
        [
          '........',
          '..D.....',
          '..HD....',
          '..HHD...',
          '...HHD..',
          '........',
          '........',
          '........',
        ],
      ],
    },
  },
};

export const BREAKABLES: {
  crate: SpriteSet<'idle'>;
  crateDebris: SpriteSet<'pieces'>;
  sign: SpriteSet<'idle' | 'broken'>;
  signShards: SpriteSet<'pieces'>;
} = { crate, crateDebris, sign, signShards };
