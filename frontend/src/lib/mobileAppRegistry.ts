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

/** The 4 apps that live in the dock, in left→right order. */
export const DOCK_ORDER: AppType[] = ['about-me', 'terminal', 'contact', 'resume'];

/**
 * Home page layout. Each page is a list of AppTypes shown in a 4-col grid.
 * The dock is sticky, so dock apps are excluded from page contents.
 */
export const HOME_PAGES: AppType[][] = [
  // Page 1 — primary apps
  ['projects', 'skills-dashboard', 'games', 'file-explorer'],
  // Page 2 — secondary apps + utilities
  ['analytics', 'changelog', 'display-options'],
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
    label: label.title,
  };
}

export function getDockApps(): MobileAppRegistration[] {
  return DOCK_ORDER.map(getMobileApp);
}

export function getHomePages(): MobileAppRegistration[][] {
  return HOME_PAGES.map((page) => page.map(getMobileApp));
}
