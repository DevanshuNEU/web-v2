'use client';

/**
 * BootSequence: a short intro, once per browser (lib/bootSession.ts).
 *
 * One beat: the name, then the role under it, then the overlay dissolves
 * over the already-mounted desktop. About 1.5s in total. Any key, click,
 * tap or wheel skips straight to the desktop, and there is a visible Skip
 * button. Under prefers-reduced-motion the intro never shows.
 *
 * DesktopHome wraps this in AnimatePresence, so the exit fade below plays
 * after setBooted() has already mounted the desktop underneath.
 */

import { useState, useEffect, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { identity, mastheadSpecLine } from '@/data/aboutMe';
import { Z } from '@/lib/zLayers';

/** ms the name holds before the role line joins it. */
const ROLE_AT = 450;
/** ms from mount until the overlay starts dissolving. */
const REVEAL_AT = 1150;

// useLayoutEffect warns during SSR; this component only renders on the client.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function BootSequence() {
  const setBooted = useOSStore(state => state.setBooted);
  const [showRole, setShowRole] = useState(false);

  // Reduced motion: no intro at all. Layout effect, so it never paints.
  useIsoLayoutEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setBooted();
  }, [setBooted]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setShowRole(true), ROLE_AT),
      setTimeout(() => setBooted(), REVEAL_AT),
    ];
    // Anything the visitor does skips the intro.
    const skip = () => setBooted();
    const opts = { once: true, passive: true } as const;
    window.addEventListener('pointerdown', skip, opts);
    window.addEventListener('keydown', skip, opts);
    window.addEventListener('wheel', skip, opts);
    window.addEventListener('touchstart', skip, opts);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('wheel', skip);
      window.removeEventListener('touchstart', skip);
    };
  }, [setBooted]);

  return (
    <motion.div
      key="boot"
      role="status"
      aria-label={`Loading ${identity.name}'s desktop`}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.4, ease: 'easeOut' } }}
      className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6"
      style={{ zIndex: Z.boot }}
    >
      <motion.p
        aria-hidden
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] leading-none text-white text-center select-none"
      >
        {identity.name}
      </motion.p>

      <motion.p
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: showRole ? 1 : 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mt-4 text-[15px] tracking-[0.02em] text-white/75 text-center select-none"
      >
        {mastheadSpecLine[0]}
      </motion.p>

      <button
        type="button"
        onClick={() => setBooted()}
        className="absolute bottom-6 right-6 rounded-md px-3 py-1.5 text-[12px] text-white/70
                   hover:text-white hover:bg-white/10 transition-colors"
      >
        Skip
      </button>
    </motion.div>
  );
}
