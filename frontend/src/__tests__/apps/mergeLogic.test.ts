import { describe, it, expect } from 'vitest';
import {
  MAX_LEVEL, MOON_MERGE_POINTS, boardFromLevels, canMove, countLevels, createGame, emptyBoard, hasLevel,
  highestLevel, levelsOf, lineCells, mergePoints, pickSpawn, slide, step,
  type Board, type MergeState,
} from '@/components/apps/games/merge/logic';
import { cellCenter, geometry, spritesForBoard, spritesForMove } from '@/components/apps/games/merge/draw';

const _ = null;

/** A rand that replays the given values, then repeats the last one. */
function seq(...values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

/** One row on top of an otherwise empty board. */
function row(...levels: (number | null)[]): Board {
  return boardFromLevels([...levels, _, _, _, _, _, _, _, _, _, _, _, _]);
}

function firstRow(board: Board) { return levelsOf(board).slice(0, 4); }
function firstCol(board: Board) { const l = levelsOf(board); return [l[0], l[4], l[8], l[12]]; }

/** A column on the left edge, top to bottom. */
function col(...levels: (number | null)[]): Board {
  const l: (number | null)[] = new Array(16).fill(null);
  levels.forEach((v, r) => { l[r * 4] = v; });
  return boardFromLevels(l);
}

function stateOf(board: Board, extra: Partial<MergeState> = {}): MergeState {
  let seen = 0;
  for (const t of board) if (t) seen |= 1 << t.level;
  const maxId = board.reduce((m, t) => (t ? Math.max(m, t.id) : m), 0);
  return { board, score: 0, nextId: maxId + 1, seen, evolved: 0, won: false, over: false, moves: 0, ...extra };
}

describe('slide: left', () => {
  it('merges [1,1,1,1] from the leading edge into [2,2,_,_]', () => {
    const r = slide(row(1, 1, 1, 1), 'left', 100);
    expect(firstRow(r.board)).toEqual([2, 2, _, _]);
    expect(r.merges).toHaveLength(2);
  });

  it('turns [1,1,2,_] into [2,2,_,_] without merging the new 2 again', () => {
    const r = slide(row(1, 1, 2, _), 'left', 100);
    expect(firstRow(r.board)).toEqual([2, 2, _, _]);
    expect(r.merges).toHaveLength(1);
  });

  it('merges the leading pair of three: [0,0,0,_] gives [1,0,_,_]', () => {
    expect(firstRow(slide(row(0, 0, 0, _), 'left', 100).board)).toEqual([1, 0, _, _]);
  });

  it('merges across gaps: [2,_,2,_] gives [3,_,_,_]', () => {
    expect(firstRow(slide(row(2, _, 2, _), 'left', 100).board)).toEqual([3, _, _, _]);
  });

  it('slides a lone tile to the wall', () => {
    expect(firstRow(slide(row(_, _, _, 0), 'left', 100).board)).toEqual([0, _, _, _]);
  });

  it('does not merge different levels: [0,1,0,1] stays put', () => {
    const r = slide(row(0, 1, 0, 1), 'left', 100);
    expect(firstRow(r.board)).toEqual([0, 1, 0, 1]);
    expect(r.changed).toBe(false);
  });
});

describe('slide: right, up, down', () => {
  it('right: [1,1,1,1] gives [_,_,2,2]', () => {
    expect(firstRow(slide(row(1, 1, 1, 1), 'right', 100).board)).toEqual([_, _, 2, 2]);
  });

  it('right: the leading edge merges first, [1,1,1,_] gives [_,_,1,2]', () => {
    expect(firstRow(slide(row(1, 1, 1, _), 'right', 100).board)).toEqual([_, _, 1, 2]);
  });

  it('right: [_,2,1,1] gives [_,_,2,2] with no double merge', () => {
    const r = slide(row(_, 2, 1, 1), 'right', 100);
    expect(firstRow(r.board)).toEqual([_, _, 2, 2]);
    expect(r.merges).toHaveLength(1);
  });

  it('up: a column of four 1s gives [2,2,_,_] top down', () => {
    expect(firstCol(slide(col(1, 1, 1, 1), 'up', 100).board)).toEqual([2, 2, _, _]);
  });

  it('up: [_,3,_,3] gives [4,_,_,_]', () => {
    expect(firstCol(slide(col(_, 3, _, 3), 'up', 100).board)).toEqual([4, _, _, _]);
  });

  it('down: [0,_,0,1] gives [_,_,1,1]', () => {
    expect(firstCol(slide(col(0, _, 0, 1), 'down', 100).board)).toEqual([_, _, 1, 1]);
  });

  it('down: [1,1,2,_] gives [_,_,2,2] with no double merge', () => {
    const r = slide(col(1, 1, 2, _), 'down', 100);
    expect(firstCol(r.board)).toEqual([_, _, 2, 2]);
    expect(r.merges).toHaveLength(1);
  });

  it('moves every line on its own', () => {
    const b = boardFromLevels([
      0, 0, _, _,
      _, 1, _, 1,
      2, 3, 2, 3,
      _, _, _, 4,
    ]);
    expect(levelsOf(slide(b, 'left', 100).board)).toEqual([
      1, _, _, _,
      2, _, _, _,
      2, 3, 2, 3,
      4, _, _, _,
    ]);
  });

  it('lists cells from the leading edge for each direction', () => {
    expect(lineCells('left', 1)).toEqual([4, 5, 6, 7]);
    expect(lineCells('right', 1)).toEqual([7, 6, 5, 4]);
    expect(lineCells('up', 2)).toEqual([2, 6, 10, 14]);
    expect(lineCells('down', 2)).toEqual([14, 10, 6, 2]);
  });
});

describe('slide: tracking tiles for the animation', () => {
  it('records where every tile went and which two made each merge', () => {
    const b = row(1, _, 1, 0); // ids 1, 2, 3
    const r = slide(b, 'left', 50);
    expect(r.slides).toEqual([
      { id: 1, level: 1, from: 0, to: 0 },
      { id: 2, level: 1, from: 2, to: 0 },
      { id: 3, level: 0, from: 3, to: 1 },
    ]);
    expect(r.merges).toEqual([{ id: 50, level: 2, at: 0, sources: [1, 2], points: 80 }]);
    expect(r.board[0]).toEqual({ id: 50, level: 2 });
    expect(r.nextId).toBe(51);
  });

  it('keeps the same tile object for a survivor', () => {
    const b = row(_, 3, _, _);
    const r = slide(b, 'left', 9);
    expect(r.board[0]).toBe(b[1]);
  });
});

describe('step: spawning', () => {
  it('a move that changes nothing does not spawn and does not touch rand', () => {
    const s = stateOf(row(0, 1, 2, 3));
    let calls = 0;
    const r = step(s, 'left', () => { calls++; return 0; });
    expect(r.changed).toBe(false);
    expect(r.spawn).toBeNull();
    expect(r.state).toBe(s);
    expect(calls).toBe(0);
  });

  it('a no-op move into a wall on a busy board does not spawn either', () => {
    const s = stateOf(boardFromLevels([0, 1, 0, 1, 1, 0, 1, 0, _, _, _, _, _, _, _, _]));
    expect(step(s, 'up', seq(0)).changed).toBe(false);
  });

  it('a real move spawns exactly one tile in an empty cell', () => {
    const s = stateOf(row(_, _, _, 0));
    const r = step(s, 'left', seq(0, 0.5));
    expect(r.changed).toBe(true);
    expect(r.spawn).toEqual({ id: 2, level: 0, at: 1 });
    expect(r.state.board.filter(Boolean)).toHaveLength(2);
    expect(r.state.moves).toBe(1);
  });

  it('picks the cell with the first draw over the empty cells in order', () => {
    const b = row(0, _, 1, _); // empties: 1, 3, 4..15 (14 cells)
    expect(pickSpawn(b, seq(0, 0.5))!.at).toBe(1);
    expect(pickSpawn(b, seq(1 / 14 + 0.001, 0.5))!.at).toBe(3);
    expect(pickSpawn(b, seq(0.9999, 0.5))!.at).toBe(15);
  });

  it('spawns a Pebble Rizzo when the second draw is under 0.1, a Bean Pookie otherwise', () => {
    const b = emptyBoard();
    expect(pickSpawn(b, seq(0, 0.0999))!.level).toBe(1);
    expect(pickSpawn(b, seq(0, 0.1))!.level).toBe(0);
    expect(pickSpawn(b, seq(0, 0.95))!.level).toBe(0);
  });

  it('spawns level 1 exactly 10% of the time over a uniform stub rand', () => {
    const counts = [0, 0];
    for (let i = 0; i < 1000; i++) counts[pickSpawn(emptyBoard(), seq(0.5, i / 1000))!.level]++;
    expect(counts).toEqual([900, 100]);
  });

  it('returns no spawn on a full board', () => {
    expect(pickSpawn(boardFromLevels(new Array(16).fill(0)), seq(0))).toBeNull();
  });

  it('starts a game with two tiles in different cells and no score', () => {
    const g = createGame(seq(0, 0.5, 0, 0.05));
    const tiles = g.board.map((t, i) => (t ? [i, t.level] : null)).filter(Boolean);
    expect(tiles).toEqual([[0, 0], [1, 1]]);
    expect(g.score).toBe(0);
    expect(g.nextId).toBe(3);
    expect(hasLevel(g.seen, 0) && hasLevel(g.seen, 1)).toBe(true);
    expect(g.evolved).toBe(0);
  });
});

describe('score', () => {
  it('pays 2^(n+1) x 10 for a merge into level n', () => {
    // mergePoints takes the level that merged; the result is one higher.
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(mergePoints)).toEqual([40, 80, 160, 320, 640, 1280, 2560, 5120]);
  });

  it('pays 80 aura for a Croissantoni', () => {
    const r = step(stateOf(row(1, 1, _, _)), 'left', seq(0.9, 0.5));
    expect(r.merges[0].level).toBe(2);
    expect(r.gained).toBe(80);
    expect(r.state.score).toBe(80);
  });

  it('adds every merge in one move', () => {
    const r = step(stateOf(row(1, 1, 1, 1), { score: 100 }), 'left', seq(0.9, 0.5));
    expect(r.gained).toBe(160);
    expect(r.state.score).toBe(260);
  });
});

