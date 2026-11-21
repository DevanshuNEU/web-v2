/**
 * Static tiles are baked per 32-column chunk into one canvas each and kept in
 * a tiny LRU, so a frame draws one or two images for the whole level instead
 * of hundreds of tiles. Evicted canvases are handed back to the baker for
 * reuse, so scrolling through a long level allocates nothing once warm.
 */

import { ART_TILE } from './camera';

export const CHUNK_COLS = 32;
export const CHUNK_PX = CHUNK_COLS * ART_TILE;

export class ChunkCache<T> {
  private keys: number[] = [];
  private vals: T[] = [];
  private used: number[] = [];
  private clock = 0;

  constructor(private readonly cap: number, private readonly bake: (index: number, reuse: T | null) => T) {}

  get size(): number { return this.keys.length; }

  has(index: number): boolean { return this.keys.indexOf(index) >= 0; }

  get(index: number): T {
    const i = this.keys.indexOf(index);
    this.clock++;
    if (i >= 0) { this.used[i] = this.clock; return this.vals[i]; }
    if (this.keys.length < this.cap) {
      const v = this.bake(index, null);
      this.keys.push(index); this.vals.push(v); this.used.push(this.clock);
      return v;
    }
    let old = 0;
    for (let j = 1; j < this.used.length; j++) if (this.used[j] < this.used[old]) old = j;
    const v = this.bake(index, this.vals[old]);
    this.keys[old] = index; this.vals[old] = v; this.used[old] = this.clock;
    return v;
  }

  /**
   * Insert a chunk baked elsewhere (ahead of time, a few columns per frame).
   * Returns the value it evicted, for the next bake to reuse, or null.
   */
  adopt(index: number, v: T): T | null {
    this.clock++;
    const i = this.keys.indexOf(index);
    if (i >= 0) { const old = this.vals[i]; this.vals[i] = v; this.used[i] = this.clock; return old === v ? null : old; }
    if (this.keys.length < this.cap) {
      this.keys.push(index); this.vals.push(v); this.used.push(this.clock);
      return null;
    }
    let old = 0;
    for (let j = 1; j < this.used.length; j++) if (this.used[j] < this.used[old]) old = j;
    const ev = this.vals[old];
    this.keys[old] = index; this.vals[old] = v; this.used[old] = this.clock;
    return ev;
  }

  /** Forget every chunk (new level, palette or size). Canvases are dropped. */
  reset() {
    this.keys.length = 0; this.vals.length = 0; this.used.length = 0;
  }
}

export interface ChunkSpan { first: number; last: number }

/** Chunks a view starting at art pixel x and w pixels wide touches. */
export function chunkRange(out: ChunkSpan, x: number, w: number): ChunkSpan {
  out.first = Math.max(0, Math.floor(x / CHUNK_PX));
  out.last = Math.max(out.first, Math.floor((x + w - 1) / CHUNK_PX));
  return out;
}
