'use client';

/**
 * LockScreen — iOS-style lock screen.
 *
 * Big time on top, date below, "swipe up to unlock" hint at the bottom.
 * Swiping up (or tapping the unlock pill) reveals the home screen.
 * Mirrors the dramatic feel of BootSequence — the user's first impression.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import { useMobileStore } from '@/store/mobileStore';
import { useSwipe } from '@/hooks/useSwipe';
import { useHaptics } from '@/hooks/useHaptics';
import StatusBar from './StatusBar';

export default function LockScreen() {
  const unlock = useMobileStore((s) => s.unlock);
  const haptics = useHaptics();

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
      exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.45, ease: 'easeOut' } }}
      transition={{ duration: 0.5 }}
      {...handlers}
      className="absolute inset-0 z-40 flex flex-col text-white touch-none"
      style={{
        background:
          'radial-gradient(120% 80% at 50% 0%, #1a0f2e 0%, #0f1923 55%, #050813 100%)',
      }}
    >
      <div className="pt-safe">
        <StatusBar />
      </div>

      {/* Time / date */}
      <div className="flex-1 flex flex-col items-center justify-start pt-12">
        <p className="text-sm font-medium text-white/70 tracking-wide">{date}</p>
        <p
          className="mt-1 text-[88px] leading-none tracking-tight"
          style={{ fontWeight: 200 }}
        >
          {time}
        </p>

        {/* devOS badge */}
        <div className="mt-6 px-3 py-1 rounded-full bg-white/8 border border-white/15 backdrop-blur-md">
          <p className="text-[11px] font-mono tracking-[0.3em] text-white/70">
            dev<span className="text-blue-300">OS</span> · v2.0
          </p>
        </div>
      </div>

      {/* Unlock hint */}
      <div className="pb-safe flex flex-col items-center pb-10 gap-2">
        <button
          onClick={() => {
            haptics('medium');
            unlock();
          }}
          className="touch-target flex flex-col items-center gap-2 text-white/55 hover:text-white transition-colors"
          aria-label="Unlock"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronUp size={26} strokeWidth={2} />
          </motion.div>
          <span className="text-xs tracking-wide">Swipe up to open</span>
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
