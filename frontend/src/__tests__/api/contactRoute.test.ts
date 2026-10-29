import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CONTACT_MAX_LEN } from '@/lib/contactLimits';

// Resend is mocked: no test ever sends a real email.
const send = vi.fn(async () => ({ data: { id: 'test' }, error: null }));
vi.mock('resend', () => {
  class Resend {
    emails = { send };
  }
  return { Resend };
});

function request(body: unknown, ip: string) {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': ip },
    body: JSON.stringify(body),
  });
}

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines',
  subject: 'Role',
  message: 'Hello there.',
};

// A fresh IP per request keeps the 5-per-minute limiter out of the way.
let ipSeq = 0;
const nextIp = () => `198.51.100.${++ipSeq}`;

describe('POST /api/contact length caps', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    send.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('sends a message within every cap', async () => {
    const { POST } = await import('@/app/api/contact/route');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(request(valid, nextIp()) as any);
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('accepts a field exactly at its cap', async () => {
    const { POST } = await import('@/app/api/contact/route');
    const body = { ...valid, message: 'x'.repeat(CONTACT_MAX_LEN.message) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(request(body, nextIp()) as any);
    expect(res.status).toBe(200);
  });

  for (const field of ['name', 'subject', 'message', 'company'] as const) {
    it(`rejects a ${field} over ${CONTACT_MAX_LEN[field]} characters with a 400`, async () => {
      const { POST } = await import('@/app/api/contact/route');
      const body = { ...valid, [field]: 'x'.repeat(CONTACT_MAX_LEN[field] + 1) };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await POST(request(body, nextIp()) as any);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/too long/i);
      expect(json.error).toContain(String(CONTACT_MAX_LEN[field]));
      expect(send).not.toHaveBeenCalled();
    });
  }

  it('rejects an email over the cap', async () => {
    const { POST } = await import('@/app/api/contact/route');
    const email = `${'a'.repeat(CONTACT_MAX_LEN.email)}@example.com`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(request({ ...valid, email }, nextIp()) as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(`Email is too long (max ${CONTACT_MAX_LEN.email} characters)`);
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects a non-string field with a 400 instead of crashing', async () => {
    const { POST } = await import('@/app/api/contact/route');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(request({ ...valid, message: 42 }, nextIp()) as any);
    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });
});
