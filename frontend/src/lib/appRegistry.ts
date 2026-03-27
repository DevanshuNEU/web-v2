/**
 * App Registry — Single source of truth for all devOS apps.
 *
 * Adding a new app:
 *   1. Add the AppType to shared/types.ts
 *   2. Create the component in components/apps/
 *   3. Add an entry here — that's it.
 *
 * WindowManager, DesktopIcons, Taskbar, StartMenu, and osStore
 * all consume this registry.
 */

import { lazy } from 'react';
import {
  User,
  FolderOpen,
  Activity,
  BarChart3,
  Mail,
  Terminal,
  Gamepad2,
  Settings,
  HardDrive,
  FileText,
  ScrollText,
} from 'lucide-react';
import type { AppType } from '../../../shared/types';
import { appLabels } from '@/data/copy';

export interface AppRegistration {
  /** Lazy-loaded React component */
  component: React.LazyExoticComponent<React.ComponentType>;
  /** Lucide icon component */
  icon: React.ElementType;
  /** Tailwind gradient for desktop icon background */
  gradient: string;
  /** Default window size */
  defaultSize: { width: number; height: number };
  /** Default window position */
  defaultPosition: { x: number; y: number };
  /** Show as a desktop icon */
  desktopIcon: boolean;
  /** Show in start menu */
  startMenu: boolean;
  /** Desktop icon grid position (column, row) — only if desktopIcon is true */
  desktopGrid?: { x: number; y: number };
}

// ---------------------------------------------------------------------------
// Lazy-loaded app components
// ---------------------------------------------------------------------------

const components = {
  'about-me': lazy(() => import('@/components/apps/AboutMeApp')),
  'projects': lazy(() => import('@/components/apps/ProjectsApp')),
  'skills-dashboard': lazy(() => import('@/components/apps/SkillsDashboardApp')),
  'analytics': lazy(() => import('@/components/apps/AnalyticsApp')),
  'contact': lazy(() => import('@/components/apps/ContactApp')),
  'terminal': lazy(() => import('@/components/apps/TerminalApp')),
  'games': lazy(() => import('@/components/apps/GamesApp')),
  'display-options': lazy(() => import('@/components/apps/SettingsApp')),
  // New apps — components will be created in later sprints
  'file-explorer': lazy(() => import('@/components/apps/FileExplorerApp')),
  'resume': lazy(() => import('@/components/apps/ResumeApp')),
  'changelog': lazy(() => import('@/components/apps/ChangelogApp')),
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const appRegistry: Record<AppType, AppRegistration> = {
  'about-me': {
    component: components['about-me'],
    icon: User,
    gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
    defaultSize: { width: 600, height: 500 },
    defaultPosition: { x: 100, y: 100 },
    desktopIcon: true,
    startMenu: true,
    desktopGrid: { x: 50, y: 50 },
  },
  'projects': {
    component: components['projects'],
    icon: FolderOpen,
    gradient: 'bg-gradient-to-br from-orange-500 to-orange-600',
    defaultSize: { width: 800, height: 600 },
    defaultPosition: { x: 150, y: 120 },
    desktopIcon: true,
    startMenu: true,
    desktopGrid: { x: 50, y: 170 },
  },
  'skills-dashboard': {
    component: components['skills-dashboard'],
    icon: Activity,
    gradient: 'bg-gradient-to-br from-purple-500 to-purple-600',
    defaultSize: { width: 700, height: 550 },
    defaultPosition: { x: 200, y: 140 },
    desktopIcon: true,
    startMenu: true,
    desktopGrid: { x: 50, y: 290 },
  },
  'analytics': {
    component: components['analytics'],
    icon: BarChart3,
    gradient: 'bg-gradient-to-br from-teal-500 to-cyan-600',
    defaultSize: { width: 900, height: 650 },
    defaultPosition: { x: 250, y: 160 },
    desktopIcon: true,
    startMenu: true,
    desktopGrid: { x: 170, y: 50 },
  },
  'contact': {
    component: components['contact'],
    icon: Mail,
    gradient: 'bg-gradient-to-br from-pink-500 to-pink-600',
    defaultSize: { width: 500, height: 400 },
    defaultPosition: { x: 300, y: 180 },
    desktopIcon: true,
    startMenu: true,
    desktopGrid: { x: 170, y: 170 },
  },
  'terminal': {
    component: components['terminal'],
    icon: Terminal,
    gradient: 'bg-gradient-to-br from-gray-700 to-gray-800',
    defaultSize: { width: 700, height: 450 },
    defaultPosition: { x: 180, y: 200 },
    desktopIcon: true,
    startMenu: true,
    desktopGrid: { x: 170, y: 290 },
  },
  'games': {
    component: components['games'],
    icon: Gamepad2,
    gradient: 'bg-gradient-to-br from-green-500 to-green-600',
    defaultSize: { width: 600, height: 500 },
    defaultPosition: { x: 220, y: 160 },
    desktopIcon: true,
    startMenu: true,
    desktopGrid: { x: 290, y: 50 },
  },
  'display-options': {
    component: components['display-options'],
    icon: Settings,
    gradient: 'bg-gradient-to-br from-red-500 to-red-600',
    defaultSize: { width: 650, height: 550 },
    defaultPosition: { x: 350, y: 150 },
    desktopIcon: true,
    startMenu: true,
    desktopGrid: { x: 290, y: 170 },
  },
  'file-explorer': {
    component: components['file-explorer'],
    icon: HardDrive,
    gradient: 'bg-gradient-to-br from-sky-500 to-sky-600',
    defaultSize: { width: 750, height: 550 },
    defaultPosition: { x: 180, y: 120 },
    desktopIcon: true,
    startMenu: true,
    desktopGrid: { x: 290, y: 290 },
  },
  'resume': {
    component: components['resume'],
    icon: FileText,
    gradient: 'bg-gradient-to-br from-amber-500 to-amber-600',
    defaultSize: { width: 650, height: 550 },
    defaultPosition: { x: 200, y: 130 },
    desktopIcon: false,
    startMenu: true,
  },
  'changelog': {
    component: components['changelog'],
    icon: ScrollText,
    gradient: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    defaultSize: { width: 600, height: 500 },
    defaultPosition: { x: 250, y: 150 },
    desktopIcon: false,
    startMenu: true,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get app label/title from copy system, falling back to registry defaults */
export function getAppLabel(appType: AppType) {
  return appLabels[appType] ?? { title: appType, windowTitle: appType, description: '' };
}

/** Get all apps that should appear on the desktop */
export function getDesktopApps() {
  return (Object.entries(appRegistry) as [AppType, AppRegistration][])
    .filter(([, reg]) => reg.desktopIcon && reg.desktopGrid)
    .map(([appType, reg]) => ({ appType, ...reg }));
}

/** Get all apps that should appear in the start menu */
export function getStartMenuApps() {
  return (Object.entries(appRegistry) as [AppType, AppRegistration][])
    .filter(([, reg]) => reg.startMenu)
    .map(([appType, reg]) => ({ appType, ...reg }));
}
