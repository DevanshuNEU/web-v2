'use client';

import React from 'react';
import { useIsPresent } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { resizeBounds, type ResizeDir, type Size, type WindowBounds } from '@/lib/windowGeometry';
import { beginWindowGesture } from '@/lib/windowGesture';
import type { WindowState } from '../../../shared/types';

type HandleHandler = (e: React.PointerEvent<HTMLDivElement>) => void;

export interface ResizeHandleProps {
  onPointerDown: HandleHandler;
  onPointerMove: HandleHandler;
  onPointerUp: HandleHandler;
  onPointerCancel: HandleHandler;
  onLostPointerCapture: HandleHandler;
}

export interface WindowResize {
  isResizing: boolean;
  handleProps: (dir: ResizeDir) => ResizeHandleProps;
}

export interface WindowResizeOptions {
  /** True while the window runs its own x/y animation (genie minimize). */
  busyRef?: React.RefObject<boolean>;
}

interface ResizeSession {
  windowId: string;
  pointerId: number;
  dir: ResizeDir;
  /** Pointer at pointerdown. */
  px: number;
  py: number;
  /** Stored bounds at pointerdown; every move is computed from these. */
  start: WindowBounds;
  /** Last bounds this resize wrote to the element. This is what gets committed. */
  last: WindowBounds;
  vw: number;
  vh: number;
  end: () => void;
}

const sameBounds = (a: WindowBounds, b: WindowBounds) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

/**
 * Edge and corner resize with live bounds. Each move writes left/top/width/
 * height straight to the window element, with no React render and no store
 * write; the store gets one setWindowBounds on release. React leaves those
 * inline styles alone mid-resize because the stored values it renders from
 * have not changed, and after the commit they equal the live ones, so nothing
 * jumps.
 *
 * A press on a window that is exiting or flying into the dock is ignored, and
 * moves stop counting once it starts leaving, so an unmount commits only what
 * the user resized.
 */
export function useWindowResize(
  win: WindowState,
  elRef: React.RefObject<HTMLDivElement | null>,
  minSize: Size,
  { busyRef }: WindowResizeOptions = {}
): WindowResize {
  const isPresent = useIsPresent();
  const [isResizing, setIsResizing] = React.useState(false);
  const session = React.useRef<ResizeSession | null>(null);
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
  const finish = React.useCallback((unmounting = false) => {
    const s = session.current;
    if (!s) return;
    session.current = null;
    s.end();
    const store = useOSStore.getState();
    const stillOpen = store.windows.some(w => w.id === s.windowId);
    if (stillOpen && !sameBounds(s.last, s.start)) {
      store.setWindowBounds(s.windowId, s.last);
    }
    if (!unmounting) setIsResizing(false);
  }, []);

  // A window closed or minimized mid-resize must not leave the gesture flag set.
  React.useEffect(() => () => finish(true), [finish]);

  // Maximizing removes the handles, so no up or lost-capture event would
  // reach them. End here and keep the resized bounds for the restore.
  React.useEffect(() => {
    if (win.isMaximized) finish();
  }, [win.isMaximized, finish]);

  const onPointerDown = (dir: ResizeDir): HandleHandler => e => {
    if (e.button !== 0 || win.isMaximized || session.current) return;
    if (animating()) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    useOSStore.getState().focusWindow(win.id);
    const start = { ...win.position, ...win.size };
    session.current = {
      windowId: win.id,
      pointerId: e.pointerId,
      dir,
      px: e.clientX,
      py: e.clientY,
      start,
      last: start,
      vw: document.documentElement.clientWidth,
      vh: document.documentElement.clientHeight,
      end: beginWindowGesture(),
    };
    setIsResizing(true);
  };

  const onPointerMove: HandleHandler = e => {
    const s = session.current;
    const el = elRef.current;
    if (!s || !el || e.pointerId !== s.pointerId || animating()) return;
    // Whole pixels, so the committed bounds match what was on screen.
    const next = resizeBounds(
      s.start,
      s.dir,
      Math.round(e.clientX - s.px),
      Math.round(e.clientY - s.py),
      s.vw,
      s.vh,
      minSize
    );
    if (sameBounds(next, s.last)) return;
    s.last = next;
    el.style.left = `${next.x}px`;
    el.style.top = `${next.y}px`;
    el.style.width = `${next.width}px`;
    el.style.height = `${next.height}px`;
  };

  const onEnd: HandleHandler = e => {
    const s = session.current;
    if (!s || e.pointerId !== s.pointerId) return;
    finish();
  };

  const handleProps = (dir: ResizeDir): ResizeHandleProps => ({
    onPointerDown: onPointerDown(dir),
    onPointerMove,
    onPointerUp: onEnd,
    onPointerCancel: onEnd,
    onLostPointerCapture: onEnd,
  });

  return { isResizing, handleProps };
}
