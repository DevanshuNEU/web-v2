/**
 * 4-boss, The Ex-Bestie: the gorilla on the cable-stayed bridge in the
 * morning (theme zakim). Its own small lazy chunk, loaded by ../themes.ts
 * when the boss card shows.
 *
 * Its layers, all read defensively from the World and drawn without
 * allocating (bubbles and cables are baked once and kept):
 * - the bridge's stays as straight cables through the level's cable steps,
 *   running on up to the towers;
 * - the arena gates, drawn per frame (the entry shuts when the fight starts,
 *   the exit opens when he is beaten);
 * - the gorilla, his animation picked from his state (telegraph frames held,
 *   impacts on their frames, a white flash on a hit, the climb on the cable);
 * - what he throws or shakes loose: the barrel held over his head while it
 *   warns, the debris shaking at the top with a mark on the deck, shockwaves;
 * - in front: the mark where he will land, his line in a speech bubble, and
 *   the boss bar with his name at the top while the fight is on.
 * A pound, a slam into the deck and a lunge into a tower shake the view.
 */

import type { Level } from '../../../sim/level';
import type { Canvas, Ctx } from '../canvas';
import type { FacadeCell } from '../tiles';
import type { EnemyArt, PixelTheme, ThemeFrame, ThemeKit } from '../themes';
import { backdropSky, col, setKit, wispBand } from './strips';
import { BARREL, DEBRIS, GORILLA, GORILLA_CLIMB_ANCHOR, GORILLA_GLOW, GORILLA_THROW_HOLD, BOSS_PROPS_GLOW, SHOCKWAVE, TAUNT_BUBBLE, WARN_MARK } from '../../sprites/gorilla';
import { ZAKIM_BACKDROP, ZAKIM_BOSS_BAR_INNER, ZAKIM_GLOW, ZAKIM_PALETTE, ZAKIM_TILES } from '../../sprites/zakim';
import { BOSTON_ENEMIES, BOSTON_ENEMY_GLOW } from '../../sprites/bostonEnemies';

let D: ThemeKit;

const LAMP = '#ffe6b0', AMBER = '#ffb347';

// ─────────────────────────────────────────────────────────────────────────────
// What the renderer reads (the sim's shapes, all optional)
// ─────────────────────────────────────────────────────────────────────────────

interface BossLike {
  x: number; y: number; w: number; h: number; vx: number; vy: number;
  hp: number; maxHp: number; phase: number; state: string; stateT: number; facing: number;
  punish: boolean; taunt: string | null; tauntT: number; aimX: number | null;
}
interface ProjectileLike { kind: string; x: number; y: number; w: number; h: number; vx: number; vy: number; warn: number }
interface FightLike { on: boolean; arena?: { floor: number } }
const NO_PROJECTILES: readonly ProjectileLike[] = [];

const bossOf = (f: ThemeFrame) => (f.world as unknown as { boss?: BossLike | null }).boss ?? null;
const projectilesOf = (f: ThemeFrame) => (f.world as unknown as { projectiles?: readonly ProjectileLike[] }).projectiles ?? NO_PROJECTILES;
const fightOf = (f: ThemeFrame) => (f.world as unknown as { fight?: FightLike | null }).fight ?? null;

/** Seconds a telegraph lasts, a line shows, and the hit flash holds (2 or 3 frames). */
const WARN = 0.8, TAUNT_SHOW = 2.4, FLASH = 0.05;

// ─────────────────────────────────────────────────────────────────────────────
// The gorilla
// ─────────────────────────────────────────────────────────────────────────────

/** His anim and frame now, and where it anchors (the climb puts its own point on the cable). */
const POSE = { anim: 'idle', frame: 0, climb: false, hold: -1 };

function at(anim: string, frame: number) { POSE.anim = anim; POSE.frame = frame; }
function loop(anim: string, fps: number, t: number, reduced: boolean) { POSE.anim = anim; POSE.frame = reduced ? 0 : t * fps; }

