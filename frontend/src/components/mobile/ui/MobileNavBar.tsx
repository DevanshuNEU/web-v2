'use client';

/**
 * MobileNavBar — iOS-style top navigation bar.
 *
 * Three equal-basis regions: back button on the left, centered title,
 * optional right-action slot. Equal basis is what guarantees the title
 * stays optically centered even when back/right widths differ.
 *
 * Pure presentation: takes a title, a back callback, an optional right
 * slot. Owns no navigation state — the parent app drives the stack.
 */

import React from 'react';
import { ChevronLeft } from 'lucide-react';

export interface MobileNavBarProps {
  /** Title — string renders as semantic h1; pass a ReactNode for custom content. */
  title?: React.ReactNode;
  /** If provided, the back chevron renders and calls this on tap. */
  onBack?: () => void;
  /** Optional iOS-style text label after the chevron (e.g. "Projects"). */
  backLabel?: string;
  /** Optional right-side slot — typically a button or icon. */
  rightAction?: React.ReactNode;
  className?: string;
}

export default function MobileNavBar({
  title,
  onBack,
  backLabel,
  rightAction,
  className = '',
}: MobileNavBarProps) {
  return (
    <header
      className={`relative flex items-center h-11 px-2 select-none ${className}`}
    >
      {/* Left — back */}
      <div className="flex-1 basis-0 flex items-center min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel ? `Back to ${backLabel}` : 'Back'}
            className="touch-target flex items-center gap-0.5 -ml-1 pl-1 pr-2 rounded-md text-accent active:opacity-50 transition-opacity"
          >
            <ChevronLeft size={26} strokeWidth={2.2} />
            {backLabel && (
              <span className="text-[16px] leading-none truncate max-w-[140px]">
                {backLabel}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Center — title (truncates before pushing the right slot) */}
      <div className="flex-1 basis-0 flex items-center justify-center min-w-0 px-1">
        {typeof title === 'string' ? (
          <h1 className="text-[17px] font-semibold text-text truncate">
            {title}
          </h1>
        ) : (
          title
        )}
      </div>

      {/* Right — action */}
      <div className="flex-1 basis-0 flex items-center justify-end min-w-0">
        {rightAction}
      </div>
    </header>
  );
}
