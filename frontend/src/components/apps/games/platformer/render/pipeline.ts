/**
 * Baguettino Run drawing. Canvas 2D only, in CSS pixels (useCanvas applies
 * the device pixel ratio). Only tiles inside the camera are drawn. Nothing
 * here changes the world.
 */

import { drawCreature } from '../../shared/cast';
import { arcadeTheme, hypeFont } from '../../shared/theme';
import type { Juice } from '../../shared/juice';
import { PHYS } from '../sim/physics';
import { ROWS, TILE, isSolidTile, tileAt } from '../sim/level';
import { CARD_SECONDS, tallyView, type World } from '../sim/world';
import type { WorldTheme } from '../sim/levels';

import { VIEW_ROWS, tileFor, type View } from './view';

export { VIEW_ROWS, tileFor, type View };
const INK = '#120b1f';
const HERO_SIZE = PHYS.heroH / 0.96;

interface Pal {
  skyTop: string; skyBottom: string; far: string; near: string; deco: string;
  ground: string; groundTop: string; speck: string;
  brick: string; mortar: string;
  aura: string; used: string; stone: string; stoneHi: string;
  spike: string; platform: string; platformShade: string;
  pole: string; flag: string; text: string;
}

const PALETTES: Partial<Record<WorldTheme, Pal>> & { stars: Pal } = {
  grass: {
    skyTop: '#8fdcff', skyBottom: '#ffe4f1', far: '#ffc2dc', near: '#ff9cc8', deco: '#ffffff',
    ground: '#9a5a3a', groundTop: '#8cf25a', speck: '#7a4229',
    brick: '#e2735a', mortar: '#8c3a2c', aura: '#ffd23f', used: '#9b8676', stone: '#c9b8e8', stoneHi: '#e6dcf7',
    spike: '#f4eefc', platform: '#ffffff', platformShade: '#d6efff', pole: '#fff4e0', flag: '#ff5fa2', text: '#120b1f',
  },
  cave: {
    skyTop: '#140d24', skyBottom: '#2a1b45', far: '#2f2150', near: '#3d2a66', deco: '#3ee0ff',
    ground: '#3b2a5a', groundTop: '#a98bff', speck: '#2c1f45',
    brick: '#6d4ba6', mortar: '#3a2560', aura: '#ffd23f', used: '#5e5470', stone: '#7f6aa8', stoneHi: '#a594c9',
    spike: '#e8e2f5', platform: '#a98bff', platformShade: '#7a5fd0', pole: '#fff4e0', flag: '#3ee0ff', text: '#fff4e0',
  },
  sky: {
    skyTop: '#3ec8ff', skyBottom: '#c9f6ff', far: '#e8fbff', near: '#ffffff', deco: '#ffffff',
    ground: '#ffffff', groundTop: '#ffffff', speck: '#d3eefc',
    brick: '#ff8f7a', mortar: '#b5493a', aura: '#ffd23f', used: '#a9a3b8', stone: '#c9b8e8', stoneHi: '#e6dcf7',
    spike: '#f4eefc', platform: '#ffffff', platformShade: '#bfe6fb', pole: '#fff4e0', flag: '#ff5fa2', text: '#120b1f',
  },
  // Only used if a rooftop level is ever drawn by this renderer; world 1 has its own (./pixel).
  rooftops: {
    skyTop: '#05040f', skyBottom: '#2a1440', far: '#1d1838', near: '#130f27', deco: '#ff3d9a',
    ground: '#2a1b38', groundTop: '#544c7e', speck: '#1f1530',
    brick: '#a8504f', mortar: '#5c2436', aura: '#9a5cff', used: '#3a345e', stone: '#544c7e', stoneHi: '#7a73a8',
    spike: '#c6dbea', platform: '#7d9bb6', platformShade: '#4a6684', pole: '#c6dbea', flag: '#ff3d9a', text: '#fff4e0',
  },
  stars: {
    skyTop: '#070512', skyBottom: '#1d1430', far: '#241a3d', near: '#2e2150', deco: '#fff4e0',
    ground: '#2b2147', groundTop: '#ff5fa2', speck: '#221a3a',
    brick: '#6d4ba6', mortar: '#3a2560', aura: '#ffd23f', used: '#5e5470', stone: '#7f6aa8', stoneHi: '#a594c9',
    spike: '#e8e2f5', platform: '#a98bff', platformShade: '#7a5fd0', pole: '#fff4e0', flag: '#ff5fa2', text: '#fff4e0',
  },
};

