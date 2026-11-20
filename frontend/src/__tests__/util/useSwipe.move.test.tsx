// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useSwipe, type SwipeDirection } from '@/hooks/useSwipe';

function Pad({ onSwipe, fireOnMove }: { onSwipe: (d: SwipeDirection) => void; fireOnMove?: boolean }) {
  const swipe = useSwipe({ onSwipe, fireOnMove, threshold: 24 });
  return <div data-testid="pad" {...swipe} />;
}

describe('useSwipe fireOnMove', () => {
  it('fires while the finger is still down, then re-anchors so turns chain', () => {
    const onSwipe = vi.fn();
    render(<Pad onSwipe={onSwipe} fireOnMove />);
    const pad = screen.getByTestId('pad');
    fireEvent.pointerDown(pad, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(pad, { clientX: 100, clientY: 70 });
    expect(onSwipe).toHaveBeenLastCalledWith('up', expect.anything());
    fireEvent.pointerMove(pad, { clientX: 70, clientY: 70 });
    expect(onSwipe).toHaveBeenLastCalledWith('left', expect.anything());
    fireEvent.pointerUp(pad, { clientX: 70, clientY: 70 });
    expect(onSwipe).toHaveBeenCalledTimes(2);
  });

  it('keeps the old lift-to-fire behaviour by default', () => {
    const onSwipe = vi.fn();
    render(<Pad onSwipe={onSwipe} />);
    const pad = screen.getByTestId('pad');
    fireEvent.pointerDown(pad, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(pad, { clientX: 100, clientY: 50 });
    expect(onSwipe).not.toHaveBeenCalled();
    fireEvent.pointerUp(pad, { clientX: 100, clientY: 50 });
    expect(onSwipe).toHaveBeenCalledWith('up', expect.anything());
  });
});
