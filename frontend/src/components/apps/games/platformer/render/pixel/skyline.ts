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

export const STRIP_W = 512;

export interface Flick { x: number; y: number; w: number; h: number; on: string; off: string; seed: number }
export interface Blink { x: number; y: number; seed: number }
export interface Neon { x: number; y: number; w: number; h: number; color: string; seed: number }

export interface SkyLayer {
  canvas: Canvas;
  /** Strip height, px; the strip's bottom sits on the horizon. */
  h: number;
  /** Parallax factor: 0 still, 1 moves with the world. */
  f: number;
  flick: Flick[];
  blinks: Blink[];
  neon: Neon[];
}

export interface Twinkle { x: number; y: number; seed: number; bright: boolean }

export interface Sky {
  canvas: Canvas;
  twinkles: Twinkle[];
  clouds: SkyLayer;
  layers: SkyLayer[];
}

function rng(seed: number) {
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
}

const LAYERS: LayerStyle[] = [
  { // far: tall, thin, hazy towers
    f: 0.1, h: 210, minH: 70, maxH: 200, minW: 14, maxW: 34,
    body: '#1d1838', shade: '#17132e', rim: '#3a2f62', top: '#2e2650',
    win: 1, winGap: 2, lit: 0.16, winAlpha: 0.55, haze: '#3a2456', hazeA: 0.5,
    spires: 0.3, towers: 0, neon: 0,
  },
  { // mid
    f: 0.25, h: 170, minH: 50, maxH: 150, minW: 20, maxW: 46,
    body: '#130f27', shade: '#0e0b1f', rim: '#3b2655', top: '#2a1f45',
    win: 1, winGap: 2, lit: 0.22, winAlpha: 0.8, haze: '#2e1640', hazeA: 0.38,
    spires: 0.22, towers: 0.25, neon: 0.18,
  },
  { // near: wide, low, detailed
    f: 0.45, h: 130, minH: 34, maxH: 110, minW: 28, maxW: 64,
    body: '#0b0918', shade: '#080612', rim: '#3a1d48', top: '#221a3a',
    win: 2, winGap: 2, lit: 0.18, winAlpha: 0.9, haze: '#2a0f30', hazeA: 0.28,
    spires: 0.18, towers: 0.3, neon: 0.3,
  },
];

const WARM = ['#ffcf7a', '#ffb347', '#ffd99a'];
const COOL = ['#9fe8ff', '#bfefff', '#7fc6ff'];
const PINK = ['#ff6ab8', '#ff8ccc'];
const NEON = ['#ff3d9a', '#3df2ff', '#ff3d9a', '#9a5cff'];

function bakeLayer(style: LayerStyle, seed: number, col: (c: string) => string): SkyLayer {
  const r = rng(seed);
  const H = style.h;
  const { canvas, ctx } = makeCanvas(STRIP_W, H);
  const flick: Flick[] = [];
  const blinks: Blink[] = [];
  const neon: Neon[] = [];
  const rect = (c: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = col(c);
    // wrap across the seam so the strip tiles
    ctx.fillRect(x, y, w, h);
    if (x + w > STRIP_W) ctx.fillRect(x - STRIP_W, y, w, h);
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
        ctx.globalAlpha = style.winAlpha * (0.45 + r() * 0.55);
        rect(c, wx, wy, ww, wh);
        ctx.globalAlpha = 1;
        if (flick.length < 6 && r() < 0.04) flick.push({ x: wx, y: wy, w: ww, h: wh, on: col(c), off: col(style.body), seed: r() * 100 });
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
      ctx.globalAlpha = 0.5;
      rect('#ffffff', nx + 1, ny + 1, 1, nh - 2);
      ctx.globalAlpha = 1;
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
  return { canvas, h: H, f: style.f, flick, blinks, neon };
}

function bakeClouds(seed: number, col: (c: string) => string): SkyLayer {
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
  return { canvas, h: H, f: 0.04, flick: [], blinks: [], neon: [] };
}

function rgba(hexOrRgb: string, a: number): string {
  const m = hexOrRgb.match(/rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(','); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; }
  const n = parseInt(hexOrRgb.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function bakeSkyCanvas(w: number, h: number, seed: number, col: (c: string) => string): { canvas: Canvas; twinkles: Twinkle[] } {
  const r = rng(seed);
  const { canvas, ctx } = makeCanvas(w, h);
  const g = ctx.createLinearGradient?.(0, 0, 0, h);
  if (g) {
    g.addColorStop(0, col('#03030b'));
    g.addColorStop(0.42, col('#0b0920'));
    g.addColorStop(0.72, col('#1e1236'));
    g.addColorStop(1, col('#3b1748'));
    ctx.fillStyle = g;
  } else ctx.fillStyle = col('#0b0920');
  ctx.fillRect(0, 0, w, h);

  // stars, thinning towards the glow of the city
  const n = Math.round((w * h) / 300);
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
  for (let i = 0; i < 14; i++) twinkles.push({ x: Math.floor(r() * w), y: Math.floor(Math.pow(r(), 1.4) * h * 0.55), seed: r() * 50, bright: i < 3 });

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
  return { canvas, twinkles };
}

/** Bake the whole night for a buffer of w by h pixels. The seed varies the skyline per run. */
export function bakeSky(w: number, h: number, mono: boolean, seed = 0): Sky {
  const col = mono ? toMono : (c: string) => c;
  const sd = Math.floor(seed) >>> 0;
  const { canvas, twinkles } = bakeSkyCanvas(w, h, 11 + sd * 13, col);
  return {
    canvas,
    twinkles,
    clouds: bakeClouds(29 + sd * 17, col),
    layers: LAYERS.map((s, i) => bakeLayer(s, (101 + i * 37 + Math.imul(sd, 7919)) >>> 0, col)),
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
