import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetLimiter, secretLimited, SECRET_TRIES_PER_WINDOW } from '@/lib/arcade/limit';

beforeEach(() => {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  resetLimiter();
});
afterEach(() => vi.unstubAllEnvs());

async function useUp(ips: (i: number) => string) {
  for (let i = 0; i < SECRET_TRIES_PER_WINDOW; i++) expect(await secretLimited(ips(i))).toBe(false);
}

describe('IPv6 addresses share a bucket per /64', () => {
  it('limits a whole /64, however the addresses inside it are written', async () => {
    await useUp((i) => `2001:db8:abcd:12::${(i + 1).toString(16)}`);
    expect(await secretLimited('2001:db8:abcd:12:ffff:1:2:3')).toBe(true);
    expect(await secretLimited('2001:0DB8:ABCD:0012::beef')).toBe(true);
  });

  it('keeps a neighbouring /64 apart', async () => {
    await useUp((i) => `2001:db8:abcd:12::${i + 1}`);
    expect(await secretLimited('2001:db8:abcd:13::1')).toBe(false);
  });

  it('expands :: before taking the /64', async () => {
    await useUp((i) => `2001:db8::${i + 1}`);
    expect(await secretLimited('2001:db8:0:0:1::1')).toBe(true);
    expect(await secretLimited('2001:db8:0:1::1')).toBe(false);
  });

  it('leaves IPv4 per address, including IPv4-mapped IPv6', async () => {
    await useUp(() => '203.0.113.5');
    expect(await secretLimited('::ffff:203.0.113.5')).toBe(true);
    expect(await secretLimited('203.0.113.6')).toBe(false);
  });
});
