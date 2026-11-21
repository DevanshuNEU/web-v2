/**
 * Helpers the lazy theme chunks share: colours under Mono, glow-only
 * palettes, and the art's 512 wide strips as parallax layers. Like the
 * chunks, it borrows the renderer's kit (set once by the chunk that loads
 * it) instead of importing the main bundle.
 */

import type { Grid, Palette } from '../../sprites';
import type { Canvas } from '../canvas';
import type { Sky, SkyLayer } from '../skyline';
import type { ThemeKit } from '../themes';
import type { SkyPreset } from '../timeofday';

/** A coloured light on a strip, as the art lists them. */
export interface StripLight { x: number; y: number; color: string; kind: 'nav' | 'strobe' }
/** A parallax backdrop: three 512 wide tileable strips, bottom on the horizon. */
export interface Backdrop { far: Grid; mid: Grid; near: Grid; palette: Palette; glow: string }

let D: ThemeKit;
/** Hand the kit over (the first chunk to load does). */
export function setKit(kit: ThemeKit) { if (!D) D = kit; }
/** The kit, for the other shared modules (set before any of them draws). */
export function kit(): ThemeKit { return D; }

export function mod(a: number, m: number) { return ((a % m) + m) % m; }
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

const monoMemo = new Map<string, string>();
export function col(s: string, mono: boolean): string {
  if (!mono) return s;
  let v = monoMemo.get(s);
  if (!v) { v = D.toMono(s); monoMemo.set(s, v); }
  return v;
}
export const lightCol = (c: string, mono: boolean) => (mono ? '#ffffff' : c);

// ─────────────────────────────────────────────────────────────────────────────
// Backgrounds: strips from the art, as skyline layers
// ─────────────────────────────────────────────────────────────────────────────

const glowPalettes = new WeakMap<Palette, Map<string, Palette>>();
/** A palette where only the glowing keys keep their colour (memoised, so the baker's memo holds). */
export function glowOnly(p: Palette, keys: string): Palette {
  let byKeys = glowPalettes.get(p);
  if (!byKeys) { byKeys = new Map(); glowPalettes.set(p, byKeys); }
  let g = byKeys.get(keys);
  if (!g) {
    const out: Record<string, string> = {};
    for (const k of Object.keys(p)) out[k] = keys.includes(k) ? p[k] : 'rgba(0,0,0,0)';
    g = out;
    byKeys.set(keys, g);
  }
  return g;
}

/** blinks, glints: how many; lift: px of the strip's bottom row repeated under it, raising its horizon above the floor. */
export interface StripOpts { blinks?: number; glints?: number; seed?: number; lift?: number; lights?: readonly StripLight[] }

/** A 512 wide strip of the art as a parallax layer, with its glowing pixels on their own canvas. */
export function stripLayer(g: Grid, palette: Palette, glowKeys: string, f: number, mono: boolean, o: StripOpts = {}): SkyLayer {
  const lift = o.lift ?? 0;
  const h = g.length + lift;
  const art = D.bakeGrid(g, palette, { mono }) as Canvas;
  const glowArt = glowKeys ? (D.bakeGrid(g, glowOnly(palette, glowKeys), { mono }) as Canvas) : null;
  let canvas = art, glow = glowArt;
  if (lift > 0) {
    const b = D.makeCanvas(D.STRIP_W, h);
    b.ctx.drawImage(art, 0, 0);
    b.ctx.drawImage(art, 0, g.length - 1, D.STRIP_W, 1, 0, g.length, D.STRIP_W, lift);
    canvas = b.canvas;
    if (glowArt) { const gl = D.makeCanvas(D.STRIP_W, h); gl.ctx.drawImage(glowArt, 0, 0); glow = gl.canvas; }
  }
  const r = D.rng(o.seed ?? 5);
  const blinks = [];
  for (let i = 0; i < (o.blinks ?? 0); i++) blinks.push({ x: Math.floor(r() * D.STRIP_W), y: Math.floor(h * (0.3 + r() * 0.4)), seed: r() * 10 });
  const glints = [];
  for (let i = 0; i < (o.glints ?? 0); i++) glints.push({ x: Math.floor(r() * D.STRIP_W), y: h - 1 - Math.floor(r() * h * 0.25), seed: r() * 50 });
  const beacons = (o.lights ?? []).map((l, i) => ({ x: l.x, y: l.y, color: col(l.color, mono), strobe: l.kind === 'strobe', seed: i * 0.43 }));
  return { canvas, glow, drips: [], tvs: [], glints: glints.length ? glints : undefined, beacons: beacons.length ? beacons : undefined, h, f, flick: [], blinks, neon: [] };
}

/** A thin band of wisps high in the sky, lit by the moon (silver) or the apron (amber). */
export function wispBand(seed: number, mono: boolean, lit: string, body: string): SkyLayer {
  const r = D.rng(seed);
  const H = 48;
  const { canvas, ctx } = D.makeCanvas(D.STRIP_W, H);
  for (let i = 0; i < 12; i++) {
    const len = 40 + Math.round(r() * 120), th = 2 + Math.round(r() * 3);
    const cx = Math.round(r() * D.STRIP_W), cy = 6 + Math.round(r() * (H - 14));
    for (let j = 0; j < th; j++) {
      const rowLen = Math.round(len * (1 - Math.abs(j - th * 0.4) / th) * (0.8 + r() * 0.2));
      const rx = cx + Math.round((len - rowLen) / 2);
      ctx.fillStyle = col(j === 0 ? lit : body, mono);
      ctx.globalAlpha = j === 0 ? 0.55 : 0.4;
      ctx.fillRect(rx, cy + j, rowLen, 1);
      if (rx + rowLen > D.STRIP_W) ctx.fillRect(rx - D.STRIP_W, cy + j, rowLen, 1);
    }
  }
  ctx.globalAlpha = 1;
  return { canvas, glow: null, drips: [], tvs: [], h: H, f: 0.04, flick: [], blinks: [], neon: [] };
}

export function backdropSky(b: Backdrop, w: number, h: number, mono: boolean, seed: number, sky: SkyPreset, clouds: SkyLayer, f: readonly [number, number, number], o: readonly StripOpts[]): Sky {
  const { canvas, twinkles, disc } = D.bakeSkyCanvas(w, h, 11 + (Math.floor(seed) >>> 0) * 13, c => col(c, mono), sky);
  return {
    canvas, twinkles, disc, clouds,
    layers: [
      stripLayer(b.far, b.palette, b.glow, f[0], mono, o[0]),
      stripLayer(b.mid, b.palette, b.glow, f[1], mono, o[1]),
      stripLayer(b.near, b.palette, b.glow, f[2], mono, o[2]),
    ],
  };
}