describe('the moon cap', () => {
  it('two moons stay one moon and pay 10000', () => {
    const r = slide(row(MAX_LEVEL, MAX_LEVEL, _, _), 'left', 100);
    expect(firstRow(r.board)).toEqual([MAX_LEVEL, _, _, _]);
    expect(r.merges[0].points).toBe(MOON_MERGE_POINTS);
  });

  it('four moons make two moons for 20000', () => {
    const r = step(stateOf(row(8, 8, 8, 8), { won: true }), 'left', seq(0.9, 0.5));
    expect(firstRow(r.state.board)).toEqual([8, 8, _, _]);
    expect(r.gained).toBe(20000);
  });

  it('the first Moon Gigachad wins, once', () => {
    const first = step(stateOf(row(7, 7, _, _)), 'left', seq(0.9, 0.5));
    expect(first.justWon).toBe(true);
    expect(first.state.won).toBe(true);
    expect(first.gained).toBe(5120);
    const again = step(stateOf(row(7, 7, _, _), { won: true }), 'left', seq(0.9, 0.5));
    expect(again.justWon).toBe(false);
    const moons = step(stateOf(row(8, 8, _, _), { won: true }), 'left', seq(0.9, 0.5));
    expect(moons.justWon).toBe(false);
  });
});

describe('game over', () => {
  const stuck = [
    0, 1, 0, 1,
    1, 0, 1, 0,
    0, 1, 0, 1,
    1, 0, 1, 0,
  ];

  it('a full board with no equal neighbours has no move', () => {
    expect(canMove(boardFromLevels(stuck))).toBe(false);
  });

  it('a full board with an equal pair side by side still has a move', () => {
    const l = [...stuck]; l[1] = 0;
    expect(canMove(boardFromLevels(l))).toBe(true);
  });

  it('a full board with an equal pair stacked still has a move', () => {
    const l = [...stuck]; l[4] = 0;
    expect(canMove(boardFromLevels(l))).toBe(true);
  });

  it('two moons next to each other still count as a move', () => {
    const l = [...stuck]; l[14] = 8; l[15] = 8;
    expect(canMove(boardFromLevels(l))).toBe(true);
  });

  it('any empty cell is a move', () => {
    const l: (number | null)[] = [...stuck]; l[15] = null;
    expect(canMove(boardFromLevels(l))).toBe(true);
  });

  it('a move that fills the last cell with no merge left ends the game', () => {
    // Row 0 slides left into a gap, the spawn fills the hole with a Pebble that matches nothing.
    const b = boardFromLevels([
      _, 2, 3, 2,
      3, 2, 3, 2,
      2, 3, 2, 3,
      3, 2, 3, 2,
    ]);
    const r = step(stateOf(b), 'left', seq(0, 0.05));
    expect(levelsOf(r.state.board).slice(0, 4)).toEqual([2, 3, 2, 1]);
    expect(r.state.over).toBe(true);
  });

  it('a move that leaves a merge open does not end the game', () => {
    // Same fill, but the spawned Bean lands on top of another Bean.
    const b = boardFromLevels([
      _, 2, 3, 2,
      3, 2, 3, 0,
      2, 3, 2, 3,
      3, 2, 3, 2,
    ]);
    const r = step(stateOf(b), 'left', seq(0, 0.5));
    expect(r.state.board.every(Boolean)).toBe(true);
    expect(r.state.over).toBe(false);
  });
});

