/**
 * EditorialSection - the standard editorial section wrapper.
 *
 * Renders, in order:
 *   • an optional MetaLabel eyebrow (with an optional leading section number)
 *   • an .editorial-head serif title
 *   • an optional trailing Hairline rule (on by default)
 *   • the section body (children)
 *
 * This is the layout primitive most editorial pages compose from. Serif
 * title stays weight-400 (no font-bold - faux-bold smears Instrument Serif).
 *
 * Pure presentation; no interactivity.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import MetaLabel from './MetaLabel';
import Hairline from './Hairline';

export interface EditorialSectionProps {
  /** Eyebrow text rendered as a MetaLabel above the title. */
  eyebrow?: React.ReactNode;
  /** Optional section number (e.g. "01"), shown before the eyebrow text. */
  number?: string;
  /** The serif headline. */
  title?: React.ReactNode;
  /** Anchor id for the section element. */
  id?: string;
  /** Draw a hairline rule under the header. Default true. */
  rule?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export default function EditorialSection({
  eyebrow,
  number,
  title,
  id,
  rule = true,
  children,
  className,
}: EditorialSectionProps) {
  const hasEyebrow = number !== undefined || eyebrow !== undefined;

  return (
    <section
      id={id}
      data-testid="editorial-section"
      className={cn('flex flex-col', className)}
    >
      {(hasEyebrow || title !== undefined) && (
        <header className="flex flex-col gap-3">
          {hasEyebrow && (
            <MetaLabel>
              {number !== undefined && (
                <span data-testid="editorial-section-number">{number}</span>
              )}
              {number !== undefined && eyebrow !== undefined && (
                <span aria-hidden className="mx-2 opacity-50">
                  /
                </span>
              )}
              {eyebrow}
            </MetaLabel>
          )}

          {title !== undefined && (
            <h2
              data-testid="editorial-section-title"
              className="editorial-head text-text"
            >
              {title}
            </h2>
          )}
        </header>
      )}

      {rule && <Hairline className="mt-6" />}

      {children !== undefined && <div className="mt-6">{children}</div>}
    </section>
  );
}
