'use client';

import React from 'react';
import type { AppType } from '../../../../shared/types';
import { appRegistry, getAppLabel } from '@/lib/appRegistry';
import { getIconColors, MONO_ICON_SCHEME } from '@/lib/iconColors';
import { useIsMono } from '@/hooks/usePalette';
import { useLongPress } from '@/hooks/useLongPress';
import { useMobileStore } from '@/store/mobileStore';
import { useHaptics } from '@/hooks/useHaptics';

interface AppIconProps {
  appType: AppType;
  onOpen: (appType: AppType) => void;
  /** Hide label (e.g. inside dock) */
  hideLabel?: boolean;
  size?: number;
  /** Override the default label from getAppLabel. Used for iOS-specific names. */
  label?: string;
}

/**
 * iOS-style app icon — squircle with rich gradient, drop shadow, label below.
 * Tap → open. Long-press → wiggle mode (mobileStore.wiggleMode).
 */
export default function AppIcon({
  appType,
  onOpen,
  hideLabel = false,
  size = 60,
  label: labelOverride,
}: AppIconProps) {
  const mono = useIsMono();
  const reg = appRegistry[appType];
  const label = labelOverride ?? getAppLabel(appType).title;
  const colors = mono ? MONO_ICON_SCHEME : getIconColors(reg.iconColor);
  const Icon = reg.icon;

  const wiggleMode = useMobileStore((s) => s.wiggleMode);
  const setWiggleMode = useMobileStore((s) => s.setWiggleMode);
  const haptics = useHaptics();

  const { handlers, didFire } = useLongPress({
    onLongPress: () => {
      haptics('heavy');
      setWiggleMode(true);
    },
  });

  const handleClick = () => {
    if (didFire()) return;
    if (wiggleMode) {
      setWiggleMode(false);
      return;
    }
    haptics('light');
    onOpen(appType);
  };

  return (
    <button
      onClick={handleClick}
      {...handlers}
      className={`flex flex-col items-center gap-1.5 select-none focus:outline-none ${
        wiggleMode ? 'animate-[wiggle_0.3s_ease-in-out_infinite_alternate]' : ''
      }`}
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
          className="text-[11px] font-medium text-white leading-tight max-w-[72px] text-center truncate"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
        >
          {label}
        </span>
      )}
    </button>
  );
}
