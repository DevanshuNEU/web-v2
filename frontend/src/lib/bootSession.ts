/**
 * Boot once per browser.
 *
 * The boot intro (desktop) and the lock screen (mobile) play on the first
 * visit in a browser, then not again for BOOT_REPLAY_MS. A recruiter who opens
 * the site from three links sees it once, not three times. The mark lives in
 * localStorage with a timestamp; the old per-tab sessionStorage key is still
 * read so an existing tab (and test scripts that set it) skip the boot too.
 *
 * Storage can throw (Safari private mode, blocked cookies). Any failure falls
 * back to "not booted", which just means the boot plays.
 */

const BOOT_KEY = 'devos-booted-at';
const LEGACY_SESSION_KEY = 'devos-booted-session';

/** Replay the intro after a week away. */
export const BOOT_REPLAY_MS = 7 * 24 * 60 * 60 * 1000;

export function hasBootedThisSession(now: number = Date.now()): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.sessionStorage.getItem(LEGACY_SESSION_KEY) === '1') return true;
    const at = Number(window.localStorage.getItem(BOOT_KEY));
    return Number.isFinite(at) && at > 0 && now - at < BOOT_REPLAY_MS;
  } catch {
    return false;
  }
}

export function markBootedThisSession(now: number = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BOOT_KEY, String(now));
    window.sessionStorage.setItem(LEGACY_SESSION_KEY, '1');
  } catch {
    /* storage unavailable: the boot plays again next load, which is fine */
  }
}
