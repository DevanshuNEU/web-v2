'use client';

import AppTile from '@/components/shared/AppTile';
import type { AppType } from '../../../../shared/types';

interface AppIconProps {
  appType: AppType;
  size: number;
}

/** A desktop app icon (dock, desktop, Launchpad, switcher): the shared app tile. */
export default function AppIcon({ appType, size }: AppIconProps) {
  return <AppTile appType={appType} size={size} />;
}
