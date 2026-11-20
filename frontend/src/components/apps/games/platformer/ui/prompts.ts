/**
 * Beginner prompts for story 1-1, and the one-time prompt after a shrine.
 * Positions come from `level.hints` when the sim provides them
 * ({ x, y, move }[]); otherwise from the tiles: the first gap gets "hold Jump
 * to jump higher", the first gap too wide for one jump gets "jump again in
 * the air". A prompt shows until its move has been used.
 */

import { ROWS, isSolidTile, type Level } from '../sim/level';

export type PromptMove = 'hold' | 'double' | 'attack' | 'dash' | 'climb';
export interface PromptSpot { x: number; y: number; move: PromptMove }

const TEXT: Record<PromptMove, [string, string]> = {
  hold: ['HOLD SPACE TO JUMP HIGHER', 'HOLD JUMP TO JUMP HIGHER'],
  double: ['JUMP AGAIN IN THE AIR', 'JUMP AGAIN IN THE AIR'],
  attack: ['PRESS Z TO ATTACK', 'TAP ATTACK TO SWING'],
  dash: ['PRESS X TO DASH', 'TAP DASH TO DASH'],
  climb: ['JUMP INTO A WALL, THEN JUMP', 'JUMP INTO A WALL, THEN JUMP'],
};

export function promptText(move: PromptMove, touch: boolean): string {
  return TEXT[move][touch ? 1 : 0];
}

function topRow(l: Level, x: number): number {
  for (let y = 0; y < ROWS; y++) if (isSolidTile(l.tiles[y * l.cols + x])) return y;
  return ROWS;
}

/** The prompt spots for a level: its hints, else the first gap and the first wide gap. */
export function promptSpots(l: Level): PromptSpot[] {
  // the sim's prompt set pieces: { kind: 'prompt', id, x0, x1 }
  const pieces = (l as unknown as { setPieces?: { kind: string; id?: string; x0: number }[] }).setPieces;
  if (Array.isArray(pieces) && pieces.some(p => p.kind === 'prompt')) {
    const ID: Record<string, PromptMove> = { doubleJump: 'double', double: 'double', holdJump: 'hold', hold: 'hold', jump: 'hold', attack: 'attack', dash: 'dash', wallJump: 'climb' };
    const marked = pieces.filter(p => p.kind === 'prompt' && p.id && ID[p.id])
      .map(p => ({ x: p.x0 + 0.5, y: Math.max(1, topRow(l, Math.max(0, Math.min(l.cols - 1, Math.floor(p.x0))))), move: ID[p.id as string] }));
    // the first gap still teaches holding Jump when the level does not mark it
    if (!marked.some(m => m.move === 'hold')) {
      const hold = derived(l).find(d => d.move === 'hold');
      if (hold && hold.x < Math.min(...marked.map(m => m.x))) marked.unshift(hold);
    }
    return marked;
  }
  const hints = (l as unknown as { hints?: { x: number; y: number; move: string }[] }).hints;
  if (Array.isArray(hints)) {
    return hints.filter(h => h && typeof h.x === 'number' && (h.move === 'hold' || h.move === 'double' || h.move === 'jump'))
      .map(h => ({ x: h.x, y: h.y, move: (h.move === 'jump' ? 'hold' : h.move) as PromptMove }));
  }
  return derived(l);
}

/** From the tiles: the first gap (hold Jump) and the first wide gap (double jump). */
function derived(l: Level): PromptSpot[] {
  const dir = (l as unknown as { goalDir?: number }).goalDir === -1 ? -1 : 1;
  const out: PromptSpot[] = [];
  let x = l.start.x;
  let lastTop = topRow(l, x);
  for (let i = 0; i < 80 && out.length < 2; i++, x += dir) {
    if (x < 0 || x >= l.cols) break;
    const t = topRow(l, x);
    if (t >= ROWS) {
      let w = 0;
      while (x + dir * w >= 0 && x + dir * w < l.cols && topRow(l, x + dir * w) >= ROWS) w++;
      const at = { x: x - dir + 0.5, y: lastTop };
      if (!out.some(o => o.move === 'hold')) out.push({ ...at, move: 'hold' });
      else if (w >= 5) out.push({ ...at, move: 'double' });
      x += dir * (w - 1);
      continue;
    }
    lastTop = t;
  }
  return out;
}
