/**
 * Brainrot Evolution rules: a 4x4 slide-merge grid of the cast chain.
 *
 * Pure and deterministic: no DOM, randomness comes in through `rand`. A tile
 * holds a level, the index into CAST (0 Bean Pookie up to 8 Moon Gigachad).
 * Two equal tiles that collide become the next level. Two moons stay a moon
 * but score MOON_MERGE_POINTS.
 *
 * The board is a flat array of 16 cells, index = row * 4 + col.
 */

export const SIZE = 4;
export const CELLS = SIZE * SIZE;
/** Highest level: Moon Gigachad. */
export const MAX_LEVEL = 8;
export const LEVELS = MAX_LEVEL + 1;
export const MOON_MERGE_POINTS = 10000;
/** Chance a spawn is level 1 (Pebble Rizzo) instead of level 0. */
export const SPAWN_HIGH_CHANCE = 0.1;

export type Dir = 'left' | 'right' | 'up' | 'down';

export interface Tile { id: number; level: number }
export type Board = (Tile | null)[];

export interface MergeState {
  board: Board;
  score: number;
  /** Next tile id. Ids let the view follow a tile from cell to cell. */
  nextId: number;
  /** Bit n set once level n has been on the board this game (the chain strip). */
  seen: number;
  /** Bit n set once a merge has produced level n this game (the name cards). */
  evolved: number;
  /** Moon Gigachad has been made this game. */
  won: boolean;
  /** No move changes the board. */
  over: boolean;
  moves: number;
}

/** One tile travelling from cell `from` to cell `to` (possibly the same). */
export interface Slide { id: number; level: number; from: number; to: number }
/** Two tiles that met in cell `at` and became tile `id`. */
export interface Merge { id: number; level: number; at: number; sources: [number, number]; points: number }
export interface Spawn { id: number; level: number; at: number }

export interface StepResult {
  state: MergeState;
  changed: boolean;
  slides: Slide[];
  merges: Merge[];
  spawn: Spawn | null;
  gained: number;
  /** Levels a merge produced for the first time this game, lowest first. */
  newEvolutions: number[];
  /** This move made the first Moon Gigachad. */
  justWon: boolean;
}

/** Points for a merge that produces `level`: 2^(level+1) x 10. Two moons pay MOON_MERGE_POINTS. */
export function mergePoints(fromLevel: number): number {
  if (fromLevel >= MAX_LEVEL) return MOON_MERGE_POINTS;
  return Math.pow(2, fromLevel + 2) * 10;
}

export function emptyBoard(): Board {
  return new Array<Tile | null>(CELLS).fill(null);
}

/** The four cell indices of line `k` for a move in `dir`, leading edge first. */
export function lineCells(dir: Dir, k: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < SIZE; i++) {
    switch (dir) {
      case 'left':  out.push(k * SIZE + i); break;
      case 'right': out.push(k * SIZE + (SIZE - 1 - i)); break;
      case 'up':    out.push(i * SIZE + k); break;
      case 'down':  out.push((SIZE - 1 - i) * SIZE + k); break;
    }
  }
  return out;
}

export function emptyCells(board: Board): number[] {
  const out: number[] = [];
  for (let i = 0; i < board.length; i++) if (!board[i]) out.push(i);
  return out;
}

/**
 * Place one new tile in a random empty cell: level 0 (90%) or level 1 (10%).
 * Uses two draws from `rand`: the cell, then the level. Returns null on a full board.
 */
export function pickSpawn(board: Board, rand: () => number): { at: number; level: number } | null {
  const empty = emptyCells(board);
  if (empty.length === 0) return null;
  const at = empty[Math.min(empty.length - 1, Math.floor(rand() * empty.length))];
  const level = rand() < SPAWN_HIGH_CHANCE ? 1 : 0;
  return { at, level };
}

/** Is any move possible: an empty cell, or two equal neighbours (moons included). */
export function canMove(board: Board): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const t = board[r * SIZE + c];
      if (!t) return true;
      const right = c < SIZE - 1 ? board[r * SIZE + c + 1] : null;
      const down = r < SIZE - 1 ? board[(r + 1) * SIZE + c] : null;
      if (right && right.level === t.level) return true;
      if (down && down.level === t.level) return true;
    }
  }
  return false;
}

export function highestLevel(board: Board): number {
  let hi = -1;
  for (const t of board) if (t && t.level > hi) hi = t.level;
  return hi;
}

