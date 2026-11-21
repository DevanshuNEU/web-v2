/**
 * Vehicles on their lanes, shared by the lazy theme chunks (the trolley and
 * trains of chapter 3, the boats of chapter 4). Each chunk hands in its own
 * art table by sim kind; this draws what `World.vehicles` holds, read
 * defensively, without allocating:
 *
 * - smoothed between sim steps, art facing right and mirrored running left;
 * - behind her, in front of the tiles (call it from the theme's tiles layer);
 * - at a lane end against a wall (a tunnel, the station) it is clipped there
 *   under the mouth's shadow; at an open end (water in fog) it fades in;
 * - its lights (headlight, windows, running lights) placed from the art;
 * - a rumble when one with `rumble` passes close to her.
 */

import type { SpriteSet } from '../../sprites';
import type { Canvas, Ctx } from '../canvas';
import type { Atlas } from '../sprites';
import type { ThemeFrame } from '../themes';
import { clamp01, kit } from './strips';

/** A light on a vehicle, in sprite pixels from its top left with the cab or bow on the right. */
export interface VehicleLight { dx: number; dy: number; r: number; color: string; k: number; halo: number }

export interface VehicleArt {
  set: SpriteSet<'idle'>;
  glow: string;
  /** CSS px of shake when it passes close (0 for none). */
  rumble: number;
  lights: readonly VehicleLight[];
  /** Frames per second while it moves (0 or unset holds frame 0). */
  fps?: number;
  /**
   * Pixels the hull must reach further down than the art draws it (the sim's
   * hull is deeper): the row under the deck is carried down that far and the
   * rest of the hull and its reflection drawn under it.
   */
  drop?: number;
}

interface VehicleLike { kind: string; x: number; y: number; w: number; h: number; vx: number; active: boolean; px?: number; py?: number }
interface LaneLike { row: number; x0: number; x1: number }
const NO_VEHICLES: readonly VehicleLike[] = [];
const NO_LANES: readonly LaneLike[] = [];

export const vehiclesOf = (f: ThemeFrame) => (f.world as unknown as { vehicles?: readonly VehicleLike[] }).vehicles ?? NO_VEHICLES;
export const lanesOf = (f: ThemeFrame) => (f.world.level as unknown as { vehicles?: readonly LaneLike[] }).vehicles ?? NO_LANES;

const shadeArt: (Canvas | null)[] = [null, null];
/** A tunnel mouth's shadow, dark at x 0 fading to clear at 15 (flip it for the other end). */
function shade(mono: boolean): Canvas {
  const hit = shadeArt[mono ? 1 : 0];
  if (hit) return hit;
  const { canvas, ctx } = kit().makeCanvas(16, 1);
  for (let x = 0; x < 16; x++) {
    ctx.globalAlpha = Math.pow(1 - x / 16, 1.6) * 0.92;
    ctx.fillStyle = mono ? '#050505' : '#05040b';
    ctx.fillRect(x, 0, 1, 1);
  }
  shadeArt[mono ? 1 : 0] = canvas;
  return canvas;
}

/** A frame with its hull lengthened: rows to the deck, the row under it stretched `drop` px, then the rest. */
function drawDropped(c: Ctx, a: Atlas, frame: number, dir: number, x: number, y: number, drop: number, layer: 'base' | 'glow') {
  const src = layer === 'glow' ? (dir < 0 ? a.glowFlip : a.glow) : dir < 0 ? a.flip : a.sheet;
  if (!src) return;
  const list = a.rects.idle;
  const r = list[((Math.floor(frame) % list.length) + list.length) % list.length];
  const sx = dir < 0 ? a.sheetW - r.x - r.w : r.x;
  const top = y - a.ay, cut = a.ay + 1;
  c.drawImage(src, sx, r.y, r.w, cut, x, top, r.w, cut);
  c.drawImage(src, sx, r.y + cut, r.w, 1, x, top + cut, r.w, drop);
  c.drawImage(src, sx, r.y + cut, r.w, r.h - cut, x, top + cut + drop, r.w, r.h - cut);
}

/** Is there a wall just past a lane end (column `x`) across the vehicle's rows? */
function wallAt(f: ThemeFrame, x: number, row: number, h: number): boolean {
  const D = kit(), level = f.world.level;
  if (x < 0 || x >= level.cols) return true;
  for (let y = Math.max(0, Math.floor(row)); y < Math.min(D.ROWS, Math.ceil(row + h)); y++) {
    const k = D.KIND[level.tiles[y * level.cols + x]];
    if (k === D.K.ROOF || k === D.K.STONE) return true;
  }
  return false;
}

