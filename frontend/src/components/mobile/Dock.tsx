'use client';

import { getDockApps } from '@/lib/mobileAppRegistry';
import AppIcon from './AppIcon';
import { useIsMono } from '@/hooks/usePalette';
import type { AppType } from '../../../../shared/types';

interface DockProps {
  onOpen: (appType: AppType) => void;
}

/**
 * iOS-style dock. Sticky to the bottom of the home screen above the safe area.
 * 4 labeled app icons: these are the apps that matter most, so a first-time
 * visitor should not have to guess what a contact-card glyph opens. Shares the SearchPill's frosted register: ink-on-paper
 * frosted surface in mono, glass over the wallpaper in colour mode.
 */
export default function Dock({ onOpen }: DockProps) {
  const apps = getDockApps();
  const mono = useIsMono();

  return (
    <div
      className={`mx-3 mb-3 rounded-[28px] px-3 pt-2.5 pb-2 flex items-start justify-around ${
        mono
          ? 'border border-border bg-surface/70 backdrop-blur'
          : 'glass-medium border border-white/20 shadow-lg'
      }`}
    >
      {apps.map((app) => (
        <AppIcon
          key={app.appType}
          appType={app.appType}
          onOpen={onOpen}
          label={app.label}
          labelOn="surface"
          size={54}
        />
      ))}
    </div>
  );
}
