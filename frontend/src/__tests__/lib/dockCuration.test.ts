import { describe, it, expect } from 'vitest';
import { appRegistry, getPinnedApps, getLaunchpadApps } from '@/lib/appRegistry';

/**
 * Dock curation guard.
 *
 * The desktop dock is deliberately slim: a core five plus Settings. Everything
 * else lives in the Launchpad only. This locks that curation so a stray
 * pinnedToDock flip (or a resurrected Chat app) is caught in CI rather than by
 * eye.
 */

describe('dock curation', () => {
  it('pins exactly the curated core set', () => {
    const pinned = getPinnedApps().map((a) => a.appType).sort();
    expect(pinned).toEqual(
      ['about-me', 'contact', 'display-options', 'github-activity', 'projects', 'resume'].sort()
    );
  });

  it('keeps secondary apps out of the dock but in the Launchpad', () => {
    const pinned = new Set(getPinnedApps().map((a) => a.appType));
    const launchpad = new Set(getLaunchpadApps().map((a) => a.appType));
    for (const app of ['terminal', 'browser', 'help'] as const) {
      expect(pinned.has(app)).toBe(false);
      expect(launchpad.has(app)).toBe(true);
    }
  });

  it('has fully retired the Chat app (now the floating assistant)', () => {
    expect('chat' in appRegistry).toBe(false);
  });
});
