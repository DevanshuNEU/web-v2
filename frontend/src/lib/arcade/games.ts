/** The arcade games that have a leaderboard. */
// 'platformer' is Main Character's Story mode (fixed levels); 'endless' is
// its seeded Endless mode, on its own board so the two never compete.
export const GAMES = ['snake', 'platformer', 'stacker', 'endless'] as const;

export type GameId = (typeof GAMES)[number];

export function isGame(value: unknown): value is GameId {
  return typeof value === 'string' && (GAMES as readonly string[]).includes(value);
}
