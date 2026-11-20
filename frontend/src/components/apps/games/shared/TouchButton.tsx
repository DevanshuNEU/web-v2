'use client';

import { useCallback, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useArcadeSound, sfx } from './sound';

/**
 * A thumb control. `onPress` fires on pointerdown (no wait for the finger to
 * lift), `onRelease` when the finger lifts, slides off or is cancelled, so
 * hold-to-run and hold-to-jump-higher work. Several can be held at once
 * (move with one thumb, jump with the other): each tracks its own pointer.
 *
 * Keyboard users press it with Enter or Space, which arrives as a click with
 * detail 0: that maps to a press followed by a release.
 */
export function TouchButton({
  label,
  onPress,
  onRelease,
  children,
  className = '',
  size = 56,
}: {
  label: string;
  onPress: () => void;
  onRelease?: () => void;
  children: React.ReactNode;
  className?: string;
  /** Square size in CSS px. 48 is the floor for a thumb. */
  size?: number;
}) {
  const pointer = useRef<number | null>(null);
  const release = useCallback(() => {
    if (pointer.current === null) return;
    pointer.current = null;
    onRelease?.();
  }, [onRelease]);

  return (
    <button
      type="button"
      aria-label={label}
      style={{ width: size, height: size }}
      className={`flex items-center justify-center select-none touch-none [-webkit-touch-callout:none]
                  [-webkit-tap-highlight-color:transparent] transition-[transform,background-color] duration-75 ease-out
                  active:scale-95 data-[held=true]:scale-95 ${className}`}
      onPointerDown={(e) => {
        e.preventDefault();
        pointer.current = e.pointerId;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        e.currentTarget.dataset.held = 'true';
        onPress();
      }}
      onPointerUp={(e) => { e.currentTarget.dataset.held = 'false'; release(); }}
      onPointerCancel={(e) => { e.currentTarget.dataset.held = 'false'; release(); }}
      onLostPointerCapture={(e) => { e.currentTarget.dataset.held = 'false'; release(); }}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => { if (e.detail === 0) { onPress(); onRelease?.(); } }}
    >
      {children}
    </button>
  );
}

/** The shared sound switch shown on every start screen and in the HUD. */
export function SoundToggle({ className = '' }: { className?: string }) {
  const [on, setOn] = useArcadeSound();
  return (
    <button
      type="button"
      onClick={() => { setOn(!on); if (!on) sfx('tap'); }}
      aria-pressed={on}
      aria-label={on ? 'Sound on' : 'Sound off'}
      title={on ? 'Sound on' : 'Sound off'}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 px-3 text-sm text-text-secondary
                  transition-colors duration-150 hover:text-text ${className}`}
    >
      {on ? <Volume2 size={18} /> : <VolumeX size={18} />}
      <span>{on ? 'Sound on' : 'Sound off'}</span>
    </button>
  );
}
