'use client';

/**
 * MobilePushView — iOS UINavigationController.
 *
 * A stack of views where push slides a new view in from the right and pop
 * slides it back out. Anywhere under a <MobilePushView>, children can call
 * `const nav = useMobileNavigation(); nav.push(...)` to drill in.
 *
 * iOS edge-swipe-back is supported: drag from the leftmost 24px of the
 * current view to the right; release past 100px OR with velocity > 500px/s
 * to pop. The drag is scoped to the edge so content inside the view (lists,
 * forms, scroll regions) keeps its normal behaviour.
 *
 * Each view gets an integrated MobileNavBar at the top (auto back button +
 * previous view's title). Pass `hideNavBar: true` on a per-view basis to
 * opt out (e.g. for views that render their own header).
 *
 * Inside the phone shell (an AppChromeContext provider from AppView) the view
 * draws no bar of its own: it hands title, Back and right action to the
 * shell's single nav bar. There, each push also adds a browser history entry,
 * so system back (Android back, Safari's left-edge swipe, the browser button)
 * returns to the previous view instead of closing the whole app, and the
 * in-app edge drag is off so it does not fight Safari's own edge gesture.
 *
 * v1 limitation: views are passed as fully-formed React elements, not
 * route definitions. If your view needs the nav stack, capture it in a
 * closure from a parent that holds `useMobileNavigation()` — or pass
 * `nav` down via props. Route-style declarations (id/component/params)
 * can come later if there's a clear need.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  motion,
  AnimatePresence,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from 'framer-motion';
import { spring, withReduced } from '@/lib/motion';
import MobileNavBar from './MobileNavBar';
import { useAppChrome } from './AppChromeContext';
import {
  isPhoneHistoryState,
  phoneHistoryActive,
  pushPhoneNavEntry,
} from '@/store/mobileStore';

export interface PushViewEntry {
  /** Unique ID; used as the React key for animation continuity. */
  id: string;
  /** Shown in the integrated NavBar. Required unless `hideNavBar`. */
  title?: string;
  /** The view body rendered under the NavBar. */
  element: React.ReactNode;
  /** Skip the integrated NavBar for this view (caller renders their own). */
  hideNavBar?: boolean;
  /** Optional right-side action in the NavBar. */
  navBarRight?: React.ReactNode;
}

export interface MobileNavigation {
  /** Push a new view onto the stack. */
  push: (view: PushViewEntry) => void;
  /** Pop the top view. No-op at root. */
  pop: () => void;
  /** Pop every view down to the root. No-op at root. */
  popToRoot: () => void;
  /** Current stack depth. 1 = at root. */
  depth: number;
}

const NavContext = createContext<MobileNavigation | null>(null);

export function useMobileNavigation(): MobileNavigation {
  const ctx = useContext(NavContext);
  if (!ctx) {
    throw new Error('useMobileNavigation must be used within <MobilePushView>');
  }
  return ctx;
}

export interface MobilePushViewProps {
  /** The initial view at the bottom of the stack. */
  rootView: PushViewEntry;
  /** Render the integrated NavBar on each view (unless overridden per-view). */
  showNavBar?: boolean;
  /** Enable the iOS edge-swipe-back gesture. Default true. */
  enableSwipeBack?: boolean;
  className?: string;
}

const SWIPE_BACK_EDGE_PX = 32;
const SWIPE_BACK_DISMISS_OFFSET_PX = 100;
const SWIPE_BACK_DISMISS_VELOCITY = 500;

