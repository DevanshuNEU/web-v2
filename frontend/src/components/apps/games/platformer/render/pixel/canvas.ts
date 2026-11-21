/** Offscreen canvases for the pixel renderer: a detached canvas on the main thread, else OffscreenCanvas. */

export type Canvas = HTMLCanvasElement | OffscreenCanvas;
export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): { canvas: Canvas; ctx: Ctx } {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, w);
    canvas.height = Math.max(1, h);
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.imageSmoothingEnabled = false; return { canvas, ctx }; }
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(Math.max(1, w), Math.max(1, h));
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.imageSmoothingEnabled = false; return { canvas, ctx }; }
  }
  throw new Error('pixel renderer: no canvas available');
}

/** Resize a canvas in place (clears it). */
export function resize(c: Canvas, w: number, h: number) {
  if (c.width !== w) c.width = w;
  if (c.height !== h) c.height = h;
}
