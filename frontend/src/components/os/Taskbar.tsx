'use client';

import React, { useState, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { useTheme } from '@/store/themeStore';
import { useIsMono } from '@/hooks/usePalette';
import { appRegistry, getPinnedApps, getAppLabel } from '@/lib/appRegistry';
import { spring } from '@/lib/motion';
import { registerDockIcon } from '@/lib/dockRegistry';
import AppIcon from './AppIcon';
import { Launchpad } from './Launchpad';
import { LayoutGrid } from 'lucide-react';
import type { AppType } from '../../../../shared/types';
import FirstVisitHint from './FirstVisitHint';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BASE_SIZE = 48;   // resting icon size in px
const MAX_SIZE  = 72;   // max icon size at peak magnification
const MAG_RANGE = 140;  // px radius of magnification effect

/* ------------------------------------------------------------------ */
/*  Magnification hook — returns a spring-smoothed scale MotionValue  */
/* ------------------------------------------------------------------ */

function useDockMagnification(
  mouseX: MotionValue<number>,
  ref: React.RefObject<HTMLDivElement | null>,
  reduced: boolean
) {
  const distance = useTransform(mouseX, (val: number) => {
    const el = ref.current;
    if (!el || val === -1) return MAG_RANGE + 1;
    const rect = el.getBoundingClientRect();
    return Math.abs(val - (rect.left + rect.width / 2));
  });

  // Reduced motion: flat scale, no magnification.
  const scale = useTransform(
    distance,
    [0, MAG_RANGE],
    reduced ? [1, 1] : [MAX_SIZE / BASE_SIZE, 1]
  );
  return useSpring(scale, spring.dock);
}

/* ------------------------------------------------------------------ */
/*  Dock icon                                                          */
/*                                                                     */
/*  Two-layer approach so magnification actually pushes neighbors:     */
/*    outer div  — animated WIDTH in the flex layout (pushes others)   */
/*    inner btn  — visual SCALE (grows upward via origin-bottom)       */
/* ------------------------------------------------------------------ */

interface DockIconProps {
  appType: AppType;
  mouseX: MotionValue<number>;
  onClick: () => void;
  isRunning: boolean;
  isMinimized?: boolean;
  reduced: boolean;
}

function DockIcon({ appType, mouseX, onClick, isRunning, isMinimized, reduced }: DockIconProps) {
  // ref lives on the outer div so getBoundingClientRect reflects the layout box
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const scale = useDockMagnification(mouseX, ref, reduced);

  // Publish this icon's live rect so a minimizing window knows where to genie into.
  React.useEffect(
    () => registerDockIcon(appType, () => ref.current?.getBoundingClientRect() ?? null),
    [appType]
  );

  // Drive the outer div's width from the same scale so flex layout expands
  const layoutWidth = useTransform(scale, (s) => Math.round(s * BASE_SIZE));

  const reg = appRegistry[appType];
  if (!reg) return null;

  const label = getAppLabel(appType);

  return (
    // Outer: layout-affecting width, fixed height = BASE_SIZE
    <motion.div
      ref={ref}
      style={{ width: layoutWidth, height: BASE_SIZE }}
      className="relative flex-shrink-0 flex items-end justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover name label — mono, clears the magnified icon */}
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: 'center bottom' }}
            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-8 -translate-x-1/2
                       whitespace-nowrap rounded-md border border-white/15 bg-black/75 px-2 py-1
                       font-mono text-[10px] uppercase tracking-[0.12em] text-white/85 backdrop-blur-md"
          >
            {label.title}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Inner: visual scale only, grows upward */}
      <motion.button
        data-magnetic
        style={{ scale, originY: 1 }}
        onClick={onClick}
        className={`relative cursor-pointer ${isMinimized ? 'opacity-40' : ''}`}
        aria-label={`${label.windowTitle}${isRunning ? ' (open)' : ''}`}
      >
        <AppIcon icon={reg.icon} colorKey={reg.iconColor} size={BASE_SIZE} />

        {isRunning && !isMinimized && (
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/80" />
        )}
      </motion.button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Separator                                                          */
/* ------------------------------------------------------------------ */

