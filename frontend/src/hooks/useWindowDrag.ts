'use client';

import React from 'react';
import { frame, useIsPresent, useMotionValue, type MotionValue } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { clampWindowPosition, type Size } from '@/lib/windowGeometry';
import { computeSnap, sameSnap, type SnapBounds } from '@/lib/windowSnap';
import { beginWindowGesture } from '@/lib/windowGesture';
import type { WindowState } from '../../../shared/types';

type TitlebarHandler = (e: React.PointerEvent<HTMLDivElement>) => void;

export interface WindowDrag {
  x: MotionValue<number>;
  y: MotionValue<number>;
  snapPreview: SnapBounds | null;
  layoutKey: number;
  titlebarProps: {
    onPointerDown: TitlebarHandler;
    onPointerMove: TitlebarHandler;
    onPointerUp: TitlebarHandler;
    onPointerCancel: TitlebarHandler;
    onLostPointerCapture: TitlebarHandler;
  };
}

export interface WindowDragOptions {
  /** True while the window runs its own x/y animation (genie minimize). */
  busyRef?: React.RefObject<boolean>;
}

interface Moved {
  /** On-screen position when the first real move happened (stored plus in-flight x/y). */
  startX: number;
  startY: number;
  /** Last whole-pixel position this drag set. This is what gets committed. */
  lastX: number;
  lastY: number;
}

interface DragSession {
  windowId: string;
  pointerId: number;
  /** Pointer at pointerdown. */
  px: number;
  py: number;
  /** Stored left/top; x/y are offsets from it. */
  baseX: number;
  baseY: number;
  size: Size;
  vw: number;
  vh: number;
  /** Null until the pointer actually moves; a plain click never touches x/y. */
  moved: Moved | null;
  /** True once the pointer has been outside every snap zone this drag. */
  leftZones: boolean;
  preview: SnapBounds | null;
  end: () => void;
}

/**
 * Titlebar drag on x/y MotionValues. The window follows the pointer as a
 * transform with no React render and no store write per move; the store gets
 * one position write on release. Keeping drag moves out of React also keeps
 * them away from the `layout` spring, which restarted from rest on every move.
 *
 * x/y are 0 whenever no drag has moved the window, so the open, close and
 * genie animations (which drive the same values) start from 0. A press on a
 * window that is exiting or flying into the dock is ignored: stopping those
 * animations would leave their promises unsettled and the window stuck.
 */
export function useWindowDrag(win: WindowState, { busyRef }: WindowDragOptions = {}): WindowDrag {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const isPresent = useIsPresent();
  const [snapPreview, setSnapPreview] = React.useState<SnapBounds | null>(null);
  const [layoutKey, setLayoutKey] = React.useState(0);
  const session = React.useRef<DragSession | null>(null);
  // Read inside the memoized `finish`, so kept in a ref. Synced in a layout
  // effect so render stays pure; no pointer event can land in between.
  const presentRef = React.useRef(isPresent);
  React.useLayoutEffect(() => {
    presentRef.current = isPresent;
  }, [isPresent]);
  const animating = React.useCallback(
    () => !presentRef.current || busyRef?.current === true,
    [busyRef]
  );

  // Runs once per gesture: the first end path to arrive clears the session.
  const finish = React.useCallback(
    (commitSnap: boolean, unmounting = false) => {
      const s = session.current;
      if (!s) return;
      session.current = null;
      s.end();

      // Commit what the drag set, not x/y now: an exit animation may be
      // driving them. No move means no write and x/y are left alone.
      const m = s.moved;
      if (m) {
        const store = useOSStore.getState();
        const stillOpen = store.windows.some(w => w.id === s.windowId);
        if (stillOpen && (m.lastX !== s.baseX || m.lastY !== s.baseY)) {
          store.updateWindowPosition(s.windowId, { x: m.lastX, y: m.lastY });
        }
        // jump() would cancel an exit or genie animation on x/y and its
        // promise would never settle; that animation owns x/y now.
        if (!unmounting && !animating()) {
          x.jump(0);
          y.jump(0);
        }
      }

      if (unmounting) return;
      const snap = s.preview;
      if (snap) setSnapPreview(null);
      if (commitSnap && snap && !animating()) {
        // After Motion has rendered x/y = 0 with left/top at the drop point,
        // so the snap's layout animation measures its start from there.
        frame.postRender(() => {
          // Closed in the frame since release: snapping would make a dead id active.
          const store = useOSStore.getState();
          if (!store.windows.some(w => w.id === s.windowId)) return;
          setLayoutKey(k => k + 1);
          store.snapWindow(s.windowId, snap);
        });
      }
    },
    [x, y, animating]
  );

  // A window closed or minimized mid-drag must not leave the gesture flag set.
  React.useEffect(() => () => finish(false, true), [finish]);

  const onPointerDown: TitlebarHandler = e => {
    if (e.button !== 0 || win.isMaximized || session.current) return;
    if (animating()) return;
    if ((e.target as Element).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    useOSStore.getState().focusWindow(win.id);
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    session.current = {
      windowId: win.id,
      pointerId: e.pointerId,
      px: e.clientX,
      py: e.clientY,
      baseX: win.position.x,
      baseY: win.position.y,
      size: win.size,
      vw,
      vh,
      moved: null,
      leftZones: computeSnap(e.clientX, e.clientY, vw, vh) === null,
      preview: null,
      end: beginWindowGesture(),
    };
  };

  const onPointerMove: TitlebarHandler = e => {
    const s = session.current;
    if (!s || e.pointerId !== s.pointerId || animating()) return;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    if (!s.moved) {
      if (dx === 0 && dy === 0) return;
      // First real move: end any open spring on x/y so it does not fight the
      // drag, and start from where the window is on screen right now, so a
      // grab during the open rise does not jump. controls.stop() would also
      // freeze an in-flight opacity fade.
      x.stop();
      y.stop();
      const startX = s.baseX + x.get();
      const startY = s.baseY + y.get();
      s.moved = { startX, startY, lastX: s.baseX, lastY: s.baseY };
    }
    const m = s.moved;
    const pos = clampWindowPosition(
      { x: Math.round(m.startX + dx), y: Math.round(m.startY + dy) },
      s.size,
      s.vw,
      s.vh
    );
    m.lastX = pos.x;
    m.lastY = pos.y;
    x.set(pos.x - s.baseX);
    y.set(pos.y - s.baseY);

    // A drag that starts inside a zone (window parked at an edge) must leave
    // it once before a preview can show, or every grab there would snap.
    const zone = computeSnap(e.clientX, e.clientY, s.vw, s.vh);
    if (zone === null) s.leftZones = true;
    const next = s.leftZones ? zone : null;
    if (!sameSnap(next, s.preview)) {
      s.preview = next;
      setSnapPreview(next);
    }
  };

  const onEnd = (commitSnap: boolean): TitlebarHandler => e => {
    const s = session.current;
    if (!s || e.pointerId !== s.pointerId) return;
    finish(commitSnap);
  };

  return {
    x,
    y,
    snapPreview,
    layoutKey,
    titlebarProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onEnd(true),
      onPointerCancel: onEnd(false),
      onLostPointerCapture: onEnd(false),
    },
  };
}
