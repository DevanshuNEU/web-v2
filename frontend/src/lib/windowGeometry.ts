/**
 * Window sizing geometry: open-time fitting and edge/corner resizing.
 *
 * Pure functions so the clamping can be unit-tested without a DOM. Same
 * coordinate space as windowSnap: viewport pixels, with the usable desktop
 * band between the 28px menu bar and the ~60px dock.
 */

import { MENUBAR_H, DOCK_H, type SnapBounds } from '@/lib/windowSnap';

export type WindowBounds = SnapBounds;
export type Size = { width: number; height: number };

/** Which edges a resize handle moves: n/s/e/w and the four corners. */
export type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** Smallest a window may be resized to unless its registry entry says otherwise. */
export const DEFAULT_MIN_SIZE: Size = { width: 380, height: 300 };

/** Breathing room kept around a window that opens at the largest size that fits. */
export const WINDOW_MARGIN = 24;

/**
 * Fit a window's requested size and position to the current viewport.
 * Size shrinks to the viewport minus a margin (never below minSize, unless the
 * screen itself is smaller). Position is centered in the desktop band, or kept
 * and pushed back inside the band when it would spill past an edge.
 */
export function fitWindow(
  size: Size,
  position: { x: number; y: number } | 'center',
  vw: number,
  vh: number,
  minSize: Size = DEFAULT_MIN_SIZE
): WindowBounds {
  const bandH = vh - MENUBAR_H - DOCK_H;
  const minW = Math.min(minSize.width, vw);
  const minH = Math.min(minSize.height, bandH);
  const width = Math.round(Math.max(minW, Math.min(size.width, vw - 2 * WINDOW_MARGIN)));
  const height = Math.round(Math.max(minH, Math.min(size.height, bandH - WINDOW_MARGIN)));

  if (position === 'center') {
    return {
      x: Math.max(0, Math.round((vw - width) / 2)),
      y: MENUBAR_H + Math.max(0, Math.round((bandH - height) / 2)),
      width,
      height,
    };
  }

  return {
    x: Math.max(0, Math.min(position.x, vw - width)),
    y: Math.max(MENUBAR_H, Math.min(position.y, vh - DOCK_H - height)),
    width,
    height,
  };
}

/**
 * New bounds for a resize that started at `start` and has moved the pointer
 * by (dx, dy). Dragging the left or top edge moves the position so the
 * opposite edge stays put. Each moving edge stops at minSize and at the
 * desktop band (viewport left/right, menu bar, dock).
 */
export function resizeBounds(
  start: WindowBounds,
  dir: ResizeDir,
  dx: number,
  dy: number,
  vw: number,
  vh: number,
  minSize: Size = DEFAULT_MIN_SIZE
): WindowBounds {
  let { x, y, width, height } = start;

  if (dir.includes('e')) {
    width = Math.max(minSize.width, Math.min(vw - start.x, start.width + dx));
  }
  if (dir.includes('w')) {
    const right = start.x + start.width;
    x = Math.min(right - minSize.width, Math.max(0, start.x + dx));
    width = right - x;
  }
  if (dir.includes('s')) {
    height = Math.max(minSize.height, Math.min(vh - DOCK_H - start.y, start.height + dy));
  }
  if (dir.includes('n')) {
    const bottom = start.y + start.height;
    y = Math.min(bottom - minSize.height, Math.max(MENUBAR_H, start.y + dy));
    height = bottom - y;
  }

  return { x, y, width, height };
}
