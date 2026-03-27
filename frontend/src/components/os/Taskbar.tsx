'use client';

/**
 * Taskbar
 *
 * macOS-style floating dock with magnification effect.
 * - Start menu button
 * - Running apps with dock magnification
 * - System tray (theme toggle, clock)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { useTheme } from '@/store/themeStore';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { appRegistry, getAppLabel } from '@/lib/appRegistry';
import { toastMessages } from '@/data/copy';
import { toast } from 'sonner';
import { StartMenu } from './StartMenu';
import { Sun, Moon, Grid3x3 } from 'lucide-react';
import type { AppType } from '../../../../shared/types';

// ---------------------------------------------------------------------------
// Dock Icon with magnification
// ---------------------------------------------------------------------------

function useDockMagnification(mouseX: MotionValue<number>, ref: React.RefObject<HTMLButtonElement | null>) {
  const distance = useTransform(mouseX, (val: number) => {
    const el = ref.current;
    if (!el || val === -1) return 150;
    const rect = el.getBoundingClientRect();
    return Math.abs(val - (rect.left + rect.width / 2));
  });

  const scale = useTransform(distance, [0, 150], [1.5, 1]);
  const smoothScale = useSpring(scale, { damping: 20, stiffness: 200 });

  return smoothScale;
}

interface DockIconProps {
  appType: AppType;
  windowId: string;
  isActive: boolean;
  isMinimized: boolean;
  mouseX: MotionValue<number>;
}

function DockIcon({ appType, windowId, isActive, isMinimized, mouseX }: DockIconProps) {
  const focusWindow = useOSStore(state => state.focusWindow);
  const ref = useRef<HTMLButtonElement>(null);
  const scale = useDockMagnification(mouseX, ref);

  const registration = appRegistry[appType];
  if (!registration) return null;
  const IconComponent = registration.icon;
  const label = getAppLabel(appType);

  return (
    <motion.button
      ref={ref}
      style={{ scale }}
      onClick={() => focusWindow(windowId)}
      className={`
        relative p-2.5 rounded-lg cursor-pointer
        transition-colors duration-200
        hover:bg-surface/50
        ${isActive && !isMinimized ? 'bg-accent/10 text-accent' : 'text-text-secondary'}
        ${isMinimized ? 'opacity-50' : ''}
      `}
      title={label.windowTitle}
    >
      <IconComponent size={20} />
      {!isMinimized && (
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
      )}
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Taskbar() {
  const windows = useOSStore(state => state.windows);
  const activeWindowId = useOSStore(state => state.activeWindowId);
  const { mode, toggleMode } = useTheme();
  const trackEvent = useAnalyticsStore(state => state.trackEvent);

  const runningApps = windows.filter(w => w.isOpen);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const mouseX = useMotionValue(-1);

  // Live clock
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle theme toggle with personality
  const handleThemeToggle = () => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    toggleMode();
    trackEvent('theme_change', `Switched to ${newMode} mode`, { theme: newMode });
    toast.success(newMode === 'dark' ? toastMessages.themeDark : toastMessages.themeLight);
  };

  return (
    <>
      <StartMenu open={startMenuOpen} onClose={() => setStartMenuOpen(false)} />

      <div
        className="fixed bottom-2 left-1/2 -translate-x-1/2 h-16 px-4 z-50
                    w-[calc(100%-2rem)] max-w-7xl
                    glass-heavy
                    bg-white/10 dark:bg-white/5
                    border border-white/20 dark:border-white/10
                    rounded-2xl
                    shadow-glass-xl
                    flex items-center justify-between"
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(-1)}
      >
        {/* Left: Start Button */}
        <div className="flex items-center">
          <button
            onClick={() => setStartMenuOpen(!startMenuOpen)}
            className={`p-2 rounded-lg transition-all duration-200 hover:scale-105
                       ${startMenuOpen ? 'bg-accent/20 text-accent' : 'text-text hover:bg-surface/50'}`}
            title="Start Menu"
          >
            <Grid3x3 size={20} />
          </button>
        </div>

        {/* Center: Running Apps with Dock Magnification */}
        <div className="flex items-center justify-center gap-1 flex-1">
          {runningApps.length === 0 ? (
            <div className="text-xs text-text-secondary/50">
              Desktop&apos;s looking clean. Too clean.
            </div>
          ) : (
            runningApps.map((window) => (
              <DockIcon
                key={window.id}
                appType={window.appType}
                windowId={window.id}
                isActive={activeWindowId === window.id}
                isMinimized={window.isMinimized}
                mouseX={mouseX}
              />
            ))
          )}
        </div>

        {/* Right: System Tray */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleThemeToggle}
            className="p-2 rounded-lg hover:bg-surface/50 transition-all duration-200 text-text hover:scale-105"
            title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="text-sm font-medium text-text min-w-[60px] text-right">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </>
  );
}
