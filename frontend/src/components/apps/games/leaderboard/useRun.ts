'use client';

import { useCallback, useRef } from 'react';
import { startRun, type ArcadeGame } from './api';

/**
 * One leaderboard run per round. Call `begin()` when the round starts: it asks
 * the server for a signed start token in the background (the server times the
 * round from it). `token()` resolves to that token, or null when the board is
 * unreachable, by the time the round is over.
 */
export function useRun(game: ArcadeGame) {
  const pending = useRef<Promise<string | null> | null>(null);

  const begin = useCallback(() => {
    pending.current = startRun(game);
  }, [game]);

  const token = useCallback(async () => (pending.current ? pending.current : null), []);

  return { begin, token };
}
