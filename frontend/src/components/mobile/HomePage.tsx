'use client';

import AppIcon from './AppIcon';
import type { MobileAppRegistration } from '@/lib/mobileAppRegistry';
import type { AppType } from '../../../../shared/types';

interface HomePageProps {
  apps: MobileAppRegistration[];
  onOpen: (appType: AppType) => void;
}

/**
 * One page of the home screen. 4-col grid, padded so icons line up
 * with the dock below.
 */
export default function HomePage({ apps, onOpen }: HomePageProps) {
  return (
    <div className="w-full flex-shrink-0 snap-start px-6 pt-6 pb-2">
      <div className="grid grid-cols-4 gap-x-4 gap-y-6">
        {apps.map((app) => (
          <div key={app.appType} className="flex justify-center">
            <AppIcon appType={app.appType} onOpen={onOpen} label={app.label} />
          </div>
        ))}
      </div>
    </div>
  );
}
