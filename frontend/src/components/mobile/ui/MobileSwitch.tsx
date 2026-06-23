'use client';

/**
 * MobileSwitch — iOS-style toggle.
 *
 * Pure CSS, no JS animation. Spec-accurate dimensions (51×31, 27px handle).
 * Stateless: parent owns the `on` value and reacts to `onChange`.
 *
 * Uses native button semantics + role="switch" + aria-checked so screen
 * readers announce state correctly and keyboards can toggle via Space.
 */

import React from 'react';
import { useIsMono } from '@/hooks/usePalette';

export interface MobileSwitchProps {
  on: boolean;
  onChange?: (on: boolean) => void;
  disabled?: boolean;
  /** Accessible label — required if there's no visible label nearby. */
  label?: string;
  className?: string;
}

export default function MobileSwitch({
  on,
  onChange,
  disabled = false,
  label,
  className = '',
}: MobileSwitchProps) {
  const mono = useIsMono();
  // The "on" fill is a single accent. In color mode it stays the iOS-green
  // signal; in mono it collapses to the graphite ink (text token) so identity
  // reads from the handle position, not hue.
  const onFill = mono ? 'bg-text' : 'bg-green-500';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={`relative inline-flex items-center w-[51px] h-[31px] rounded-full flex-shrink-0 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 ${
        on ? onFill : 'bg-text/15'
      } ${className}`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 left-0.5 w-[27px] h-[27px] rounded-full bg-surface shadow-[var(--shadow-sm)] transition-transform duration-200 ease-out ${
          on ? 'translate-x-[20px]' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
