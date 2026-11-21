import type { NextRequest } from 'next/server';
import { startRun } from '@/lib/arcade/service';
import { readJson, toResponse } from '@/lib/arcade/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await readJson(req)) ?? {};
  return toResponse(startRun(body.game));
}
