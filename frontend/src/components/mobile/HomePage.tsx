'use client';

import type React from 'react';
import AppIcon from './AppIcon';
import type { MobileAppRegistration } from '@/lib/mobileAppRegistry';
import type { AppType } from '../../../../shared/types';

interface HomePageProps {
  apps: MobileAppRegistration[];
  onOpen: (appType: AppType) => void;
  /** Optional widget above the grid (page 1 carries the identity widget). */
  header?: React.ReactNode;
}

/**
 * One page of the home screen. 4-col grid, padded so icons line up
 * with the dock below.
 */
export default function HomePage({ apps, onOpen, header }: HomePageProps) {
  return (
    <div className="w-full flex-shrink-0 snap-start overflow-y-auto overscroll-contain hide-scrollbar px-5 pt-4 pb-2">
      {header && <div className="mb-6">{header}</div>}
      <div className="grid grid-cols-4 gap-x-3 gap-y-5">
        {apps.map((app) => (
          <div key={app.appType} className="flex justify-center">
            <AppIcon appType={app.appType} onOpen={onOpen} label={app.label} />
          </div>
        ))}
      </div>
    </div>
  );
}
