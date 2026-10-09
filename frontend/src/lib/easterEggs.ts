/**
 * Menu-bar easter eggs: the Wi-Fi and battery icons.
 *
 * Pure data and helpers, no React, so the copy and the edge cases are
 * unit-testable. MenuBar (desktop) renders them as small tray menus;
 * StatusBar (mobile) shows the short versions as toasts.
 *
 * Rules: every number shown is real (the ping is measured, the visitor's
 * battery comes from the browser) or obviously a joke. No visa or student
 * jokes, ever.
 */

export interface WifiNetwork {
  ssid: string;
  /** The network devOS is "on". Shows the live ping. */
  connected?: boolean;
  /** Locked networks answer with the wrong-password hint. */
  secured?: boolean;
  /** Joining this one runs `hire devanshu` in the terminal. */
  hire?: boolean;
}

export const WIFI_NETWORKS: WifiNetwork[] = [
  { ssid: 'devanshu-5G', connected: true },
  { ssid: 'pineapple-on-pizza', secured: true },
  { ssid: 'Verstappen_Pit_Wall', secured: true },
  { ssid: 'hire-devanshu', hire: true },
];

export const WIFI_WRONG_PASSWORD = 'Wrong password. Hint: try the network at the bottom.';

export const WIFI_MOBILE_TOAST = 'Connected to devanshu-5G. pineapple-on-pizza is locked. Some opinions need protecting.';

/** Ping label for the connected network; null while measuring or on failure. */
export function formatPing(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return 'measuring...';
  return `${Math.round(ms)}ms to this site`;
}

/**
 * Round-trip time to this origin, measured with an uncached tiny request.
 * Resolves null if the request fails; the menu just keeps "measuring...".
 */
export async function measurePing(fetcher: typeof fetch = fetch): Promise<number | null> {
  try {
    const start = performance.now();
    await fetcher(`/favicon.ico?ping=${Date.now()}`, { cache: 'no-store', method: 'HEAD' });
    return performance.now() - start;
  } catch {
    return null;
  }
}

export interface VisitorBattery {
  /** 0 to 1, as the Battery Status API reports it. */
  level: number;
  charging: boolean;
}

export const LOW_BATTERY = 0.2;

export const BATTERY_MINE = {
  level: '100%',
  source: 'Cold brew',
  remaining: 'Until the next deploy',
};

export const BATTERY_MOBILE_TOAST = '100%. Power source: cold brew. Time remaining: until the next deploy.';

/** The line about the visitor's own battery, or null when the browser won't say. */
export function visitorBatteryLine(b: VisitorBattery | null): string | null {
  if (!b || !Number.isFinite(b.level)) return null;
  const pct = Math.round(Math.min(Math.max(b.level, 0), 1) * 100);
  if (b.charging) return `Yours: ${pct}%, charging. Mine runs on coffee.`;
  if (b.level < LOW_BATTERY) return `You're at ${pct}%. The resume is one click away, just saying.`;
  return `Yours: ${pct}%. Mine runs on coffee.`;
}

/** True when the visitor is low and not charging: the menu offers the resume. */
export function isLowBattery(b: VisitorBattery | null): boolean {
  return !!b && !b.charging && Number.isFinite(b.level) && b.level < LOW_BATTERY;
}

type BatteryNavigator = Navigator & {
  getBattery?: () => Promise<{ level: number; charging: boolean }>;
};

/** Reads the visitor's battery where the browser exposes it (Chromium). */
export async function readVisitorBattery(nav: Navigator | undefined = typeof navigator === 'undefined' ? undefined : navigator): Promise<VisitorBattery | null> {
  const getBattery = (nav as BatteryNavigator | undefined)?.getBattery;
  if (typeof getBattery !== 'function') return null;
  try {
    const b = await getBattery.call(nav);
    return { level: b.level, charging: b.charging };
  } catch {
    return null;
  }
}
