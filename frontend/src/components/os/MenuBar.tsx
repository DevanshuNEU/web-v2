'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/store/themeStore';
import { useOSStore } from '@/store/osStore';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { getAppLabel } from '@/lib/appRegistry';
import { isSoundEnabled, setSoundEnabled } from '@/hooks/useSoundEffects';
import { Sun, Moon, Wifi, Volume2, VolumeX, BatteryMedium } from 'lucide-react';

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

  const activeWindow = windows.find(w => w.id === activeWindowId && w.isOpen);
  const activeAppLabel = activeWindow
    ? getAppLabel(activeWindow.appType).windowTitle
    : 'devOS';

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
      className="fixed top-0 inset-x-0 z-[999] h-7 flex items-center justify-between px-3 select-none"
      style={{
        background: isDark ? 'rgba(20, 20, 20, 0.72)' : 'rgba(248, 248, 248, 0.72)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderBottom: isDark
          ? '1px solid rgba(255,255,255,0.06)'
          : '1px solid rgba(0,0,0,0.08)',
      }}
    >
      {/* Left — active app name */}
      <div className="flex items-center">
        <span
          className="text-[13px] font-semibold tracking-[-0.01em]"
          style={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.80)' }}
        >
          {activeAppLabel}
        </span>
      </div>

      {/* Right — system tray */}
      <div className="flex items-center gap-0.5">
        {/* Wifi indicator */}
        <div
          className="flex items-center justify-center w-7 h-6 rounded-md cursor-default
                     hover:bg-white/10 dark:hover:bg-white/8 transition-colors duration-100"
          title="Connected"
        >
          <Wifi
            size={13}
            strokeWidth={2}
            style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)' }}
          />
        </div>

        {/* Battery indicator */}
        <div
          className="flex items-center justify-center w-7 h-6 rounded-md cursor-default
                     hover:bg-white/10 dark:hover:bg-white/8 transition-colors duration-100"
          title="Battery"
        >
          <BatteryMedium
            size={14}
            strokeWidth={1.8}
            style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)' }}
          />
        </div>

        {/* Volume / mute toggle */}
        <button
          onClick={handleSoundToggle}
          className="flex items-center justify-center w-7 h-6 rounded-md cursor-pointer
                     hover:bg-white/10 dark:hover:bg-white/8 transition-colors duration-100"
          title={soundOn ? 'Mute sounds' : 'Unmute sounds'}
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
                     hover:bg-white/10 dark:hover:bg-white/8 transition-colors duration-100 cursor-pointer"
          title={isDark ? 'Switch to Light' : 'Switch to Dark'}
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
