'use client';

/**
 * IconTile — the small colored squircle that appears next to each row in
 * iOS Settings (Wi-Fi blue, Notifications red, Cellular green, …).
 *
 * Fixed size (28px tile, 16px icon) so that lists of these look uniform.
 * If you need a bigger one, use MobileActionRow's icon tile (44px) or
 * MobileAppIcon (60px+) instead — those are different primitives.
 */

import React from 'react';

export interface IconTileProps {
  /** Tile background (CSS color or gradient). */
  color: string;
  /** Icon content. Sized to fit a 28px tile (use a 16px icon). */
  icon: React.ReactNode;
  /** Icon color. Default white. */
  iconColor?: string;
  className?: string;
}

export default function IconTile({
  color,
  icon,
  iconColor = '#ffffff',
  className = '',
}: IconTileProps) {
  return (
    <span
      data-testid="icon-tile"
      className={`w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 ${className}`}
      style={{
        background: color,
        color: iconColor,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {icon}
    </span>
  );
}
