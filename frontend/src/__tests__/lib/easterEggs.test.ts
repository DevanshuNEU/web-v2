import { describe, it, expect, vi } from 'vitest';
import {
  WIFI_NETWORKS,
  WIFI_MOBILE_TOAST,
  BATTERY_MOBILE_TOAST,
  WIFI_WRONG_PASSWORD,
  formatPing,
  measurePing,
  visitorBatteryLine,
  isLowBattery,
  readVisitorBattery,
} from '@/lib/easterEggs';

const BANNED = /\b(student|visa|sponsor\w*|opt|f-?1)\b|[—–]/i;

describe('wifi easter egg', () => {
  it('has exactly one connected network and one hire network', () => {
    expect(WIFI_NETWORKS.filter(n => n.connected)).toHaveLength(1);
    expect(WIFI_NETWORKS.filter(n => n.hire).map(n => n.ssid)).toEqual(['hire-devanshu']);
  });

  it('formats a measured ping and waits on a missing one', () => {
    expect(formatPing(38.4)).toBe('38ms to this site');
    expect(formatPing(null)).toBe('measuring...');
    expect(formatPing(Number.NaN)).toBe('measuring...');
  });

  it('measures ping with an uncached request and survives a failure', async () => {
    const calls: Array<RequestInit | undefined> = [];
    const ok = async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(init);
      return new Response(null, { status: 200 });
    };
    const ms = await measurePing(ok as typeof fetch);
    expect(ms).not.toBeNull();
    expect(calls[0]).toMatchObject({ cache: 'no-store' });

    const fail = vi.fn(async () => { throw new Error('offline'); });
    expect(await measurePing(fail as unknown as typeof fetch)).toBeNull();
  });
});

describe('battery easter egg', () => {
  it('describes the visitor battery in three states', () => {
    expect(visitorBatteryLine({ level: 0.64, charging: true })).toBe('Yours: 64%, charging. Mine runs on coffee.');
    expect(visitorBatteryLine({ level: 0.8, charging: false })).toBe('Yours: 80%. Mine runs on coffee.');
    expect(visitorBatteryLine({ level: 0.14, charging: false })).toMatch(/^You're at 14%\. The resume/);
  });

  it('stays quiet when the browser will not say', () => {
    expect(visitorBatteryLine(null)).toBeNull();
    expect(isLowBattery(null)).toBe(false);
  });

  it('offers the resume only when low and not charging', () => {
    expect(isLowBattery({ level: 0.1, charging: false })).toBe(true);
    expect(isLowBattery({ level: 0.1, charging: true })).toBe(false);
    expect(isLowBattery({ level: 0.5, charging: false })).toBe(false);
  });

  it('reads the Battery Status API when present and null when absent', async () => {
    const nav = { getBattery: async () => ({ level: 0.5, charging: false }) } as unknown as Navigator;
    expect(await readVisitorBattery(nav)).toEqual({ level: 0.5, charging: false });
    expect(await readVisitorBattery({} as Navigator)).toBeNull();
    expect(await readVisitorBattery(undefined)).toBeNull();
  });
});

describe('easter egg copy', () => {
  it('never uses banned framing or dashes', () => {
    const copy = [
      WIFI_MOBILE_TOAST,
      BATTERY_MOBILE_TOAST,
      WIFI_WRONG_PASSWORD,
      ...WIFI_NETWORKS.map(n => n.ssid),
      visitorBatteryLine({ level: 0.1, charging: false }) ?? '',
    ].join(' ');
    expect(copy).not.toMatch(BANNED);
  });
});
