/**
 * Window edge-snapping geometry.
 *
 * Pure function so the snap targets can be unit-tested without a DOM. All
 * values are viewport coordinates, matching how windows are positioned
 * (maximize uses top: 28 and full 100vh). The usable band sits between the
 * 28px menu bar and the ~60px dock.
 */

export type SnapBounds = { x: number; y: number; width: number; height: number };

export const MENUBAR_H = 28;
export const DOCK_H = 60;
export const SNAP_EDGE = 26; // px proximity to a screen edge that triggers a snap

/**
 * Given the pointer position and viewport size, return the region the window
 * should snap to, or null when the pointer isn't near an edge.
 */
export function computeSnap(
  px: number,
  py: number,
  vw: number,
  vh: number
): SnapBounds | null {
  const top = MENUBAR_H;
  const bottom = vh - DOCK_H;
  const usableH = bottom - top;
  const halfW = Math.round(vw / 2);
  const halfH = Math.round(usableH / 2);

  const nearLeft = px <= SNAP_EDGE;
  const nearRight = px >= vw - SNAP_EDGE;
  const nearTop = py <= top + SNAP_EDGE;
  const nearBottom = py >= bottom - SNAP_EDGE;

  if (nearLeft && nearTop) return { x: 0, y: top, width: halfW, height: halfH };
  if (nearRight && nearTop) return { x: vw - halfW, y: top, width: halfW, height: halfH };
  if (nearLeft && nearBottom) return { x: 0, y: top + halfH, width: halfW, height: halfH };
  if (nearRight && nearBottom) return { x: vw - halfW, y: top + halfH, width: halfW, height: halfH };
  if (nearTop) return { x: 0, y: top, width: vw, height: usableH }; // fill
  if (nearLeft) return { x: 0, y: top, width: halfW, height: usableH };
  if (nearRight) return { x: vw - halfW, y: top, width: halfW, height: usableH };
  return null;
}
