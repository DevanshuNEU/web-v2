import { describe, it, expect } from 'vitest';
import { ChunkCache, CHUNK_COLS, chunkRange } from '@/components/apps/games/platformer/render/pixel/chunks';

/** Static tiles are baked per 32-column chunk and kept in an LRU of 4. */
describe('tile chunk cache', () => {
  const make = () => {
    const baked: number[] = [];
    const cache = new ChunkCache<{ id: number }>(4, (index, reuse) => {
      baked.push(index);
      return reuse ?? { id: index };
    });
    return { cache, baked };
  };

  it('bakes a chunk once and serves it from the cache after', () => {
    const { cache, baked } = make();
    const a = cache.get(0);
    expect(cache.get(0)).toBe(a);
    expect(baked).toEqual([0]);
  });

  it('keeps at most four chunks, evicting the least recently used', () => {
    const { cache, baked } = make();
    for (const i of [0, 1, 2, 3]) cache.get(i);
    cache.get(0); // 1 is now the oldest
    cache.get(4);
    expect(cache.size).toBe(4);
    expect(cache.has(1)).toBe(false);
    expect(cache.has(0)).toBe(true);
    cache.get(1);
    expect(baked).toEqual([0, 1, 2, 3, 4, 1]);
    expect(cache.has(2)).toBe(false);
  });

  it('reuses the evicted canvas for the new chunk instead of making one', () => {
    const { cache } = make();
    const first = cache.get(0);
    for (const i of [1, 2, 3, 4]) cache.get(i);
    expect(cache.has(0)).toBe(false);
    expect(cache.get(5)).not.toBe(first);
    // 0 was recycled into 4; 1 into 5
    expect(cache.get(4)).toBe(first);
  });

  it('a reset forgets every chunk, so a new level or palette bakes fresh', () => {
    const { cache, baked } = make();
    cache.get(0); cache.get(1);
    cache.reset();
    expect(cache.size).toBe(0);
    cache.get(0);
    expect(baked).toEqual([0, 1, 0]);
  });

  it('a chunk baked ahead of time is adopted, and hands back the evicted canvas for the next one', () => {
    const { cache, baked } = make();
    for (const i of [0, 1, 2, 3]) cache.get(i);
    cache.get(1); cache.get(2); cache.get(3); // 0 is now the oldest
    const pre = { id: 4 };
    const evicted = cache.adopt(4, pre);
    expect(evicted).toEqual({ id: 0 });
    expect(cache.get(4)).toBe(pre);
    expect(baked).toEqual([0, 1, 2, 3]);
    expect(cache.size).toBe(4);
    expect(cache.adopt(5, { id: 5 })).not.toBeNull();
    // below the cap nothing is evicted
    cache.reset();
    expect(cache.adopt(7, { id: 7 })).toBeNull();
  });

  it('a view spanning a chunk edge needs both chunks', () => {
    const r = { first: 0, last: 0 };
    chunkRange(r, CHUNK_COLS * 16 - 40, 200);
    expect(r).toEqual({ first: 0, last: 1 });
    chunkRange(r, 0, 100);
    expect(r).toEqual({ first: 0, last: 0 });
    chunkRange(r, -30, 100);
    expect(r.first).toBe(0);
  });
});
