/**
 * Recruiter Tour
 *
 * A self-running guided walkthrough of the portfolio — opens About Me,
 * Projects, and Resume in sequence with delays, like a kiosk demo.
 *
 * Usage:
 *   runRecruiterTour()  — called from terminal `tour` command or Cmd+Shift+T
 *
 * Implementation notes:
 *   - Uses Zustand store getState() calls directly (no React hooks needed)
 *     so this function can be called from anywhere (terminal commands,
 *     keyboard shortcuts, etc.) without coupling to component lifecycle.
 *   - Window positions are staggered so windows cascade and don't fully
 *     overlap — visitors can see all three are open.
 *   - Returns a cleanup function that cancels pending timers if called
 *     (e.g. if the user closes the terminal before the tour finishes).
 */

import { useOSStore } from '@/store/osStore';
import { useNotificationStore } from '@/store/notificationStore';

// Tour stops: each opens a window after `delay` ms from tour start
const TOUR_STOPS = [
  { appType: 'about-me'  as const, delay: 300,  position: { x: 80,  y: 80  } },
  { appType: 'projects'  as const, delay: 4500, position: { x: 180, y: 110 } },
  { appType: 'resume'    as const, delay: 9000, position: { x: 280, y: 140 } },
];

const TOUR_DONE_DELAY = 13_000; // ms after start to show the closing notification

export function runRecruiterTour(): () => void {
  const { openWindow, windows } = useOSStore.getState();
  const push = useNotificationStore.getState().push;

  // Don't start if a tour notification already exists (prevent double-firing)
  // We can detect this loosely by checking if all 3 apps are already open.
  const allOpen = TOUR_STOPS.every(stop =>
    windows.some(w => w.appType === stop.appType && w.isOpen)
  );
  if (allOpen) {
    push({
      title: 'Tour already running',
      body: "All windows are already open. You're ahead of schedule.",
      dismissAfter: 4000,
    });
    return () => {};
  }

  // Kick off with an intro notification
  push({
    title: 'Recruiter Tour starting...',
    body: 'Sit back. The portfolio will present itself.',
    dismissAfter: 3500,
  });

  const timers: ReturnType<typeof setTimeout>[] = [];

  // Open each window at its scheduled time with a custom position
  for (const stop of TOUR_STOPS) {
    timers.push(
      setTimeout(() => {
        // Re-read openWindow from store at call time (safest pattern)
        useOSStore.getState().openWindow(stop.appType, { position: stop.position });
      }, stop.delay)
    );
  }

  // Closing notification
  timers.push(
    setTimeout(() => {
      useNotificationStore.getState().push({
        title: 'Tour complete.',
        body: "Questions? Open Ping Me and say hello.",
        dismissAfter: 6000,
      });
    }, TOUR_DONE_DELAY)
  );

  // Return a cleanup function so callers can cancel if needed
  return () => timers.forEach(clearTimeout);
}
