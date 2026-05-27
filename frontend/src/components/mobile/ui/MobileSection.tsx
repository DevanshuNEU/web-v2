'use client';

/**
 * MobileSection — iOS Settings-style grouped list.
 *
 * Renders an optional uppercase header, a rounded container of rows with
 * separators between them, and an optional footer note. Pure presentation;
 * no list semantics enforced (iOS rows aren't lists in the formal sense).
 *
 * Separators use `divide-y` for a clean, browser-handled 1px line that
 * adapts to dark mode. Full-width by default. Pass `inset` to indent
 * the separators past the icon column (iOS Settings look).
 */

import React from 'react';

export interface MobileSectionProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  /** Indent separators 56px to align with the row title (iOS Settings look). */
  inset?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function MobileSection({
  header,
  footer,
  inset = false,
  children,
  className = '',
}: MobileSectionProps) {
  // Inset separators are rendered via ::after on each non-first child so
  // they can start at left:56px without shifting the row itself.
  const separatorClasses = inset
    ? `[&>*:not(:first-child)]:relative ` +
      `[&>*:not(:first-child)]:before:content-[''] ` +
      `[&>*:not(:first-child)]:before:absolute ` +
      `[&>*:not(:first-child)]:before:top-0 ` +
      `[&>*:not(:first-child)]:before:left-[56px] ` +
      `[&>*:not(:first-child)]:before:right-0 ` +
      `[&>*:not(:first-child)]:before:h-px ` +
      `[&>*:not(:first-child)]:before:bg-black/[0.08] ` +
      `dark:[&>*:not(:first-child)]:before:bg-white/[0.08] ` +
      `[&>*:not(:first-child)]:before:pointer-events-none`
    : 'divide-y divide-black/[0.08] dark:divide-white/[0.08]';

  return (
    <section className={`flex flex-col ${className}`}>
      {header && (
        <h2
          data-testid="section-header"
          className="px-5 mb-1.5 text-label font-medium uppercase tracking-wider text-text-secondary"
        >
          {header}
        </h2>
      )}

      <div
        data-testid="section-body"
        className={`mx-3 rounded-xl overflow-hidden bg-surface dark:bg-white/[0.04] ${separatorClasses}`}
      >
        {children}
      </div>

      {footer && (
        <p
          data-testid="section-footer"
          className="px-5 pt-1.5 text-label leading-snug text-text-secondary"
        >
          {footer}
        </p>
      )}
    </section>
  );
}