const MONO: Pal = {
  skyTop: '#0c0c0d', skyBottom: '#1f1f22', far: '#2a2a2e', near: '#36363b', deco: '#d4d4d8',
  ground: '#3f3f46', groundTop: '#d4d4d8', speck: '#2f2f35',
  brick: '#71717a', mortar: '#3f3f46', aura: '#f4f4f5', used: '#52525b', stone: '#8a8a93', stoneHi: '#a1a1aa',
  spike: '#e4e4e7', platform: '#a1a1aa', platformShade: '#71717a', pole: '#f4f4f5', flag: '#d4d4d8', text: '#f4f4f5',
};

export function palette(theme: WorldTheme, mono: boolean): Pal {
  return mono ? MONO : PALETTES[theme] ?? PALETTES.stars;
}

// Deterministic star field, made once.
const STARS: { x: number; y: number; r: number; p: number }[] = (() => {
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  return Array.from({ length: 70 }, () => ({ x: rnd(), y: rnd() * 0.75, r: 0.6 + rnd() * 1.4, p: rnd() * 6.28 }));
})();

let gradCache: { key: string; g: CanvasGradient } | null = null;

function sky(ctx: CanvasRenderingContext2D, pal: Pal, h: number, w: number) {
  const key = `${pal.skyTop}${pal.skyBottom}${h}`;
  if (!gradCache || gradCache.key !== key || typeof ctx.createLinearGradient !== 'function') {
    const g = ctx.createLinearGradient?.(0, 0, 0, h);
    if (!g) { ctx.fillStyle = pal.skyTop; ctx.fillRect(0, 0, w, h); return; }
    g.addColorStop(0, pal.skyTop); g.addColorStop(1, pal.skyBottom);
    gradCache = { key, g };
  }
  ctx.fillStyle = gradCache.g;
  ctx.fillRect(0, 0, w, h);
}

function mod(a: number, m: number) { return ((a % m) + m) % m; }

