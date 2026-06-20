'use client';

/**
 * MobileAppIcon — an iOS Home-screen-style squircle icon with optional
 * notification badge and label.
 *
 * Visual:
 *   ┌──────┐
 *   │  *   │   ← squircle (rounded square, ~22% radius)
 *   └──────┘
 *    Label    ← optional, two-line max truncate
 *
 * The badge is the small red number/dot that appears at the top-right of
 * iOS apps with pending notifications. Pass a number for a count, pass
 * `true` for a plain dot, omit for none.
 *
 * iOS uses a true superellipse for its app icon mask (|x|^5.5 + |y|^5.5 = 1).
 * Pure CSS can't express that, so we approximate with border-radius at
 * ~22.5% of the icon's side length — visually indistinguishable at 60px,
 * a tiny bit less rounded at the very corners at large sizes.
 */

import React from 'react';
import { useIsMono } from '@/hooks/usePalette';

export interface MobileAppIconProps {
  /** Icon content shown inside the squircle (Lucide icon, <img>, emoji, …). */
  icon: React.ReactNode;
  /** Optional label rendered below the squircle. */
  label?: string;
  /** Squircle background. Accepts any CSS color or gradient. Default near-black. */
  background?: string;
  /** Icon color inside the squircle. Default white. */
  iconColor?: string;
  /**
   * Notification badge.
   *   number → shows the count (capped to "99+")
   *   true   → shows a plain dot
   *   undefined / false / 0 → no badge
   */
  badge?: number | boolean;
  /** Tap handler. Acts like launching the app. */
  onClick?: () => void;
  /** Squircle side length in px. Default 60 (iOS Home screen size). */
  size?: number;
  className?: string;
}

export default function MobileAppIcon({
  icon,
  label,
  background = '#1c1c1e',
  iconColor = '#ffffff',
  badge,
  onClick,
  size = 60,
  className = '',
}: MobileAppIconProps) {
  const mono = useIsMono();
  const radius = Math.round(size * 0.225);
  const showBadge = badge !== undefined && badge !== false && badge !== 0;
  const badgeText =
    typeof badge === 'number' ? (badge > 99 ? '99+' : String(badge)) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ? `Open ${label}` : 'App icon'}
      className={`group flex flex-col items-center gap-1.5 select-none ${className}`}
    >
      <div className="relative">
        <div
          data-testid="app-icon-squircle"
          className="flex items-center justify-center group-active:scale-95 group-active:opacity-90 transition-transform duration-100"
          style={{
            width: size,
            height: size,
            background,
            color: iconColor,
            borderRadius: radius,
            boxShadow: '0 4px 14px -3px rgba(0,0,0,0.25)',
          }}
        >
          {icon}
        </div>
        {showBadge && (
          <span
            data-testid="app-icon-badge"
            aria-label={
              typeof badge === 'number'
                ? `${badge} unread`
                : 'has notifications'
            }
            className={`absolute -top-1 -right-1.5 min-w-[20px] h-5 px-[5px] flex items-center justify-center rounded-full text-[11px] font-semibold leading-none ring-2 ring-bg pointer-events-none ${
              mono
                ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900'
                : 'bg-[#ff3b30] text-white'
            }`}
          >
            {badgeText}
          </span>
        )}
      </div>
      {label && (
        <span
          data-testid="app-icon-label"
          className="text-label leading-tight text-text text-center max-w-[68px] truncate"
        >
          {label}
        </span>
      )}
    </button>
  );
}
