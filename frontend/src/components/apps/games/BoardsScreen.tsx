'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Hairline } from '@/components/editorial';
import { BoardView } from './leaderboard/Leaderboard';
import { savedName, type ArcadeGame } from './leaderboard/api';
import { BOARD_GAMES } from './registry';

// One tab per board. Main Character has two: Story (the fixed levels) and
// Endless (seeded runs), so the two kinds of score never compete.
type Tab = { board: ArcadeGame; title: string };
const TABS: Tab[] = BOARD_GAMES.flatMap((g): Tab[] =>
  g.board === 'platformer'
    ? [{ board: g.board, title: g.title }, { board: 'endless', title: 'Endless' }]
    : [{ board: g.board, title: g.title }],
);

/** Every game's global leaderboard, one tab per game. */
export default function BoardsScreen({ onBack, initial = 'platformer' }: { onBack: () => void; initial?: ArcadeGame }) {
  const [game, setGame] = useState<ArcadeGame>(initial);
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={onBack} aria-label="Back to arcade" className="min-h-11 min-w-11 -ml-2 flex items-center justify-center text-text-secondary hover:text-text">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-text text-[22px] leading-tight">Leaderboards</h1>
      </div>
      <Hairline />
      <div role="tablist" aria-label="Game" className="flex gap-1 overflow-x-auto overscroll-contain px-3 py-2 [scrollbar-width:none]">
        {TABS.map(g => (
          <button
            key={g.board}
            role="tab"
            type="button"
            aria-selected={game === g.board}
            onClick={() => setGame(g.board)}
            className={`min-h-11 shrink-0 px-3 text-sm whitespace-nowrap transition-colors duration-150
                        ${game === g.board ? 'bg-text text-bg' : 'text-text-secondary hover:text-text'}`}
          >
            {g.title}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-6 pt-2">
        <BoardView key={game} game={game} name={savedName()} />
      </div>
    </div>
  );
}