/** A row of soft bumps (hills or cloud banks) repeating every `period` px. */
function bumps(ctx: CanvasRenderingContext2D, w: number, baseY: number, period: number, r: number, offset: number, color: string, outline: boolean) {
  ctx.beginPath();
  const start = -mod(offset, period) - period;
  for (let x = start; x < w + period; x += period) {
    ctx.moveTo(x + period * 0.5 + r, baseY);
    ctx.ellipse(x + period * 0.5, baseY, r, r * 0.8, 0, 0, Math.PI, true);
  }
  ctx.fillStyle = color;
  ctx.fill();
  if (outline) { ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(18,11,31,0.18)'; ctx.stroke(); }
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
  ctx.arc(x + s * 0.55, y - s * 0.2, s * 0.6, 0, Math.PI * 2);
  ctx.arc(x + s * 1.15, y, s * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function background(ctx: CanvasRenderingContext2D, world: World, pal: Pal, v: View, T: number, camX: number, t: number) {
  const { w, h } = v;
  sky(ctx, pal, h, w);
  const theme = world.level.theme;
  if (theme === 'grass') {
    ctx.globalAlpha = 0.9;
    for (let i = 0; i < 4; i++) {
      const cx = mod(i * 260 - camX * T * 0.08, w + 300) - 150;
      cloud(ctx, cx, h * (0.14 + 0.07 * (i % 2)), T * 1.1, pal.deco);
    }
    ctx.globalAlpha = 1;
    bumps(ctx, w, h * 0.78, T * 9, T * 4.2, camX * T * 0.18, pal.far, false);
    bumps(ctx, w, h * 0.86, T * 6.5, T * 2.6, camX * T * 0.38, pal.near, true);
  } else if (theme === 'cave') {
    // far crystal spires and near stalactites
    ctx.fillStyle = pal.far;
    ctx.beginPath();
    const p1 = T * 5, o1 = mod(camX * T * 0.2, p1);
    for (let x = -o1 - p1; x < w + p1; x += p1) {
      ctx.moveTo(x, h); ctx.lineTo(x + p1 * 0.3, h * 0.42); ctx.lineTo(x + p1 * 0.55, h); ctx.closePath();
      ctx.moveTo(x + p1 * 0.5, h); ctx.lineTo(x + p1 * 0.72, h * 0.58); ctx.lineTo(x + p1 * 0.95, h); ctx.closePath();
    }
    ctx.fill();
    ctx.fillStyle = pal.near;
    ctx.beginPath();
    const p2 = T * 3.5, o2 = mod(camX * T * 0.45, p2);
    for (let x = -o2 - p2; x < w + p2; x += p2) {
      ctx.moveTo(x, 0); ctx.lineTo(x + p2 * 0.22, h * 0.3); ctx.lineTo(x + p2 * 0.44, 0); ctx.closePath();
    }
    ctx.fill();
    // a few glowing crystal motes
    if (!v.mono) {
      for (let i = 0; i < 10; i++) {
        const x = mod(i * 97 - camX * T * 0.3, w + 40) - 20;
        const y = h * (0.2 + ((i * 37) % 50) / 100) + Math.sin(t * 1.3 + i) * 4;
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 2 + i * 1.7);
        ctx.fillStyle = i % 3 === 0 ? '#ff5fa2' : pal.deco;
        ctx.fillRect(x, y, 3, 3);
      }
      ctx.globalAlpha = 1;
    }
  } else if (theme === 'sky') {
    ctx.globalAlpha = 0.65;
    for (let i = 0; i < 6; i++) {
      const cx = mod(i * 180 - camX * T * 0.1 - t * 6, w + 260) - 130;
      cloud(ctx, cx, h * (0.12 + 0.11 * (i % 3)), T * (0.8 + (i % 2) * 0.5), pal.far);
    }
    ctx.globalAlpha = 1;
    bumps(ctx, w, h * 1.02, T * 5, T * 2.6, camX * T * 0.25, pal.near, false);
  } else {
    for (const s of STARS) {
      const x = mod(s.x * w * 1.6 - camX * T * 0.05, w * 1.6) - w * 0.3;
      const tw = v.reduced ? 0.8 : 0.5 + 0.5 * Math.sin(t * 2.2 + s.p);
      ctx.globalAlpha = 0.35 + 0.65 * tw;
      ctx.fillStyle = pal.deco;
      ctx.fillRect(x, s.y * h, s.r, s.r);
    }
    ctx.globalAlpha = 1;
    const mx = w * 0.78 - camX * T * 0.03;
    drawCreature(ctx, 'moon', mx, h * 0.22, T * 2.6, { mono: v.mono, t });
    bumps(ctx, w, h * 0.92, T * 8, T * 3.2, camX * T * 0.2, pal.far, false);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiles
// ─────────────────────────────────────────────────────────────────────────────

function isSolidCode(t: number) { return t >= TILE.GROUND && t <= TILE.SPIKE; }

function drawCoin(ctx: CanvasRenderingContext2D, cx: number, cy: number, T: number, phase: number, mono: boolean) {
  const spin = Math.abs(Math.cos(phase));
  const rw = Math.max(1.2, T * 0.3 * spin);
  const rh = T * 0.36;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
  ctx.fillStyle = mono ? '#e4e4e7' : '#ffd23f';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, T * 0.07);
  ctx.strokeStyle = INK;
  ctx.stroke();
  if (spin > 0.45) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rw * 0.45, rh * 0.6, 0, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1, T * 0.04);
    ctx.strokeStyle = mono ? '#71717a' : '#c98a00';
    ctx.stroke();
  }
}

function auraBlock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, pal: Pal, t: number, lit: boolean) {
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 1, s - 2, s - 2, s * 0.16);
  ctx.fillStyle = lit ? pal.aura : pal.used;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, s * 0.07);
  ctx.strokeStyle = INK;
  ctx.stroke();
  if (!lit) return;
  // shine and the sigma glyph
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(x + s * 0.14, y + s * 0.14, s * 0.18, s * 0.08);
  const pulse = 1 + 0.06 * Math.sin(t * 4);
  ctx.font = hypeFont(s * 0.66 * pulse);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  ctx.fillText('Σ', x + s / 2, y + s * 0.55);
}

