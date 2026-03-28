'use client';

import React, { useState, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { useTheme } from '@/store/themeStore';
import { appRegistry, getPinnedApps, getAppLabel } from '@/lib/appRegistry';
import AppIcon from './AppIcon';
import { Launchpad } from './Launchpad';
import { LayoutGrid } from 'lucide-react';
import type { AppType } from '../../../../shared/types';

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
  ref: React.RefObject<HTMLDivElement | null>
) {
  const distance = useTransform(mouseX, (val: number) => {
    const el = ref.current;
    if (!el || val === -1) return MAG_RANGE + 1;
    const rect = el.getBoundingClientRect();
    return Math.abs(val - (rect.left + rect.width / 2));
  });

  const scale = useTransform(distance, [0, MAG_RANGE], [MAX_SIZE / BASE_SIZE, 1]);
  return useSpring(scale, { damping: 18, stiffness: 220, mass: 0.6 });
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
}

function DockIcon({ appType, mouseX, onClick, isRunning, isMinimized }: DockIconProps) {
  // ref lives on the outer div so getBoundingClientRect reflects the layout box
  const ref = useRef<HTMLDivElement>(null);
  const scale = useDockMagnification(mouseX, ref);

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
    >
      {/* Inner: visual scale only, grows upward */}
      <motion.button
        style={{ scale, originY: 1 }}
        onClick={onClick}
        className={`relative cursor-pointer ${isMinimized ? 'opacity-40' : ''}`}
        title={label.windowTitle}
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
/*  Taskbar (Dock)                                                     */
/* ------------------------------------------------------------------ */

export default function Taskbar() {
  const windows = useOSStore(s => s.windows);
  const openWindow = useOSStore(s => s.openWindow);
  const focusWindow = useOSStore(s => s.focusWindow);
  const { mode } = useTheme();

  const [launchpadOpen, setLaunchpadOpen] = useState(false);
  const mouseX = useMotionValue(-1);

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

      {/* Dock shelf — overflow-visible so scaled icons show above the shelf */}
      <div
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
        {/* Launchpad button */}
        <button
          onClick={() => setLaunchpadOpen(!launchpadOpen)}
          className={`
            flex-shrink-0 rounded-[11px] flex items-center justify-center
            transition-all duration-150 cursor-pointer
            ${launchpadOpen
              ? 'bg-white/25 dark:bg-white/20'
              : 'bg-white/10 dark:bg-white/8 hover:bg-white/20 dark:hover:bg-white/15'}
          `}
          style={{ width: BASE_SIZE, height: BASE_SIZE }}
          title="Launchpad"
        >
          <LayoutGrid size={22} strokeWidth={1.8} className="text-gray-700 dark:text-gray-200" />
        </button>

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
              />
            ))}
          </>
        )}
      </div>
    </>
  );
}
