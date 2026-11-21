/**
 * Story progress on this device: levels cleared (best time, memories found
 * there), every memory found, abilities unlocked and powers already
 * explained. One versioned record in localStorage; anything unreadable is
 * dropped field by field instead of breaking the game.
 */

export const PROGRESS_KEY = 'devos-mc-story';
const VERSION = 1;

export interface LevelProgress { best: number | null; memories: string[] }
export interface Abilities { wallJump: boolean; dash: boolean; blade: boolean }
export interface Progress {
  levels: Record<string, LevelProgress>;
  memories: string[];
  abilities: Abilities;
  powersSeen: string[];
}

export function emptyProgress(): Progress {
  return { levels: {}, memories: [], abilities: { wallJump: false, dash: false, blade: false }, powersSeen: [] };
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const bool = (v: unknown) => v === true;

export function loadProgress(): Progress {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== 'object' || o.v !== VERSION) return emptyProgress();
    const levels: Record<string, LevelProgress> = {};
    if (o.levels && typeof o.levels === 'object') {
      for (const [id, l] of Object.entries(o.levels as Record<string, unknown>)) {
        if (!l || typeof l !== 'object') continue;
        const lp = l as Record<string, unknown>;
        const best = typeof lp.best === 'number' && Number.isFinite(lp.best) && lp.best > 0 ? lp.best : null;
        levels[id] = { best, memories: strings(lp.memories) };
      }
    }
    const a = (o.abilities && typeof o.abilities === 'object' ? o.abilities : {}) as Record<string, unknown>;
    return {
      levels,
      memories: strings(o.memories),
      abilities: { wallJump: bool(a.wallJump), dash: bool(a.dash), blade: bool(a.blade) },
      powersSeen: strings(o.powersSeen),
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: Progress) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify({ v: VERSION, ...p })); } catch { /* private mode */ }
}

const union = (a: string[], b: readonly string[]) => [...new Set([...a, ...b])];

export function recordClear(p: Progress, id: string, seconds: number, memories: readonly string[]): Progress {
  const old = p.levels[id];
  const best = old?.best != null ? Math.min(old.best, seconds) : seconds;
  return {
    ...p,
    levels: { ...p.levels, [id]: { best, memories: union(old?.memories ?? [], memories) } },
    memories: union(p.memories, memories),
  };
}

export function recordMemory(p: Progress, memoryId: string): Progress {
  return { ...p, memories: union(p.memories, [memoryId]) };
}

export function recordAbility(p: Progress, a: keyof Abilities): Progress {
  return { ...p, abilities: { ...p.abilities, [a]: true } };
}

export function recordPowerSeen(p: Progress, kind: string): Progress {
  return { ...p, powersSeen: union(p.powersSeen, [kind]) };
}

/** The first level in story order not yet cleared (the last one when all are). */
export function nextLevelId(p: Progress, order: readonly string[]): string {
  for (const id of order) if (!p.levels[id]) return id;
  return order[order.length - 1];
}