function bit(level: number) { return 1 << level; }

/** How many levels a bitmask covers. */
export function countLevels(mask: number): number {
  let n = 0;
  for (let l = 0; l < LEVELS; l++) if (mask & bit(l)) n++;
  return n;
}

export function hasLevel(mask: number, level: number): boolean {
  return (mask & bit(level)) !== 0;
}

/**
 * Slide every tile in `dir` without spawning. Standard slide-merge: each line
 * is processed from the leading edge, and a tile made by a merge cannot merge
 * again in the same move.
 */
export function slide(board: Board, dir: Dir, firstId: number) {
  const next = emptyBoard();
  const slides: Slide[] = [];
  const merges: Merge[] = [];
  let nextId = firstId;
  let changed = false;

  for (let k = 0; k < SIZE; k++) {
    const cells = lineCells(dir, k);
    let target = 0;
    // The last tile placed in this line, while it can still take a merge.
    let open: { pos: number; tile: Tile } | null = null;
    for (let i = 0; i < SIZE; i++) {
      const t = board[cells[i]];
      if (!t) continue;
      if (open && open.tile.level === t.level) {
        const at = cells[open.pos];
        const level = Math.min(MAX_LEVEL, t.level + 1);
        const made: Tile = { id: nextId++, level };
        next[at] = made;
        slides.push({ id: t.id, level: t.level, from: cells[i], to: at });
        merges.push({ id: made.id, level, at, sources: [open.tile.id, t.id], points: mergePoints(t.level) });
        changed = true;
        open = null;
      } else {
        const at = cells[target];
        next[at] = t;
        slides.push({ id: t.id, level: t.level, from: cells[i], to: at });
        if (at !== cells[i]) changed = true;
        open = { pos: target, tile: t };
        target++;
      }
    }
  }
  return { board: next, slides, merges, changed, nextId };
}

/** A fresh game: an empty board with two spawned tiles. */
export function createGame(rand: () => number = Math.random): MergeState {
  const board = emptyBoard();
  let nextId = 1;
  let seen = 0;
  for (let n = 0; n < 2; n++) {
    const s = pickSpawn(board, rand);
    if (!s) break;
    board[s.at] = { id: nextId++, level: s.level };
    seen |= bit(s.level);
  }
  return { board, score: 0, nextId, seen, evolved: 0, won: false, over: false, moves: 0 };
}

/**
 * Apply one move. A move that changes nothing returns the same state with
 * `changed: false` and spawns nothing. A real move spawns one tile, then
 * checks for game over.
 */
export function step(state: MergeState, dir: Dir, rand: () => number = Math.random): StepResult {
  const moved = slide(state.board, dir, state.nextId);
  if (!moved.changed) {
    return { state, changed: false, slides: moved.slides, merges: [], spawn: null, gained: 0, newEvolutions: [], justWon: false };
  }
  const board = moved.board;
  let nextId = moved.nextId;
  let seen = state.seen;
  let evolved = state.evolved;
  let gained = 0;
  const fresh = new Set<number>();
  for (const m of moved.merges) {
    gained += m.points;
    if (!hasLevel(evolved, m.level)) fresh.add(m.level);
    evolved |= bit(m.level);
    seen |= bit(m.level);
  }
  const justWon = !state.won && moved.merges.some(m => m.level === MAX_LEVEL);

  let spawn: Spawn | null = null;
  const s = pickSpawn(board, rand);
  if (s) {
    spawn = { id: nextId++, level: s.level, at: s.at };
    board[s.at] = { id: spawn.id, level: s.level };
    seen |= bit(s.level);
  }

  const next: MergeState = {
    board,
    score: state.score + gained,
    nextId,
    seen,
    evolved,
    won: state.won || justWon,
    over: !canMove(board),
    moves: state.moves + 1,
  };
  return {
    state: next,
    changed: true,
    slides: moved.slides,
    merges: moved.merges,
    spawn,
    gained,
    newEvolutions: [...fresh].sort((a, b) => a - b),
    justWon,
  };
}

/** Build a board from 16 levels (null for empty). Ids are 1..n in reading order. For tests and demos. */
export function boardFromLevels(levels: (number | null)[]): Board {
  let id = 1;
  return levels.map(l => (l === null ? null : { id: id++, level: l }));
}

export function levelsOf(board: Board): (number | null)[] {
  return board.map(t => (t ? t.level : null));
}
