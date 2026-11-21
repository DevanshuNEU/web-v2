import type { NextRequest } from 'next/server';
import { getBoard } from '@/lib/arcade/service';
import { serverError, toResponse } from '@/lib/arcade/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  try {
    return toResponse(await getBoard(params.get('game'), params.get('name')));
  } catch (err) {
    return serverError(err);
  }
}
