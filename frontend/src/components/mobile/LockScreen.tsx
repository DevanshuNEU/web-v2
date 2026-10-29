'use client';

/**
 * LockScreen — iOS-style lock screen.
 *
 * Big time on top, date below, "tap or swipe up" hint at the bottom.
 * A tap anywhere or an upward swipe reveals the home screen.
 * Mirrors the dramatic feel of BootSequence — the user's first impression.
 */

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronUp, MapPin } from 'lucide-react';
import { useMobileStore } from '@/store/mobileStore';
import { useSwipe } from '@/hooks/useSwipe';
import { useHaptics } from '@/hooks/useHaptics';
import { useIsMono } from '@/hooks/usePalette';
import { identity } from '@/data/aboutMe';
import StatusBar from './StatusBar';

export default function LockScreen() {
  const unlock = useMobileStore((s) => s.unlock);
  const haptics = useHaptics();
  const mono = useIsMono();
  const reduced = useReducedMotion();

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const handlers = useSwipe({
    onSwipe: (dir) => {
      if (dir === 'up') {
        haptics('medium');
        unlock();
      }
    },
    threshold: 60,
  });

  const time = formatTime(now);
  const date = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03, transition: { duration: 0.25, ease: 'easeOut' } }}
      transition={{ duration: 0.2 }}
      {...handlers}
      // A tap anywhere unlocks too: desktop-trained visitors and switch users
      // tap rather than swipe. The status-bar easter eggs stop propagation.
      onClick={() => {
        haptics('medium');
        unlock();
      }}
      // pan-x + pinch-zoom: blocks the vertical pan the swipe needs, keeps zoom.
      className="absolute inset-0 z-40 flex flex-col text-white touch-pan-x touch-pinch-zoom cursor-pointer"
      style={{
        background: mono
          ? 'radial-gradient(120% 80% at 50% 0%, #2a2a2c 0%, #161618 55%, #050505 100%)'
          : 'radial-gradient(120% 80% at 50% 0%, #1a0f2e 0%, #0f1923 55%, #050813 100%)',
      }}
    >
      <div className="pt-safe">
        <StatusBar />
      </div>

      {/* Time / date */}
      <div className="flex-1 flex flex-col items-center justify-start pt-10">
        <p className="text-sm font-medium text-white/70 tracking-wide">{date}</p>
        <p
          className="mt-1 text-[82px] leading-none tracking-tight"
          style={{ fontWeight: 200 }}
        >
          {time}
        </p>

        {/* Identity — the one useful thing a recruiter sees before unlocking */}
        <div className="mt-8 flex flex-col items-center gap-1.5">
          <p className="text-lg font-semibold text-white/90 tracking-tight">{identity.name}</p>
          <p className="text-sm text-white/55">{identity.title}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-[12px] text-white/60">
              <MapPin size={11} />{identity.location}
            </span>
            <span
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                mono
                  ? 'bg-white/12 border border-white/25 text-white/85'
                  : 'bg-accent/15 border border-accent/25 text-accent'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${reduced ? '' : 'animate-pulse'} ${
                  mono ? 'bg-white/90' : 'bg-accent'
                }`}
              />
              {identity.availabilityShort}
            </span>
          </div>
        </div>
      </div>

      {/* Unlock hint. One inline padding: the old pb-safe + pb-10 pair
          conflicted (pb-safe won and computed to 0), so the hint sat flush
          against the bottom edge under the home indicator. The click bubbles
          to the root handler, so Enter / Space on it unlock as well. */}
      <div
        className="flex flex-col items-center gap-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 40px)' }}
      >
        <button
          type="button"
          className="touch-target flex flex-col items-center justify-center gap-2 px-4 py-2 text-white/60 active:text-white transition-colors"
        >
          <motion.div
            animate={reduced ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronUp size={26} strokeWidth={2} aria-hidden />
          </motion.div>
          <span className="text-[13px] tracking-wide">Tap or swipe up to open</span>
        </button>
      </div>
    </motion.div>
  );
}

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${m.toString().padStart(2, '0')}`;
}
