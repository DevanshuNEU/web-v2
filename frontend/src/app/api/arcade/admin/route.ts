import type { NextRequest } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { removeEntry } from '@/lib/arcade/service';
import { errorResponse, readJson, serverError, toResponse } from '@/lib/arcade/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Hash both sides so the comparison is constant time whatever the lengths.
function sameToken(given: string, expected: string): boolean {
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function DELETE(req: NextRequest) {
  const adminToken = process.env.ARCADE_ADMIN_TOKEN;
  if (!adminToken) {
    return errorResponse(404, 'not_found', 'This route is turned off. Set ARCADE_ADMIN_TOKEN to turn it on.');
  }
  const header = req.headers.get('authorization') ?? '';
  const given = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!given || !sameToken(given, adminToken)) {
    return errorResponse(401, 'unauthorized', 'The admin token is missing or wrong. Send Authorization: Bearer <token>.');
  }
  const body = (await readJson(req)) ?? {};
  try {
    return toResponse(await removeEntry(body.game, body.name));
  } catch (err) {
    return serverError(err);
  }
}
