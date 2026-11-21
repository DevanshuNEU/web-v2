import { NextResponse } from 'next/server';
import type { ArcadeError, Result } from './service';

const NO_STORE = { 'Cache-Control': 'no-store' };

export function errorResponse(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status, headers: NO_STORE });
}

export function toResponse<T>(result: Result<T>): NextResponse {
  if (!result.ok) {
    const e = result as ArcadeError;
    return errorResponse(e.status, e.code, e.message);
  }
  return NextResponse.json(result.data, { headers: NO_STORE });
}

/**
 * Parse a JSON object body, or null when it is missing or not an object.
 * Routes treat null as an empty body, so the first field check names the
 * problem (bad_game, bad_token) instead of a generic parse error.
 */
export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function serverError(err: unknown): NextResponse {
  console.error('Arcade leaderboard failed:', err);
  return errorResponse(
    503,
    'unavailable',
    'The leaderboard could not reach its storage. Try again in a minute.',
  );
}
