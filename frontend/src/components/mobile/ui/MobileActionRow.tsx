'use client';

/**
 * MobileActionRow — a prominent, tappable row for primary actions on a
 * screen (e.g. "Send Email", "Open on LinkedIn", "Star on GitHub").
 *
 * Compared to MobileListRow:
 *  - Bigger icon tile (44px vs ~30px)
 *  - Supports a two-line title + subtitle
 *  - Renders as its own bordered tile (not inside a section)
 *  - Can be a link (`href`) or a button (`onClick`)
 *
 * Use when the action is the *point* of the screen, not one option among
 * many. A column of these on Ping Me is the canonical example.
 */

import React from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { useIsMono } from '@/hooks/usePalette';

export interface MobileActionRowProps {
  /** Icon inside the colored tile on the left. */
  icon: React.ReactNode;
  /**
   * Tile background (CSS color or gradient). In color mode defaults to the
   * accent; in mono mode an explicit value is still honored (so semantic
   * colors like destructive red survive), otherwise it falls back to a
   * graphite ink tile.
   */
  iconBackground?: string;
  /** Icon color inside the tile. Default white. */
  iconColor?: string;
  /** Primary label. */
  title: string;
  /** Optional second line below the title. */
  subtitle?: string;
  /**
   * Trailing chevron / external-link icon. Defaults:
   *   - `external` when `href` is set
   *   - `chevron`  when `onClick` is set without `href`
   *   - `none`     otherwise (decorative tile)
   * Pass explicitly to override.
   */
  accessory?: 'chevron' | 'external' | 'none';
  /** Tap handler for the button variant. */
  onClick?: () => void;
  /** When set, renders as an external <a> opening in a new tab. */
  href?: string;
  className?: string;
}

const TILE_BASE_CLASSES =
  'flex items-center gap-3 px-4 py-3 bg-surface dark:bg-white/[0.04] rounded-2xl active:opacity-70 transition-opacity w-full text-left';

export default function MobileActionRow({
  icon,
  iconBackground,
  iconColor,
  title,
  subtitle,
  accessory,
  onClick,
  href,
  className = '',
}: MobileActionRowProps) {
  const mono = useIsMono();
  const isLink = !!href;
  const resolvedAccessory: 'chevron' | 'external' | 'none' =
    accessory ?? (isLink ? 'external' : onClick ? 'chevron' : 'none');

  // Accent tile survives only in color mode; mono collapses the *default*
  // tile to graphite ink. An explicit iconBackground (e.g. semantic
  // destructive red) is always honored — that color carries meaning.
  const resolvedBackground =
    iconBackground ??
    (mono ? 'rgb(var(--color-text))' : 'rgb(var(--color-accent))');
  const resolvedColor = iconColor ?? 'rgb(var(--color-surface))';

  const inner = (
    <>
      <div
        aria-hidden
        className="flex items-center justify-center rounded-2xl shrink-0"
        style={{
          width: 44,
          height: 44,
          background: resolvedBackground,
          color: resolvedColor,
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="text-[16px] font-medium text-text truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-[13px] text-text-secondary truncate mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
      {resolvedAccessory === 'chevron' && (
        <ChevronRight
          size={20}
          className="text-text-secondary/60 shrink-0"
          aria-hidden
        />
      )}
      {resolvedAccessory === 'external' && (
        <ExternalLink
          size={18}
          className="text-text-secondary/60 shrink-0"
          aria-hidden
        />
      )}
    </>
  );

  if (isLink) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${TILE_BASE_CLASSES} ${className}`}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${TILE_BASE_CLASSES} ${className}`}
    >
      {inner}
    </button>
  );
}
