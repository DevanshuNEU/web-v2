// @vitest-environment jsdom

// A game takes keyboard focus so the arrows and Space work; the site's
// accent focus ring would then frame the whole game while it is played.
// Every game root opts out of it (its buttons keep their own rings).

import '../setup/dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { stubCanvas } from '../setup/canvas';
import PlatformerGame from '@/components/apps/games/platformer/PlatformerGame';
import SnakeGame from '@/components/apps/games/snake/SnakeGame';
import StackerGame from '@/components/apps/games/stacker/StackerGame';
import TetrisGame from '@/components/apps/games/tetris/TetrisGame';

beforeEach(() => {
  stubCanvas();
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ all: [], week: [], me: null }) })));
});

describe('game roots do not draw the site focus ring while played', () => {
  it.each([
    ['platformer-root', PlatformerGame],
    ['snake-root', SnakeGame],
    ['stacker-root', StackerGame],
    ['tetris-root', TetrisGame],
  ] as const)('%s opts out of the ring', (id, Game) => {
    const { getByTestId } = render(<Game onBack={() => {}} isMobile={false} />);
    expect(getByTestId(id)).toHaveAttribute('data-no-focus-ring');
  });
});
