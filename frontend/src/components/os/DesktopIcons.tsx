'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { getPinnedApps, getAppLabel } from '@/lib/appRegistry';
import type { AppType } from '../../../../shared/types';

// Statically defined so Tailwind can include all classes at build time
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

interface DesktopIconProps {
  appType: AppType;
  icon: React.ElementType;
  label: string;
  iconColor: string;
}

function DesktopIcon({ appType, icon: Icon, label, iconColor }: DesktopIconProps) {
  const openWindow = useOSStore(state => state.openWindow);
  const colors = COLOR_CLASSES[iconColor] ?? COLOR_CLASSES.blue;

  return (
    <motion.button
      className="flex flex-col items-center gap-1.5 w-[68px] cursor-pointer group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={() => openWindow(appType)}
      title={label}
    >
      <div
        className={`
          w-12 h-12 rounded-xl flex items-center justify-center
          backdrop-blur-sm border border-white/20 dark:border-white/10
          shadow-sm group-hover:shadow-md
          transition-shadow duration-200
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

export default function DesktopIcons() {
  const desktopApps = getPinnedApps();

  return (
    <div className="absolute top-5 left-5 grid grid-cols-2 gap-x-3 gap-y-4 z-[1]">
      {desktopApps.map((app) => {
        const label = getAppLabel(app.appType);
        return (
          <DesktopIcon
            key={app.appType}
            appType={app.appType}
            icon={app.icon}
            label={label.title}
            iconColor={app.iconColor}
          />
        );
      })}
    </div>
  );
}
