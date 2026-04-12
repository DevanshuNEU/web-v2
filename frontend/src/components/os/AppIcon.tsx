'use client';

import React from 'react';
import { getIconColors } from '@/lib/iconColors';

interface AppIconProps {
  icon: React.ElementType;
  colorKey: string;
  size: number;
}

/**
 * macOS-authentic app icon with visual depth.
 *
 * Layers (back to front):
 *  1. Colored drop shadow — floats the icon off the surface
 *  2. Multi-stop gradient background
 *  3. Inset shadows — raised glass surface impression
 *  4. Top highlight overlay — simulates overhead light
 *  5. White Lucide icon with drop-shadow
 */
export default function AppIcon({ icon: Icon, colorKey, size }: AppIconProps) {
  const colors = getIconColors(colorKey);
  const radius = Math.round(size * 0.22);
  const iconSize = Math.round(size * 0.46);

  return (
    <div
      className="relative overflow-hidden flex-shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: colors.gradient,
        boxShadow: [
          `0 4px 14px ${colors.shadow}`,
          `0 1px 3px rgba(0,0,0,0.12)`,
          `inset 0 1px 1px rgba(255,255,255,0.3)`,
          `inset 0 -1px 2px rgba(0,0,0,0.1)`,
        ].join(', '),
      }}
    >
      {/* Top highlight — light reflecting off the surface */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: '50%',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
          borderRadius: `${radius}px ${radius}px 0 0`,
        }}
      />

      {/* Icon */}
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        <Icon
          size={iconSize}
          style={{
            color: 'white',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
          }}
        />
      </div>
    </div>
  );
}
