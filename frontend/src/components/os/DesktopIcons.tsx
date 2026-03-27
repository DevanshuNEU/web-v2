'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { getDesktopApps, getAppLabel } from '@/lib/appRegistry';
import type { AppType } from '../../../../shared/types';

interface DesktopIconProps {
  appType: AppType;
  icon: React.ElementType;
  label: string;
  gradient: string;
  position: { x: number; y: number };
}

function DesktopIcon({ appType, icon: Icon, label, gradient, position }: DesktopIconProps) {
  const openWindow = useOSStore(state => state.openWindow);

  return (
    <motion.div
      className="absolute cursor-pointer group"
      style={{ left: position.x, top: position.y }}
      whileHover={{ scale: 1.08, y: -4 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onDoubleClick={() => openWindow(appType)}
    >
      <div className="flex flex-col items-center gap-2 p-2">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center
                      shadow-lg group-hover:shadow-xl transition-all duration-200
                      ${gradient}`}
        >
          <Icon size={28} className="text-white drop-shadow-md" />
        </div>
        <span
          className="text-xs font-medium text-center px-2 py-1 rounded-md
                     bg-surface/80 backdrop-blur-sm shadow-sm
                     text-text max-w-[80px] leading-tight"
        >
          {label}
        </span>
      </div>
    </motion.div>
  );
}

export default function DesktopIcons() {
  const desktopApps = getDesktopApps();

  return (
    <>
      {desktopApps.map((app) => {
        const label = getAppLabel(app.appType);
        return (
          <DesktopIcon
            key={app.appType}
            appType={app.appType}
            icon={app.icon}
            label={label.title}
            gradient={app.gradient}
            position={app.desktopGrid!}
          />
        );
      })}
    </>
  );
}
