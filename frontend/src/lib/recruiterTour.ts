/**
 * Quick tour (Option+T, or `tour` in Terminal)
 *
 * Walks through About Me, Projects and Resume one window at a time. A small
 * bar at the top of the screen says where you are ("Quick tour 1 of 3: About
 * Me") and carries Next and Stop. The tour stops on:
 *   - the Stop button,
 *   - Esc (caught in the capture phase, so Esc stops the tour instead of
 *     closing the window underneath),
 *   - running it again (a second Option+T or `tour`).
 *
 * Only one tour window is visible at a time: moving on closes the previous
 * stop's window if the tour opened it, or minimizes it if the visitor already
 * had it open. Stops advance on a timer, except under reduced motion, where
 * only Next moves the tour on.
 *
 * Not to be confused with the Help app's walkthrough (HelpApp.tsx).
 *
 * Implementation notes:
 *   - Uses Zustand getState() calls directly (no React hooks), so this can be
 *     called from anywhere: terminal commands, keyboard shortcuts.
 *   - The bar is plain DOM appended to <body>. It needs no shell component,
 *     and it is removed on every exit path.
 */

import { useOSStore } from '@/store/osStore';
import { useNotificationStore } from '@/store/notificationStore';
import { getAppLabel } from '@/lib/appRegistry';
import { contactLinks } from '@/data/aboutMe';
import type { AppType } from '../../../shared/types';

export const TOUR_STOPS: AppType[] = ['about-me', 'projects', 'resume'];

/** Time on each stop before the tour moves on by itself. */
export const STOP_MS = 7000;

export const TOUR_BAR_ID = 'devos-quick-tour';

interface ActiveTour {
  stop: (reason: 'stopped' | 'done' | 'silent') => void;
  next: () => void;
}

let active: ActiveTour | null = null;

export function isRecruiterTourRunning(): boolean {
  return active !== null;
}

/** Stop the running tour, if any. */
export function stopRecruiterTour(): void {
  active?.stop('stopped');
}

/** Move the running tour to its next stop, if any. */
export function nextRecruiterTourStop(): void {
  active?.next();
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const BTN =
  'inline-flex min-h-[32px] items-center px-3 text-sm transition-colors duration-150 ';

function buildBar(onNext: () => void, onStop: () => void) {
  const bar = document.createElement('div');
  bar.id = TOUR_BAR_ID;
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Quick tour');
  bar.className =
    'fixed left-1/2 top-9 z-[2147483000] flex -translate-x-1/2 items-center gap-2 ' +
    'border border-border bg-surface/95 py-1.5 pl-4 pr-1.5 text-text shadow-lg backdrop-blur-xl';

  const status = document.createElement('span');
  status.setAttribute('aria-live', 'polite');
  status.className = 'whitespace-nowrap pr-2 text-sm';

  const next = document.createElement('button');
  next.type = 'button';
  next.className = BTN + 'border border-text font-medium text-text hover:bg-text hover:text-bg';
  next.addEventListener('click', onNext);

  const stop = document.createElement('button');
  stop.type = 'button';
  stop.textContent = 'Stop';
  stop.className = BTN + 'text-text-secondary hover:text-text';
  stop.addEventListener('click', onStop);

  bar.append(status, next, stop);
  document.body.appendChild(bar);
  return { bar, status, next };
}

export function runRecruiterTour(): () => void {
  // Running it again stops it.
  if (active) {
    active.stop('stopped');
    return () => {};
  }
  if (typeof document === 'undefined') return () => {};

  const os = () => useOSStore.getState();
  const push = useNotificationStore.getState().push;
  const reduced = prefersReducedMotion();

  // Windows the visitor already had open: minimize those instead of closing.
  const preexisting = new Set(
    os().windows.filter((w) => w.isOpen).map((w) => w.appType),
  );

  let index = -1;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const hidePrevious = (appType: AppType) => {
    const w = os().windows.find((x) => x.appType === appType && x.isOpen);
    if (!w) return;
    if (preexisting.has(appType)) {
      if (!w.isMinimized) os().minimizeWindow(w.id);
    } else {
      os().closeWindow(w.id);
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    tour.stop('stopped');
  };

  const ui = buildBar(
    () => tour.next(),
    () => tour.stop('stopped'),
  );

  const show = (i: number) => {
    if (index >= 0) hidePrevious(TOUR_STOPS[index]);
    index = i;
    const appType = TOUR_STOPS[i];
    os().openWindow(appType);
    const isLast = i === TOUR_STOPS.length - 1;
    ui.status.textContent = `Quick tour ${i + 1} of ${TOUR_STOPS.length}: ${getAppLabel(appType).title}`;
    ui.next.textContent = isLast ? 'Done' : 'Next';
    clearTimer();
    if (!reduced) timer = setTimeout(() => tour.next(), STOP_MS);
  };

  const tour: ActiveTour = {
    next: () => {
      if (index >= TOUR_STOPS.length - 1) tour.stop('done');
      else show(index + 1);
    },
    stop: (reason) => {
      if (active !== tour) return;
      active = null;
      clearTimer();
      window.removeEventListener('keydown', onKey, true);
      ui.bar.remove();
      if (reason === 'done') {
        push({
          title: "That's the tour.",
          body: `To get in touch, open ${getAppLabel('contact').title} or email ${contactLinks.email}.`,
          dismissAfter: 7000,
        });
      } else if (reason === 'stopped') {
        push({ title: 'Tour stopped', body: 'Press Option+T to start it again.', dismissAfter: 3500 });
      }
    },
  };

  active = tour;
  window.addEventListener('keydown', onKey, true);
  show(0);

  return () => tour.stop('silent');
}