function pose(b: BossLike, t: number, reduced: boolean) {
  const st = b.state, k = b.stateT;
  POSE.climb = false; POSE.hold = -1;
  switch (st) {
    case 'pace': loop('pace', 10, t, reduced); break;
    case 'chestBeat': case 'roar': loop('chestBeat', 8, t, reduced); break;
    // the wind up: the thing held over his head (frames 0 then 1), released after
    case 'throwWarn': at('throw', k < WARN * 0.5 ? 0 : 1); POSE.hold = POSE.frame; break;
    case 'watch': case 'perch':
      if (k < 0.2) at('throw', k < 0.1 ? 2 : 3); else loop('idle', 6, t, reduced);
      break;
    case 'lungeWarn': at('lunge', 0); break;
    case 'lunge': at('lunge', 1); break;
    case 'dazed': if (k < 0.25) at('lunge', 2); else loop('winded', 6, t, reduced); break;
    case 'poundWarn': at('pound', k < WARN - 0.1 ? 0 : 1); break;
    case 'pound': at('pound', k < 0.2 ? 2 : 3); break;
    case 'winded': case 'slumped': if (st === 'slumped' && k < 0.15) at('slam', 1); else loop('winded', 6, t, reduced); break;
    case 'climb': loop('climb', 8, t, reduced); POSE.climb = true; break;
    case 'slamWarn': at('pound', 0); break;
    case 'slam': at('slam', 0); break;
    case 'down': at('down', Math.min(3, Math.floor(k * 4))); break;
    case 'beaten': at('down', 3); break;
    default: loop('idle', 6, t, reduced);
  }
}

/** When the last hit landed (world time), and a hit heard but not yet timed. */
const HIT = { at: -9, pending: false };

