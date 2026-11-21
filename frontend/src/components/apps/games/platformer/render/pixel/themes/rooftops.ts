/**
 * The bundled themes: the neon rooftops (Endless) and Austin (chapter 1).
 * Both share the rooftop tile set, the brick facades with their windows,
 * doors and puddles, rain, the drone and the crawler, the beacon goal and
 * the slang neon signs; both see the Austin skyline behind them.
 */

import { toMono } from '../../bake';
import { ENEMIES, ROOFTOP_TILES } from '../../sprites';
import type { Ctx } from '../canvas';
import { drawText, textWidth } from '../font';
import { signSet, signWord } from '../signs';
import { bakeSky, hash2 } from '../skyline';
import type { FacadeCell } from '../tiles';
import type { PixelTheme } from '../themes';

/** Keys of the rooftop palette that glow: neon, lamps and their halos. */
export const ROOF_GLOW = 'NMDCTSWVQRGHIJK';
const ENEMY_GLOW = 'YZXRFEW6GH';

const RED = '#ff3b4f', SCREEN = '#ffe14d', MAGENTA = '#ff3d9a', CYAN = '#3df2ff', SODIUM = '#ffb347';
const WINDOW_LIT = ['#d9965a', '#e0b070', '#6aa6c8'];

const monoMemo = new Map<string, string>();
function toMonoCached(s: string): string {
  let v = monoMemo.get(s);
  if (!v) { v = toMono(s); monoMemo.set(s, v); }
  return v;
}

/**
 * The front of a building under its roof: darker the further down, the odd
 * lit window, drainpipes, and a fire-escape door with a lamp. Roof tops get
 * puddles. Exposed sides get a dark seam and a faint rim, so walls read.
 * Glowing parts go on the chunk's glow layer.
 */
export function rooftopFacade(cell: FacadeCell) {
  const { base: b, glow: g, mono, tx, px, py, depth } = cell;
  const col = (s: string) => (mono ? toMonoCached(s) : s);
  if (depth === 0) {
    // a puddle on the roof top: a glossy dark strip that reflections light up live
    if (hash2(tx * 17, 31) < 0.24) {
      const w = 5 + Math.floor(hash2(tx, 77) * 7), x = px + Math.floor(hash2(tx, 78) * (16 - w));
      b.fillStyle = col('#151129');
      b.fillRect(x, py + 1, w, 2);
      b.fillStyle = col('#221c3c');
      b.fillRect(x + 1, py + 1, w - 2, 1);
      cell.puddles.push(x, py + 1, w);
    }
  } else {
    buildingFront(cell, b, g, col);
  }
  sides(cell);
}

function buildingFront(cell: FacadeCell, b: Ctx, g: Ctx, col: (s: string) => string) {
  const { tx, ty, px, py, depth, below } = cell;
  const pipe = hash2(tx * 13, 401) < 0.07;
  const door = depth === 1 && below && hash2(tx * 29, 503) < 0.045;
  if (door) {
    // a fire-escape door: frame, a lit pane, a tiny landing and a lamp above
    b.fillStyle = col('#06040c'); b.fillRect(px + 4, py + 2, 9, 14);
    b.fillStyle = col('#2a1a2a'); b.fillRect(px + 5, py + 3, 7, 13);
    b.fillStyle = col('#3a2436'); b.fillRect(px + 5, py + 3, 1, 13);
    g.fillStyle = col('#ffcf7a'); g.fillRect(px + 6, py + 5, 5, 4);
    b.fillStyle = col('#ffcf7a'); b.fillRect(px + 6, py + 5, 5, 4);
    b.fillStyle = col('#4a3a6a'); b.fillRect(px + 2, py + 16, 13, 1);
    g.fillStyle = col('#fff1c2'); g.fillRect(px + 7, py, 3, 1);
    cell.lamps.push(px + 8, py + 1);
  } else if (!pipe && depth >= 2 && below && hash2(tx * 7, ty * 11 + 5) < 0.07) {
    // an apartment window, sometimes someone in it
    const lit = hash2(tx, ty * 3) < 0.7;
    b.fillStyle = col('#06040c'); b.fillRect(px + 4, py + 4, 8, 8);
    b.fillStyle = col('#2a2040'); b.fillRect(px + 4, py + 12, 8, 1);
    const wc = lit ? WINDOW_LIT[Math.floor(hash2(tx, ty) * WINDOW_LIT.length)] : '#0c0a18';
    for (const k of lit ? [b, g] : [b]) {
      k.fillStyle = col(wc); k.fillRect(px + 5, py + 5, 6, 6);
      if (lit) { k.fillStyle = 'rgba(0,0,0,0.35)'; k.fillRect(px + 5, py + 5, 6, 1); }
      if (lit && hash2(tx * 3, ty) < 0.35) { k.fillStyle = col('#07050c'); k.fillRect(px + 7, py + 7, 2, 1); k.fillRect(px + 6, py + 8, 4, 3); }
    }
  }
  if (pipe) {
    b.fillStyle = col('#1c2a40'); b.fillRect(px + 11, py, 2, 16);
    b.fillStyle = col('#4a6684'); b.fillRect(px + 11, py, 1, 16);
    b.fillStyle = col('#0f1828'); b.fillRect(px + 10, py + 8, 4, 1);
  }
  // deeper is darker: the street light never reaches the lower floors
  b.fillStyle = 'rgba(3,2,9,1)';
  b.globalAlpha = Math.min(0.6, 0.12 * depth);
  b.fillRect(px, py, 16, 16);
  b.globalAlpha = 1;
}

