'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronsRight } from 'lucide-react';
import { TouchButton } from '../../shared/TouchButton';
import { tryCapture, type InputFrame } from './frame';

/**
 * Portrait touch adapter: the control deck under the view. Writes the run
 * pad, Jump and Dash into the `input` latch the view reads once per step.
 * Each control tracks its own pointers, so both thumbs work at once.
 */
export function TouchDeck({ input, mono }: { input: InputFrame; mono: boolean }) {
  const onRun = useCallback((left: boolean, right: boolean) => {
    input.move = (right ? 1 : 0) - (left ? 1 : 0);
  }, [input]);
  const onJump = useCallback(() => { input.jumpHeld = true; input.jumpPressed = true; }, [input]);
  const onJumpUp = useCallback(() => { input.jumpHeld = false; }, [input]);
  const onDash = useCallback(() => { input.dashPressed = true; }, [input]);
  return (
    <div className="flex items-end justify-between px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <RunPad onChange={onRun} mono={mono} size={76} />
      <div className="flex items-end gap-3">
        <DashButton onPress={onDash} mono={mono} size={64} />
        <div className="pb-8">
          <JumpButton onPress={onJump} onRelease={onJumpUp} mono={mono} size={96} />
        </div>
      </div>
    </div>
  );
}

/**
 * The left thumb's run pad: Left and Right side by side, as one touch
 * surface. Each finger is tracked by pointer id, and the side it is on is
 * read from its position on every move, so the thumb can rock from Left to
 * Right without lifting. (The shared TouchButton captures its pointer, which
 * is right for Jump but would pin a sliding thumb to the first button.)
 *
 * Keyboard users press either button with Enter or Space (a click with
 * detail 0), which runs that way for a moment.
 */
export function RunPad({ onChange, size = 76, mono }: { onChange: (left: boolean, right: boolean) => void; size?: number; mono: boolean }) {
  const padRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLButtonElement>(null);
  const rightRef = useRef<HTMLButtonElement>(null);
  const pointers = useRef(new Map<number, -1 | 1>());
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publish = useCallback(() => {
    let l = false, r = false;
    pointers.current.forEach(s => { if (s < 0) l = true; else r = true; });
    if (leftRef.current) leftRef.current.dataset.held = String(l);
    if (rightRef.current) rightRef.current.dataset.held = String(r);
    onChange(l, r);
  }, [onChange]);

  useEffect(() => () => { if (tapTimer.current) clearTimeout(tapTimer.current); }, []);

  const sideOf = (clientX: number): -1 | 1 => {
    const el = padRef.current;
    if (!el) return 1;
    const r = el.getBoundingClientRect();
    return clientX < r.left + r.width / 2 ? -1 : 1;
  };

  const end = (id: number) => {
    if (!pointers.current.delete(id)) return;
    publish();
  };

  const tap = (side: -1 | 1) => {
    onChange(side < 0, side > 0);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(publish, 180);
  };

  const btn = `flex items-center justify-center border text-text select-none touch-none [-webkit-touch-callout:none]
    [-webkit-tap-highlight-color:transparent] transition-[transform,background-color] duration-75 ease-out
    data-[held=true]:scale-95 ${mono ? 'border-border data-[held=true]:bg-text/15' : 'border-[#3a2a5c] bg-[#1d1430] data-[held=true]:bg-[#3a2a5c]'}`;

  return (
    <div
      ref={padRef}
      className="flex gap-3 touch-none select-none"
      onPointerDown={(e) => {
        e.preventDefault();
        pointers.current.set(e.pointerId, sideOf(e.clientX));
        publish();
        tryCapture(padRef.current, e.pointerId);
      }}
      onPointerMove={(e) => {
        const cur = pointers.current.get(e.pointerId);
        if (cur === undefined) return;
        const s = sideOf(e.clientX);
        if (s !== cur) { pointers.current.set(e.pointerId, s); publish(); }
      }}
      onPointerUp={(e) => end(e.pointerId)}
      onPointerCancel={(e) => end(e.pointerId)}
      onLostPointerCapture={(e) => { if (e.target === e.currentTarget) end(e.pointerId); }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        ref={leftRef}
        type="button"
        aria-label="Run left"
        style={{ width: size, height: size }}
        className={`${btn} rounded-l-[22px] rounded-r-md`}
        onClick={(e) => { if (e.detail === 0) tap(-1); }}
      >
        <ChevronLeft size={30} aria-hidden />
      </button>
      <button
        ref={rightRef}
        type="button"
        aria-label="Run right"
        style={{ width: size, height: size }}
        className={`${btn} rounded-r-[22px] rounded-l-md`}
        onClick={(e) => { if (e.detail === 0) tap(1); }}
      >
        <ChevronRight size={30} aria-hidden />
      </button>
    </div>
  );
}

/** The right thumb's big round Jump. Fires on pointerdown, lifts on release (variable height). */
export function JumpButton({ onPress, onRelease, size = 92, mono }: { onPress: () => void; onRelease: () => void; size?: number; mono: boolean }) {
  return (
    <TouchButton
      label="Jump"
      size={size}
      onPress={onPress}
      onRelease={onRelease}
      className={`rounded-full border-[3px] border-[#120b1f] flex-col gap-0.5 font-semibold text-[13px] ${
        mono ? 'bg-text text-bg' : 'bg-[#ff5fa2] text-[#120b1f] data-[held=true]:bg-[#ff86b9]'
      }`}
    >
      <ChevronUp size={30} aria-hidden strokeWidth={2.6} />
      <span aria-hidden>Jump</span>
    </TouchButton>
  );
}

/** Dash: a press, no hold. Smaller than Jump so the right thumb finds Jump first. */
export function DashButton({ onPress, size = 64, mono }: { onPress: () => void; size?: number; mono: boolean }) {
  return (
    <TouchButton
      label="Dash"
      size={size}
      onPress={onPress}
      className={`rounded-full border-2 flex-col gap-0 font-semibold text-[11px] ${
        mono ? 'border-border text-text data-[held=true]:bg-text/15' : 'border-[#3a2a5c] bg-[#1d1430] text-text data-[held=true]:bg-[#3a2a5c]'
      }`}
    >
      <ChevronsRight size={22} aria-hidden />
      <span aria-hidden>Dash</span>
    </TouchButton>
  );
}
