// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { StoryMap } from '@/components/apps/games/platformer/ui/StoryMap';
import { RELEASED_CHAPTERS, released } from '@/components/apps/games/platformer/ui/release';
import { STORY } from '@/components/apps/games/platformer/sim/story';
import type { Progress } from '@/components/apps/games/platformer/ui/progress';

const cleared = (ids: string[]): Progress => ({
  levels: Object.fromEntries(ids.map(id => [id, { best: 90, memories: [] }])),
  memories: [], abilities: { wallJump: true, dash: false, blade: true }, powersSeen: [],
} as unknown as Progress);

describe('released chapters', () => {
  it('ship chapters 1 to 3; later chapters wait even when their levels are built', () => {
    expect(RELEASED_CHAPTERS).toBe(3);
    expect(STORY.filter(released).map(e => e.id)).toEqual(['1-1', '1-2', '1-3', '2-1', '2-2', '3-1', '3-2', '3-3']);
  });

  it('the map marks chapter 4 onward Coming soon, and 4-1 is not playable after 3-3', () => {
    render(<StoryMap progress={cleared(['1-1', '1-2', '1-3', '2-1', '2-2', '3-1', '3-2', '3-3'])} onPlay={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Level 3-3/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Level 4-1/ })).toBeNull();
    const soon = screen.getAllByText('Coming soon');
    expect(soon.length).toBe(new Set(STORY.filter(e => e.world > 3).map(e => e.world)).size);
    expect(within(screen.getByTestId('chapter-4')).getByText('Coming soon')).toBeInTheDocument();
    expect(within(screen.getByTestId('chapter-3')).queryByText('Coming soon')).toBeNull();
  });
});

describe('level tags on the map', () => {
  it('show Boss and Finale instead of raw ids', async () => {
    const { levelTag } = await import('@/components/apps/games/platformer/ui/StoryMap');
    expect(levelTag('2-1')).toBe('2-1');
    expect(levelTag('4-boss')).toBe('Boss');
    expect(levelTag('season-boss')).toBe('Finale');
  });
});