export function drawVehicles(c: Ctx, f: ThemeFrame, layer: 'base' | 'glow', table: Readonly<Record<string, VehicleArt>>) {
  const D = kit();
  const list = vehiclesOf(f);
  const lanes = lanesOf(f);
  const T = D.ART_TILE;
  const hx = (f.heroX + f.ox) / T, hy = (f.heroY + f.oy) / T;
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (!v.active) continue;
    const art = table[v.kind];
    if (!art) continue;
    const a = D.atlas(art.set, f.mono, art.glow);
    const vx = typeof v.px === 'number' ? v.px + (v.x - v.px) * f.alpha : v.x;
    const vy = typeof v.py === 'number' ? v.py + (v.y - v.py) * f.alpha : v.y;
    const x = Math.round(vx * T) - f.ox, y = Math.round(vy * T) - f.oy;
    const lane = lanes[i];
    const wallL = !!lane && wallAt(f, lane.x0 - 1, lane.row, v.h), wallR = !!lane && wallAt(f, lane.x1 + 1, lane.row, v.h);
    const left = lane ? lane.x0 * T - f.ox : -1e4, right = lane ? (lane.x1 + 1) * T - f.ox : 1e4;
    if (x > Math.min(f.bw + 40, right) || x + a.w < Math.max(-40, left)) continue;
    const dir = v.vx < 0 ? -1 : 1;
    const bodyH = Math.round(v.h * T);
    // open lane ends: fade with how much of it is inside the lane
    const inside = lane ? (Math.min(x + a.w, right) - Math.max(x, left)) / a.w : 1;
    const fade = (wallL && wallR) || !lane ? 1 : clamp01(inside * 1.6);
    const frame = art.fps && v.vx !== 0 ? f.t * art.fps : 0;
    c.save();
    c.beginPath();
    c.rect(wallL ? left : -1e4, y - a.h, (wallR ? right : 1e4) - (wallL ? left : -1e4), a.h * 3);
    c.clip();
    c.globalAlpha = fade;
    if (art.drop) drawDropped(c, a, frame, dir, x, y, art.drop, layer);
    else D.drawFrame(c, a, 'idle', frame, dir > 0 ? x : x + a.w, y, dir, layer);
    if (layer === 'base') {
      const sh = shade(f.mono);
      if (wallL && x < left + 16) c.drawImage(sh, left, y - 8, 16, bodyH + 10);
      if (wallR && x + a.w > right - 16) { c.translate(right, 0); c.scale(-1, 1); c.drawImage(sh, 0, y - 8, 16, bodyH + 10); }
    }
    c.restore();
    if (layer !== 'base') continue;
    // its lights, from the art (mirrored running left), only where it shows
    const top = y - a.ay;
    for (let j = 0; j < art.lights.length; j++) {
      const L = art.lights[j];
      const lx = x + (dir > 0 ? L.dx : a.w - L.dx);
      if ((wallL && lx < left - 8) || (wallR && lx > right + 8)) continue;
      f.light(lx, top + L.dy, L.r, L.color, L.k * fade, L.halo * fade);
    }
    // one passing close rumbles the view
    if (art.rumble > 0) {
      const dx = Math.abs(vx + v.w / 2 - hx), dy = Math.abs(vy - hy);
      if (dx < v.w / 2 + 6 && dy < 5) {
        const k = (1 - clamp01((dx - v.w / 2) / 6)) * (1 - dy / 5) * Math.min(1, Math.abs(v.vx) / 6);
        if (art.rumble * k > f.shake) f.shake = art.rumble * k;
      }
    }
  }
}

/**
 * Rails along the bottom of each lane where it crosses open air (a trench):
 * steel rails on sleepers over a dark girder, drawn once per lane however
 * many timetables share it.
 */
export function drawRails(c: Ctx, f: ThemeFrame, col: (s: string, mono: boolean) => string) {
  const D = kit();
  const lanes = lanesOf(f);
  if (!lanes.length) return;
  const list = vehiclesOf(f);
  const level = f.world.level, cols = level.cols, T = D.ART_TILE;
  const steel = col('#8a93a8', f.mono), web = col('#3a3f52', f.mono), sleeper = col('#2a2230', f.mono), girder = col('#141824', f.mono);
  for (let i = 0; i < lanes.length; i++) {
    const L = lanes[i];
    let dup = false;
    for (let j = 0; j < i && !dup; j++) dup = lanes[j].row === L.row && lanes[j].x0 === L.x0 && lanes[j].x1 === L.x1;
    if (dup) continue;
    const h = list[i] ? list[i].h : 2;
    const row = Math.floor(L.row + h);
    if (row < 0 || row >= D.ROWS) continue;
    const y = Math.round((L.row + h) * T) - f.oy;
    if (y < -8 || y > f.bh + 4) continue;
    const c0 = Math.max(L.x0, Math.floor(f.ox / T)), c1 = Math.min(L.x1, Math.floor((f.ox + f.bw) / T));
    for (let tx = c0; tx <= c1; tx++) {
      if (D.KIND[level.tiles[row * cols + tx]] !== 0) continue;
      const x = tx * T - f.ox;
      c.fillStyle = girder; c.fillRect(x, y + 3, 16, 2);
      c.fillStyle = sleeper;
      for (let k = 1; k < 16; k += 5) c.fillRect(x + k, y + 1, 3, 2);
      c.fillStyle = web; c.fillRect(x, y + 1, 16, 1);
      c.fillStyle = steel; c.fillRect(x, y, 16, 1);
    }
  }
}
