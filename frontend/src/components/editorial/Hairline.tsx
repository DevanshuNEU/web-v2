/**
 * Hairline - a single 1px monochrome rule.
 *
 * The atomic divider of the editorial system. Horizontal renders a top
 * border (the default page/section divider); vertical renders a left border
 * for column gutters. `inset` indents the start of the rule (left for
 * horizontal, top for vertical) so it can sit flush past a label column.
 *
 * Pure presentation. Color comes from --color-border via the .hairline
 * utility, so it adapts to light/dark automatically. Decorative by default
 * (aria-hidden); it carries no semantics.
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface HairlineProps {
  /** 'horizontal' (top border) or 'vertical' (left border). Default horizontal. */
  orientation?: 'horizontal' | 'vertical';
  /** Pixels to indent the start of the rule (left for horizontal, top for vertical). */
  inset?: number;
  className?: string;
}

export default function Hairline({
  orientation = 'horizontal',
  inset,
  className,
}: HairlineProps) {
  const isVertical = orientation === 'vertical';

  // The .hairline utility sets border-top; for vertical we override to a
  // left border of the same weight/color.
  const style: React.CSSProperties = isVertical
    ? {
        borderTop: 0,
        borderLeft: 'var(--rule-weight) solid rgb(var(--color-border))',
        ...(inset ? { marginTop: inset } : {}),
      }
    : inset
      ? { marginLeft: inset }
      : {};

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      data-testid="hairline"
      data-orientation={orientation}
      className={cn(
        'hairline',
        isVertical ? 'self-stretch w-0' : 'w-full h-0',
        className,
      )}
      style={style}
    />
  );
}
