/**
 * Dock-icon rect registry.
 *
 * The genie minimize effect needs to know the on-screen position of the dock
 * icon a window should fly into. Dock icons live in Taskbar and windows live in
 * WindowManager, with no shared parent that holds both refs. This tiny module
 * lets each dock icon publish a live getter for its bounding rect, keyed by
 * AppType, which a window reads at minimize time.
 *
 * It is a module-level map by design: it carries no React state, just a pointer
 * back to a live DOM measurement, so the value is always current when read.
 */

import type { AppType } from '../../../shared/types';

type RectGetter = () => DOMRect | null;

const registry = new Map<AppType, RectGetter>();

/** Register a dock icon's rect getter. Returns an unregister cleanup. */
export function registerDockIcon(appType: AppType, getter: RectGetter): () => void {
  registry.set(appType, getter);
  return () => {
    if (registry.get(appType) === getter) registry.delete(appType);
  };
}

/** Current bounding rect of the dock icon for an app, or null if not docked. */
export function getDockIconRect(appType: AppType): DOMRect | null {
  return registry.get(appType)?.() ?? null;
}

// ---------------------------------------------------------------------------
// Launchpad (grid) button rect: the first-visit hint anchors to it.
// ---------------------------------------------------------------------------

let launchpadGetter: RectGetter | null = null;

/** Register the dock's Launchpad button. Returns an unregister cleanup. */
export function registerLaunchpadButton(getter: RectGetter): () => void {
  launchpadGetter = getter;
  return () => {
    if (launchpadGetter === getter) launchpadGetter = null;
  };
}

/** Current bounding rect of the Launchpad button, or null before the dock mounts. */
export function getLaunchpadButtonRect(): DOMRect | null {
  return launchpadGetter?.() ?? null;
}

// ---------------------------------------------------------------------------
// Dock order: recruiter first. Pinned apps not listed keep registry order
// after these.
// ---------------------------------------------------------------------------

export const DOCK_ORDER: AppType[] = [
  'about-me',
  'projects',
  'resume',
  'contact',
  'github-activity',
  'display-options',
];

/** Sort pinned apps into DOCK_ORDER without dropping any. */
export function sortDockApps(apps: AppType[]): AppType[] {
  const rank = (a: AppType) => {
    const i = DOCK_ORDER.indexOf(a);
    return i === -1 ? DOCK_ORDER.length : i;
  };
  return apps
    .map((a, i) => ({ a, i }))
    .sort((x, y) => rank(x.a) - rank(y.a) || x.i - y.i)
    .map(({ a }) => a);
}
