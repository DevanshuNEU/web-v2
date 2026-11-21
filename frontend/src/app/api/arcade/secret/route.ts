import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { clientIp } from '@/lib/rateLimit';
import { errorResponse, readJson } from '@/lib/arcade/http';
import { secretLimited } from '@/lib/arcade/limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const STORY_LINE_MAX = 280;
const STORY_LINES_MAX = 40;

/**
 * GET: the public part, her name only. It is already public once she holds
 * the crown on the board, and the secret world spells it in coins.
 */
export async function GET() {
  const name = process.env.ARCADE_HER_NAME?.trim();
  if (!name) {
    return errorResponse(404, 'not_set', 'There is no name set. Set ARCADE_HER_NAME to add one.');
  }
  return NextResponse.json({ name }, { headers: NO_STORE });
}

/**
 * POST { code }: the private part, for a device that proves the crown code.
 * Returns his message and the personal story lines (env ARCADE_STORY, a JSON
 * object of story id to line). Everyone else plays the generic story that
 * ships in the repo. Rate limited per network so the code cannot be guessed.
 */
export async function POST(req: NextRequest) {
  const code = process.env.ARCADE_CROWN_CODE?.trim();
  if (!code) {
    return errorResponse(404, 'not_set', 'There is no crown code set. Set ARCADE_CROWN_CODE to open the story.');
  }
  if (await secretLimited(clientIp(req))) {
    return errorResponse(429, 'rate_limited', 'Too many tries from this network. Wait ten minutes and try again.');
  }
  const body = (await readJson(req)) ?? {};
  if (!matches(body.code, code)) {
    return errorResponse(403, 'not_crowned', 'That code does not open the story. The shared version still plays in full.');
  }
  return NextResponse.json(
    {
      name: process.env.ARCADE_HER_NAME?.trim() || null,
      message: process.env.ARCADE_SECRET_MESSAGE?.trim() || null,
      story: parseStory(process.env.ARCADE_STORY),
    },
    { headers: NO_STORE },
  );
}

/** Case and surrounding space do not matter; compared in constant time. */
function matches(typed: unknown, code: string): boolean {
  if (typeof typed !== 'string' || !typed.trim()) return false;
  const a = createHash('sha256').update(typed.trim().toLowerCase()).digest();
  const b = createHash('sha256').update(code.toLowerCase()).digest();
  return timingSafeEqual(a, b);
}

function parseStory(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [id, line] of Object.entries(parsed).slice(0, STORY_LINES_MAX)) {
      if (typeof line === 'string' && line.trim()) out[id.slice(0, 40)] = line.trim().slice(0, STORY_LINE_MAX);
    }
    return out;
  } catch {
    return {};
  }
}
