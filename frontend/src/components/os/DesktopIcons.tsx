'use client';

/**
 * DesktopIcons — macOS-style shortcut icons on the desktop surface.
 *
 * Intentionally a curated short list — NOT the full pinned-dock set.
 * Desktop icons should be the highest-value shortcuts for first-time visitors.
 * Keep this to 3-4 max; everything else lives in the dock or Launchpad.
 *
 * To change which apps appear here, edit DESKTOP_APP_TYPES below.
 * Single-click opens the app (macOS Finder uses double-click, but single-click
 * is more intuitive for web visitors who expect click = action).
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { appRegistry, getAppLabel } from '@/lib/appRegistry';
import type { AppType } from '../../../../shared/types';

// ---------------------------------------------------------------------------
// Curated desktop app list
// ---------------------------------------------------------------------------

/**
 * These three give a first-time visitor everything they need:
 *   About Me  — who is this person?
 *   Resume    — the document recruiters actually want
 *   Projects  — proof of work
 */
const DESKTOP_APP_TYPES: AppType[] = ['about-me', 'resume', 'projects'];

// ---------------------------------------------------------------------------
// Color map — must list all iconColor values used in appRegistry so Tailwind
// includes these classes at build time (dynamic class names get purged).
// ---------------------------------------------------------------------------

const COLOR_CLASSES: Record<string, { bg: string; icon: string }> = {
  blue:   { bg: 'bg-blue-500/10   dark:bg-blue-500/15',   icon: 'text-blue-500'   },
  orange: { bg: 'bg-orange-500/10 dark:bg-orange-500/15', icon: 'text-orange-500' },
  purple: { bg: 'bg-purple-500/10 dark:bg-purple-500/15', icon: 'text-purple-500' },
  teal:   { bg: 'bg-teal-500/10   dark:bg-teal-500/15',   icon: 'text-teal-500'   },
  pink:   { bg: 'bg-pink-500/10   dark:bg-pink-500/15',   icon: 'text-pink-500'   },
  slate:  { bg: 'bg-slate-500/10  dark:bg-slate-500/15',  icon: 'text-slate-400 dark:text-slate-300' },
  green:  { bg: 'bg-green-500/10  dark:bg-green-500/15',  icon: 'text-green-500'  },
  red:    { bg: 'bg-red-500/10    dark:bg-red-500/15',    icon: 'text-red-500'    },
  sky:    { bg: 'bg-sky-500/10    dark:bg-sky-500/15',    icon: 'text-sky-500'    },
  amber:  { bg: 'bg-amber-500/10  dark:bg-amber-500/15',  icon: 'text-amber-500'  },
  indigo: { bg: 'bg-indigo-500/10 dark:bg-indigo-500/15', icon: 'text-indigo-500' },
};

// ---------------------------------------------------------------------------
// Single icon
// ---------------------------------------------------------------------------

interface DesktopIconProps {
  appType: AppType;
  icon: React.ElementType;
  label: string;
  iconColor: string;
  /** Staggered mount animation delay (seconds) */
  delay: number;
}

function DesktopIcon({ appType, icon: Icon, label, iconColor, delay }: DesktopIconProps) {
  const openWindow = useOSStore(state => state.openWindow);
  const colors = COLOR_CLASSES[iconColor] ?? COLOR_CLASSES.blue;

  return (
    <motion.button
      className="flex flex-col items-center gap-1.5 w-[68px] cursor-pointer group"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={() => openWindow(appType)}
      title={`Open ${label}`}
    >
      <div
        className={`
          w-12 h-12 rounded-xl flex items-center justify-center
          backdrop-blur-sm border border-white/20 dark:border-white/10
          shadow-sm group-hover:shadow-md group-hover:border-white/30
          transition-all duration-200
          ${colors.bg}
        `}
      >
        <Icon size={22} className={colors.icon} />
      </div>
      <span
        className="text-[11px] font-medium text-center leading-tight
                   text-white/90 max-w-[68px] truncate
                   [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
      >
        {label}
      </span>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export default function DesktopIcons() {
  // top-9 (36px) = menu bar height h-7 (28px) + 8px gap.
  // absolute children ignore the parent's pt-7 padding, so we clear manually.
  return (
    <div className="absolute top-9 left-5 flex flex-col gap-4 z-[1]">
      {DESKTOP_APP_TYPES.map((appType, i) => {
        const reg = appRegistry[appType];
        if (!reg) return null;
        const label = getAppLabel(appType);
        return (
          <DesktopIcon
            key={appType}
            appType={appType}
            icon={reg.icon}
            label={label.title}
            iconColor={reg.iconColor}
            delay={i * 0.08}
          />
        );
      })}
    </div>
  );
}