/** Exposed building sides: a dark seam and a faint rim. */
function sides(cell: FacadeCell) {
  const { base: b, mono, px, py } = cell;
  const shade = mono ? '#0b0b0c' : '#07050f';
  const rim = mono ? '#3a3a40' : '#2c2346';
  if (cell.openL) { b.fillStyle = shade; b.fillRect(px, py + 1, 1, 15); b.fillStyle = rim; b.fillRect(px + 1, py + 2, 1, 14); }
  if (cell.openR) { b.fillStyle = shade; b.fillRect(px + 15, py + 1, 1, 15); }
}

const SKY_TEXT = { draw: (c: Ctx, t: string, x: number, y: number) => drawText(c, t, x, y), width: (t: string) => textWidth(t) };

const ROOFTOPS: PixelTheme = {
  id: 'rooftops',
  tiles: ROOFTOP_TILES.tiles,
  decor: ROOFTOP_TILES.decor,
  glow: ROOF_GLOW,
  facade: rooftopFacade,
  sky: (w, h, mono, seed, o) => bakeSky(w, h, mono, seed, SKY_TEXT, { austin: true, neon: o.neon, sky: o.sky }),
  weather: 'rain',
  enemies: {
    walker: { set: ENEMIES.doomCrawler, glow: ENEMY_GLOW, move: 'walk', dead: 'squashed', light: RED },
    flyer: { set: ENEMIES.adDrone, glow: ENEMY_GLOW, move: 'hover', dead: 'dead', light: SCREEN },
  },
  goal: {
    kind: 'goalBeacon', mast: true, fps: 6,
    // the lamp's light comes from the level; the flag adds a magenta wash and the lamp a halo
    lights: [
      { dx: 4, dy: -61, r: 10, color: CYAN, k: 0.8, priority: 3, halo: 0.8 },
      { dx: 12, dy: -52, r: 34, color: MAGENTA, k: 0.8, priority: 2, halo: 0.35 },
    ],
  },
  sign: (seed, level, i) => signSet(signWord(seed, level, i)),
  signLight: MAGENTA,
  decorLights: {
    antenna: { dx: 7.5, dy: -47, r: 20, colors: [RED], k: 0.9, halo: 0.6, blink: 0.8 },
    waterTower: { dx: 13, dy: -46, r: 18, colors: [SODIUM], k: 0.7, halo: 0.4, blink: 0 },
  },
  checkpoint: 'antenna',
};

export const ROOFTOPS_THEME: PixelTheme = ROOFTOPS;
/** Chapter 1 is the rooftops in Austin: the same art, the same night. */
export const AUSTIN_THEME: PixelTheme = { ...ROOFTOPS, id: 'austin' };
