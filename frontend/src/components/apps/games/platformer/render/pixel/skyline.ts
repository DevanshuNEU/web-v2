/**
 * The night behind the rooftops, baked once per view size and palette: a sky
 * with stars and a moon, a band of clouds lit from below by the city, and
 * three skyline strips (far, mid, near) of procedural buildings with lit
 * windows, setbacks, spires and water towers. Strips tile horizontally.
 * What moves (a window flickering, an antenna blinking) is recorded here
 * and drawn per frame by the renderer.
 */

import { toMono } from '../bake';
import { makeCanvas, type Canvas, type Ctx } from './canvas';
import { AUSTIN, type AustinBuilding } from '../sprites';
import { atlas, drawFrame } from './sprites';
import { SKY_PRESETS, type SkyPreset } from './timeofday';

export const STRIP_W = 512;

export interface Flick { x: number; y: number; w: number; h: number; on: string; off: string; seed: number }
export interface Blink { x: number; y: number; seed: number }
export interface Neon { x: number; y: number; w: number; h: number; color: string; seed: number }

export interface Drip { x: number; y: number; seed: number }
/** A coloured light on a strip: a nav light blinks, a strobe double-flashes. */
export interface Beacon { x: number; y: number; color: string; strobe: boolean; seed: number }

export interface SkyLayer {
  canvas: Canvas;
  /** What glows on this layer (lit windows, signs, bulbs), drawn after the darkness; null for distant layers. */
  glow: Canvas | null;
  /** Cable low points that drip, and windows with a flickering TV. */
  drips: Drip[];
  tvs: Flick[];
  /** Water glints that twinkle (Lady Bird Lake). */
  glints?: Drip[];
  /** Coloured lights that blink or strobe (a wing's nav lights). */
  beacons?: Beacon[];
  /** Strip height, px; the strip's bottom sits on the horizon. */
  h: number;
  /** Parallax factor: 0 still, 1 moves with the world. */
  f: number;
  flick: Flick[];
  blinks: Blink[];
  neon: Neon[];
}

export interface Twinkle { x: number; y: number; seed: number; bright: boolean }

/** Where the moon or the sun sits in the sky canvas, so it can be drawn again after the darkness. */
export interface Disc { x: number; y: number; r: number }

export interface Sky {
  canvas: Canvas;
  twinkles: Twinkle[];
  disc?: Disc;
  clouds: SkyLayer;
  layers: SkyLayer[];
}

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface LayerStyle {
  f: number; h: number;
  minH: number; maxH: number; minW: number; maxW: number;
  body: string; shade: string; rim: string; top: string;
  win: number; winGap: number; lit: number; winAlpha: number;
  haze: string; hazeA: number;
  spires: number; towers: number; neon: number;
  /** Share of lit window brightness that glows through the darkness (0 for distant layers). */
  glow: number;
}

const LAYERS: LayerStyle[] = [
  { // far: tall, thin, hazy towers
    f: 0.1, h: 210, minH: 70, maxH: 200, minW: 14, maxW: 34,
    body: '#1d1838', shade: '#17132e', rim: '#3a2f62', top: '#2e2650',
    win: 1, winGap: 2, lit: 0.16, winAlpha: 0.55, haze: '#3a2456', hazeA: 0.5,
    spires: 0.3, towers: 0, neon: 0, glow: 0,
  },
  { // mid
    f: 0.25, h: 170, minH: 50, maxH: 150, minW: 20, maxW: 46,
    body: '#130f27', shade: '#0e0b1f', rim: '#3b2655', top: '#2a1f45',
    win: 1, winGap: 2, lit: 0.22, winAlpha: 0.8, haze: '#2e1640', hazeA: 0.38,
    spires: 0.22, towers: 0.25, neon: 0.18, glow: 0,
  },
  { // near: wide, low, detailed
    f: 0.45, h: 130, minH: 34, maxH: 110, minW: 28, maxW: 64,
    body: '#0b0918', shade: '#080612', rim: '#3a1d48', top: '#221a3a',
    win: 2, winGap: 2, lit: 0.18, winAlpha: 0.9, haze: '#2a0f30', hazeA: 0.28,
    spires: 0.18, towers: 0.3, neon: 0.3, glow: 0.45,
  },
];

