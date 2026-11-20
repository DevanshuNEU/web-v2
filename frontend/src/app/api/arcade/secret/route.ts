import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/arcade/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const name = process.env.ARCADE_HER_NAME?.trim();
  const message = process.env.ARCADE_SECRET_MESSAGE?.trim();
  if (!name || !message) {
    return errorResponse(404, 'not_set', 'There is no secret message set. Set ARCADE_HER_NAME and ARCADE_SECRET_MESSAGE to add one.');
  }
  return NextResponse.json({ name, message }, { headers: { 'Cache-Control': 'no-store' } });
}
