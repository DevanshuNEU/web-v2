'use client';

import React from 'react';
import type { AppType } from '../../../../shared/types';
import { appRegistry, getAppLabel } from '@/lib/appRegistry';
import { getIconColors, MONO_ICON_SCHEME } from '@/lib/iconColors';
import { useIsMono } from '@/hooks/usePalette';
import { useHaptics } from '@/hooks/useHaptics';
import { useWallpaperTone } from './useWallpaperTone';

interface AppIconProps {
  appType: AppType;
  onOpen: (appType: AppType) => void;
  /** Hide label (e.g. inside dock) */
  hideLabel?: boolean;
  size?: number;
  /** Override the default label from getAppLabel. Used for iOS-specific names. */
  label?: string;
  /**
   * What the label sits on. 'wallpaper' (default) picks white or dark ink from
   * the wallpaper's tone; 'surface' (the dock) uses the theme's text token.
   */
  labelOn?: 'wallpaper' | 'surface';
}

/**
 * iOS-style app icon — squircle with rich gradient, drop shadow, label below.
 * Tap → open. (Long-press wiggle mode was removed: it did nothing and ate
 * the next tap.)
 */
export default function AppIcon({
  appType,
  onOpen,
  hideLabel = false,
  size = 60,
  label: labelOverride,
  labelOn = 'wallpaper',
}: AppIconProps) {
  const mono = useIsMono();
  const reg = appRegistry[appType];
  const label = labelOverride ?? getAppLabel(appType).title;
  const colors = mono ? MONO_ICON_SCHEME : getIconColors(reg.iconColor);
  const Icon = reg.icon;

  const haptics = useHaptics();
  const tone = useWallpaperTone();

  const handleClick = () => {
    haptics('light');
    onOpen(appType);
  };

  // Ink for the label: the dock surface follows the theme token; on the bare
  // wallpaper, dark ink with a light halo on light wallpapers, white with a
  // dark halo on dark ones.
  const labelInk =
    labelOn === 'surface' ? 'text-text' : tone === 'light' ? 'text-[#1d1d1f]' : 'text-white';
  const labelShadow =
    labelOn === 'surface'
      ? undefined
      : tone === 'light'
        ? '0 0 6px rgba(255,255,255,0.7)'
        : '0 1px 2px rgba(0,0,0,0.6)';

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex min-w-[44px] flex-col items-center gap-1.5 rounded-2xl select-none"
      aria-label={label}
    >
      <div
        className="rounded-[22%] flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: colors.gradient,
          // Mono: flat graphite face with hairline border + soft shadow, no gloss.
          // Color (Fun): today's gradient with raised inset highlight.
          border: mono ? `1px solid ${colors.glow}` : undefined,
          boxShadow: mono
            ? `0 4px 12px ${colors.shadow}, 0 1px 2px rgba(0,0,0,0.18)`
            : `0 8px 16px ${colors.shadow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
        }}
      >
        <Icon size={Math.round(size * 0.55)} className="text-white" strokeWidth={2} />
      </div>
      {!hideLabel && (
        <span
          className={`text-[12px] font-medium leading-tight max-w-[76px] text-center truncate ${labelInk}`}
          style={{ textShadow: labelShadow }}
        >
          {label}
        </span>
      )}
    </button>
  );
}
