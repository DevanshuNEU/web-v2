import type { NextRequest } from 'next/server';
import { clientIp } from '@/lib/rateLimit';
import { getBoard } from '@/lib/arcade/service';
import { boardLimited } from '@/lib/arcade/limit';
import { errorResponse, serverError, SHARED_CACHE, toResponse } from '@/lib/arcade/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (await boardLimited(clientIp(req))) {
    return errorResponse(429, 'rate_limited', 'Too many board loads from this network. Wait a minute and load it again.');
  }
  const params = new URL(req.url).searchParams;
  // Without a name the board is the same for everyone (me is null), so the
  // CDN may share it. With a name it holds that player's rank: never cached.
  const cache = params.has('name') ? undefined : SHARED_CACHE;
  try {
    return toResponse(await getBoard(params.get('game'), params.get('name')), cache);
  } catch (err) {
    return serverError(err);
  }
}
