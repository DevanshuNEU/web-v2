import type { NextRequest } from 'next/server';
import { clientIp } from '@/lib/rateLimit';
import { startRun } from '@/lib/arcade/service';
import { startLimited } from '@/lib/arcade/limit';
import { errorResponse, readJson, toResponse } from '@/lib/arcade/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (await startLimited(clientIp(req))) {
    return errorResponse(429, 'rate_limited', 'Too many rounds started from this network. Wait a few minutes, then play again.');
  }
  const body = (await readJson(req)) ?? {};
  return toResponse(startRun(body.game));
}
