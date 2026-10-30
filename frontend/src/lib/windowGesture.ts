/**
 * Window gesture flag. A drag or resize calls `beginWindowGesture()` on start
 * and the returned `end()` on every exit path (including unmount). While any
 * gesture is active, `<html data-window-drag>` is set so CSS can stop iframes
 * from swallowing pointer events, and the wallpaper parallax holds still.
 *
 * A counter (not a boolean) so overlapping gestures clear only when the last
 * one ends. `end` is idempotent and the count never goes negative.
 */

let active = 0;

export function beginWindowGesture(): () => void {
  active += 1;
  document.documentElement.dataset.windowDrag = '';
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    active = Math.max(0, active - 1);
    if (active === 0) delete document.documentElement.dataset.windowDrag;
  };
}

export function isWindowGestureActive(): boolean {
  return active > 0;
}
