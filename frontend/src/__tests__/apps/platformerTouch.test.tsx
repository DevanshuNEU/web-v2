// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { emptyFrame } from '@/components/apps/games/platformer/input/frame';
import { TouchDeck } from '@/components/apps/games/platformer/input/TouchDeck';
import { TouchOverlay, moveFromOffset } from '@/components/apps/games/platformer/input/TouchOverlay';

const rect = (left: number, width: number) => () =>
  ({ left, width, top: 0, height: 80, right: left + width, bottom: 80, x: left, y: 0, toJSON: () => ({}) });

describe('portrait touch deck adapter', () => {
  it('has Run left, Run right, Jump and Dash, all thumb sized', () => {
    render(<TouchDeck input={emptyFrame()} mono={false} />);
    for (const name of ['Run left', 'Run right', 'Jump', 'Dash']) {
      const b = screen.getByRole('button', { name });
      expect(parseInt(b.style.width, 10)).toBeGreaterThanOrEqual(64);
    }
  });

  it('the run pad holds move while a thumb is down and follows it across without lifting', () => {
    const f = emptyFrame();
    render(<TouchDeck input={f} mono={false} />);
    const left = screen.getByRole('button', { name: 'Run left' });
    const pad = left.parentElement!;
    pad.getBoundingClientRect = rect(0, 160);
    fireEvent.pointerDown(left, { pointerId: 5, clientX: 30 });
    expect(f.move).toBe(-1);
    fireEvent.pointerMove(pad, { pointerId: 5, clientX: 130 });
    expect(f.move).toBe(1);
    fireEvent.pointerUp(pad, { pointerId: 5 });
    expect(f.move).toBe(0);
  });

  it('Jump is a press edge plus a hold, released on lift', () => {
    const f = emptyFrame();
    render(<TouchDeck input={f} mono={false} />);
    const jump = screen.getByRole('button', { name: 'Jump' });
    fireEvent.pointerDown(jump, { pointerId: 2 });
    expect(f).toMatchObject({ jumpPressed: true, jumpHeld: true });
    fireEvent.pointerUp(jump, { pointerId: 2 });
    expect(f.jumpHeld).toBe(false);
  });

  it('Dash is a press edge', () => {
    const f = emptyFrame();
    render(<TouchDeck input={f} mono={false} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Dash' }), { pointerId: 3 });
    expect(f.dashPressed).toBe(true);
  });

  it('multitouch: running right and jumping at once both land in the frame', () => {
    const f = emptyFrame();
    render(<TouchDeck input={f} mono={false} />);
    const right = screen.getByRole('button', { name: 'Run right' });
    right.parentElement!.getBoundingClientRect = rect(0, 160);
    fireEvent.pointerDown(right, { pointerId: 1, clientX: 140 });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Jump' }), { pointerId: 2 });
    expect(f).toMatchObject({ move: 1, jumpHeld: true, jumpPressed: true });
  });
});

describe('landscape thumb overlay adapter', () => {
  it('maps the thumb offset to move: 10 px dead zone, full at 40 px', () => {
    expect(moveFromOffset(0)).toBe(0);
    expect(moveFromOffset(10)).toBe(0);
    expect(moveFromOffset(-9)).toBe(0);
    expect(moveFromOffset(25)).toBeCloseTo(0.5);
    expect(moveFromOffset(-25)).toBeCloseTo(-0.5);
    expect(moveFromOffset(40)).toBe(1);
    expect(moveFromOffset(-120)).toBe(-1);
  });

  it('the left zone covers 45 percent of the screen', () => {
    render(<TouchOverlay input={emptyFrame()} mono={false} />);
    expect(screen.getByTestId('move-zone').style.width).toBe('45%');
  });

  it('move comes from where the thumb landed, not where on the screen it is', () => {
    const f = emptyFrame();
    render(<TouchOverlay input={f} mono={false} />);
    const zone = screen.getByTestId('move-zone');
    fireEvent.pointerDown(zone, { pointerId: 7, clientX: 200 });
    expect(f.move).toBe(0);
    fireEvent.pointerMove(zone, { pointerId: 7, clientX: 225 });
    expect(f.move).toBeCloseTo(0.5);
    fireEvent.pointerMove(zone, { pointerId: 7, clientX: 195 });
    expect(f.move).toBe(0);
    fireEvent.pointerMove(zone, { pointerId: 7, clientX: 150 });
    expect(f.move).toBe(-1);
    fireEvent.pointerUp(zone, { pointerId: 7 });
    expect(f.move).toBe(0);
  });

  it('past full the anchor follows the thumb, so turning back is quick', () => {
    const f = emptyFrame();
    render(<TouchOverlay input={f} mono={false} />);
    const zone = screen.getByTestId('move-zone');
    fireEvent.pointerDown(zone, { pointerId: 7, clientX: 100 });
    fireEvent.pointerMove(zone, { pointerId: 7, clientX: 260 });
    expect(f.move).toBe(1);
    // 60 px back from the far point already runs left (a fixed anchor would still be 100 px right).
    fireEvent.pointerMove(zone, { pointerId: 7, clientX: 200 });
    expect(f.move).toBeCloseTo(-1 / 3);
  });

  it('a cancelled touch lets go', () => {
    const f = emptyFrame();
    render(<TouchOverlay input={f} mono={false} />);
    const zone = screen.getByTestId('move-zone');
    fireEvent.pointerDown(zone, { pointerId: 7, clientX: 100 });
    fireEvent.pointerMove(zone, { pointerId: 7, clientX: 160 });
    fireEvent.pointerCancel(zone, { pointerId: 7 });
    expect(f.move).toBe(0);
  });

  it('Jump, Dash and Action are named and at least 64 px', () => {
    render(<TouchOverlay input={emptyFrame()} mono={false} />);
    for (const name of ['Jump', 'Dash', 'Action']) {
      const b = screen.getByRole('button', { name });
      expect(parseInt(b.style.width, 10)).toBeGreaterThanOrEqual(64);
    }
    expect(parseInt(screen.getByRole('button', { name: 'Jump' }).style.width, 10))
      .toBeGreaterThan(parseInt(screen.getByRole('button', { name: 'Dash' }).style.width, 10));
  });

  it('multitouch: a thumb in the zone and one on Jump, Dash and Action all reach the frame', () => {
    const f = emptyFrame();
    render(<TouchOverlay input={f} mono={false} />);
    const zone = screen.getByTestId('move-zone');
    fireEvent.pointerDown(zone, { pointerId: 1, clientX: 100 });
    fireEvent.pointerMove(zone, { pointerId: 1, clientX: 150 });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Jump' }), { pointerId: 2 });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Dash' }), { pointerId: 3 });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Action' }), { pointerId: 4 });
    expect(f).toEqual({ move: 1, jumpHeld: true, jumpPressed: true, dashPressed: true, actionPressed: true });
    fireEvent.pointerUp(screen.getByRole('button', { name: 'Jump' }), { pointerId: 2 });
    expect(f.jumpHeld).toBe(false);
    expect(f.move).toBe(1);
  });
});

describe('touch adapters when the browser refuses pointer capture', () => {
  const real = HTMLElement.prototype.setPointerCapture;
  afterEach(() => { HTMLElement.prototype.setPointerCapture = real; });
  const refuse = () => {
    HTMLElement.prototype.setPointerCapture = () => { throw new DOMException('No active pointer', 'NotFoundError'); };
  };

  it('the overlay zone still tracks the thumb', () => {
    refuse();
    const f = emptyFrame();
    render(<TouchOverlay input={f} mono={false} />);
    const zone = screen.getByTestId('move-zone');
    fireEvent.pointerDown(zone, { pointerId: 9, clientX: 100 });
    fireEvent.pointerMove(zone, { pointerId: 9, clientX: 160 });
    expect(f.move).toBe(1);
  });

  it('the deck run pad still runs', () => {
    refuse();
    const f = emptyFrame();
    render(<TouchDeck input={f} mono={false} />);
    const right = screen.getByRole('button', { name: 'Run right' });
    right.parentElement!.getBoundingClientRect = rect(0, 160);
    fireEvent.pointerDown(right, { pointerId: 9, clientX: 140 });
    expect(f.move).toBe(1);
  });
});
