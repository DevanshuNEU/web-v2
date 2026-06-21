/**
 * Grid - the editorial layout grid.
 *
 * A CSS grid with a fixed column count and a rhythm-based gap. When `divided`
 * is set, vertical hairlines are drawn between columns (a ruled multi-column
 * block, Stripe-Press style). Dividers are CSS borders on the cell, so they
 * adapt to dark mode and require no extra DOM.
 *
 * Column count is fixed (not responsive) by design: editorial layouts choose
 * their column count deliberately. Wrap in a parent that swaps `cols` per
 * breakpoint if responsiveness is needed.
 *
 * Pure presentation, no interactivity.
 */

import React from 'react';
import { cn } from '@/lib/utils';

export type GridCols = 1 | 2 | 3 | 4 | 6 | 12;

export interface GridProps {
  cols: GridCols;
  /** Gap scale. 'rhythm' maps to the standard 1.5rem (gap-6). Default 'rhythm'. */
  gap?: 'rhythm';
  /** Draw vertical hairlines between columns. */
  divided?: boolean;
  children?: React.ReactNode;
  className?: string;
}

// Static maps so Tailwind's JIT scanner sees the full class strings (it does
// not evaluate template literals, so every variant must appear verbatim).
const COLS: Record<GridCols, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  6: 'grid-cols-6',
  12: 'grid-cols-12',
};

// Reset the left border + padding on the first cell of each row, per column count.
const DIVIDER_RESET: Record<GridCols, string> = {
  1: '[&>*:nth-child(1n+1)]:border-l-0 [&>*:nth-child(1n+1)]:pl-0',
  2: '[&>*:nth-child(2n+1)]:border-l-0 [&>*:nth-child(2n+1)]:pl-0',
  3: '[&>*:nth-child(3n+1)]:border-l-0 [&>*:nth-child(3n+1)]:pl-0',
  4: '[&>*:nth-child(4n+1)]:border-l-0 [&>*:nth-child(4n+1)]:pl-0',
  6: '[&>*:nth-child(6n+1)]:border-l-0 [&>*:nth-child(6n+1)]:pl-0',
  12: '[&>*:nth-child(12n+1)]:border-l-0 [&>*:nth-child(12n+1)]:pl-0',
};

export default function Grid({
  cols,
  gap = 'rhythm',
  divided = false,
  children,
  className,
}: GridProps) {
  const gapClass = gap === 'rhythm' ? 'gap-6' : 'gap-6';

  // Divided columns: a left hairline on every cell except the first in each
  // row. `nth-child` modulo the column count gives the per-row first cell.
  const dividedClasses =
    divided &&
    cn('[&>*]:border-l [&>*]:border-border [&>*]:pl-6', DIVIDER_RESET[cols]);

  return (
    <div
      data-testid="editorial-grid"
      data-cols={cols}
      className={cn('grid', COLS[cols], gapClass, dividedClasses, className)}
    >
      {children}
    </div>
  );
}