describe('new evolutions', () => {
  it('announces a level the first time a merge makes it', () => {
    const r = step(stateOf(row(1, 1, _, _)), 'left', seq(0.9, 0.5));
    expect(r.newEvolutions).toEqual([2]);
    expect(hasLevel(r.state.evolved, 2)).toBe(true);
  });

  it('does not announce it a second time', () => {
    const s = stateOf(row(1, 1, _, _), { evolved: 1 << 2 });
    expect(step(s, 'left', seq(0.9, 0.5)).newEvolutions).toEqual([]);
  });

  it('announces two new levels from one move, lowest first', () => {
    const r = step(stateOf(boardFromLevels([2, 2, _, _, 0, 0, _, _, _, _, _, _, _, _, _, _])), 'left', seq(0.9, 0.5));
    expect(r.newEvolutions).toEqual([1, 3]);
  });

  it('a spawned Pebble colours the chain but still gets its card on the first merge', () => {
    const start = stateOf(row(_, _, _, 0));
    const s1 = step(start, 'left', seq(0, 0.05)).state; // Pebble spawns
    expect(hasLevel(s1.seen, 1)).toBe(true);
    expect(hasLevel(s1.evolved, 1)).toBe(false);
    const merged = step(stateOf(row(0, 0, _, _), { seen: s1.seen }), 'left', seq(0.9, 0.5));
    expect(merged.newEvolutions).toEqual([1]);
  });

  it('marks merged levels as seen for the chain strip', () => {
    const r = step(stateOf(row(4, 4, _, _)), 'left', seq(0.9, 0.5));
    expect(hasLevel(r.state.seen, 5)).toBe(true);
    expect(countLevels(r.state.seen)).toBe(3); // 4 is gone from the board but stays seen, plus 5 and the 0 spawn
  });

  it('reports the highest creature on the board', () => {
    expect(highestLevel(row(0, 6, 3, _))).toBe(6);
    expect(highestLevel(emptyBoard())).toBe(-1);
  });
});

describe('animation sprites', () => {
  it('turns a move into ghosts for the merged pair, slides, a pop and a spawn', () => {
    const r = step(stateOf(row(1, 1, 0, _)), 'left', seq(0.9, 0.5));
    const kinds = spritesForMove(r).map(s => s.kind);
    expect(kinds).toEqual(['ghost', 'ghost', 'slide', 'pop', 'spawn']);
  });

  it('a new game grows every tile in, a static board does not', () => {
    const b = row(0, _, 1, _);
    expect(spritesForBoard(b, true).map(s => s.kind)).toEqual(['spawn', 'spawn']);
    expect(spritesForBoard(b).map(s => s.kind)).toEqual(['slide', 'slide']);
  });

  it('fits four cells, three gaps and two pads inside the board', () => {
    const g = geometry(360);
    expect(g.pad * 2 + g.gap * 3 + g.cell * 4).toBeCloseTo(360);
    expect(cellCenter(g, 15).x).toBeCloseTo(360 - g.pad - g.cell / 2);
  });
});
