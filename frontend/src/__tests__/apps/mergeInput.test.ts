import { describe, it, expect } from 'vitest';
import {
  SWIPE_PX, advancePacer, createPacer, gestureEnd, gestureMove, gestureStart, pushMove, startSlide, swipeDir,
  type Pacer,
} from '@/components/apps/games/merge/input';
import type { Dir } from '@/components/apps/games/merge/logic';

const SLIDE = 0.11;

/** Drive the pacer like the view does: input applies or queues, each applied move starts a slide. */
function harness() {
  let p: Pacer = createPacer();
  const applied: Dir[] = [];
  const apply = (d: Dir) => { applied.push(d); p = startSlide(p, SLIDE); };
  return {
    applied,
    input(d: Dir) { const r = pushMove(p, d); p = r.pacer; if (r.now) apply(r.now); },
    tick(dt: number) { const r = advancePacer(p, dt); p = r.pacer; if (r.now) apply(r.now); },
    get pacer() { return p; },
  };
}

describe('move queue during the slide animation', () => {
  it('applies a move at once when nothing is sliding', () => {
    expect(pushMove(createPacer(), 'left')).toEqual({ pacer: { busy: 0, pending: null }, now: 'left' });
  });

  it('holds a move that arrives mid slide instead of dropping it', () => {
    const h = harness();
    h.input('left');
    h.tick(0.03);
    h.input('up');
    expect(h.applied).toEqual(['left']);
    expect(h.pacer.pending).toBe('up');
  });

  it('applies the held move the moment the slide ends, not before', () => {
    const h = harness();
    h.input('left');
    h.input('up');
    h.tick(0.1);
    expect(h.applied).toEqual(['left']);
    h.tick(0.02);
    expect(h.applied).toEqual(['left', 'up']);
  });

  it('queues at most one move: the latest wins', () => {
    const h = harness();
    h.input('left');
    h.input('up');
    h.input('right');
    h.tick(0.2);
    expect(h.applied).toEqual(['left', 'right']);
  });

  it('chains: a move queued during the second slide waits for that slide', () => {
    const h = harness();
    h.input('left');
    h.input('up');
    h.tick(0.12); // up applies, a new slide starts
    h.input('down');
    h.tick(0.05);
    expect(h.applied).toEqual(['left', 'up']);
    h.tick(0.07);
    expect(h.applied).toEqual(['left', 'up', 'down']);
  });

  it('does nothing when idle with nothing queued', () => {
    const p = createPacer();
    expect(advancePacer(p, 1)).toEqual({ pacer: p, now: null });
  });

  it('a zero length slide (reduced motion) never blocks input', () => {
    let p = startSlide(createPacer(), 0);
    const r = pushMove(p, 'down');
    p = r.pacer;
    expect(r.now).toBe('down');
  });
});

describe('swipe direction', () => {
  it('ignores drags shorter than 24px', () => {
    expect(SWIPE_PX).toBe(24);
    expect(swipeDir(23, 0)).toBeNull();
    expect(swipeDir(-10, 20)).toBeNull();
  });

  it('reads the dominant axis', () => {
    expect(swipeDir(-30, 5)).toBe('left');
    expect(swipeDir(30, -20)).toBe('right');
    expect(swipeDir(4, -24)).toBe('up');
    expect(swipeDir(-20, 40)).toBe('down');
  });
});

describe('one move per gesture', () => {
  it('fires once the finger passes 24px and ignores the rest of the drag', () => {
    let g = gestureStart(null, 1, 100, 100);
    let r = gestureMove(g, 1, 112, 101); g = r.gesture!;
    expect(r.fire).toBeNull();
    r = gestureMove(g, 1, 126, 102); g = r.gesture!;
    expect(r.fire).toBe('right');
    r = gestureMove(g, 1, 126, 200); g = r.gesture!;
    expect(r.fire).toBeNull();
    const end = gestureEnd(g, 1, 126, 260);
    expect(end.fire).toBeNull();
    expect(end.gesture).toBeNull();
  });

  it('a fast flick with no move past the threshold fires on lift', () => {
    const g = gestureStart(null, 7, 50, 300);
    expect(gestureEnd(g, 7, 50, 220).fire).toBe('up');
  });

  it('a tap does not move', () => {
    const g = gestureStart(null, 7, 50, 300);
    expect(gestureEnd(g, 7, 53, 302).fire).toBeNull();
  });

  it('a second finger does not start a new gesture or steal the first', () => {
    const g = gestureStart(null, 1, 0, 0);
    expect(gestureStart(g, 2, 300, 300)).toBe(g);
    expect(gestureMove(g, 2, 400, 300).fire).toBeNull();
    expect(gestureMove(g, 1, 0, 40).fire).toBe('down');
  });
});
