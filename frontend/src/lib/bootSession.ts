/**
 * Boot once per visit.
 *
 * The cinematic boot (desktop) and the lock screen (mobile) play on the first
 * load of a browser tab. A refresh in the same tab skips straight to the
 * desktop. sessionStorage survives a reload but clears when the tab closes,
 * so a new visit gets the full boot again.
 *
 * Storage can throw (Safari private mode, blocked cookies). Any failure falls
 * back to "not booted", which just means the boot plays.
 */

const BOOT_SESSION_KEY = 'devos-booted-session';

export function hasBootedThisSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(BOOT_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function markBootedThisSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(BOOT_SESSION_KEY, '1');
  } catch {
    /* storage unavailable: the boot plays again next load, which is fine */
  }
}
