/**
 * The brainrot cast: nine original creatures, drawn in code as flat stickers
 * with a thick dark outline. No image assets, so nothing to download on a
 * phone and every size stays sharp.
 *
 * Order matters: smallest to largest. Snake serves them as snacks and Aura
 * Tower uses their colours.
 */

import { arcadeTheme } from './theme';

export type CreatureId =
  | 'bean' | 'pebble' | 'croissant' | 'frog' | 'capy'
  | 'mango' | 'toaster' | 'baguette' | 'moon';

export interface Creature {
  id: CreatureId;
  name: string;
  /** Main fill in the Color palette. */
  fill: string;
  /** Grayscale fill under Mono, spaced by lightness along the chain. */
  mono: string;
}

export const CAST: readonly Creature[] = [
  { id: 'bean',      name: 'Bean Pookie',         fill: '#8cf25a', mono: '#3f3f46' },
  { id: 'pebble',    name: 'Pebble Rizzo',        fill: '#a98bff', mono: '#52525b' },
  { id: 'croissant', name: 'Croissantoni',        fill: '#ff9a3c', mono: '#63636b' },
  { id: 'frog',      name: 'Frogatti Bossini',    fill: '#3ddc84', mono: '#71717a' },
  { id: 'capy',      name: 'Capybarra Wi-Fi',     fill: '#c08552', mono: '#8a8a93' },
  { id: 'mango',     name: 'Mangolino Sigmaroni', fill: '#ffc233', mono: '#a1a1aa' },
  { id: 'toaster',   name: 'Toastino Turbo',      fill: '#9ad7ff', mono: '#c4c4cc' },
  { id: 'baguette',  name: 'Baguettino Chadoni',  fill: '#e8b65c', mono: '#d4d4d8' },
  { id: 'moon',      name: 'Moon Gigachad',       fill: '#fff0a8', mono: '#f4f4f5' },
];

export function creature(id: CreatureId): Creature {
  return CAST.find(c => c.id === id)!;
}

export interface DrawOpts {
  mono?: boolean;
  /** Seconds, drives idle bob and blinking. */
  t?: number;
  /** 1 faces right, -1 faces left. */
  facing?: 1 | -1;
  /** Vertical squash for landings and merges: 1 is neutral. */
  squash?: number;
  /** Eyes shut (hit, sleeping). */
  dizzy?: boolean;
}

type Ctx = CanvasRenderingContext2D;

const INK = '#120b1f';

function blob(ctx: Ctx, fill: string, lw: number, path: () => void) {
  ctx.beginPath(); path();
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
}

function eye(ctx: Ctx, x: number, y: number, r: number, look: number, shut: boolean) {
  if (shut) {
    ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.6); ctx.lineTo(x + r, y + r * 0.6);
    ctx.moveTo(x + r, y - r * 0.6); ctx.lineTo(x - r, y + r * 0.6);
    ctx.lineWidth = r * 0.45; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    return;
  }
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.lineWidth = r * 0.28; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.arc(x + look * r * 0.35, y + r * 0.1, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
}

function shades(ctx: Ctx, x: number, y: number, w: number) {
  const h = w * 0.32;
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w * 0.44, h, h * 0.4); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x + w * 0.06, y - h / 2, w * 0.44, h, h * 0.4); ctx.fill();
  ctx.fillRect(x - w * 0.1, y - h * 0.4, w * 0.2, h * 0.22);
  // glint
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(x - w * 0.42, y - h * 0.3, w * 0.1, h * 0.18);
  ctx.fillRect(x + w * 0.14, y - h * 0.3, w * 0.1, h * 0.18);
}

function smile(ctx: Ctx, x: number, y: number, w: number, lw: number, smug = false) {
  ctx.beginPath();
  if (smug) { ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x + w * 0.1, y + w * 0.25, x + w / 2, y - w * 0.18); }
  else ctx.arc(x, y - w * 0.15, w / 2, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
}

