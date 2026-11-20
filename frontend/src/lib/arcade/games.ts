/** The arcade games that have a leaderboard. */
export const GAMES = ['snake', 'platformer', 'stacker', 'merge'] as const;

export type GameId = (typeof GAMES)[number];

export function isGame(value: unknown): value is GameId {
  return typeof value === 'string' && (GAMES as readonly string[]).includes(value);
}