function drawGorilla(c: Ctx, f: ThemeFrame, layer: 'base' | 'glow') {
  const b = bossOf(f);
  if (!b) return;
  const T = D.ART_TILE;
  if (HIT.pending) { HIT.at = f.t; HIT.pending = false; }
  pose(b, f.t, f.reduced);
  const a = D.atlas(GORILLA, f.mono, GORILLA_GLOW);
  const cx = Math.round((b.x + b.w / 2) * T) - f.ox, feet = Math.round((b.y + b.h) * T) - f.oy;
  if (cx < -40 || cx > f.bw + 40) return;
  const dir = b.facing < 0 ? -1 : 1;
  const flash = f.t - HIT.at >= 0 && f.t - HIT.at < FLASH;
  // on a cable his hands and feet sit on its line: that point goes where his feet are
  // (at the cable's foot, still on the deck, he stands on it as usual)
  const fight = fightOf(f);
  const onDeck = !!fight?.arena && b.y + b.h >= fight.arena.floor - 0.6;
  // walking the deck to the cable's foot he paces; on the cable he climbs
  if (POSE.climb && onDeck) { POSE.anim = 'pace'; POSE.climb = false; }
  const y = POSE.climb ? feet + (GORILLA.anchor.y - GORILLA_CLIMB_ANCHOR.y) : feet;
  D.drawFrame(c, a, flash ? 'hurt' : POSE.anim, flash ? 0 : POSE.frame, cx, y, dir, layer);
  // what he holds over his head in the wind up
  if (POSE.hold >= 0 && layer === 'base') {
    const h = GORILLA_THROW_HOLD[POSE.hold];
    const held = h ? heldProp(f) : null;
    if (h && held) {
      const hx = dir > 0 ? h.x : GORILLA.size.w - h.x;
      const top = y - GORILLA.anchor.y;
      drawProp(c, f, held, cx - GORILLA.anchor.x + hx, top + h.y, 0, layer);
    }
  }
  if (layer === 'base' && b.punish) f.light(cx, feet - 30, 40, '#fff0c8', 0.35, 0.15);
  // the cues: a pound landing, a slam into the deck, a lunge into a tower
  if (!f.reduced && layer === 'base') {
    const k = b.stateT;
    const s = (b.state === 'pound' && k < 0.25) ? 2.2 : (b.state === 'slumped' && k < 0.3) ? 2.6 : (b.state === 'dazed' && k < 0.25) ? 1.8 : 0;
    if (s > f.shake) f.shake = s;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// What he throws
// ─────────────────────────────────────────────────────────────────────────────

/** The projectile held in a wind up: the warning barrel or debris nearest his head. */
function heldProp(f: ThemeFrame): ProjectileLike | null {
  const b = bossOf(f), list = projectilesOf(f);
  if (!b) return null;
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (p.warn > 0 && p.kind === 'barrel' && Math.abs(p.x + p.w / 2 - (b.x + b.w / 2)) < 2 && p.y < b.y + 0.5) return p;
  }
  return null;
}

/** One prop: the barrel (bottom centre, rolling), the debris (centre), the shockwave (bottom centre on the deck). */
function drawProp(c: Ctx, f: ThemeFrame, p: ProjectileLike, x: number, y: number, i: number, layer: 'base' | 'glow') {
  const t = f.reduced ? 0 : f.t;
  if (p.kind === 'barrel') {
    D.drawFrame(c, D.atlas(BARREL, f.mono, BOSS_PROPS_GLOW), 'roll', p.vx === 0 ? 0 : t * 12, Math.round(x), Math.round(y + 8), p.vx < 0 ? -1 : 1, layer);
  } else if (p.kind === 'debris') {
    D.drawFrame(c, D.atlas(DEBRIS, f.mono, BOSS_PROPS_GLOW), 'idle', i % 2, Math.round(x), Math.round(y), 1, layer);
  } else if (p.kind === 'shockwave') {
    D.drawFrame(c, D.atlas(SHOCKWAVE, f.mono, BOSS_PROPS_GLOW), 'roll', t * 12, Math.round(x), Math.round(y), p.vx < 0 ? -1 : 1, layer);
  }
}

/** The deck's top under a column (tiles), from the fight's arena or the first solid cell. */
function deckAt(f: ThemeFrame, x: number): number {
  const a = fightOf(f)?.arena;
  if (a) return a.floor;
  const level = f.world.level, cols = level.cols, tx = Math.max(0, Math.min(cols - 1, Math.floor(x)));
  for (let y = 0; y < D.ROWS; y++) { const k = D.KIND[level.tiles[y * cols + tx]]; if (k === D.K.ROOF || k === D.K.STONE) return y; }
  return D.ROWS - 1;
}

function drawProjectiles(c: Ctx, f: ThemeFrame, layer: 'base' | 'glow') {
  const list = projectilesOf(f);
  if (!list.length) return;
  const T = D.ART_TILE;
  const held = layer === 'base' ? heldProp(f) : null;
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (p === held) continue;
    const cx = (p.x + p.w / 2) * T - f.ox;
    if (cx < -32 || cx > f.bw + 32) continue;
    if (p.kind === 'debris' && p.warn > 0) {
      // shaking loose at the top of the view
      const jig = f.reduced ? 0 : Math.round(Math.sin(f.t * 60 + i) * 1.2);
      drawProp(c, f, p, cx + jig, 8 - f.oy, i, layer);
      continue;
    }
    drawProp(c, f, p, cx, p.kind === 'debris' ? (p.y + p.h / 2) * T - f.oy : (p.y + p.h) * T - f.oy - (p.kind === 'barrel' ? 8 : 0), i, layer);
  }
}