function drawTiles(ctx: CanvasRenderingContext2D, world: World, pal: Pal, T: number, c0: number, c1: number, r0: number, r1: number, t: number, mono: boolean) {
  const cols = world.level.cols;
  const tiles = world.tiles;
  const theme = world.level.theme;
  const lw = Math.max(1.5, T * 0.07);
  for (let ty = r0; ty <= r1; ty++) {
    for (let tx = c0; tx <= c1; tx++) {
      const code = tiles[ty * cols + tx];
      if (code === TILE.EMPTY) continue;
      const x = Math.floor(tx * T), y = Math.floor(ty * T);
      const s = Math.floor((tx + 1) * T) - x;
      const sh = Math.floor((ty + 1) * T) - y;
      switch (code) {
        case TILE.GROUND: {
          const up = ty > 0 && isSolidCode(tiles[(ty - 1) * cols + tx]);
          const left = tx > 0 && isSolidCode(tiles[ty * cols + tx - 1]);
          const right = tx < cols - 1 && isSolidCode(tiles[ty * cols + tx + 1]);
          const down = ty < ROWS - 1 && isSolidCode(tiles[(ty + 1) * cols + tx]);
          if (theme === 'sky') {
            ctx.fillStyle = pal.ground;
            ctx.fillRect(x, y, s, sh);
            if (!down) { ctx.fillStyle = pal.platformShade; ctx.fillRect(x, y + sh * 0.6, s, sh * 0.4); }
            if (!up) {
              ctx.beginPath();
              ctx.arc(x + s * 0.5, y + sh * 0.25, s * 0.42, Math.PI, 0);
              ctx.fillStyle = pal.ground; ctx.fill();
              ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
            }
          } else {
            ctx.fillStyle = pal.ground;
            ctx.fillRect(x, y, s, sh);
            if (((tx * 7 + ty * 13) % 5) === 0) { ctx.fillStyle = pal.speck; ctx.fillRect(x + s * 0.3, y + sh * 0.55, s * 0.16, sh * 0.12); }
            if (!up) {
              ctx.fillStyle = pal.groundTop;
              ctx.fillRect(x, y, s, sh * (theme === 'grass' ? 0.3 : 0.16));
              if (theme === 'grass' && (tx % 3) === 0) ctx.fillRect(x + s * 0.2, y + sh * 0.3, s * 0.18, sh * 0.12);
              if (theme === 'cave' && ((tx * 5 + ty) % 7) === 0 && !mono) {
                ctx.beginPath(); ctx.moveTo(x + s * 0.3, y); ctx.lineTo(x + s * 0.45, y - sh * 0.45); ctx.lineTo(x + s * 0.6, y); ctx.closePath();
                ctx.fillStyle = pal.deco; ctx.fill(); ctx.lineWidth = lw * 0.7; ctx.strokeStyle = INK; ctx.stroke();
              }
            }
          }
          ctx.fillStyle = INK;
          if (!up) ctx.fillRect(x, y, s, lw);
          if (!left) ctx.fillRect(x, y, lw, sh);
          if (!right) ctx.fillRect(x + s - lw, y, lw, sh);
          if (!down && ty < ROWS - 1) ctx.fillRect(x, y + sh - lw, s, lw);
          break;
        }
        case TILE.BRICK: {
          const bump = bumpOffset(world, tx, ty) * T;
          const by = y - bump;
          ctx.fillStyle = pal.brick;
          ctx.fillRect(x, by, s, sh);
          ctx.fillStyle = pal.mortar;
          ctx.fillRect(x, by + sh * 0.48, s, Math.max(1, sh * 0.06));
          ctx.fillRect(x + s * 0.5, by, Math.max(1, s * 0.06), sh * 0.48);
          ctx.fillRect(x + s * 0.2, by + sh * 0.5, Math.max(1, s * 0.06), sh * 0.5);
          ctx.lineWidth = lw; ctx.strokeStyle = INK;
          ctx.strokeRect(x + lw / 2, by + lw / 2, s - lw, sh - lw);
          break;
        }
        case TILE.AURA: case TILE.AURA_CROWN:
          auraBlock(ctx, x, y - bumpOffset(world, tx, ty) * T, s, pal, t, true);
          break;
        case TILE.USED:
          auraBlock(ctx, x, y - bumpOffset(world, tx, ty) * T, s, pal, t, false);
          break;
        case TILE.STONE: {
          ctx.fillStyle = pal.stone;
          ctx.fillRect(x, y, s, sh);
          ctx.fillStyle = pal.stoneHi;
          ctx.fillRect(x + lw, y + lw, s - lw * 2, sh * 0.18);
          ctx.lineWidth = lw; ctx.strokeStyle = INK;
          ctx.strokeRect(x + lw / 2, y + lw / 2, s - lw, sh - lw);
          break;
        }
        case TILE.SPIKE: {
          ctx.fillStyle = pal.speck;
          ctx.fillRect(x, y + sh * 0.8, s, sh * 0.2);
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            const sx = x + (s / 3) * i;
            ctx.moveTo(sx, y + sh * 0.85);
            ctx.lineTo(sx + s / 6, y + sh * 0.18);
            ctx.lineTo(sx + s / 3, y + sh * 0.85);
          }
          ctx.closePath();
          ctx.fillStyle = pal.spike; ctx.fill();
          ctx.lineWidth = lw * 0.8; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
          break;
        }
        case TILE.COIN:
          drawCoin(ctx, x + s / 2, y + sh / 2, T, t * 4 + tx * 0.45, mono);
          break;
      }
    }
  }
}

