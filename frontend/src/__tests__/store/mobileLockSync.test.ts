// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useMobileStore } from '@/store/mobileStore';
import { markBootedThisSession } from '@/lib/bootSession';

describe('mobile lock vs boot session', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useMobileStore.setState({ locked: true, lockedByUser: false });
  });

  it('drops the stale initial lock once this tab has booted', () => {
    markBootedThisSession();
    useMobileStore.getState().syncLockWithSession();
    expect(useMobileStore.getState().locked).toBe(false);
  });

  it('keeps the initial lock on a fresh visit', () => {
    useMobileStore.getState().syncLockWithSession();
    expect(useMobileStore.getState().locked).toBe(true);
  });

  it('never undoes an explicit lock', () => {
    markBootedThisSession();
    useMobileStore.getState().unlock();
    useMobileStore.getState().lock();
    useMobileStore.getState().syncLockWithSession();
    expect(useMobileStore.getState().locked).toBe(true);
  });
});
