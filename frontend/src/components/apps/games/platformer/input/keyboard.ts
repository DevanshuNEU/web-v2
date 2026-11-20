/**
 * Keyboard adapter: key names in, an InputFrame latch out. No DOM, so it is
 * tested with plain key strings; the view forwards keydown and keyup while
 * its root has focus. Pause keys (P, Escape) stay in the view.
 */

import { emptyFrame, releaseAll, type InputFrame } from './frame';

// Letters are matched lower case: with Shift held, D goes down as 'D' and
// can come up as 'd', and it must still let go.
const LEFT = new Set(['ArrowLeft', 'a']);
const RIGHT = new Set(['ArrowRight', 'd']);
const JUMP = new Set([' ', 'w', 'ArrowUp']);
const DASH = new Set(['Shift', 'x']);
const ACTION = new Set(['z', 'c']);

const norm = (key: string) => (key.length === 1 ? key.toLowerCase() : key);
/** Handled so the page does not scroll, with no rule yet. */
const QUIET = new Set(['ArrowDown']);

export interface Keyboard {
  frame: InputFrame;
  /** True when the key belongs to the game (prevent its default). */
  down(key: string, repeat?: boolean): boolean;
  up(key: string): boolean;
  reset(): void;
}

export function createKeyboard(): Keyboard {
  const frame = emptyFrame();
  // Held keys per side, so releasing ArrowLeft while A is still down keeps running.
  const left = new Set<string>();
  const right = new Set<string>();
  const jump = new Set<string>();

  const publish = () => {
    frame.move = (right.size ? 1 : 0) - (left.size ? 1 : 0);
    frame.jumpHeld = jump.size > 0;
  };

  return {
    frame,
    down(raw, repeat = false) {
      const key = norm(raw);
      if (LEFT.has(key)) left.add(key);
      else if (RIGHT.has(key)) right.add(key);
      else if (JUMP.has(key)) { jump.add(key); if (!repeat) frame.jumpPressed = true; }
      else if (DASH.has(key)) { if (!repeat) frame.dashPressed = true; }
      else if (ACTION.has(key)) { if (!repeat) frame.actionPressed = true; }
      else return QUIET.has(key);
      publish();
      return true;
    },
    up(raw) {
      const key = norm(raw);
      const had = left.delete(key) || right.delete(key) || jump.delete(key);
      publish();
      return had;
    },
    reset() {
      left.clear(); right.clear(); jump.clear();
      releaseAll(frame);
    },
  };
}
