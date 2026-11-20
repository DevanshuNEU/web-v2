'use client';

import { useCallback, useRef } from 'react';
import { tryCapture } from './frame';
import { ThumbArc } from './ThumbArc';
import { IntroLabel, type ControlProps } from './TouchDeck';
import { buzzPress } from '../ui/controls';

/** Thumb travel, CSS px: inside DEAD it stands still, at FULL it runs flat out. */
export const DEAD_PX = 10;
export const FULL_PX = 40;
/** Share of the screen width the move zone covers, from the left edge. */
export const ZONE_SHARE = 0.45;

/** How far a thumb sits from where it landed, as a move value -1..1. */
export function moveFromOffset(dx: number): number {
  const a = Math.abs(dx);
  if (a <= DEAD_PX) return 0;
  if (a >= FULL_PX) return Math.sign(dx);
  return (Math.sign(dx) * (a - DEAD_PX)) / (FULL_PX - DEAD_PX);
}

interface Finger { anchor: number; x: number }

/**
 * Landscape touch adapter, laid over a full bleed view. The left 45 percent
 * is a move zone: the thumb's horizontal offset from where it landed sets
 * `move`, and past full the anchor follows the thumb, so sliding back turns
 * at once. Jump (large), Dash and Action sit under the right thumb. All of it
 * writes into the `input` latch the view reads once per step; every finger
 * is tracked by pointer id, so both thumbs work together.
 *
 * The zone is a touch surface only (it has no keyboard or screen reader
 * role); keyboard players have the keyboard adapter.
 */
export function TouchOverlay({ input, mono, owned = {}, haptics = true, swap = false, intro = false, onPlayed, opacity = 1 }: ControlProps) {
  const fingers = useRef(new Map<number, Finger>());
  const ringRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  // The newest finger in the zone drives; lifting it hands back to the one before.
  const publish = useCallback(() => {
    let last: Finger | null = null;
    fingers.current.forEach(f => { last = f; });
    const f = last as Finger | null;
    input.move = f ? moveFromOffset(f.x - f.anchor) : 0;
    const ring = ringRef.current;
    if (ring) {
      if (f) {
        const left = zoneRef.current?.getBoundingClientRect().left ?? 0;
        ring.style.opacity = '1';
        ring.style.transform = `translateX(${f.anchor - left}px)`;
      } else ring.style.opacity = '0';
    }
  }, [input]);

  const end = (id: number) => { if (fingers.current.delete(id)) publish(); };

  const played = useCallback(() => { if (intro) onPlayed?.(); }, [intro, onPlayed]);

  return (
    <div className="pointer-events-none absolute inset-0 select-none touch-none">
      <div
        ref={zoneRef}
        data-testid="move-zone"
        aria-hidden
        style={{ width: `${ZONE_SHARE * 100}%`, [swap ? 'right' : 'left']: 0 }}
        className="pointer-events-auto absolute bottom-0 top-11 touch-none [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent]"
        onPointerDown={(e) => {
          e.preventDefault();
          fingers.current.delete(e.pointerId);
          fingers.current.set(e.pointerId, { anchor: e.clientX, x: e.clientX });
          publish();
          tryCapture(zoneRef.current, e.pointerId);
          buzzPress(haptics, 6);
          played();
        }}
        onPointerMove={(e) => {
          const f = fingers.current.get(e.pointerId);
          if (!f) return;
          f.x = e.clientX;
          const dx = f.x - f.anchor;
          if (dx > FULL_PX) f.anchor = f.x - FULL_PX;
          else if (dx < -FULL_PX) f.anchor = f.x + FULL_PX;
          publish();
        }}
        onPointerUp={(e) => end(e.pointerId)}
        onPointerCancel={(e) => end(e.pointerId)}
        onLostPointerCapture={(e) => end(e.pointerId)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Where the thumb landed: a faint ring, moved by style, not by React state. */}
        <div
          ref={ringRef}
          className={`absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-0 -ml-9 h-[72px] w-[72px] rounded-full border-2 opacity-0 transition-opacity duration-150 ${
            mono ? 'border-text/40' : 'border-white/30'
          }`}
        />
      </div>

      {intro && (
        <div className="pointer-events-none absolute bottom-24" style={{ [swap ? 'right' : 'left']: '18%' }}>
          <div className="relative"><IntroLabel text="Move: slide your thumb" /></div>
        </div>
      )}
      <div
        style={{ opacity }}
        className={`pointer-events-auto absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] ${
          swap ? 'left-[max(0.75rem,env(safe-area-inset-left))]' : 'right-[max(0.75rem,env(safe-area-inset-right))]'
        }`}
      >
        <ThumbArc input={input} mono={mono} owned={owned} hand={swap ? 'left' : 'right'} haptics={haptics} intro={intro} onPress={played} labelBeside />
      </div>
    </div>
  );
}
