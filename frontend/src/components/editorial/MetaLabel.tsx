/**
 * MetaLabel - the uppercase mono eyebrow used everywhere in the editorial
 * system (section kickers, index headers, captions).
 *
 * Wraps the .font-mono-meta utility: uppercase, tracked-out, graphite mono
 * at meta size. Optional leading glyph (e.g. a small box or index marker)
 * renders inline before the text. Renders as a span by default; pass `as`
 * to use a block-level p/div where the label stands alone.
 *
 * Pure presentation, no interactivity.
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface MetaLabelProps {
  /** Element to render. Default 'span'. */
  as?: 'span' | 'p' | 'div';
  /** Optional leading glyph rendered inline before the text. */
  glyph?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function MetaLabel({
  as: Tag = 'span',
  glyph,
  children,
  className,
}: MetaLabelProps) {
  return (
    <Tag
      data-testid="meta-label"
      className={cn('font-mono-meta inline-flex items-center gap-2', className)}
    >
      {glyph !== undefined && (
        <span aria-hidden className="inline-flex items-center shrink-0">
          {glyph}
        </span>
      )}
      <span>{children}</span>
    </Tag>
  );
}
