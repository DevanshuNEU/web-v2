'use client';

/**
 * MobileListRow — iOS-style list row.
 *
 * Covers the four standard iOS row shapes by composition:
 *   • Navigation row: icon + title + (optional value) + chevron
 *   • Toggle row:     icon + title + switch
 *   • Info row:       icon + title + value (no chevron)
 *   • Action row:     title only (optionally destructive)
 *
 * The caller composes the icon themselves (so each app picks its own
 * tinted tile). The row is agnostic of icon shape; it just slots whatever
 * ReactNode you give it into a fixed 28×28 region for alignment.
 */

import React from 'react';
import { ChevronRight, Check } from 'lucide-react';
import MobileSwitch from './MobileSwitch';

export type MobileListRowAccessory =
  | 'chevron'
  | 'switch'
  | 'check'
  | 'none'
  | React.ReactNode;

export interface MobileListRowProps {
  /** Pre-styled icon node (caller-controlled colour). 28×28 reserved when present. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  /** Smaller secondary line under the title. */
  subtitle?: React.ReactNode;
  /** Right-aligned value text (e.g. "1.2 GB", "On", "Devanshu"). */
  value?: React.ReactNode;
  /**
   * Right-edge accessory. Defaults to 'chevron' when onClick is set, 'none' otherwise.
   * Pass any ReactNode to drop in a custom accessory.
   */
  accessory?: MobileListRowAccessory;
  /** When accessory='switch'. */
  switchOn?: boolean;
  onSwitchToggle?: (on: boolean) => void;
  /** Tap handler for the whole row. */
  onClick?: () => void;
  /** Render title in destructive red. */
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function MobileListRow({
  icon,
  title,
  subtitle,
  value,
  accessory,
  switchOn,
  onSwitchToggle,
  onClick,
  destructive = false,
  disabled = false,
  className = '',
}: MobileListRowProps) {
  // Default accessory: chevron when tappable, none otherwise.
  // Switches override tappability since the row should not also click.
  const resolvedAccessory: MobileListRowAccessory =
    accessory ?? (onClick ? 'chevron' : 'none');

  // A row is rendered as a <button> whenever it has a tap handler — even
  // when disabled. This preserves keyboard/SR semantics; `disabled` just
  // stops the click from firing. Switch rows render as <div> because the
  // switch owns the interaction.
  const isButton = !!onClick && resolvedAccessory !== 'switch';
  const Container = isButton ? 'button' : 'div';

  const titleColor = destructive
    ? 'text-red-500'
    : disabled
    ? 'text-text-secondary'
    : 'text-text';

  return (
    <Container
      type={isButton ? 'button' : undefined}
      onClick={isButton && !disabled ? onClick : undefined}
      disabled={isButton ? disabled : undefined}
      aria-disabled={!isButton && disabled ? true : undefined}
      className={`w-full flex items-center gap-3 px-4 py-2.5 min-h-[44px] text-left ${
        isButton && !disabled
          ? 'active:bg-black/5 dark:active:bg-white/5 transition-colors'
          : ''
      } ${disabled ? 'opacity-60' : ''} ${className}`}
    >
      {icon !== undefined && (
        <span className="w-7 h-7 flex items-center justify-center flex-shrink-0">
          {icon}
        </span>
      )}

      <span className="flex-1 min-w-0 flex flex-col">
        <span className={`text-title leading-tight truncate ${titleColor}`}>{title}</span>
        {subtitle && (
          <span className="text-meta text-text-secondary leading-tight truncate mt-0.5">
            {subtitle}
          </span>
        )}
      </span>

      {value !== undefined && (
        <span className="text-body text-text-secondary truncate max-w-[140px] flex-shrink-0">
          {value}
        </span>
      )}

      <Accessory
        kind={resolvedAccessory}
        switchOn={switchOn}
        onSwitchToggle={onSwitchToggle}
        disabled={disabled}
      />
    </Container>
  );
}

function Accessory({
  kind,
  switchOn,
  onSwitchToggle,
  disabled,
}: {
  kind: MobileListRowAccessory;
  switchOn?: boolean;
  onSwitchToggle?: (on: boolean) => void;
  disabled?: boolean;
}) {
  if (kind === 'none') return null;

  if (kind === 'chevron') {
    return (
      <ChevronRight
        aria-hidden
        size={18}
        strokeWidth={2.2}
        className="text-text-secondary/60 flex-shrink-0"
      />
    );
  }

  if (kind === 'check') {
    return (
      <Check
        aria-hidden
        size={18}
        strokeWidth={2.5}
        className="text-accent flex-shrink-0"
      />
    );
  }

  if (kind === 'switch') {
    return (
      <MobileSwitch
        on={!!switchOn}
        onChange={onSwitchToggle}
        disabled={disabled}
      />
    );
  }

  // Custom ReactNode
  return <span className="flex-shrink-0">{kind}</span>;
}