/** In front: the marks where debris will land, and where he will land from the cable. */
function drawMarks(c: Ctx, f: ThemeFrame) {
  const T = D.ART_TILE;
  const a = D.atlas(WARN_MARK, f.mono, BOSS_PROPS_GLOW);
  const fr = f.reduced ? 0 : f.t * 8;
  const list = projectilesOf(f);
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (p.kind !== 'debris' || p.warn <= 0) continue;
    const x = Math.round((p.x + p.w / 2) * T) - f.ox;
    D.drawFrame(c, a, 'blink', fr, x, deckAt(f, p.x + p.w / 2) * T - f.oy, 1);
  }
  const b = bossOf(f);
  if (b && b.aimX !== null && (b.state === 'slamWarn' || b.state === 'slam' || b.state === 'throwWarn')) {
    D.drawFrame(c, a, 'blink', fr, Math.round(b.aimX * T) - f.ox, deckAt(f, b.aimX) * T - f.oy, 1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// His lines and the boss bar
// ─────────────────────────────────────────────────────────────────────────────

/** Baked bubbles by line id and palette, and the bar's name. */
const bubbles = new Map<string, Canvas>();

/** A speech bubble with the line in it: the 9 slice stretched round the text, the tail under it. */
function bubbleFor(f: ThemeFrame, id: string): Canvas {
  const key = (f.mono ? 'm:' : 'c:') + id;
  const hit = bubbles.get(key);
  if (hit) return hit;
  const text = f.text(id).toUpperCase();
  const B = TAUNT_BUBBLE, inset = B.inset;
  const tw = D.textWidth(text), w = Math.max(16, tw + 2 * B.padding), h = D.GLYPH_H + 8;
  const tail = B.tail, th = tail.length, tW = tail[0].length;
  const { canvas, ctx } = D.makeCanvas(w, h + th - 2);
  const s = D.bakeGrid(B.slice, B.palette, { mono: f.mono }) as Canvas, S = B.slice.length;
  const m = S - 2 * inset;
  // corners, edges stretched, the centre
  ctx.drawImage(s, 0, 0, inset, inset, 0, 0, inset, inset);
  ctx.drawImage(s, S - inset, 0, inset, inset, w - inset, 0, inset, inset);
  ctx.drawImage(s, 0, S - inset, inset, inset, 0, h - inset, inset, inset);
  ctx.drawImage(s, S - inset, S - inset, inset, inset, w - inset, h - inset, inset, inset);
  ctx.drawImage(s, inset, 0, m, inset, inset, 0, w - 2 * inset, inset);
  ctx.drawImage(s, inset, S - inset, m, inset, inset, h - inset, w - 2 * inset, inset);
  ctx.drawImage(s, 0, inset, inset, m, 0, inset, inset, h - 2 * inset);
  ctx.drawImage(s, S - inset, inset, inset, m, w - inset, inset, inset, h - 2 * inset);
  ctx.drawImage(s, inset, inset, m, m, inset, inset, w - 2 * inset, h - 2 * inset);
  const tailArt = D.bakeGrid(tail, B.palette, { mono: f.mono }) as Canvas;
  ctx.drawImage(tailArt, Math.round(w / 2 - tW / 2), h - 2);
  ctx.fillStyle = col(B.ink, f.mono);
  D.drawText(ctx, text, Math.round((w - tw) / 2), 4);
  bubbles.set(key, canvas);
  return canvas;
}

function drawTaunt(c: Ctx, f: ThemeFrame) {
  const b = bossOf(f);
  if (!b || !b.taunt || b.tauntT > TAUNT_SHOW) return;
  const img = bubbleFor(f, b.taunt);
  const T = D.ART_TILE;
  const cx = Math.round((b.x + b.w / 2) * T) - f.ox, top = Math.round((b.y + b.h) * T) - f.oy - GORILLA.size.h + 4;
  const x = Math.max(2, Math.min(f.bw - img.width - 2, cx - Math.round(img.width / 2)));
  const y = Math.max(2, top - img.height);
  c.drawImage(img, 0, 0, img.width, img.height, x, y, img.width, img.height);
}

const BAR_NAME = 'boss-gorilla-name';

/** The bar at the top centre while the fight is on: the frame, the trough filled with his hp, his name under it. */
function drawBar(c: Ctx, f: ThemeFrame) {
  const fight = fightOf(f), b = bossOf(f);
  if (!fight || !fight.on || !b) return;
  const bar = D.atlas(ZAKIM_TILES.decor.bossBar, f.mono, ZAKIM_GLOW);
  const x = Math.round((f.bw - bar.w) / 2), y = Math.round(f.insetTop) + 6;
  D.drawFrame(c, bar, 'idle', 0, x, y + bar.h, 1);
  const I = ZAKIM_BOSS_BAR_INNER;
  const k = b.maxHp > 0 ? Math.max(0, Math.min(1, b.hp / b.maxHp)) : 0;
  const fw = Math.round(I.w * k);
  if (fw > 0) {
    c.fillStyle = col(b.punish ? '#ffd36a' : '#e8404a', f.mono);
    c.fillRect(x + I.x, y + I.y, fw, I.h);
    c.fillStyle = col(b.punish ? '#fff1c2' : '#ff8a8a', f.mono);
    c.fillRect(x + I.x, y + I.y, fw, 1);
  }
  const name = nameFor(f);
  c.drawImage(name, 0, 0, name.width, name.height, Math.round((f.bw - name.width) / 2), y + bar.h + 2, name.width, name.height);
}

/** His name in the pixel font with a dark edge, baked once per palette. */
function nameFor(f: ThemeFrame): Canvas {
  const key = (f.mono ? 'm:' : 'c:') + BAR_NAME;
  const hit = bubbles.get(key);
  if (hit) return hit;
  const text = f.text(BAR_NAME).toUpperCase();
  const tw = D.textWidth(text);
  const { canvas, ctx } = D.makeCanvas(tw + 2, D.GLYPH_H + 2);
  ctx.fillStyle = col('#1a1626', f.mono);
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) D.drawText(ctx, text, dx, dy);
  ctx.fillStyle = col('#fff6e8', f.mono);
  D.drawText(ctx, text, 1, 1);
  bubbles.set(key, canvas);
  return canvas;
}

// ─────────────────────────────────────────────────────────────────────────────
// The arena: cables and gates
// ─────────────────────────────────────────────────────────────────────────────

/** The level's cables, baked once into a canvas the size of the level (per level and palette). */
const CABLES = { level: null as unknown, mono: false, canvas: null as Canvas | null };

/**
 * Each connected run of cable cells becomes one straight stay through the
 * middles of its steps (the sim's walkable tops), carried on up to the
 * tower it hangs from, with a socket where it meets the deck.
 */
function bakeCables(level: Level, mono: boolean): Canvas {
  const cols = level.cols, rows = D.ROWS, T = D.ART_TILE, CB = D.K.CABLE;
  const { canvas, ctx } = D.makeCanvas(cols * T, rows * T);
  const seen = new Uint8Array(cols * rows);
  const sheath = col(ZAKIM_PALETTE.B, mono), core = col(ZAKIM_PALETTE.C, mono), under = col(ZAKIM_PALETTE.D, mono), socket = col('#3a3a4a', mono);
  const solid = (x: number, y: number) => { if (x < 0 || x >= cols || y < 0 || y >= rows) return false; const k = D.KIND[level.tiles[y * cols + x]]; return k === D.K.ROOF || k === D.K.STONE; };
  for (let i = 0; i < cols * rows; i++) {
    if (D.KIND[level.tiles[i]] !== CB || seen[i]) continue;
    // the run: flood the cable cells touching this one
    const run: number[] = [i]; seen[i] = 1;
    for (let r = 0; r < run.length; r++) {
      const cx = run[r] % cols, cy = Math.floor(run[r] / cols);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        const n = ny * cols + nx;
        if (!seen[n] && D.KIND[level.tiles[n]] === CB) { seen[n] = 1; run.push(n); }
      }
    }
    // its top step and its foot step: the middle of each step's top
    let topY = rows, footY = -1;
    for (const n of run) { const y = Math.floor(n / cols); if (y < topY) topY = y; if (y > footY) footY = y; }
    let t0 = cols, t1 = -1, f0 = cols, f1 = -1;
    for (const n of run) {
      const x = n % cols, y = Math.floor(n / cols);
      if (y === topY) { t0 = Math.min(t0, x); t1 = Math.max(t1, x); }
      if (y === footY) { f0 = Math.min(f0, x); f1 = Math.max(f1, x); }
    }
    const ax = ((t0 + t1 + 1) / 2) * T, ay = topY * T, bx = ((f0 + f1 + 1) / 2) * T, by = footY * T;
    if (bx === ax) continue;
    const slope = (by - ay) / (bx - ax);
    const down = bx > ax ? 1 : -1;
    // up to the tower: on from the top until a solid column or the top of the level
    let xs = ax;
    while (true) {
      const nx = xs - down;
      const ny = ay + (nx - ax) * slope;
      if (ny < 0 || solid(Math.floor((nx - (down > 0 ? 1 : 0)) / T), Math.floor(ny / T))) break;
      xs = nx;
      if (Math.abs(xs - ax) > cols * T) break;
    }
    const xe = (down > 0 ? f1 + 1 : f0) * T;
    const lo = Math.min(xs, xe), hi = Math.max(xs, xe);
    for (let x = lo; x < hi; x++) {
      const y = Math.round(ay + (x + 0.5 - ax) * slope);
      ctx.fillStyle = sheath; ctx.fillRect(x, y, 1, 1);
      ctx.fillStyle = core; ctx.fillRect(x, y + 1, 1, 1);
      ctx.fillStyle = under; ctx.fillRect(x, y + 2, 1, 1);
    }
    // the socket on the deck at its foot
    const sx = xe - (down > 0 ? 6 : 0), sy = Math.round(ay + (xe - ax) * slope);
    ctx.fillStyle = socket; ctx.fillRect(sx, sy - 1, 6, 5);
    ctx.fillStyle = core; ctx.fillRect(sx, sy - 1, 6, 1);
  }
  return canvas;
}

