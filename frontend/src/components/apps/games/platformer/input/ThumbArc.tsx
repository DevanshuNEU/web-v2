'use client';

import { useCallback, useRef } from 'react';
import { ChevronUp, ChevronsRight, Swords } from 'lucide-react';
import { arcLayout, type Owned, type Rect } from './arc';
import { buzzPress } from '../ui/controls';
import type { InputFrame } from './frame';

/**
 * The right thumb's arc: Jump (largest, in the corner), Attack to its left,
 * Dash above it. Each button's hit area is bigger than the face drawn in it;
 * a press squashes and brightens the face, buzzes, and writes the input on
 * the same frame. Attack and Dash appear once she has them.
 */
export function ThumbArc({ input, mono, owned, hand, haptics, intro, onPress, labelBeside = false }: {
  input: InputFrame; mono: boolean; owned: Owned; hand: 'right' | 'left'; haptics: boolean;
  /** Show the first-run labels on the buttons. */
  intro?: boolean;
  /** Put Jump's label beside the button (landscape has open space there; the portrait deck does not). */
  labelBeside?: boolean;
  /** Any press (the first-run overlay goes away once she plays). */
  onPress?: () => void;
}) {
  const l = arcLayout(hand, owned);
  const press = useCallback(() => { buzzPress(haptics); onPress?.(); }, [haptics, onPress]);
  const onJump = useCallback(() => { input.jumpHeld = true; input.jumpPressed = true; press(); }, [input, press]);
  const onJumpUp = useCallback(() => { input.jumpHeld = false; }, [input]);
  const onDash = useCallback(() => { input.dashPressed = true; press(); }, [input, press]);
  const onAttack = useCallback(() => { input.actionPressed = true; press(); }, [input, press]);
  return (
    <div data-testid="thumb-arc" data-hand={hand} className="relative" style={{ width: l.w, height: l.h }}>
      <ArcButton label="Jump" rect={l.jump} face={76} kind="jump" mono={mono} onPress={onJump} onRelease={onJumpUp}
        intro={intro ? 'Jump, tap again to double jump' : undefined} hand={hand} beside={labelBeside}>
        <ChevronUp size={30} strokeWidth={2.6} aria-hidden />
      </ArcButton>
      {l.attack && (
        <ArcButton label="Attack" rect={l.attack} face={56} kind="minor" mono={mono} onPress={onAttack} intro={intro ? 'Attack' : undefined} hand={hand}>
          <Swords size={22} aria-hidden />
        </ArcButton>
      )}
      {l.dash && (
        <ArcButton label="Dash" rect={l.dash} face={54} kind="minor" mono={mono} onPress={onDash} intro={intro ? 'Dash' : undefined} hand={hand}>
          <ChevronsRight size={22} aria-hidden />
        </ArcButton>
      )}
    </div>
  );
}

function ArcButton({ label, rect, face, kind, mono, onPress, onRelease, intro, hand, beside = false, children }: {
  label: string; rect: Rect; face: number; kind: 'jump' | 'minor'; mono: boolean;
  onPress: () => void; onRelease?: () => void; intro?: string; hand: 'right' | 'left'; beside?: boolean; children: React.ReactNode;
}) {
  const pointer = useRef<number | null>(null);
  const release = (el: HTMLElement) => {
    el.dataset.held = 'false';
    if (pointer.current === null) return;
    pointer.current = null;
    onRelease?.();
  };
  const faceCls = kind === 'jump'
    ? (mono ? 'bg-text text-bg' : 'bg-[#ff5fa2] text-[#120b1f] shadow-[0_0_18px_rgba(255,95,162,0.45)]')
    : (mono ? 'border-2 border-text/50 text-text bg-text/10' : 'border-2 border-[#5a3f8a] bg-[#1d1430]/80 text-[#efe2ff]');
  return (
    <button
      type="button"
      aria-label={label}
      style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      className="group flex items-center justify-center select-none touch-none [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent] focus-visible:outline-2"
      onPointerDown={(e) => {
        e.preventDefault();
        pointer.current = e.pointerId;
        try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* a refused capture must not cost the press */ }
        e.currentTarget.dataset.held = 'true';
        onPress();
      }}
      onPointerUp={(e) => release(e.currentTarget)}
      onPointerCancel={(e) => release(e.currentTarget)}
      onLostPointerCapture={(e) => release(e.currentTarget)}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => { if (e.detail === 0) { onPress(); onRelease?.(); } }}
    >
      <span
        data-face
        aria-hidden
        style={{ width: face, height: face }}
        className={`flex items-center justify-center rounded-full transition-[transform,filter] duration-75 ease-out
          group-data-[held=true]:scale-90 group-data-[held=true]:brightness-150 ${faceCls}`}
      >
        {children}
      </span>
      {intro && (
        <span
          aria-hidden
          // In landscape Jump's label sits beside the button, in the open space
          // between the thumbs; everywhere else labels sit above their button.
          className={`pointer-events-none absolute z-30 border border-[#3df2ff] bg-[#06040f] px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-[#d8f8ff] shadow-[0_0_12px_rgba(61,242,255,0.35)] ${
            beside
              ? `top-1/2 -translate-y-1/2 w-max max-w-[9.5rem] text-center leading-snug ${hand === 'right' ? 'right-full mr-2' : 'left-full ml-2'}`
              : `bottom-full mb-1 whitespace-nowrap ${hand === 'right' ? 'right-0' : 'left-0'}`
          }`}
        >
          {intro}
        </span>
      )}
    </button>
  );
}
