/**
 * Aura Tower drawing helpers: the cursed slab sticker, the sky and the
 * pedestal. Plain canvas calls, no allocation in the per-slab path.
 */

const INK = '#120b1f';

export const Face = { None: 0, Calm: 1, Happy: 2, Look: 3, Dizzy: 4 } as const;
export type Face = (typeof Face)[keyof typeof Face];

/**
 * One cursed slab: a stretched sticker with a thick outline, a glossy top
 * strip and a face. (x, y) is the top-left corner in CSS px.
 */
export function drawSlab(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  fill: string, face: Face, look = 0, shades = false,
) {
  if (w <= 0.5) return;
  const lw = Math.max(2.5, h * 0.1);
  const r = Math.min(h * 0.32, w / 2, 9);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (w > lw * 4) {
    ctx.beginPath();
    ctx.roundRect(x + lw * 1.1, y + lw * 0.9, w - lw * 2.2, h * 0.2, h * 0.1);
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.stroke();

  if (face === Face.None || w < h * 1.15) return;
  const cx = x + w / 2;
  const cy = y + h * 0.5;
  const er = h * 0.17;
  const gap = Math.min(w * 0.17, h * 0.62);
  ctx.lineCap = 'round';

  if (shades && face !== Face.Dizzy) {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.roundRect(cx - gap - er * 1.4, cy - er * 1.2, er * 2.8, er * 1.7, er * 0.6);
    ctx.roundRect(cx + gap - er * 1.4, cy - er * 1.2, er * 2.8, er * 1.7, er * 0.6);
    ctx.fill();
    ctx.fillRect(cx - gap, cy - er * 0.9, gap * 2, er * 0.45);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(cx - gap - er * 0.9, cy - er * 0.8, er * 0.7, er * 0.35);
    ctx.fillRect(cx + gap - er * 0.9, cy - er * 0.8, er * 0.7, er * 0.35);
  } else {
    for (let side = -1; side <= 1; side += 2) {
      const ex = cx + side * gap;
      const ey = cy - er * 0.35;
      if (face === Face.Happy) {
        ctx.beginPath();
        ctx.arc(ex, ey + er * 0.4, er * 0.85, Math.PI * 1.1, Math.PI * 1.9);
        ctx.lineWidth = er * 0.5; ctx.strokeStyle = INK; ctx.stroke();
      } else if (face === Face.Dizzy) {
        ctx.beginPath();
        ctx.moveTo(ex - er * 0.8, ey - er * 0.8); ctx.lineTo(ex + er * 0.8, ey + er * 0.8);
        ctx.moveTo(ex + er * 0.8, ey - er * 0.8); ctx.lineTo(ex - er * 0.8, ey + er * 0.8);
        ctx.lineWidth = er * 0.45; ctx.strokeStyle = INK; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.lineWidth = er * 0.3; ctx.strokeStyle = INK; ctx.stroke();
        ctx.beginPath(); ctx.arc(ex + look * er * 0.4, ey + er * 0.1, er * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = INK; ctx.fill();
      }
    }
  }

  // mouth
  const my = cy + h * 0.2;
  ctx.beginPath();
  if (face === Face.Dizzy || face === Face.Look) {
    // a little "o": shocked when falling, hyped while sliding
    ctx.ellipse(cx, my, er * 0.45, er * (face === Face.Dizzy ? 0.6 : 0.45), 0, 0, Math.PI * 2);
    ctx.fillStyle = INK; ctx.fill();
  } else if (face === Face.Happy) {
    ctx.moveTo(cx - er * 1.1, my - er * 0.35);
    ctx.quadraticCurveTo(cx, my + er * 1.3, cx + er * 1.1, my - er * 0.35);
    ctx.closePath();
    ctx.fillStyle = INK; ctx.fill();
  } else {
    ctx.arc(cx, my - er * 0.6, er * 0.75, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.lineWidth = er * 0.38; ctx.strokeStyle = INK; ctx.stroke();
  }
}

/** The pedestal under the base slab: a dark block with a few lit windows. */
export function drawPedestal(
  ctx: CanvasRenderingContext2D,
  x: number, top: number, w: number, bottom: number,
  fill: string, windowLit: string, windowDark: string, unit: number,
) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, top, w, bottom - top);
  const lw = Math.max(2.5, unit * 0.1);
  ctx.lineWidth = lw; ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(x, top); ctx.lineTo(x, bottom + lw); ctx.moveTo(x + w, top); ctx.lineTo(x + w, bottom + lw);
  ctx.stroke();
  const ww = unit * 0.34; const wh = unit * 0.44;
  const cols = Math.max(1, Math.floor((w - unit * 0.6) / (unit * 1.1)));
  const span = cols * unit * 1.1 - unit * 0.6;
  const x0 = x + (w - span) / 2;
  for (let row = 0, y = top + unit * 0.7; y < bottom && row < 40; row++, y += unit * 1.1) {
    for (let c = 0; c < cols; c++) {
      const lit = ((row * 7 + c * 13) % 9) === 0;
      ctx.fillStyle = lit ? windowLit : windowDark;
      ctx.fillRect(x0 + c * unit * 1.1, y, ww, wh);
    }
  }
}

type RGB = readonly [number, number, number];
const SKY_COLOR: readonly (readonly [number, RGB])[] = [
  [0, [0x1d, 0x14, 0x30]],   // night plum
  [18, [0x22, 0x13, 0x4f]],  // deeper violet
  [40, [0x0f, 0x0a, 0x33]],
  [70, [0x05, 0x05, 0x18]],  // starry
];
const SKY_MONO: readonly (readonly [number, RGB])[] = [
  [0, [0x16, 0x16, 0x18]],
  [70, [0x04, 0x04, 0x05]],
];

/** Sky colour at a height in floors. */
export function skyAt(level: number, mono: boolean): string {
  const stops = mono ? SKY_MONO : SKY_COLOR;
  let i = 0;
  while (i < stops.length - 2 && level > stops[i + 1][0]) i++;
  const [a, ca] = stops[i]; const [b, cb] = stops[i + 1];
  const t = Math.max(0, Math.min(1, (level - a) / (b - a)));
  const ch = (n: number) => Math.round(ca[n] + (cb[n] - ca[n]) * t);
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
}

/** Star opacity by height: none near the ground, fully out by 35 floors. */
export function starAlpha(level: number): number {
  return Math.max(0, Math.min(1, (level - 8) / 27));
}

/** 70 stars as [x, y, size, phase] in unit space, fixed per load. */
export const STARS = (() => {
  const n = 70; const out = new Float32Array(n * 4);
  let s = 12345;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
  for (let i = 0; i < n; i++) {
    out[i * 4] = r(); out[i * 4 + 1] = r(); out[i * 4 + 2] = 1 + r() * 1.8; out[i * 4 + 3] = r() * Math.PI * 2;
  }
  return out;
})();