/**
 * Draw a creature centred on (cx, cy), fitting a `size` by `size` box.
 * The ctx state is saved and restored.
 */
export function drawCreature(ctx: Ctx, id: CreatureId, cx: number, cy: number, size: number, o: DrawOpts = {}) {
  const c = creature(id);
  const fill = o.mono ? c.mono : c.fill;
  const t = o.t ?? 0;
  const facing = o.facing ?? 1;
  const squash = o.squash ?? 1;
  const s = size;
  const lw = Math.max(1.5, s * 0.06);
  const blink = !o.dizzy && Math.sin(t * 2.1 + s) > 0.985;
  const shut = !!o.dizzy || blink;
  const theme = arcadeTheme(!!o.mono);

  ctx.save();
  ctx.translate(cx, cy + s * 0.5);
  ctx.scale(facing / Math.sqrt(squash), squash);
  ctx.translate(0, -s * 0.5);

  switch (id) {
    case 'bean': {
      blob(ctx, fill, lw, () => ctx.ellipse(0, s * 0.08, s * 0.3, s * 0.38, 0.25, 0, Math.PI * 2));
      eye(ctx, -s * 0.09, -s * 0.02, s * 0.09, 1, shut);
      eye(ctx, s * 0.11, -s * 0.05, s * 0.09, 1, shut);
      smile(ctx, s * 0.02, s * 0.16, s * 0.16, lw * 0.7);
      break;
    }
    case 'pebble': {
      blob(ctx, fill, lw, () => {
        ctx.moveTo(-s * 0.42, s * 0.3);
        ctx.bezierCurveTo(-s * 0.5, -s * 0.2, -s * 0.15, -s * 0.42, s * 0.12, -s * 0.36);
        ctx.bezierCurveTo(s * 0.44, -s * 0.3, s * 0.5, s * 0.1, s * 0.4, s * 0.32);
        ctx.closePath();
      });
      eye(ctx, -s * 0.13, -s * 0.02, s * 0.085, 1, shut);
      eye(ctx, s * 0.14, -s * 0.02, s * 0.085, 1, shut);
      // villain eyebrows
      ctx.beginPath(); ctx.moveTo(-s * 0.26, -s * 0.18); ctx.lineTo(-s * 0.05, -s * 0.1);
      ctx.moveTo(s * 0.27, -s * 0.18); ctx.lineTo(s * 0.06, -s * 0.1);
      ctx.lineWidth = lw * 1.1; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
      smile(ctx, 0, s * 0.17, s * 0.22, lw * 0.7, true);
      break;
    }
    case 'croissant': {
      // three lobes along an arc, then sneakers
      const lobes = [[-0.3, 0.06, 0.17], [0, -0.06, 0.23], [0.3, 0.06, 0.17]] as const;
      for (const [x, y, r] of lobes) blob(ctx, fill, lw, () => ctx.ellipse(x * s, y * s, r * s, r * s * 0.95, 0, 0, Math.PI * 2));
      ctx.beginPath(); ctx.moveTo(-s * 0.14, -s * 0.2); ctx.lineTo(-s * 0.1, s * 0.1);
      ctx.moveTo(s * 0.14, -s * 0.2); ctx.lineTo(s * 0.1, s * 0.1);
      ctx.lineWidth = lw * 0.6; ctx.strokeStyle = 'rgba(18,11,31,0.45)'; ctx.stroke();
      for (const x of [-0.18, 0.18]) {
        blob(ctx, '#ffffff', lw * 0.8, () => ctx.roundRect((x - 0.11) * s, s * 0.27, s * 0.22, s * 0.12, s * 0.05));
        ctx.fillStyle = theme.pink; ctx.fillRect((x - 0.09) * s, s * 0.31, s * 0.18, s * 0.03);
      }
      eye(ctx, -s * 0.07, -s * 0.06, s * 0.07, 1, shut);
      eye(ctx, s * 0.08, -s * 0.06, s * 0.07, 1, shut);
      break;
    }
    case 'frog': {
      blob(ctx, fill, lw, () => ctx.ellipse(0, s * 0.12, s * 0.42, s * 0.3, 0, 0, Math.PI * 2));
      blob(ctx, fill, lw, () => ctx.arc(-s * 0.2, -s * 0.16, s * 0.14, 0, Math.PI * 2));
      blob(ctx, fill, lw, () => ctx.arc(s * 0.2, -s * 0.16, s * 0.14, 0, Math.PI * 2));
      eye(ctx, -s * 0.2, -s * 0.16, s * 0.08, 1, shut);
      eye(ctx, s * 0.2, -s * 0.16, s * 0.08, 1, shut);
      smile(ctx, 0, s * 0.12, s * 0.42, lw * 0.75);
      // the tie
      blob(ctx, o.mono ? '#18181b' : theme.danger, lw * 0.7, () => {
        ctx.moveTo(-s * 0.05, s * 0.24); ctx.lineTo(s * 0.05, s * 0.24);
        ctx.lineTo(s * 0.07, s * 0.4); ctx.lineTo(0, s * 0.46); ctx.lineTo(-s * 0.07, s * 0.4); ctx.closePath();
      });
      break;
    }
    case 'capy': {
      blob(ctx, fill, lw, () => ctx.roundRect(-s * 0.4, -s * 0.14, s * 0.8, s * 0.56, s * 0.24));
      blob(ctx, fill, lw * 0.8, () => ctx.arc(-s * 0.26, -s * 0.12, s * 0.07, 0, Math.PI * 2));
      blob(ctx, fill, lw * 0.8, () => ctx.arc(s * 0.26, -s * 0.12, s * 0.07, 0, Math.PI * 2));
      // router hat
      blob(ctx, o.mono ? '#27272a' : '#2b2440', lw * 0.8, () => ctx.roundRect(-s * 0.2, -s * 0.3, s * 0.4, s * 0.14, s * 0.03));
      ctx.beginPath(); ctx.moveTo(-s * 0.13, -s * 0.3); ctx.lineTo(-s * 0.18, -s * 0.46);
      ctx.moveTo(s * 0.13, -s * 0.3); ctx.lineTo(s * 0.18, -s * 0.46);
      ctx.lineWidth = lw * 0.7; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
      const led = Math.sin(t * 6) > 0 ? (o.mono ? '#fff' : theme.lime) : (o.mono ? '#71717a' : '#3a7d2a');
      ctx.fillStyle = led; ctx.beginPath(); ctx.arc(s * 0.1, -s * 0.23, s * 0.025, 0, Math.PI * 2); ctx.fill();
      // sleepy chill eyes
      ctx.beginPath(); ctx.moveTo(-s * 0.2, s * 0.04); ctx.lineTo(-s * 0.06, s * 0.04);
      ctx.moveTo(s * 0.06, s * 0.04); ctx.lineTo(s * 0.2, s * 0.04);
      ctx.lineWidth = lw * 0.9; ctx.strokeStyle = INK; ctx.stroke();
      blob(ctx, o.mono ? '#52525b' : '#8a5a33', lw * 0.6, () => ctx.ellipse(0, s * 0.22, s * 0.12, s * 0.08, 0, 0, Math.PI * 2));
      break;
    }
    case 'mango': {
      blob(ctx, fill, lw, () => {
        ctx.moveTo(0, -s * 0.38);
        ctx.bezierCurveTo(s * 0.42, -s * 0.3, s * 0.44, s * 0.4, 0, s * 0.42);
        ctx.bezierCurveTo(-s * 0.44, s * 0.4, -s * 0.36, -s * 0.2, 0, -s * 0.38);
      });
      blob(ctx, o.mono ? '#52525b' : '#3ddc84', lw * 0.7, () => ctx.ellipse(s * 0.12, -s * 0.42, s * 0.12, s * 0.05, -0.5, 0, Math.PI * 2));
      shades(ctx, 0, -s * 0.02, s * 0.5);
      smile(ctx, s * 0.03, s * 0.2, s * 0.2, lw * 0.75, true);
      break;
    }
    case 'toaster': {
      // rocket flame
      const flick = 0.8 + Math.sin(t * 30) * 0.2;
      blob(ctx, o.mono ? '#e4e4e7' : theme.orange, lw * 0.7, () => {
        ctx.moveTo(-s * 0.14, s * 0.34); ctx.lineTo(0, s * (0.34 + 0.16 * flick)); ctx.lineTo(s * 0.14, s * 0.34); ctx.closePath();
      });
      // toast slices
      blob(ctx, o.mono ? '#a1a1aa' : '#e0a458', lw * 0.7, () => ctx.roundRect(-s * 0.22, -s * 0.4, s * 0.18, s * 0.2, s * 0.05));
      blob(ctx, o.mono ? '#a1a1aa' : '#e0a458', lw * 0.7, () => ctx.roundRect(s * 0.04, -s * 0.44, s * 0.18, s * 0.24, s * 0.05));
      blob(ctx, fill, lw, () => ctx.roundRect(-s * 0.38, -s * 0.26, s * 0.76, s * 0.6, s * 0.14));
      eye(ctx, -s * 0.12, s * 0.02, s * 0.08, 1, shut);
      eye(ctx, s * 0.12, s * 0.02, s * 0.08, 1, shut);
      smile(ctx, 0, s * 0.2, s * 0.22, lw * 0.75);
      break;
    }
    case 'baguette': {
      // arms with biceps behind the body
      for (const side of [-1, 1]) {
        blob(ctx, fill, lw * 0.85, () => ctx.ellipse(side * s * 0.25, s * 0.06, s * 0.1, s * 0.14, side * 0.5, 0, Math.PI * 2));
      }
      blob(ctx, fill, lw, () => ctx.roundRect(-s * 0.18, -s * 0.46, s * 0.36, s * 0.86, s * 0.17));
      // baked scores
      ctx.beginPath();
      for (const y of [-0.28, -0.08, 0.12]) { ctx.moveTo(-s * 0.1, (y + 0.05) * s); ctx.lineTo(s * 0.1, (y - 0.03) * s); }
      ctx.lineWidth = lw * 0.6; ctx.strokeStyle = 'rgba(18,11,31,0.4)'; ctx.lineCap = 'round'; ctx.stroke();
      shades(ctx, s * 0.02, -s * 0.3, s * 0.34);
      smile(ctx, s * 0.03, -s * 0.16, s * 0.14, lw * 0.7, true);
      // little legs
      ctx.beginPath(); ctx.moveTo(-s * 0.08, s * 0.4); ctx.lineTo(-s * 0.1, s * 0.5);
      ctx.moveTo(s * 0.08, s * 0.4); ctx.lineTo(s * 0.1, s * 0.5);
      ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
      break;
    }
    case 'moon': {
      blob(ctx, fill, lw, () => ctx.arc(0, 0, s * 0.44, 0, Math.PI * 2));
      ctx.fillStyle = o.mono ? 'rgba(0,0,0,0.12)' : 'rgba(200,160,60,0.35)';
      for (const [x, y, r] of [[-0.22, -0.18, 0.07], [0.24, 0.2, 0.06], [-0.16, 0.26, 0.05]] as const) {
        ctx.beginPath(); ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2); ctx.fill();
      }
      // gigachad jaw line
      ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.12); ctx.lineTo(-s * 0.12, s * 0.32); ctx.lineTo(s * 0.12, s * 0.32); ctx.lineTo(s * 0.3, s * 0.12);
      ctx.lineWidth = lw * 0.8; ctx.strokeStyle = 'rgba(18,11,31,0.55)'; ctx.stroke();
      shades(ctx, 0, -s * 0.06, s * 0.5);
      smile(ctx, s * 0.02, s * 0.14, s * 0.18, lw * 0.75, true);
      break;
    }
  }
  ctx.restore();
}
