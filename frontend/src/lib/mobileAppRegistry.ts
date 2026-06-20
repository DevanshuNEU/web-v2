/**
 * Mobile App Registry — additive overrides over the canonical appRegistry.
 *
 * The desktop registry is the source of truth for app metadata (component,
 * icon, color, etc.). This file only adds phone-shell-specific metadata:
 *   - dockOrder       : which 4 apps occupy the dock (in left→right order)
 *   - homePages       : which apps appear on which home page
 *
 * Add new mobile-only metadata here; never redeclare apps.
 */

import { appRegistry, getAppLabel } from './appRegistry';
import type { AppType } from '../../../shared/types';

export interface MobileAppRegistration {
  appType: AppType;
  component: (typeof appRegistry)[AppType]['component'];
  icon: (typeof appRegistry)[AppType]['icon'];
  iconColor: string;
  label: string;
}

/**
 * Mobile-only label overrides. The desktop variant might be named for its
 * macOS persona (e.g. "Preferences"); the iOS variant uses the iOS name.
 * Only override when the mobile label genuinely differs.
 */
const MOBILE_LABEL_OVERRIDES: Partial<Record<AppType, string>> = {
  'display-options': 'Settings',
  'github-activity': 'Activity',
};

/**
 * Dock — the 4 apps a first-time visitor (especially a recruiter or founder)
 * should be able to reach with zero scrolling. About-Me to establish identity,
 * Projects for the work, Resume for the credentials, Contact to reach out.
 *
 * Terminal/Games/FileExplorer were here before but they're easter eggs for
 * other engineers — they belong on a deeper page, not at the bottom-of-thumb
 * reach where every visitor lands.
 */
export const DOCK_ORDER: AppType[] = ['about-me', 'projects', 'resume', 'contact'];

/**
 * Home page layout. Each page is a list of AppTypes shown in a 4-col grid.
 * The dock is sticky, so dock apps are excluded from page contents.
 *
 * Page 1 = supporting evidence for the flagship apps (skills, real analytics,
 * changelog showing recent shipping cadence). Page 2 = utilities and easter
 * eggs visitors discover by swiping.
 */
export const HOME_PAGES: AppType[][] = [
  // Page 1 — supporting evidence. Activity first (top-left) because it's the
  // single highest-credibility surface: real, live, can't be faked. Browser
  // sits here too: it shows the shipped products running on the open web.
  ['github-activity', 'skills-dashboard', 'analytics', 'changelog', 'browser'],
  // Page 2 — utilities, settings, easter eggs
  ['terminal', 'games', 'file-explorer', 'display-options'],
];

/** Resolve full mobile metadata for an app. */
export function getMobileApp(appType: AppType): MobileAppRegistration {
  const reg = appRegistry[appType];
  const label = getAppLabel(appType);
  return {
    appType,
    component: reg.component,
    icon: reg.icon,
    iconColor: reg.iconColor,
    label: MOBILE_LABEL_OVERRIDES[appType] ?? label.title,
  };
}

export function getDockApps(): MobileAppRegistration[] {
  return DOCK_ORDER.map(getMobileApp);
}

export function getHomePages(): MobileAppRegistration[][] {
  return HOME_PAGES.map((page) => page.map(getMobileApp));
}
