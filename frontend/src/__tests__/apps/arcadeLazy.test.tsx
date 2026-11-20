// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Each game module records when it is first evaluated. With React.lazy that
// happens when the visitor picks the game, never when the launcher opens.
const { loaded, stub } = vi.hoisted(() => {
  const loaded = new Set<string>();
  const stub = (id: string, title: string) => {
    loaded.add(id);
    return { default: ({ onBack }: { onBack: () => void }) => <div><h2>{title} stub</h2><button onClick={onBack}>Back to arcade</button></div> };
  };
  return { loaded, stub };
});
vi.mock('@/components/apps/games/platformer/PlatformerGame', () => stub('platformer', 'Platformer'));
vi.mock('@/components/apps/games/snake/SnakeGame', () => stub('snake', 'Snake'));
vi.mock('@/components/apps/games/stacker/StackerGame', () => stub('stacker', 'Stacker'));
vi.mock('@/components/apps/games/merge/MergeGame', () => stub('merge', 'Merge'));
vi.mock('@/components/apps/games/tetris/TetrisGame', () => stub('tetris', 'Tetris'));
vi.mock('@/components/apps/games/typeracer/TypeRacerGame', () => stub('typeracer', 'Type Racer'));

import GamesApp from '@/components/apps/GamesApp';

describe('arcade lazy loading', () => {
  it('opening the launcher loads no game; picking one loads only that one', async () => {
    render(<GamesApp variant="mobile" />);
    expect(screen.getAllByTestId('index-row')).toHaveLength(6);
    expect([...loaded]).toEqual([]);
    await userEvent.click(screen.getByText('Sigma Snake'));
    expect(await screen.findByRole('heading', { name: 'Snake stub' })).toBeInTheDocument();
    expect([...loaded]).toEqual(['snake']);
    await userEvent.click(screen.getByRole('button', { name: 'Back to arcade' }));
    await userEvent.click(await screen.findByText('Main Character'));
    expect(await screen.findByRole('heading', { name: 'Platformer stub' })).toBeInTheDocument();
    expect([...loaded].sort()).toEqual(['platformer', 'snake']);
  });
});
