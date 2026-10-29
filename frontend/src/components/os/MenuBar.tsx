'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTheme } from '@/store/themeStore';
import { useSpotlightStore } from '@/store/spotlightStore';
import { identity } from '@/data/aboutMe';
import { Z } from '@/lib/zLayers';
import { useOSStore } from '@/store/osStore';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { getAppLabel } from '@/lib/appRegistry';
import { isSoundEnabled, setSoundEnabled } from '@/hooks/useSoundEffects';
import { Sun, Moon, Volume2, VolumeX, Search } from 'lucide-react';
import { WifiTray, BatteryTray } from './TrayMenus';

export default function MenuBar() {
  const { mode, toggleMode } = useTheme();
  const trackEvent = useAnalyticsStore(s => s.trackEvent);
  const windows = useOSStore(s => s.windows);
  const activeWindowId = useOSStore(s => s.activeWindowId);

  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => { setSoundOn(isSoundEnabled()); }, []);

  const handleSoundToggle = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
  };

  const openSpotlight = useSpotlightStore(s => s.open);
  const reduced = useReducedMotion();
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  const activeWindow = windows.find(w => w.id === activeWindowId && w.isOpen && !w.isMinimized);
  const activeAppLabel = activeWindow
    ? getAppLabel(activeWindow.appType).windowTitle
    : null;

  const handleThemeToggle = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    toggleMode();
    trackEvent('theme_change', `Switched to ${next} mode`, { theme: next });
  };

  const formattedTime = time
    ? time.toLocaleTimeString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  const isDark = mode === 'dark';

  return (
    <div
      role="banner"
      aria-label="System menu bar"
      className="fixed top-0 inset-x-0 h-7 flex items-center justify-between gap-4 px-3 select-none"
      style={{
        zIndex: Z.menuBar,
        background: isDark ? 'rgba(20, 20, 20, 0.72)' : 'rgba(248, 248, 248, 0.72)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderBottom: isDark
          ? '1px solid rgba(255,255,255,0.06)'
          : '1px solid rgba(0,0,0,0.08)',
      }}
    >
      {/* Left: the owner's name, always, then the focused app like macOS */}
      <div className="flex min-w-0 items-center gap-3 overflow-hidden">
        <span className="whitespace-nowrap text-[13px] font-semibold tracking-[-0.01em] text-text">
          {identity.name}
        </span>
        <AnimatePresence mode="wait" initial={false}>
          {activeAppLabel && (
            <motion.span
              key={activeAppLabel}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="truncate text-[13px] text-text-secondary"
            >
              {activeAppLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Right: system tray */}
      <div className="flex items-center gap-0.5">
        {/* Visible way into Spotlight: most visitors never guess Cmd+K */}
        <button
          type="button"
          onClick={openSpotlight}
          aria-label={`Search devOS (${isMac ? 'Command' : 'Control'} K)`}
          aria-haspopup="dialog"
          className="mr-1 flex h-6 items-center gap-1.5 rounded-md px-2 text-[12px] text-text
                     hover:bg-text/10 transition-colors duration-100 cursor-pointer"
        >
          <Search size={13} strokeWidth={2} aria-hidden />
          <span>Search</span>
          <kbd className="rounded border border-text/20 px-1 font-sans text-[11px] leading-[16px] text-text-secondary">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </button>

        {/* Wi-Fi and battery: tray menus with easter eggs (TrayMenus.tsx) */}
        <WifiTray isDark={isDark} />
        <BatteryTray isDark={isDark} />

        {/* Volume / mute toggle */}
        <button
          onClick={handleSoundToggle}
          className="flex items-center justify-center w-7 h-6 rounded-md cursor-pointer
                     hover:bg-text/10 transition-colors duration-100"
          title={soundOn ? 'Mute sounds' : 'Unmute sounds'}
          aria-label={soundOn ? 'Mute sounds' : 'Unmute sounds'}
          aria-pressed={soundOn}
        >
          {soundOn
            ? <Volume2 size={13} strokeWidth={1.8} style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)' }} />
            : <VolumeX size={13} strokeWidth={1.8} style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)' }} />
          }
        </button>

        {/* Divider */}
        <div
          className="w-px h-3.5 mx-1"
          style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }}
        />

        {/* Theme toggle */}
        <button
          onClick={handleThemeToggle}
          className="flex items-center justify-center w-7 h-6 rounded-md
                     hover:bg-text/10 transition-colors duration-100 cursor-pointer"
          title={isDark ? 'Light mode' : 'Dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark
            ? <Sun size={13} strokeWidth={2} style={{ color: 'rgba(255,255,255,0.75)' }} />
            : <Moon size={13} strokeWidth={2} style={{ color: 'rgba(0,0,0,0.65)' }} />
          }
        </button>

        {/* Divider */}
        <div
          className="w-px h-3.5 mx-1"
          style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }}
        />

        {/* Date + time */}
        <span
          className="text-[12px] font-medium tabular-nums px-1 cursor-default"
          style={{ color: isDark ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.75)' }}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
}
