'use client';

import React from 'react';
import { getIconColors, MONO_ICON_SCHEME } from '@/lib/iconColors';
import { useIsMono } from '@/hooks/usePalette';

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
  const mono = useIsMono();
  const colors = mono ? MONO_ICON_SCHEME : getIconColors(colorKey);
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
        // Mono: flat graphite face with hairline border + soft restrained shadow,
        // no gloss. Color (Fun): today's raised-glass gradient + insets.
        border: mono ? `1px solid ${colors.glow}` : undefined,
        boxShadow: mono
          ? `0 2px 8px ${colors.shadow}, 0 1px 2px rgba(0,0,0,0.18)`
          : [
              `0 4px 14px ${colors.shadow}`,
              `0 1px 3px rgba(0,0,0,0.12)`,
              `inset 0 1px 1px rgba(255,255,255,0.3)`,
              `inset 0 -1px 2px rgba(0,0,0,0.1)`,
            ].join(', '),
      }}
    >
      {/* Top highlight — light reflecting off the surface (gloss only in Fun mode) */}
      {!mono && (
        <div
          className="absolute inset-x-0 top-0 pointer-events-none"
          style={{
            height: '50%',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
            borderRadius: `${radius}px ${radius}px 0 0`,
          }}
        />
      )}

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
