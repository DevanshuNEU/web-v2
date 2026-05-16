'use client';

import { getDockApps } from '@/lib/mobileAppRegistry';
import AppIcon from './AppIcon';
import type { AppType } from '../../../../shared/types';

interface DockProps {
  onOpen: (appType: AppType) => void;
}

/**
 * iOS-style dock. Sticky to the bottom of the home screen above the safe area.
 * Frosted glass surface with 4 app icons (no labels).
 */
export default function Dock({ onOpen }: DockProps) {
  const apps = getDockApps();

  return (
    <div className="mx-3 mb-3 rounded-[28px] px-3 py-3 flex items-center justify-around glass-medium border border-white/20 shadow-lg">
      {apps.map((app) => (
        <AppIcon
          key={app.appType}
          appType={app.appType}
          onOpen={onOpen}
          hideLabel
          size={54}
        />
      ))}
    </div>
  );
}
