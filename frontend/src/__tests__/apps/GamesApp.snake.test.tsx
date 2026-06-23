// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GamesApp from '@/components/apps/GamesApp';

/**
 * Snake gained touch controls (swipe + on-screen D-pad) so it's playable on a
 * phone. This asserts the D-pad renders and the controls hint reflects touch.
 * jsdom has no canvas, so stub a minimal 2D context the draw loop calls.
 */

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillStyle: '',
    strokeStyle: '',
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe('Snake — mobile touch controls', () => {
  it('renders the on-screen D-pad and the touch hint in the mobile variant', async () => {
    render(<GamesApp variant="mobile" />);
    await userEvent.click(screen.getByText('Snake'));

    expect(screen.getByLabelText('Move up')).toBeInTheDocument();
    expect(screen.getByLabelText('Move left')).toBeInTheDocument();
    expect(screen.getByLabelText('Move down')).toBeInTheDocument();
    expect(screen.getByLabelText('Move right')).toBeInTheDocument();
    // Mobile variant shows the touch hint, never the keyboard "P pause" / WASD text.
    expect(screen.getByText(/swipe or tap the controls/i)).toBeInTheDocument();
  });

  it('shows keyboard hints (not touch) in the desktop variant', async () => {
    render(<GamesApp variant="desktop" />);
    await userEvent.click(screen.getByText('Snake'));
    expect(screen.getByText(/arrow keys \/ wasd/i)).toBeInTheDocument();
  });
});
