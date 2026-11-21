/**
 * The input seam. Every adapter (keyboard, the portrait touch deck, the
 * landscape thumb overlay) reduces what the player did to one InputFrame per
 * fixed step, and the sim reads nothing else. Tests drive the sim with frames
 * the same way the game does.
 *
 * `move` is analog, -1 (full left) to 1 (full right). `jumpHeld` is the hold
 * that keeps a jump rising. The three `...Pressed` fields are edges: true on
 * exactly one step after a press. The sim consumes them (sets them false), so
 * a frame held across several steps presses once.
 */
export interface InputFrame {
  move: number;
  jumpHeld: boolean;
  jumpPressed: boolean;
  dashPressed: boolean;
  actionPressed: boolean;
}

export function emptyFrame(): InputFrame {
  return { move: 0, jumpHeld: false, jumpPressed: false, dashPressed: false, actionPressed: false };
}

/** Clear the one-step edges once a step has seen them. */
export function consumeEdges(f: InputFrame) {
  f.jumpPressed = false;
  f.dashPressed = false;
  f.actionPressed = false;
}

/**
 * Build this step's frame from every adapter's latch. Moves add up and clamp
 * (keyboard right plus a thumb left stands still), holds and presses are any.
 * Each source's presses are handed over here, so a press reaches exactly one
 * step even when the finger lifted before it. Writes into `out`, no allocation.
 */
export function readInto(out: InputFrame, sources: readonly InputFrame[]): InputFrame {
  let move = 0;
  out.jumpHeld = false; out.jumpPressed = false; out.dashPressed = false; out.actionPressed = false;
  for (const s of sources) {
    move += s.move;
    if (s.jumpHeld) out.jumpHeld = true;
    if (s.jumpPressed) out.jumpPressed = true;
    if (s.dashPressed) out.dashPressed = true;
    if (s.actionPressed) out.actionPressed = true;
    consumeEdges(s);
  }
  out.move = Math.max(-1, Math.min(1, move));
  return out;
}

/** Let go of everything: pause, blur, a new round. */
export function releaseAll(f: InputFrame) {
  f.move = 0;
  f.jumpHeld = false;
  consumeEdges(f);
}

/**
 * Capture a pointer if the browser allows it. Capture keeps a sliding thumb
 * reporting to its control, but a refusal (a pointer that already lifted, an
 * embedded view) must never cost the press itself.
 */
export function tryCapture(el: Element | null, pointerId: number) {
  try { el?.setPointerCapture?.(pointerId); } catch { /* keep the press without capture */ }
}
