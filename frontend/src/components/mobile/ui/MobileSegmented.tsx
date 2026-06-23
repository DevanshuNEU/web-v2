'use client';

/**
 * MobileSegmented — iOS-style segmented control.
 *
 * Pill-shaped track with a sliding "thumb" that animates between segments.
 * Used wherever a small set of mutually-exclusive options needs to fit in
 * a tight horizontal space (e.g. Projects detail tabs: Story / Tech / Impact).
 *
 * Accessibility: each segment is a native <button> with aria-pressed.
 * No roving tabindex needed — screen readers announce "button, pressed"
 * on the active segment, and Tab navigates between them naturally.
 *
 * Generic over the option value type so callers get exhaustive type
 * checking on `value` and `onChange`. Default is string.
 */

import React from 'react';

export interface MobileSegmentedOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  /** Accessible name for icon-only segments. */
  ariaLabel?: string;
}

export interface MobileSegmentedProps<T extends string = string> {
  options: MobileSegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Stretch to fill container width. Default hugs content (iOS default). */
  fullWidth?: boolean;
  /** aria-label describing the group's purpose, e.g. "View mode". */
  label?: string;
  className?: string;
}

function MobileSegmented<T extends string = string>({
  options,
  value,
  onChange,
  fullWidth = false,
  label,
  className = '',
}: MobileSegmentedProps<T>) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={`relative inline-flex p-[2px] rounded-[9px] bg-text/[0.06] ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {/* Sliding thumb. translateX is relative to the thumb's own width
          (one segment wide), so each step is exactly 100%. */}
      <span
        aria-hidden
        data-testid="segmented-thumb"
        className="absolute top-[2px] bottom-[2px] rounded-[7px] bg-surface shadow-[var(--shadow-sm)] ring-[0.5px] ring-border/40 transition-transform duration-200 ease-out"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(calc(${selectedIndex} * 100%))`,
        }}
      />

      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            aria-label={opt.ariaLabel}
            onClick={() => onChange(opt.value)}
            className={`relative z-10 flex-1 px-3 py-1 text-[13px] font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-[7px] ${
              isActive ? 'text-text' : 'text-text-secondary'
            }`}
            style={{ minWidth: fullWidth ? undefined : 60 }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default MobileSegmented;
