'use client';

/**
 * IndexRow - the Stripe-Press "01 - Title" index row.
 *
 * A mono index number + a title, with optional right-aligned meta, and a
 * hairline below by default. When href or onClick is supplied the row becomes
 * a keyboard-focusable interactive element (anchor for href, button for
 * onClick) with a visible focus ring. Hover is a subtle graphite background
 * tint only - strictly monochrome, no color.
 *
 * The hairline lives below the content so a stacked list reads as a single
 * ruled column; pass hairline={false} on the last row to drop the trailing rule.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import MetaLabel from './MetaLabel';
import Hairline from './Hairline';

export interface IndexRowProps {
  /** Index marker, e.g. "01". */
  number: string;
  title: React.ReactNode;
  /** Optional right-aligned meta (e.g. a year or category). */
  meta?: React.ReactNode;
  /** Render as an anchor to this href. */
  href?: string;
  /** Render as a button with this click handler. */
  onClick?: () => void;
  /** Marks the row as the current item (aria-current + persistent tint). */
  active?: boolean;
  /** Draw a hairline below the row. Default true. */
  hairline?: boolean;
  className?: string;
}

export default function IndexRow({
  number,
  title,
  meta,
  href,
  onClick,
  active = false,
  hairline = true,
  className,
}: IndexRowProps) {
  const interactive = href !== undefined || onClick !== undefined;

  const tint =
    'hover:bg-black/[0.035] dark:hover:bg-white/[0.05] transition-colors';
  const focus =
    'focus-visible:outline-none focus-visible:bg-black/[0.05] dark:focus-visible:bg-white/[0.07]';

  const content = (
    <>
      <MetaLabel className="shrink-0 w-10 justify-start">{number}</MetaLabel>
      <span className="flex-1 min-w-0 editorial-head text-text text-[clamp(1.25rem,3vw,1.75rem)] leading-tight truncate">
        {title}
      </span>
      {meta !== undefined && (
        <MetaLabel className="shrink-0 justify-end">{meta}</MetaLabel>
      )}
    </>
  );

  const rowClass = cn(
    'w-full flex items-center gap-4 py-4 px-1 text-left',
    interactive && tint,
    interactive && focus,
    active && 'bg-black/[0.045] dark:bg-white/[0.06]',
    className,
  );

  return (
    <div className="flex flex-col">
      {href !== undefined ? (
        <a
          href={href}
          onClick={onClick}
          data-testid="index-row"
          aria-current={active ? 'true' : undefined}
          className={rowClass}
        >
          {content}
        </a>
      ) : onClick !== undefined ? (
        <button
          type="button"
          onClick={onClick}
          data-testid="index-row"
          aria-current={active ? 'true' : undefined}
          className={rowClass}
        >
          {content}
        </button>
      ) : (
        <div data-testid="index-row" className={rowClass}>
          {content}
        </div>
      )}

      {hairline && <Hairline />}
    </div>
  );
}
