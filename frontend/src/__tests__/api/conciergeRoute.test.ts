import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Upstash is configured but broken (the production failure mode): every
// limit() call throws. The route must fall back, not return an empty 500.
vi.mock('@upstash/ratelimit', () => {
  class Ratelimit {
    static slidingWindow() { return {}; }
    async limit() { throw new Error('upstash unreachable'); }
  }
  return { Ratelimit };
});
vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: () => ({ incr: async () => { throw new Error('upstash unreachable'); }, expire: async () => 0 }) },
}));

// A stream that yields one text delta, standing in for the Anthropic SDK.
vi.mock('@anthropic-ai/sdk', () => {
  class Anthropic {
    messages = {
      stream: () => ({
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'OpenCodeIntel.' } };
        },
      }),
    };
  }
  return { default: Anthropic };
});

function request(body: unknown) {
  return new Request('http://localhost/api/concierge', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': '203.0.113.7' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/concierge', () => {
  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('still answers when the Upstash limiter throws', async () => {
    const { POST } = await import('@/app/api/concierge/route');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(request({ messages: [{ role: 'user', content: 'what did you build with MCP?' }] }) as any);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('OpenCodeIntel.');
  });

  it('rejects an empty thread with a named error', async () => {
    const { POST } = await import('@/app/api/concierge/route');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(request({ messages: [] }) as any);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'empty_query' });
  });
});
