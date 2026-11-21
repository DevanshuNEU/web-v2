import type { NextRequest } from 'next/server';
import { clientIp } from '@/lib/rateLimit';
import { submitScore } from '@/lib/arcade/service';
import { readJson, serverError, toResponse } from '@/lib/arcade/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await readJson(req)) ?? {};
  try {
    return toResponse(await submitScore(body, { ip: clientIp(req) }));
  } catch (err) {
    return serverError(err);
  }
}
