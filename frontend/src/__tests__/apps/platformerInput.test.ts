import { describe, it, expect } from 'vitest';
import { emptyFrame, readInto, releaseAll } from '@/components/apps/games/platformer/input/frame';
import { createKeyboard } from '@/components/apps/games/platformer/input/keyboard';

describe('input frame: one frame per step from every adapter', () => {
  it('merges adapters: moves add up and clamp, holds and presses are any', () => {
    const keys = emptyFrame(), thumbs = emptyFrame(), out = emptyFrame();
    keys.move = 1; thumbs.move = 0.6; thumbs.jumpHeld = true; keys.dashPressed = true;
    readInto(out, [keys, thumbs]);
    expect(out).toEqual({ move: 1, jumpHeld: true, jumpPressed: false, dashPressed: true, actionPressed: false });
  });

  it('opposite pushes cancel out', () => {
    const a = emptyFrame(), b = emptyFrame(), out = emptyFrame();
    a.move = 1; b.move = -1;
    expect(readInto(out, [a, b]).move).toBe(0);
  });

  it('a press is handed to exactly one step, even if the finger lifted before it', () => {
    const thumbs = emptyFrame(), out = emptyFrame();
    thumbs.jumpPressed = true; thumbs.jumpHeld = false;
    expect(readInto(out, [thumbs]).jumpPressed).toBe(true);
    expect(readInto(out, [thumbs]).jumpPressed).toBe(false);
  });

  it('holds stay held across steps until the adapter lets go', () => {
    const thumbs = emptyFrame(), out = emptyFrame();
    thumbs.move = -1; thumbs.jumpHeld = true;
    readInto(out, [thumbs]);
    expect(readInto(out, [thumbs])).toMatchObject({ move: -1, jumpHeld: true });
  });

  it('releaseAll drops holds and pending presses (pause, blur)', () => {
    const f = { move: 1, jumpHeld: true, jumpPressed: true, dashPressed: true, actionPressed: true };
    releaseAll(f);
    expect(f).toEqual(emptyFrame());
  });
});

describe('keyboard adapter', () => {
  it('arrows and A D run, both at once stand still', () => {
    const k = createKeyboard();
    k.down('ArrowRight');
    expect(k.frame.move).toBe(1);
    k.down('a');
    expect(k.frame.move).toBe(0);
    k.up('ArrowRight');
    expect(k.frame.move).toBe(-1);
    k.up('a');
    expect(k.frame.move).toBe(0);
  });

  it('releasing one of two keys for the same side keeps running', () => {
    const k = createKeyboard();
    k.down('ArrowLeft'); k.down('A');
    k.up('ArrowLeft');
    expect(k.frame.move).toBe(-1);
  });

  it('Space, W and Up jump: a press edge and a hold; key repeat is not a new press', () => {
    for (const key of [' ', 'w', 'W', 'ArrowUp']) {
      const k = createKeyboard();
      k.down(key);
      expect(k.frame).toMatchObject({ jumpPressed: true, jumpHeld: true });
      k.frame.jumpPressed = false; // a step consumed it
      k.down(key, true);
      expect(k.frame.jumpPressed).toBe(false);
      k.up(key);
      expect(k.frame.jumpHeld).toBe(false);
    }
  });

  it('Shift or X dashes, Z or C is the action, each an edge only', () => {
    for (const key of ['Shift', 'x', 'X']) {
      const k = createKeyboard();
      k.down(key);
      expect(k.frame.dashPressed).toBe(true);
      expect(k.frame.jumpHeld).toBe(false);
    }
    for (const key of ['z', 'Z', 'c', 'C']) {
      const k = createKeyboard();
      k.down(key);
      expect(k.frame.actionPressed).toBe(true);
    }
  });

  it('says which keys it handled, so the view can stop the page scrolling', () => {
    const k = createKeyboard();
    expect(k.down('ArrowDown')).toBe(true);
    expect(k.down('ArrowRight')).toBe(true);
    expect(k.down('q')).toBe(false);
    expect(k.down('p')).toBe(false); // pause stays in the view
    expect(k.down('Escape')).toBe(false);
  });

  it('a letter pressed with Shift and released without it does not stick', () => {
    const k = createKeyboard();
    k.down('Shift'); k.down('D');
    k.up('Shift'); k.up('d');
    expect(k.frame.move).toBe(0);
  });

  it('reset lets go of everything (focus left the game)', () => {
    const k = createKeyboard();
    k.down('ArrowRight'); k.down(' ');
    k.reset();
    expect(k.frame).toEqual(emptyFrame());
    k.up('ArrowRight');
    expect(k.frame.move).toBe(0);
  });
});