export default function MobilePushView({
  rootView,
  showNavBar = true,
  enableSwipeBack = true,
  className = '',
}: MobilePushViewProps) {
  const [stack, setStack] = useState<PushViewEntry[]>([rootView]);
  const chrome = useAppChrome();
  const inShell = chrome !== null;
  // Mirror of stack.length for the callbacks below, so they stay stable.
  const depthRef = useRef(1);
  depthRef.current = stack.length;

  const popLocal = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  const push = useCallback(
    (view: PushViewEntry) => {
      if (inShell) pushPhoneNavEntry(depthRef.current + 1);
      setStack((s) => [...s, view]);
    },
    [inShell]
  );

  // In the shell, Back goes through history so the browser's stack and ours
  // never disagree; the popstate listener below does the actual pop.
  const pop = useCallback(() => {
    if (depthRef.current <= 1) return;
    if (inShell && phoneHistoryActive()) window.history.back();
    else popLocal();
  }, [inShell, popLocal]);

  const popToRoot = useCallback(() => {
    const extra = depthRef.current - 1;
    if (extra <= 0) return;
    if (inShell && phoneHistoryActive()) window.history.go(-extra);
    else setStack((s) => (s.length > 1 ? [s[0]] : s));
  }, [inShell]);

  useEffect(() => {
    if (!inShell) return;
    const onPop = (e: PopStateEvent) => {
      // Landing on our depth-N entry means views above N were popped. Any
      // other entry means the app is closing; PhoneShell handles that.
      if (!isPhoneHistoryState(e.state)) return;
      const depth = Math.max(1, e.state.devosDepth);
      setStack((s) => (s.length > depth ? s.slice(0, depth) : s));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [inShell]);

  // Hand the top view's navigation to the shell's nav bar.
  const top = stack[stack.length - 1];
  const below = stack.length > 1 ? stack[stack.length - 2] : undefined;
  useEffect(() => {
    if (!chrome) return;
    chrome.setNav({
      title: top.title,
      onBack: below ? pop : undefined,
      backLabel: below?.title,
      rightAction: top.navBarRight,
    });
  }, [chrome, top, below, pop]);
  useEffect(() => {
    if (!chrome) return;
    return () => chrome.setNav(null);
  }, [chrome]);

  const nav = useMemo<MobileNavigation>(
    () => ({ push, pop, popToRoot, depth: stack.length }),
    [push, pop, popToRoot, stack.length]
  );

  return (
    <NavContext.Provider value={nav}>
      <div
        data-testid="push-view-container"
        className={`relative h-full w-full overflow-hidden ${className}`}
      >
        <AnimatePresence initial={false}>
          {stack.map((view, i) => (
            <StackedView
              key={view.id}
              view={view}
              index={i}
              previousTitle={i > 0 ? stack[i - 1].title : undefined}
              isTop={i === stack.length - 1}
              showNavBar={showNavBar && !inShell}
              enableSwipeBack={enableSwipeBack && !inShell}
              onPop={pop}
            />
          ))}
        </AnimatePresence>
      </div>
    </NavContext.Provider>
  );
}

interface StackedViewProps {
  view: PushViewEntry;
  index: number;
  previousTitle: string | undefined;
  isTop: boolean;
  showNavBar: boolean;
  enableSwipeBack: boolean;
  onPop: () => void;
}

function StackedView({
  view,
  index,
  previousTitle,
  isTop,
  showNavBar,
  enableSwipeBack,
  onPop,
}: StackedViewProps) {
  const dragControls = useDragControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const canSwipeBack = isTop && index > 0 && enableSwipeBack;

  /**
   * Only initiate a drag if the pointer comes down within SWIPE_BACK_EDGE_PX
   * of the view's left edge. Without this gate, *any* horizontal pan inside
   * the view (scrolling a carousel, swiping a list row) would start a pop.
   */
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canSwipeBack) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xWithin = e.clientX - rect.left;
    if (xWithin < SWIPE_BACK_EDGE_PX) {
      dragControls.start(e);
    }
  };

  const handleDragEnd = (
    _: PointerEvent | MouseEvent | TouchEvent,
    info: PanInfo
  ) => {
    if (
      info.offset.x > SWIPE_BACK_DISMISS_OFFSET_PX ||
      info.velocity.x > SWIPE_BACK_DISMISS_VELOCITY
    ) {
      onPop();
    }
  };

  return (
    <motion.div
      ref={containerRef}
      data-testid={`push-view-${view.id}`}
      data-stack-index={index}
      onPointerDown={handlePointerDown}
      drag={canSwipeBack ? 'x' : false}
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ left: 0 }}
      dragElastic={0}
      onDragEnd={handleDragEnd}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={withReduced(spring.window, reduced)}
      style={{ zIndex: index + 1 }}
      className="absolute inset-0 flex flex-col bg-bg"
    >
      {showNavBar && !view.hideNavBar && (
        <MobileNavBar
          title={view.title ?? ''}
          onBack={index > 0 ? onPop : undefined}
          backLabel={previousTitle}
          rightAction={view.navBarRight}
        />
      )}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {view.element}
      </div>
    </motion.div>
  );
}