function bumpOffset(world: World, tx: number, ty: number): number {
  for (const b of world.bumps) if (b.tx === tx && b.ty === ty) return Math.sin((b.t / 0.18) * Math.PI) * 0.28;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Props: pole, flag, checkpoint, bakery
// ─────────────────────────────────────────────────────────────────────────────

function crownShape(ctx: CanvasRenderingContext2D, cx: number, by: number, s: number, fill: string) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.5, by);
  ctx.lineTo(cx - s * 0.5, by - s * 0.55);
  ctx.lineTo(cx - s * 0.25, by - s * 0.25);
  ctx.lineTo(cx, by - s * 0.7);
  ctx.lineTo(cx + s * 0.25, by - s * 0.25);
  ctx.lineTo(cx + s * 0.5, by - s * 0.55);
  ctx.lineTo(cx + s * 0.5, by);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = Math.max(1.5, s * 0.1); ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
}

function drawPole(ctx: CanvasRenderingContext2D, world: World, pal: Pal, T: number, t: number, mono: boolean) {
  const p = world.level.pole;
  const cx = (p.x + 0.5) * T;
  const top = (p.top + 0.5) * T;
  const bottom = (p.base + 1) * T;
  const pw = Math.max(3, T * 0.14);
  ctx.fillStyle = pal.pole;
  ctx.fillRect(cx - pw / 2, top, pw, bottom - top);
  ctx.lineWidth = Math.max(1.5, T * 0.06); ctx.strokeStyle = INK;
  ctx.strokeRect(cx - pw / 2, top, pw, bottom - top);
  // the meme flag: a Moon Gigachad banner that waves
  const fy = top + T * 0.35 + world.flagDrop * (bottom - top - T * 1.9);
  const fw = T * 1.9, fh = T * 1.3;
  ctx.beginPath();
  ctx.moveTo(cx - pw / 2, fy);
  const wave = Math.sin(t * 5) * T * 0.08;
  ctx.quadraticCurveTo(cx - fw * 0.5, fy + wave, cx - fw, fy + wave * 2);
  ctx.lineTo(cx - fw, fy + fh + wave * 2);
  ctx.quadraticCurveTo(cx - fw * 0.5, fy + fh + wave, cx - pw / 2, fy + fh);
  ctx.closePath();
  ctx.fillStyle = pal.flag; ctx.fill();
  ctx.lineWidth = Math.max(1.5, T * 0.07); ctx.stroke();
  drawCreature(ctx, 'moon', cx - fw * 0.52, fy + fh * 0.5 + wave, fh * 0.85, { mono, t });
  // finial: the very top tile
  ctx.beginPath();
  ctx.arc(cx, (p.top + 0.5) * T, T * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = mono ? '#f4f4f5' : '#ffd23f'; ctx.fill();
  ctx.lineWidth = Math.max(1.5, T * 0.07); ctx.strokeStyle = INK; ctx.stroke();
}

function drawCheckpoint(ctx: CanvasRenderingContext2D, world: World, T: number, t: number, mono: boolean) {
  const cp = world.level.checkpoint;
  if (!cp) return;
  const cx = (cp.x + 0.5) * T;
  const feet = cp.y * T;
  const s = T * 1.15;
  ctx.globalAlpha = world.checkpointHit ? 1 : 0.6;
  drawCreature(ctx, 'capy', cx, feet - s * 0.42, s, { mono, t: world.checkpointHit ? t : 0 });
  ctx.globalAlpha = 1;
  if (!world.checkpointHit) return;
  ctx.lineWidth = Math.max(1.5, T * 0.07);
  ctx.strokeStyle = mono ? '#f4f4f5' : '#8cf25a';
  ctx.lineCap = 'round';
  for (let i = 1; i <= 3; i++) {
    ctx.globalAlpha = 0.4 + 0.6 * ((Math.sin(t * 4 - i) + 1) / 2);
    ctx.beginPath();
    ctx.arc(cx, feet - s * 0.95, T * 0.18 * i, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawBakery(ctx: CanvasRenderingContext2D, world: World, T: number, mono: boolean) {
  if (world.levelIndex >= 3) return;
  const p = world.level.pole;
  const x0 = (p.x + 5.5) * T;
  const floor = (p.base + 1) * T;
  const w = T * 4.2, h = T * 2.6;
  const lw = Math.max(1.5, T * 0.07);
  ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  ctx.fillStyle = mono ? '#a1a1aa' : '#fff4e0';
  ctx.fillRect(x0, floor - h, w, h); ctx.strokeRect(x0, floor - h, w, h);
  ctx.beginPath();
  ctx.moveTo(x0 - T * 0.4, floor - h); ctx.lineTo(x0 + w / 2, floor - h - T * 1.6); ctx.lineTo(x0 + w + T * 0.4, floor - h); ctx.closePath();
  ctx.fillStyle = mono ? '#71717a' : '#ff5fa2'; ctx.fill(); ctx.stroke();
  // door the hero walks into
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.roundRect(x0 + T * 1.1, floor - T * 1.7, T * 1, T * 1.7, [T * 0.5, T * 0.5, 0, 0]); ctx.fill();
  // sign: a baguette
  ctx.beginPath(); ctx.roundRect(x0 + T * 2.5, floor - h + T * 0.5, T * 1.3, T * 0.42, T * 0.2);
  ctx.fillStyle = mono ? '#d4d4d8' : '#e8b65c'; ctx.fill(); ctx.stroke();
}

function drawPlatforms(ctx: CanvasRenderingContext2D, world: World, pal: Pal, T: number, a: number) {
  const lw = Math.max(1.5, T * 0.07);
  for (const p of world.platforms) {
    const x = (p.px + (p.x - p.px) * a) * T;
    const y = (p.py + (p.y - p.py) * a) * T;
    ctx.beginPath();
    ctx.roundRect(x, y, p.w * T, p.h * T, T * 0.22);
    ctx.fillStyle = pal.platform; ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = pal.platformShade;
    ctx.fillRect(x + T * 0.2, y + p.h * T * 0.55, p.w * T - T * 0.4, p.h * T * 0.18);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen-space cards
// ─────────────────────────────────────────────────────────────────────────────

function panel(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, fill: string) {
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 14);
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
}

function outlinedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill: string) {
  ctx.font = hypeFont(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size * 0.2);
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** Split text into lines that fit `maxW` at the current font. */
export function wrapLines(measure: (s: string) => number, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > maxW) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Level card, tally and the secret finale, in CSS pixels. Shared with the pixel renderer. */
export function drawCards(ctx: CanvasRenderingContext2D, world: World, v: View, mono: boolean) {
  const { w, h } = v;
  const th = arcadeTheme(mono);
  if (world.cardT > 0 && world.phase === 'play') {
    const k = Math.min(1, world.cardT / 0.5, (CARD_SECONDS - world.cardT) / 0.2);
    ctx.globalAlpha = Math.max(0, k);
    const size = Math.min(h * 0.11, w * 0.085);
    // This run's world modifier (when the sim has one) gets a third line in the card.
    const mod = (world as { modifier?: { name?: unknown } | null }).modifier;
    const modName = mod && typeof mod.name === 'string' ? mod.name : '';
    panel(ctx, w / 2, h * 0.3 + (modName ? size * 0.36 : 0), Math.min(w * 0.8, size * 9), size * (modName ? 3.4 : 2.6), '#1d1430');
    ctx.font = hypeFont(size * 0.48);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = th.textDim;
    ctx.fillText(world.level.label, w / 2, h * 0.3 - size * 0.62);
    outlinedText(ctx, world.level.name, w / 2, h * 0.3 + size * 0.28, size, th.sun);
    if (modName) {
      ctx.font = hypeFont(size * 0.44);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = th.pink;
      ctx.fillText(modName, w / 2, h * 0.3 + size * 1.2);
    }
    ctx.globalAlpha = 1;
  }
  if (world.phase === 'tally') {
    const size = Math.min(h * 0.1, w * 0.08);
    panel(ctx, w / 2, h * 0.36, Math.min(w * 0.82, size * 9), size * 3.6, '#1d1430');
    outlinedText(ctx, world.secretUnlocked && world.levelIndex === 2 ? 'SECRET UNLOCKED' : 'LEVEL CLEARED', w / 2, h * 0.36 - size * 0.95, size, world.secretUnlocked && world.levelIndex === 2 ? th.pink : th.sun);
    ctx.font = hypeFont(size * 0.55);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = th.text;
    ctx.fillText(`Time bonus ${tallyView(world).time}`, w / 2, h * 0.36 + size * 0.2);
    ctx.fillText(world.pendingClear ? 'Clear bonus 1000' : 'Clear bonus +1000', w / 2, h * 0.36 + size * 1.0);
  }
  if (world.phase === 'finale' || (world.phase === 'done' && world.result === 'secret')) {
    const k = Math.min(1, world.phaseT / 1.2);
    ctx.globalAlpha = k * 0.82;
    ctx.fillStyle = '#070512';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = k;
    for (const s of STARS) {
      ctx.fillStyle = '#fff4e0';
      ctx.globalAlpha = k * (0.4 + 0.6 * (v.reduced ? 0.8 : 0.5 + 0.5 * Math.sin(world.t * 2.4 + s.p)));
      ctx.fillRect(s.x * w, s.y * h * 1.2, s.r, s.r);
    }
    ctx.globalAlpha = Math.min(1, Math.max(0, (world.phaseT - 0.6) / 0.8));
    const bw = w * 0.84, bh = h * 0.62;
    const bx = w / 2, by = h * 0.47;
    // the big flag, on its pole
    ctx.fillStyle = '#fff4e0';
    ctx.fillRect(bx - bw / 2 - 10, by - bh / 2 - 14, 7, bh + h * 0.4);
    ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeRect(bx - bw / 2 - 10, by - bh / 2 - 14, 7, bh + h * 0.4);
    const wave = v.reduced ? 0 : Math.sin(world.t * 2.2) * 6;
    ctx.beginPath();
    ctx.moveTo(bx - bw / 2, by - bh / 2);
    ctx.quadraticCurveTo(bx, by - bh / 2 + wave, bx + bw / 2, by - bh / 2 - wave * 0.5);
    ctx.lineTo(bx + bw / 2, by + bh / 2 - wave * 0.5);
    ctx.quadraticCurveTo(bx, by + bh / 2 + wave, bx - bw / 2, by + bh / 2);
    ctx.closePath();
    ctx.fillStyle = mono ? '#3f3f46' : '#ff5fa2';
    ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    let size = Math.min(h * 0.12, w * 0.075);
    ctx.font = hypeFont(size);
    let lines = wrapLines(s => ctx.measureText(s).width, world.secret.message, bw * 0.86);
    while (lines.length * size * 1.25 > bh * 0.72 && size > 10) {
      size *= 0.9;
      ctx.font = hypeFont(size);
      lines = wrapLines(s => ctx.measureText(s).width, world.secret.message, bw * 0.86);
    }
    const lh = size * 1.25;
    const y0 = by - ((lines.length - 1) * lh) / 2 - size * 0.25;
    lines.forEach((line, i) => outlinedText(ctx, line, bx, y0 + i * lh, size, '#fff4e0'));
    ctx.font = hypeFont(size * 0.5);
    ctx.fillStyle = '#fff4e0';
    ctx.textAlign = 'center';
    ctx.fillText(`for ${world.secret.name}`, bx, by + bh / 2 - size * 0.55);
    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Frame
// ─────────────────────────────────────────────────────────────────────────────

export function drawFrame(ctx: CanvasRenderingContext2D, world: World, v: View, juice: Juice) {
  const T = tileFor(v.w, v.h);
  const pal = palette(world.level.theme, v.mono);
  const a = Math.max(0, Math.min(1, v.alpha));
  const cam = world.cam;
  const camX = cam.px + (cam.x - cam.px) * a;
  const camY = cam.py + (cam.y - cam.py) * a;
  const t = world.t;

  background(ctx, world, pal, v, T, camX, t);

  const shake = juice.offset();
  const ox = Math.round(-camX * T + shake.x);
  const oy = Math.round(-camY * T + shake.y);
  ctx.save();
  ctx.translate(ox, oy);

  const c0 = Math.max(0, Math.floor(camX) - 1);
  const c1 = Math.min(world.level.cols - 1, Math.ceil(camX + v.w / T) + 1);
  const r0 = Math.max(0, Math.floor(camY) - 1);
  const r1 = Math.min(ROWS - 1, Math.ceil(camY + v.h / T));

  drawCheckpoint(ctx, world, T, t, v.mono);
  const p = world.level.pole;
  if (p.x >= c0 - 3 && p.x <= c1 + 2) drawPole(ctx, world, pal, T, t, v.mono);
  if (p.x + 10 >= c0 && p.x + 5 <= c1) drawBakery(ctx, world, T, v.mono);
  // On a view taller than the level, the space above row 0 is sky; under a
  // solid top row (a cave ceiling) it is more rock, so the ceiling does not
  // float in the middle of the screen.
  if (camY < 0) {
    ctx.fillStyle = pal.ground;
    for (let c = c0; c <= c1; c++) {
      if (isSolidTile(tileAt(world.level.tiles, world.level.cols, c, 0))) {
        ctx.fillRect(c * T, camY * T - 2, T + 1, -camY * T + 2);
      }
    }
  }
  drawTiles(ctx, world, pal, T, c0, c1, r0, r1, t, v.mono);
  drawPlatforms(ctx, world, pal, T, a);

  // coins popping out of aura blocks
  for (const pop of world.pops) {
    const k = pop.t / 0.55;
    ctx.globalAlpha = 1 - k * k;
    drawCoin(ctx, (pop.x + 0.5) * T, (pop.y - 0.6 - Math.sin(k * Math.PI) * 1.4) * T, T, pop.t * 25, v.mono);
  }
  ctx.globalAlpha = 1;

  for (const cr of world.crowns) {
    crownShape(ctx, (cr.x + cr.w / 2) * T, (cr.y + cr.h) * T, cr.w * T, v.mono ? '#f4f4f5' : '#ffd23f');
  }

  for (const e of world.enemies) {
    if (e.x + e.w < c0 - 1 || e.x > c1 + 1) continue;
    const ex = (e.px + (e.x - e.px) * a + e.w / 2) * T;
    const feet = (e.py + (e.y - e.py) * a + e.h) * T;
    const s = T * (e.kind === 'pebble' ? 1.05 : 1.1);
    const dead = e.deadT !== -1;
    let squash = dead ? 0.35 : 1;
    if (!dead && !v.reduced) {
      if (e.kind === 'pebble') squash = 1 + Math.sin(t * 10 + e.x) * 0.04;
      else squash = e.landT > 0 ? 0.8 : e.onGround ? 1 : 1.15;
    }
    if (dead) ctx.globalAlpha = Math.max(0, e.deadT / 0.45);
    const lift = e.kind === 'pebble' ? 0.32 : 0.46;
    // World 1's new kinds only appear here if a rooftop level is drawn by this renderer.
    const creature = e.kind === 'pebble' || e.kind === 'frog' ? e.kind : e.kind === 'adDrone' ? 'frog' : 'pebble';
    drawCreature(ctx, creature, ex, feet - s * 0.5 + s * (0.5 - lift), s, { mono: v.mono, t, facing: e.dir, squash, dizzy: dead });
    ctx.globalAlpha = 1;
  }

  drawHero(ctx, world, T, a, v);

  juice.draw(ctx);
  ctx.restore();

  drawCards(ctx, world, v, v.mono);
}

function drawHero(ctx: CanvasRenderingContext2D, world: World, T: number, a: number, v: View) {
  if (world.hidden) return;
  const h = world.hero;
  const x = world.heroPx + (h.x - world.heroPx) * a;
  const y = world.heroPy + (h.y - world.heroPy) * a;
  const s = HERO_SIZE * T;
  const cx = (x + h.w / 2) * T;
  const feet = (y + h.h) * T;
  const dying = world.phase === 'dying';
  if (world.invuln > 0 && !dying && Math.floor(world.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.35;
  let squash = 1;
  if (!v.reduced && !dying) {
    if (world.landT > 0) squash = 1 - 0.26 * (world.landT / 0.14);
    else if (world.jumpT > 0) squash = 1 + 0.2 * (world.jumpT / 0.16);
    else if (!h.onGround) squash = h.vy < 0 ? 1.08 : 1.04;
    else if (Math.abs(h.vx) > 0.5) squash = 1 + Math.sin(world.t * 22) * 0.035;
  }
  const hurtLook = dying || (world.invuln > 1.0 && world.phase === 'play' && !world.crowned);
  drawCreature(ctx, 'baguette', cx, feet - s * 0.5, s, { mono: v.mono, t: world.t, facing: h.facing, squash, dizzy: hurtLook });
  if (world.crowned) {
    const headTop = feet - s * 0.96 * squash;
    crownShape(ctx, cx + h.facing * s * 0.02, headTop + T * 0.06, T * 0.5, v.mono ? '#f4f4f5' : '#ffd23f');
  }
  ctx.globalAlpha = 1;
}
