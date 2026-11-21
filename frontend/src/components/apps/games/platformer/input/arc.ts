/**
 * Where the right thumb's buttons sit. Jump is the largest, in the corner;
 * Attack to its left; Dash above it, each nudged along the arc the thumb
 * sweeps. Rects are hit areas (larger than the drawn buttons) and never
 * overlap. A left-handed layout mirrors it.
 */

export const JUMP_HIT = 88;
export const ARC_MIN = 64;
const GAP = 8;

export interface Rect { x: number; y: number; w: number; h: number }
export interface ArcLayout { w: number; h: number; jump: Rect; attack: Rect | null; dash: Rect | null }
export interface Owned { attack?: boolean; dash?: boolean }

export function arcLayout(hand: 'right' | 'left', owned: Owned): ArcLayout {
  const J = JUMP_HIT, A = ARC_MIN;
  const w = J + (owned.attack ? GAP + A : 0);
  const h = J + (owned.dash ? GAP + A : 0);
  let jump: Rect = { x: w - J, y: h - J, w: J, h: J };
  // Attack rides up the arc a little; Dash leans in towards the palm.
  let attack: Rect | null = owned.attack ? { x: w - J - GAP - A, y: h - A - 10, w: A, h: A } : null;
  let dash: Rect | null = owned.dash ? { x: w - A - 6, y: h - J - GAP - A, w: A, h: A } : null;
  if (hand === 'left') {
    const flip = (r: Rect): Rect => ({ ...r, x: w - r.x - r.w });
    jump = flip(jump);
    attack = attack && flip(attack);
    dash = dash && flip(dash);
  }
  return { w, h, jump, attack, dash };
}
