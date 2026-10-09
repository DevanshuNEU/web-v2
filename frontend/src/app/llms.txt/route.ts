import { buildLlmsTxt } from '@/lib/llmsTxt';

// Served at /llms.txt. Content and rationale live in lib/llmsTxt.ts.
export const dynamic = 'force-static';

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