function drawCables(c: Ctx, f: ThemeFrame) {
  const level = f.world.level;
  if (CABLES.level !== level || CABLES.mono !== f.mono || !CABLES.canvas) {
    let any = false;
    for (let i = 0; i < level.tiles.length && !any; i++) any = D.KIND[level.tiles[i]] === D.K.CABLE;
    CABLES.canvas = any ? bakeCables(level, f.mono) : null;
    CABLES.level = level; CABLES.mono = f.mono;
  }
  const cv = CABLES.canvas;
  if (!cv) return;
  const sx = Math.max(0, Math.floor(f.ox)), sy = Math.max(0, Math.floor(f.oy));
  const w = Math.min(cv.width - sx, f.bw + 2), h = Math.min(cv.height - sy, f.bh + 2);
  if (w > 0 && h > 0) c.drawImage(cv, sx, sy, w, h, sx - f.ox, sy - f.oy, w, h);
}

/** Gate cells: a steel shutter of bars under a hazard striped head, drawn while shut. */
function drawGates(c: Ctx, f: ThemeFrame) {
  const w = f.world, cols = w.level.cols, T = D.ART_TILE, GK = D.K.GATE;
  const c0 = Math.max(0, Math.floor(f.ox / T)), c1 = Math.min(cols - 1, Math.floor((f.ox + f.bw) / T));
  const frame = col('#2a2f3a', f.mono), bar = col('#c8ccd6', f.mono), dark = col('#151821', f.mono), stripe = col('#ffcc33', f.mono);
  for (let tx = c0; tx <= c1; tx++) {
    for (let ty = 0; ty < D.ROWS; ty++) {
      if (D.KIND[w.tiles[ty * cols + tx]] !== GK) continue;
      const x = tx * T - f.ox, y = ty * T - f.oy;
      const head = ty === 0 || D.KIND[w.tiles[(ty - 1) * cols + tx]] !== GK;
      c.fillStyle = dark; c.fillRect(x + 1, y, 14, 16);
      c.fillStyle = frame; c.fillRect(x, y, 1, 16); c.fillRect(x + 15, y, 1, 16);
      c.fillStyle = bar;
      for (let bx = 3; bx < 14; bx += 3) c.fillRect(x + bx, y, 1, 16);
      if (head) {
        c.fillStyle = frame; c.fillRect(x, y, 16, 4);
        c.fillStyle = stripe;
        for (let k = 0; k < 16; k += 4) c.fillRect(x + k, y + 1, 2, 2);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The theme
// ─────────────────────────────────────────────────────────────────────────────

function deckFacade(cell: FacadeCell) {
  const { base: b, px, py, depth } = cell;
  if (depth > 0) {
    b.fillStyle = 'rgba(30,24,40,1)';
    b.globalAlpha = Math.min(0.35, 0.07 * depth);
    b.fillRect(px, py, 16, 16);
    b.globalAlpha = 1;
  }
  if (cell.openL) { b.fillStyle = cell.mono ? '#0b0b0c' : '#2a2430'; b.fillRect(px, py + 1, 1, 15); }
  if (cell.openR) { b.fillStyle = cell.mono ? '#0b0b0c' : '#2a2430'; b.fillRect(px + 15, py + 1, 1, 15); }
}

const ENEMIES: { walker: EnemyArt; flyer: EnemyArt } = {
  walker: { set: BOSTON_ENEMIES.pigeon, glow: BOSTON_ENEMY_GLOW, move: 'hop', dead: 'squashed', light: '#ffa04a', hop: { every: 1.2, fps: 8, frames: 4 } },
  flyer: { set: BOSTON_ENEMIES.gull, glow: BOSTON_ENEMY_GLOW, move: 'hover', dive: 'swoop', dead: 'dead', light: '#fff6c8' },
};

export const ZAKIM: PixelTheme = {
  id: 'zakim',
  tiles: ZAKIM_TILES.tiles,
  // the beacon goal is borrowed from the rooftops when the chunk loads
  decor: ZAKIM_TILES.decor,
  glow: ZAKIM_GLOW,
  fillWeights: [0.8, 0.12, 0.08],
  facade: deckFacade,
  sky: (w, h, mono, seed, o) => backdropSky(ZAKIM_BACKDROP, w, h, mono, seed, o.sky, wispBand(91 + seed * 17, mono, '#ffffff', '#e4ecf6'), [0.06, 0.18, 0.4],
    [{ lift: 56 }, { lift: 30 }, { lift: 10 }]),
  weather: 'none',
  enemies: ENEMIES,
  goal: { kind: 'goalBeacon', mast: true, fps: 6, lights: [] },
  sign: (seed, level, i) => D.neonSign(seed, level, i),
  signLight: '#ff6ab8',
  decorLights: {
    bridgeLamp: { dx: 11, dy: -38, r: 26, colors: [LAMP], k: 0.4, halo: 0.3, blink: 0 },
    arenaGate: { dx: 15, dy: -43, r: 20, colors: [AMBER], k: 0.7, halo: 0.5, blink: 2 },
  },
  checkpoint: 'arenaGate',
  layers: {
    tiles(c, f, layer) {
      if (layer === 'base') { drawCables(c, f); drawGates(c, f); }
      drawGorilla(c, f, layer);
      drawProjectiles(c, f, layer);
    },
    front(c, f) { drawMarks(c, f); drawTaunt(c, f); drawBar(c, f); },
    event(type) { if (type === 'bossHit') HIT.pending = true; },
  },
};

/** The boss theme, given the renderer's kit (once, when the chunk loads). */
export function zakimThemes(kit: ThemeKit): Readonly<Record<'zakim', PixelTheme>> {
  if (!D) {
    D = kit; setKit(kit);
    // the goal is the rooftops' beacon; the borrowed neon sign glows with its own keys
    ZAKIM.decor = { ...ZAKIM_TILES.decor, goalBeacon: kit.rooftops.decor.goalBeacon };
    ZAKIM.goal = kit.rooftops.goal;
    ZAKIM.signGlow = kit.neonGlow;
  }
  return { zakim: ZAKIM };
}

/** For tests: the anim the gorilla shows for a state at a moment. */
export function gorillaPose(state: string, stateT: number, t = 0): { anim: string; frame: number } {
  pose({ x: 0, y: 0, w: 2.2, h: 2.4, vx: 0, vy: 0, hp: 1, maxHp: 1, phase: 1, state, stateT, facing: 1, punish: false, taunt: null, tauntT: 0, aimX: null }, t, false);
  return { anim: POSE.anim, frame: Math.floor(POSE.frame) };
}
