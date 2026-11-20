// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { arcLayout, ARC_MIN, JUMP_HIT, type Rect } from '@/components/apps/games/platformer/input/arc';
import { loadControls, saveControls, CONTROLS_KEY, DEFAULT_CONTROLS } from '@/components/apps/games/platformer/ui/controls';
import { TouchDeck } from '@/components/apps/games/platformer/input/TouchDeck';
import { TouchOverlay } from '@/components/apps/games/platformer/input/TouchOverlay';
import { createKeyboard } from '@/components/apps/games/platformer/input/keyboard';
import { keyboardHint } from '@/components/apps/games/platformer/input/hints';
import { emptyFrame } from '@/components/apps/games/platformer/input/frame';

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

beforeEach(() => { localStorage.clear(); });

describe('the right-thumb arc', () => {
  it('Jump is the largest, in the corner; Attack to its left; Dash above it', () => {
    const l = arcLayout('right', { attack: true, dash: true });
    expect(l.jump.w).toBeGreaterThanOrEqual(JUMP_HIT);
    expect(JUMP_HIT).toBeGreaterThanOrEqual(88);
    for (const r of [l.attack!, l.dash!]) expect(Math.min(r.w, r.h)).toBeGreaterThanOrEqual(ARC_MIN);
    expect(ARC_MIN).toBeGreaterThanOrEqual(64);
    // corner: Jump touches the right and bottom edges of the arc box
    expect(l.jump.x + l.jump.w).toBe(l.w);
    expect(l.jump.y + l.jump.h).toBe(l.h);
    expect(l.attack!.x + l.attack!.w).toBeLessThanOrEqual(l.jump.x);
    expect(l.dash!.y + l.dash!.h).toBeLessThanOrEqual(l.jump.y);
  });

  it('hit areas never overlap', () => {
    for (const hand of ['right', 'left'] as const) {
      const l = arcLayout(hand, { attack: true, dash: true });
      const all = [l.jump, l.attack!, l.dash!];
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(overlaps(all[i], all[j])).toBe(false);
    }
  });

  it('left-handed mirrors the arc: Jump in the left corner, Attack to its right', () => {
    const l = arcLayout('left', { attack: true, dash: false });
    expect(l.jump.x).toBe(0);
    expect(l.attack!.x).toBeGreaterThanOrEqual(l.jump.x + l.jump.w);
    expect(l.dash).toBeNull();
  });
});

describe('controls settings, per device', () => {
  it('defaults when nothing or junk is stored', () => {
    expect(loadControls()).toEqual(DEFAULT_CONTROLS);
    localStorage.setItem(CONTROLS_KEY, '{nope');
    expect(loadControls()).toEqual(DEFAULT_CONTROLS);
    localStorage.setItem(CONTROLS_KEY, JSON.stringify({ v: 1, swap: 'yes', opacity: 7, haptics: 0 }));
    const c = loadControls();
    expect(c.swap).toBe(false);
    expect(c.opacity).toBeLessThanOrEqual(1);
    expect(c.haptics).toBe(DEFAULT_CONTROLS.haptics);
  });

  it('saves and loads back', () => {
    saveControls({ ...DEFAULT_CONTROLS, swap: true, opacity: 0.5, haptics: false, seenIntro: true });
    expect(loadControls()).toEqual({ ...DEFAULT_CONTROLS, swap: true, opacity: 0.5, haptics: false, seenIntro: true });
  });
});

describe('touch controls', () => {
  it('no Attack or Dash until owned; Jump always', () => {
    const { rerender } = render(<TouchDeck input={emptyFrame()} mono={false} />);
    expect(screen.queryByRole('button', { name: 'Attack' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dash' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jump' })).toBeInTheDocument();
    rerender(<TouchDeck input={emptyFrame()} mono={false} owned={{ attack: true, dash: true }} />);
    expect(screen.getByRole('button', { name: 'Attack' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dash' })).toBeInTheDocument();
  });

  it('the hit area is larger than the drawn button', () => {
    render(<TouchDeck input={emptyFrame()} mono={false} owned={{ attack: true, dash: true }} />);
    const jump = screen.getByRole('button', { name: 'Jump' });
    expect(parseInt(jump.style.width, 10)).toBeGreaterThanOrEqual(88);
    const face = jump.querySelector('[data-face]') as HTMLElement;
    expect(parseInt(face.style.width, 10)).toBeLessThan(parseInt(jump.style.width, 10));
  });

  it('Attack writes the action press; the overlay has the same arc', () => {
    const f = emptyFrame();
    render(<TouchOverlay input={f} mono={false} owned={{ attack: true, dash: false }} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Attack' }), { pointerId: 3 });
    expect(f.actionPressed).toBe(true);
    expect(screen.queryByRole('button', { name: 'Dash' })).not.toBeInTheDocument();
  });

  it('a press buzzes where vibration exists, unless haptics are off', () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
    const { unmount } = render(<TouchDeck input={emptyFrame()} mono={false} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Jump' }), { pointerId: 1 });
    expect(vibrate).toHaveBeenCalled();
    unmount();
    vibrate.mockClear();
    render(<TouchDeck input={emptyFrame()} mono={false} haptics={false} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Jump' }), { pointerId: 2 });
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('the first-run labels sit on the real buttons and go once she plays', () => {
    const played = vi.fn();
    render(<TouchDeck input={emptyFrame()} mono={false} intro onPlayed={played} />);
    expect(screen.getByText('Move')).toBeInTheDocument();
    expect(screen.getByText(/tap again to double jump/i)).toBeInTheDocument();
    act(() => { fireEvent.pointerDown(screen.getByRole('button', { name: 'Jump' }), { pointerId: 1 }); });
    expect(played).toHaveBeenCalled();
  });

  it('swapped sides put the arc on the left', () => {
    render(<TouchDeck input={emptyFrame()} mono={false} swap />);
    expect(screen.getByTestId('thumb-arc').dataset.hand).toBe('left');
  });
});

describe('keyboard', () => {
  it('Z or J attack, X, K or Shift dash', () => {
    const k = createKeyboard();
    k.down('j');
    expect(k.frame.actionPressed).toBe(true);
    k.down('k');
    expect(k.frame.dashPressed).toBe(true);
  });

  it('the hint names only the moves she has', () => {
    expect(keyboardHint({ attack: false, dash: false })).toBe('Arrows to run. Space to jump, again in the air to double jump. P pauses.');
    expect(keyboardHint({ attack: true, dash: true })).toBe('Arrows to run. Space to jump, again in the air to double jump. Z to attack, X to dash. P pauses.');
    expect(keyboardHint({ attack: true, dash: false })).toBe('Arrows to run. Space to jump, again in the air to double jump. Z to attack. P pauses.');
  });
});