function DockDivider() {
  return (
    <div
      className="w-px bg-white/20 mx-1 self-stretch flex-shrink-0"
      style={{ minHeight: BASE_SIZE }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Launchpad button — magnifies + tooltips exactly like a dock icon, */
/*  so the whole dock responds uniformly as the cursor sweeps across.  */
/* ------------------------------------------------------------------ */

interface LaunchpadButtonProps {
  mouseX: MotionValue<number>;
  reduced: boolean;
  open: boolean;
  pulse: boolean;
  mono: boolean;
  isDark: boolean;
  onToggle: () => void;
}

function LaunchpadButton({ mouseX, reduced, open, pulse, mono, isDark, onToggle }: LaunchpadButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const scale = useDockMagnification(mouseX, ref, reduced);
  const layoutWidth = useTransform(scale, (s) => Math.round(s * BASE_SIZE));

  return (
    <motion.div
      ref={ref}
      style={{ width: layoutWidth, height: BASE_SIZE }}
      className="relative flex-shrink-0 flex items-end justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: 'center bottom' }}
            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-8 -translate-x-1/2
                       whitespace-nowrap rounded-md border border-white/15 bg-black/75 px-2 py-1
                       font-mono text-[10px] uppercase tracking-[0.12em] text-white/85 backdrop-blur-md"
          >
            All apps
          </motion.span>
        )}
      </AnimatePresence>

      {/* Pulse ring — first-time visitors only */}
      {pulse && (
        <span
          className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[12px] animate-ping"
          style={{
            width: BASE_SIZE,
            height: BASE_SIZE,
            background: mono
              ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.22)')
              : 'rgba(59,130,246,0.35)',
            animationDuration: '1.6s',
          }}
        />
      )}

      <motion.button
        data-magnetic
        style={{ scale, originY: 1, width: BASE_SIZE, height: BASE_SIZE }}
        onClick={onToggle}
        aria-label="Launchpad, explore all apps"
        className={`relative flex items-center justify-center rounded-[12px] cursor-pointer transition-colors duration-150 ${
          open
            ? 'bg-white/25 dark:bg-white/20'
            : 'bg-white/10 dark:bg-white/[0.08] hover:bg-white/20 dark:hover:bg-white/15'
        }`}
      >
        <LayoutGrid size={22} strokeWidth={1.8} className="text-gray-700 dark:text-gray-200" />
      </motion.button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Taskbar (Dock)                                                     */
/* ------------------------------------------------------------------ */

export default function Taskbar() {
  const windows = useOSStore(s => s.windows);
  const openWindow = useOSStore(s => s.openWindow);
  const focusWindow = useOSStore(s => s.focusWindow);
  const { mode } = useTheme();
  const mono = useIsMono();

  const [launchpadOpen, setLaunchpadOpen] = useState(false);
  const [firstVisit, setFirstVisit] = useState(false);
  const mouseX = useMotionValue(-1);
  const reduced = !!useReducedMotion();

  // Track whether this is a first-time visitor (for pulse on grid button)
  React.useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('devos_hint_dismissed')) {
      setFirstVisit(true);
    }
  }, []);

  const pinnedApps = getPinnedApps().map(a => a.appType);
  const pinnedSet = new Set(pinnedApps);
  const runningUnpinned = windows.filter(w => w.isOpen && !pinnedSet.has(w.appType));

  const handleDockIconClick = (appType: AppType) => {
    const win = windows.find(w => w.appType === appType && w.isOpen);
    if (win) focusWindow(win.id);
    else openWindow(appType);
  };

  return (
    <>
      <Launchpad open={launchpadOpen} onClose={() => setLaunchpadOpen(false)} />
      <FirstVisitHint onDismiss={() => setFirstVisit(false)} />

      {/* Dock shelf — overflow-visible so scaled icons show above the shelf */}
      <div
        role="toolbar"
        aria-label="Dock"
        className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50
                   flex items-end gap-1 px-2.5 pb-2 pt-2
                   rounded-2xl overflow-visible
                   max-w-[calc(100vw-2rem)]"
        style={{
          background: mode === 'dark'
            ? 'rgba(30, 30, 30, 0.5)'
            : 'rgba(243, 243, 243, 0.55)',
          backdropFilter: 'blur(55px) saturate(180%)',
          WebkitBackdropFilter: 'blur(55px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: mode === 'dark'
            ? '0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05) inset'
            : '0 8px 32px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.5) inset',
        }}
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(-1)}
      >
        {/* Launchpad button — magnifies + tooltips like a dock icon */}
        <LaunchpadButton
          mouseX={mouseX}
          reduced={reduced}
          open={launchpadOpen}
          pulse={firstVisit && !launchpadOpen}
          mono={mono}
          isDark={mode === 'dark'}
          onToggle={() => {
            setLaunchpadOpen(!launchpadOpen);
            setFirstVisit(false);
            localStorage.setItem('devos_hint_dismissed', '1');
          }}
        />

        <DockDivider />

        {/* Pinned apps */}
        {pinnedApps.map((appType) => {
          const win = windows.find(w => w.appType === appType && w.isOpen);
          return (
            <DockIcon
              key={appType}
              appType={appType}
              mouseX={mouseX}
              onClick={() => handleDockIconClick(appType)}
              isRunning={!!win}
              isMinimized={win?.isMinimized}
              reduced={reduced}
            />
          );
        })}

        {/* Running non-pinned apps */}
        {runningUnpinned.length > 0 && (
          <>
            <DockDivider />
            {runningUnpinned.map((win) => (
              <DockIcon
                key={win.id}
                appType={win.appType}
                mouseX={mouseX}
                onClick={() => focusWindow(win.id)}
                isRunning
                isMinimized={win.isMinimized}
                reduced={reduced}
              />
            ))}
          </>
        )}
      </div>
    </>
  );
}