const WARM = ['#ffcf7a', '#ffb347', '#ffd99a'];
const COOL = ['#9fe8ff', '#bfefff', '#7fc6ff'];
const PINK = ['#ff6ab8', '#ff8ccc'];
const NEON = ['#ff3d9a', '#3df2ff', '#ff3d9a', '#9a5cff'];

function bakeLayer(style: LayerStyle, seed: number, col: (c: string) => string, neonMul = 1): SkyLayer {
  const r = rng(seed);
  style = { ...style, neon: Math.min(0.9, style.neon * neonMul), lit: style.lit * (neonMul > 1 ? 1.25 : 1) };
  const H = style.h;
  const { canvas, ctx } = makeCanvas(STRIP_W, H);
  const gl = style.glow > 0 ? makeCanvas(STRIP_W, H) : null;
  const flick: Flick[] = [];
  const blinks: Blink[] = [];
  const neon: Neon[] = [];
  const rect = (c: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = col(c);
    // wrap across the seam so the strip tiles
    ctx.fillRect(x, y, w, h);
    if (x + w > STRIP_W) ctx.fillRect(x - STRIP_W, y, w, h);
  };
  const glowRect = (c: string, a: number, x: number, y: number, w: number, h: number) => {
    if (!gl) return;
    gl.ctx.globalAlpha = a;
    gl.ctx.fillStyle = col(c);
    gl.ctx.fillRect(x, y, w, h);
    if (x + w > STRIP_W) gl.ctx.fillRect(x - STRIP_W, y, w, h);
    gl.ctx.globalAlpha = 1;
  };

  let x = 0;
  while (x < STRIP_W) {
    const w = Math.round(style.minW + r() * (style.maxW - style.minW));
    const bh = Math.round(style.minH + Math.pow(r(), 1.3) * (style.maxH - style.minH));
    const top = H - bh;
    // body with a lit rim on the left and a darker right face
    rect(style.body, x, top, w, bh);
    const face = Math.max(2, Math.round(w * 0.22));
    rect(style.shade, x + w - face, top, face, bh);
    rect(style.rim, x, top, 1, bh);
    rect(style.top, x, top, w, 1);

    // crown: setback, stepped top or a slab
    const kind = r();
    if (kind < 0.35 && w > 16) {
      const sw = Math.round(w * (0.4 + r() * 0.3)), sh = 4 + Math.round(r() * 10);
      const sx = x + Math.round((w - sw) * r());
      rect(style.body, sx, top - sh, sw, sh);
      rect(style.rim, sx, top - sh, 1, sh);
      rect(style.top, sx, top - sh, sw, 1);
      if (r() < style.spires) {
        const ah = 6 + Math.round(r() * 16);
        rect(style.rim, sx + (sw >> 1), top - sh - ah, 1, ah);
        blinks.push({ x: sx + (sw >> 1), y: top - sh - ah - 1, seed: r() * 10 });
      }
    } else if (kind < 0.55 && w > 20) {
      for (let s = 1; s <= 3; s++) {
        const inset = s * Math.round(w * 0.12);
        rect(style.body, x + inset, top - s * 3, w - inset * 2, 3);
        rect(style.top, x + inset, top - s * 3, w - inset * 2, 1);
      }
    } else if (r() < style.spires) {
      const ah = 8 + Math.round(r() * 20);
      const ax = x + 2 + Math.round(r() * (w - 4));
      rect(style.rim, ax, top - ah, 1, ah);
      blinks.push({ x: ax, y: top - ah - 1, seed: r() * 10 });
    }
    if (r() < style.towers && w > 18) {
      // a water tower on legs
      const tx = x + 3 + Math.round(r() * (w - 14));
      rect(style.body, tx + 1, top - 12, 8, 7);
      rect(style.rim, tx + 1, top - 12, 1, 7);
      rect(style.body, tx + 2, top - 14, 6, 2);
      rect(style.body, tx + 4, top - 15, 2, 1);
      rect(style.body, tx + 2, top - 5, 1, 5);
      rect(style.body, tx + 7, top - 5, 1, 5);
    }

    // windows: floors of a grid, one tone per building, some floors dark
    const tone = r();
    const palette = tone < 0.55 ? WARM : tone < 0.9 ? COOL : PINK;
    const ww = style.win, wh = style.win === 2 ? (r() < 0.5 ? 1 : 2) : 1;
    const gx = ww + style.winGap, gy = wh + style.winGap + (r() < 0.4 ? 1 : 0);
    const lit = style.lit * (0.5 + r());
    for (let wy = top + 3; wy < H - 4; wy += gy) {
      const floorLit = r() < 0.75;
      for (let wx = x + 2; wx + ww < x + w - 1; wx += gx) {
        if (!floorLit || r() > lit) continue;
        const c = palette[Math.floor(r() * palette.length)];
        const wa = style.winAlpha * (0.45 + r() * 0.55);
        ctx.globalAlpha = wa;
        rect(c, wx, wy, ww, wh);
        ctx.globalAlpha = 1;
        glowRect(c, wa * style.glow, wx, wy, ww, wh);
        if (flick.length < 6 && r() < 0.04) flick.push({ x: wx, y: wy, w: ww, h: wh, on: col(c), off: col(night(style.body)), seed: r() * 100 });
      }
    }

    // a vertical neon sign on the face
    if (r() < style.neon && bh > 40 && w > 14) {
      const nh = 10 + Math.round(r() * 14), nw = 3;
      const nx = x + 2 + Math.round(r() * (w - 8)), ny = top + 4 + Math.round(r() * Math.min(18, Math.max(1, bh * 0.3)));
      const c = NEON[Math.floor(r() * NEON.length)];
      // high on the face only: low signs would poke up from behind the roofs like loose bars
      if (ny + nh > H - 70) { x += w; continue; }
      rect('#05040a', nx - 1, ny - 1, nw + 2, nh + 2);
      rect(c, nx, ny, nw, nh);
      neon.push({ x: nx, y: ny, w: nw, h: nh, color: col(c), seed: r() * 100 });
    }

    x += w + (r() < 0.3 ? Math.round(r() * 6) : 0);
  }

  // atmospheric haze: further layers fade into the city glow, more so low down
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient?.(0, 0, 0, H);
  if (g) {
    g.addColorStop(0, rgba(col(style.haze), style.hazeA * 0.5));
    g.addColorStop(1, rgba(col(style.haze), Math.min(1, style.hazeA * 1.6)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STRIP_W, H);
  }
  ctx.globalCompositeOperation = 'source-over';
  return { canvas, glow: gl ? gl.canvas : null, drips: [], tvs: [], h: H, f: style.f, flick, blinks, neon };
}

const INTERIOR = {
  warm: ['#c7864a', '#d9a05e', '#b8703f'],
  cool: ['#5f9fc2', '#7fb0d0', '#6a8fc0'],
  pink: ['#c25a92', '#d07aa8'],
};

/** A colour as it looks under the night's darkness (flicker-off patches are drawn after it). */
function night(hex: string): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const k = [0.42, 0.39, 0.59];
  const r = Math.round(((n >> 16) & 255) * k[0]), g = Math.round(((n >> 8) & 255) * k[1]), b = Math.round((n & 255) * k[2]);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
const ADS = ['BUY AURA', 'GET RIZZ', 'SIGMA COLA', 'NO CAP TV', 'DELULU FM', 'MEWING 24/7'];
const BULBS = ['#ffcf7a', '#ff6ab8', '#3df2ff', '#ffcf7a'];

/**
 * The close layer, right behind the roofs (parallax 0.6): wide apartment
 * fronts with lit rooms and the people in them, fire escapes, billboards on
 * legs, and cables slung across the alleys, some strung with bulbs, dripping.
 */
function bakeClose(seed: number, col: (c: string) => string, drawText: (c: Ctx, t: string, x: number, y: number) => void, textW: (t: string) => number): SkyLayer {
  const r = rng(seed);
  const H = 170;
  const base = makeCanvas(STRIP_W, H), glow = makeCanvas(STRIP_W, H);
  const flick: Flick[] = [], drips: Drip[] = [], tvs: Flick[] = [];
  const both = (c: string, a: number, x: number, y: number, w: number, h: number, where: 0 | 1 | 2) => {
    for (const [i, k] of [[0, base.ctx], [1, glow.ctx]] as const) {
      if ((where === 0 && i === 1) || (where === 1 && i === 0)) continue;
      k.globalAlpha = a;
      k.fillStyle = col(c);
      k.fillRect(x, y, w, h);
      if (x + w > STRIP_W) k.fillRect(x - STRIP_W, y, w, h);
      if (x < 0) k.fillRect(x + STRIP_W, y, w, h);
    }
    base.ctx.globalAlpha = 1; glow.ctx.globalAlpha = 1;
  };
  const B = 0, G = 1, BOTH = 2;
  const px = (c: string, x: number, y: number, where: 0 | 1 | 2 = B) => both(c, 1, ((x % STRIP_W) + STRIP_W) % STRIP_W, y, 1, 1, where);

  let x = 0;
  let prevRight = -1, prevTop = 0;
  while (x < STRIP_W) {
    const w = Math.round(56 + r() * 70);
    const bh = Math.round(50 + Math.pow(r(), 1.2) * 100);
    const top = H - bh;
    // facade, its lit edge, a cornice and faint brick courses
    both('#0c0918', 1, x, top, w, bh, B);
    both('#08060f', 1, x + w - 6, top, 6, bh, B);
    both('#2a1838', 1, x, top, 1, bh, B);
    both('#1c1530', 1, x - 1, top, w + 2, 2, B);
    both('#3a2a55', 1, x - 1, top, w + 2, 1, B);
    for (let y = top + 5; y < H; y += 4) both('#100c20', 0.7, x + 1, y, w - 7, 1, B);

    // a cable from the last roof across the alley, maybe strung with bulbs
    if (prevRight >= 0 && r() < 0.7) {
      const ax = prevRight - 2, ay = prevTop + 4 + Math.round(r() * 8);
      const bx = x + 2, by = top + 4 + Math.round(r() * 8);
      const span = Math.max(1, bx - ax);
      const sag = 5 + span * 0.18;
      const bulbs = r() < 0.45;
      let low = { x: ax, y: ay };
      for (let i = 0; i <= span; i++) {
        const f = i / span;
        const cy = Math.round(ay + (by - ay) * f + sag * 4 * f * (1 - f));
        px('#05040a', ax + i, cy);
        if (cy > low.y) low = { x: ax + i, y: cy };
        if (bulbs && i % 5 === 2) px(BULBS[(i / 5) % BULBS.length | 0], ax + i, cy + 1, BOTH);
      }
      drips.push({ x: ((low.x % STRIP_W) + STRIP_W) % STRIP_W, y: low.y + 1, seed: r() * 10 });
    }

    // windows: rooms, lit or dark, with whoever is home
    const tone = r();
    const pal = tone < 0.6 ? INTERIOR.warm : tone < 0.9 ? INTERIOR.cool : INTERIOR.pink;
    const fireX = w > 60 && r() < 0.5 ? x + 6 + Math.round(r() * (w - 32)) : -100;
    for (let wy = top + 9; wy < H - 8; wy += 12) {
      for (let wx = x + 5; wx + 5 < x + w - 7; wx += 9) {
        if (wx + 6 > fireX && wx < fireX + 20) continue;
        both('#06040c', 1, wx - 1, wy - 1, 7, 8, B);
        both('#2a2040', 1, wx - 1, wy + 7, 7, 1, B);
        if (r() > 0.26) {
          both('#0a0814', 1, wx, wy, 5, 6, B);
          px('#1a1630', wx, wy);
          continue;
        }
        const c = pal[Math.floor(r() * pal.length)];
        const a = 0.65 + r() * 0.35;
        both(c, a, wx, wy, 5, 6, BOTH);
        both('#000000', 0.35, wx, wy, 5, 1, BOTH);
        const who = r();
        if (who < 0.22) {
          // someone at the window: head and shoulders
          both('#07050c', 1, wx + 2, wy + 2, 1, 1, BOTH);
          both('#07050c', 1, wx + 1, wy + 3, 3, 3, BOTH);
        } else if (who < 0.32) {
          // a cat on the sill
          both('#07050c', 1, wx + 1, wy + 4, 3, 2, BOTH);
          px('#07050c', wx + 1, wy + 3, BOTH); px('#07050c', wx + 3, wy + 3, BOTH);
        } else if (who < 0.42) {
          // a plant
          both('#0b1a12', 1, wx, wy + 3, 2, 3, BOTH);
          px('#0b1a12', wx + 1, wy + 2, BOTH);
        }
        if (r() < 0.3) both('#5a2a48', 0.9, r() < 0.5 ? wx : wx + 4, wy, 1, 4, BOTH);
        if (pal === INTERIOR.cool && r() < 0.25 && tvs.length < 6) tvs.push({ x: wx, y: wy, w: 5, h: 6, on: col('#4f7fc0'), off: col(night('#0a0814')), seed: r() * 50 });
        else if (flick.length < 8 && r() < 0.06) flick.push({ x: wx, y: wy, w: 5, h: 6, on: col(c), off: col(night('#0a0814')), seed: r() * 100 });
      }
    }
    // a fire escape: landings, rails and stairs zigzagging down the front
    if (fireX > 0) {
      let dir = 1;
      for (let fy = top + 16; fy < H - 4; fy += 12) {
        both('#2a2240', 1, fireX, fy, 20, 1, B);
        both('#4a3a6a', 1, fireX, fy - 1, 20, 1, B);
        both('#1e1830', 1, fireX, fy - 5, 20, 1, B);
        for (let b = 0; b < 20; b += 3) both('#1e1830', 1, fireX + b, fy - 5, 1, 5, B);
        for (let i = 0; i < 11; i++) px('#241c38', fireX + (dir > 0 ? 3 + i : 16 - i), fy + 1 + i);
        dir = -dir;
      }
    }
    // a billboard on legs, lit from below
    if (w > 56 && r() < 0.3) {
      const bw = Math.min(54, w - 8), bhh = 20;
      const bx = x + Math.round((w - bw) / 2), by = top - bhh - 8;
      for (let lx = bx + 4; lx < bx + bw - 2; lx += 12) both('#1a1428', 1, lx, by + bhh, 1, 8, B);
      both('#3a3060', 1, bx - 1, by - 1, bw + 2, bhh + 2, B);
      both('#1a1430', 1, bx, by, bw, bhh, B);
      both('#241c40', 1, bx, by + bhh - 4, bw, 4, B);
      // an ad that fits the panel
      let ad = ADS[Math.floor(r() * ADS.length)];
      for (let tries = 0; tries < ADS.length && textW(ad) > bw - 4; tries++) ad = ADS[(ADS.indexOf(ad) + 1) % ADS.length];
      const tw = textW(ad);
      const adCol = r() < 0.5 ? '#3df2ff' : '#ff6ab8';
      const tx = bx + Math.max(1, Math.round((bw - tw) / 2)), ty = by + 7;
      if (tw <= bw - 2) for (const k of [base.ctx, glow.ctx]) { k.globalAlpha = k === glow.ctx ? 0.8 : 1; k.fillStyle = col(adCol); drawText(k, ad, tx, ty); k.globalAlpha = 1; }
      flick.push({ x: bx + 1, y: ty - 1, w: bw - 2, h: 9, on: col(adCol), off: col(night('#1a1430')), seed: r() * 100 });
      // two lamps under it and their warm wash up the panel
      for (const lx of [bx + 6, bx + bw - 8]) {
        both('#ffd08a', 1, lx, by + bhh + 1, 2, 1, BOTH);
        for (let i = 0; i < 12; i++) both('#ffcf7a', 0.16 - i * 0.011, lx - 3 - Math.floor(i / 2), by + bhh - 1 - i, 8 + i, 1, G);
      }
    }
    prevRight = x + w; prevTop = top;
    x += w + (r() < 0.4 ? Math.round(8 + r() * 22) : 0);
  }
  // street haze thickening downwards keeps this layer behind the roofs
  for (const [k, a] of [[base.ctx, 1], [glow.ctx, 0.6]] as const) {
    k.globalCompositeOperation = 'source-atop';
    const hz = k.createLinearGradient?.(0, H * 0.35, 0, H);
    if (hz) {
      hz.addColorStop(0, 'rgba(26,14,40,0)');
      hz.addColorStop(1, `rgba(26,14,40,${0.55 * a})`);
      k.fillStyle = hz;
      k.fillRect(0, 0, STRIP_W, H);
    }
    k.globalCompositeOperation = 'source-over';
  }
  return { canvas: base.canvas, glow: glow.canvas, drips, tvs, h: H, f: 0.6, flick, blinks: [], neon: [] };
}

export function bakeClouds(seed: number, col: (c: string) => string): SkyLayer {
  const r = rng(seed);
  const H = 48;
  const { canvas, ctx } = makeCanvas(STRIP_W, H);
  for (let i = 0; i < 16; i++) {
    const len = 30 + Math.round(r() * 110);
    const th = 2 + Math.round(r() * 4);
    const cx = Math.round(r() * STRIP_W), cy = 6 + Math.round(r() * (H - 14));
    for (let j = 0; j < th; j++) {
      // a wisp: rows get shorter towards the top, lit from below
      const rowLen = Math.round(len * (1 - Math.abs(j - th * 0.6) / th) * (0.8 + r() * 0.2));
      const rx = cx + Math.round((len - rowLen) / 2 + (r() - 0.5) * 6);
      const lit = j === th - 1;
      ctx.fillStyle = col(lit ? '#5a2a5e' : j === 0 ? '#1c1434' : '#21173c');
      ctx.globalAlpha = lit ? 0.75 : 0.85;
      ctx.fillRect(rx, cy + j, rowLen, 1);
      if (rx + rowLen > STRIP_W) ctx.fillRect(rx - STRIP_W, cy + j, rowLen, 1);
    }
  }
  ctx.globalAlpha = 1;
  return { canvas, glow: null, drips: [], tvs: [], h: H, f: 0.04, flick: [], blinks: [], neon: [] };
}

/** Lit keys of the Austin art: windows, the Capitol's floodlights, the beacon. */
const AUSTIN_GLOW = 'wWvkDER';

/**
 * Austin from the art set, as a strip: landmarks (the Capitol, the Frost
 * Bank Tower, the Austonian) placed along the horizon with generic towers
 * between. `far` is hazy and sits over Lady Bird Lake, whose glints twinkle;
 * `near` is dark with lit windows and the floodlit dome.
 */
function bakeAustin(depth: 'far' | 'near', mono: boolean): SkyLayer {
  // raised so the landmarks clear the nearer skylines: the lake (far) or a
  // dark base (near) fills below their horizon
  const H = depth === 'far' ? 170 : 180;
  const base = makeCanvas(STRIP_W, H), glow = makeCanvas(STRIP_W, H);
  const r = rng(depth === 'far' ? 4242 : 777);
  const set = AUSTIN[depth];
  const horizon = depth === 'far' ? H - 44 : H - 52;
  const marks: Partial<Record<AustinBuilding, number>> = depth === 'far'
    ? { capitol: 40, frostTower: 250, austonian: 360 }
    : { frostTower: 110, austonian: 168, capitol: 300 };
  const generic: AustinBuilding[] = ['towerFlat', 'towerStepped', 'towerSlant'];
  const put = (kind: AustinBuilding, x: number, frame: number) => {
    const a = atlas(set[kind], mono, AUSTIN_GLOW);
    drawFrame(base.ctx, a, 'idle', frame, x, horizon, 1);
    drawFrame(glow.ctx, a, 'idle', frame, x, horizon, 1, 'glow');
    // wrap across the seam so the strip tiles
    if (x + a.w > STRIP_W) {
      drawFrame(base.ctx, a, 'idle', frame, x - STRIP_W, horizon, 1);
      drawFrame(glow.ctx, a, 'idle', frame, x - STRIP_W, horizon, 1, 'glow');
    }
  };
  // generic towers first, behind and between the landmarks
  for (let x = 0; x < STRIP_W;) {
    const kind = generic[Math.floor(r() * generic.length)];
    put(kind, x, Math.floor(r() * 2));
    x += set[kind].size.w + 6 + Math.round(r() * (depth === 'far' ? 30 : 46));
  }
  for (const [kind, x] of Object.entries(marks) as [AustinBuilding, number][]) put(kind, x, 0);
  if (depth === 'near') {
    base.ctx.fillStyle = mono ? toMono('#130f27') : '#130f27';
    base.ctx.fillRect(0, horizon, STRIP_W, H - horizon);
  }
  const glints: Drip[] = [];
  if (depth === 'far') {
    // Lady Bird Lake along the bottom, the city pulled down into it
    const col = mono ? toMono : (c: string) => c;
    base.ctx.fillStyle = col('#120a20');
    base.ctx.fillRect(0, horizon, STRIP_W, H - horizon);
    base.ctx.fillStyle = col('#2a1c40');
    base.ctx.fillRect(0, horizon, STRIP_W, 1);
    glow.ctx.globalAlpha = 0.35;
    glow.ctx.save();
    glow.ctx.translate(0, horizon * 2);
    glow.ctx.scale(1, -1);
    glow.ctx.drawImage(glow.canvas, 0, horizon - (H - horizon), STRIP_W, H - horizon, 0, horizon - (H - horizon), STRIP_W, H - horizon);
    glow.ctx.restore();
    glow.ctx.globalAlpha = 1;
    for (let i = 0; i < 40; i++) glints.push({ x: Math.round(r() * STRIP_W), y: horizon + 2 + Math.round(r() * (H - horizon - 3)), seed: r() * 50 });
  }
  return { canvas: base.canvas, glow: glow.canvas, drips: [], tvs: [], glints, h: H, f: depth === 'far' ? 0.13 : 0.2, flick: [], blinks: [], neon: [] };
}

function rgba(hexOrRgb: string, a: number): string {
  const m = hexOrRgb.match(/rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(','); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; }
  const n = parseInt(hexOrRgb.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function bakeSkyCanvas(w: number, h: number, seed: number, col: (c: string) => string, sky: SkyPreset): { canvas: Canvas; twinkles: Twinkle[]; disc?: Disc } {
  const r = rng(seed);
  const { canvas, ctx } = makeCanvas(w, h);
  const g = ctx.createLinearGradient?.(0, 0, 0, h);
  if (g) {
    g.addColorStop(0, col(sky.sky[0]));
    g.addColorStop(0.42, col(sky.sky[1]));
    g.addColorStop(0.72, col(sky.sky[2]));
    g.addColorStop(1, col(sky.sky[3]));
    ctx.fillStyle = g;
  } else ctx.fillStyle = col(sky.sky[1]);
  ctx.fillRect(0, 0, w, h);

  // stars, thinning towards the glow of the city (fewer as the night ends)
  const n = Math.round(((w * h) / 300) * sky.stars);
  for (let i = 0; i < n; i++) {
    const y = Math.pow(r(), 1.6) * h * 0.75;
    const x = r() * w;
    const fade = 1 - y / (h * 0.75);
    ctx.globalAlpha = (0.15 + r() * 0.55) * fade;
    ctx.fillStyle = col(r() < 0.15 ? '#ffe6c8' : '#c9d4ff');
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }
  ctx.globalAlpha = 1;
  const twinkles: Twinkle[] = [];
  if (sky.stars > 0) for (let i = 0; i < Math.round(14 * sky.stars); i++) twinkles.push({ x: Math.floor(r() * w), y: Math.floor(Math.pow(r(), 1.4) * h * 0.55), seed: r() * 50, bright: i < 3 });

  if (sky.disc === 'sun') {
    // the sun just up over the water: a gold disc, a wide warm halo
    const sx = Math.round(w * 0.3), sy = Math.round(h * 0.72), sr = 14;
    const sh = ctx.createRadialGradient?.(sx, sy, sr, sx, sy, sr * 7);
    if (sh) {
      sh.addColorStop(0, rgba(col('#ffd08a'), 0.55));
      sh.addColorStop(1, rgba(col('#ffd08a'), 0));
      ctx.fillStyle = sh;
      ctx.fillRect(sx - sr * 7, sy - sr * 7, sr * 14, sr * 14);
    }
    for (let y = -sr; y <= sr; y++) {
      const half = Math.round(Math.sqrt(Math.max(0, sr * sr - y * y)));
      ctx.fillStyle = col(y < -sr * 0.4 ? '#fff4d6' : y < sr * 0.3 ? '#ffe2a0' : '#ffc070');
      ctx.fillRect(sx - half, sy + y, half * 2, 1);
    }
    return { canvas, twinkles, disc: { x: sx, y: sy, r: sr } };
  }
  if (sky.disc !== 'moon') return { canvas, twinkles };
  // the moon: a pale disc with soft shading and a wide halo
  const mx = Math.round(w * 0.74), my = Math.round(h * 0.17), mr = 10;
  const halo = ctx.createRadialGradient?.(mx, my, mr * 0.8, mx, my, mr * 6);
  if (halo) {
    halo.addColorStop(0, rgba(col('#b9a8ff'), 0.22));
    halo.addColorStop(1, rgba(col('#b9a8ff'), 0));
    ctx.fillStyle = halo;
    ctx.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
  }
  for (let y = -mr; y <= mr; y++) {
    for (let x = -mr; x <= mr; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d > mr + 0.2) continue;
      // lit from the upper left; a soft terminator on the right
      const lit = (-(x + y) / (mr * 1.6)) + 0.55;
      ctx.fillStyle = col(d > mr - 1 ? '#bfb4ee' : lit > 0.75 ? '#f6f2ff' : lit > 0.35 ? '#e2dbff' : '#c4b9f0');
      ctx.fillRect(mx + x, my + y, 1, 1);
    }
  }
  ctx.fillStyle = col('#cbc0f2');
  for (const [cx, cy, cr] of [[-3, -2, 2], [3, 3, 2], [-1, 5, 1], [4, -4, 1]]) ctx.fillRect(mx + cx, my + cy, cr, cr);
  return { canvas, twinkles, disc: { x: mx, y: my, r: mr } };
}

export interface SkyOpts {
  /** Chapter 1: the Austin skyline and the lake. */
  austin?: boolean;
  /** Time of day (default night). */
  sky?: SkyPreset;
  /** Neon density on the near layers (Sixth Street: 2.5). */
  neon?: number;
}

/** Bake the whole night for a buffer of w by h pixels. The seed varies the skyline per run. */
export function bakeSky(w: number, h: number, mono: boolean, seed = 0, text?: { draw: (c: Ctx, t: string, x: number, y: number) => void; width: (t: string) => number }, opts: SkyOpts = {}): Sky {
  const col = mono ? toMono : (c: string) => c;
  const sd = Math.floor(seed) >>> 0;
  const { canvas, twinkles, disc } = bakeSkyCanvas(w, h, 11 + sd * 13, col, opts.sky ?? SKY_PRESETS.night);
  const neon = opts.neon ?? 1;
  // in Austin the generic towers stay lower, so the landmarks read
  const styles = opts.austin ? LAYERS.map((st, i) => (i === 1 || i === 2 ? { ...st, maxH: Math.round(st.maxH * 0.62), minH: Math.round(st.minH * 0.7) } : st)) : LAYERS;
  const base = styles.map((st, i) => bakeLayer(st, (101 + i * 37 + Math.imul(sd, 7919)) >>> 0, col, i > 0 ? neon : 1));
  if (opts.austin) base.splice(1, 0, bakeAustin('far', mono), bakeAustin('near', mono));
  return {
    canvas,
    twinkles,
    disc,
    clouds: bakeClouds(29 + sd * 17, col),
    layers: [
      ...base,
      bakeClose((977 + Math.imul(sd, 104729)) >>> 0, col, text?.draw ?? (() => {}), text?.width ?? (() => 0)),
    ],
  };
}

/** A small deterministic hash of two numbers to 0..1. */
export function hash2(a: number, b: number): number {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2d);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Rare flicker: mostly 1, a short dip now and then. */
export function flicker(t: number, seed: number): number {
  const bucket = Math.floor(t * 14 + seed * 13);
  const r = hash2(bucket, Math.floor(seed * 1000));
  if (r < 0.025) return 0;
  if (r < 0.05) return 0.45;
  return 1;
}

export function drawStrip(ctx: Ctx, layer: SkyLayer, x: number, y: number, bw: number) {
  for (let sx = x; sx < bw; sx += STRIP_W) ctx.drawImage(layer.canvas, sx, y);
}
