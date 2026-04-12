'use client';

/**
 * BootSequence — "Words in the Dark"
 *
 * Inspired by Apple's "Think Different" brand ads. Three statements appear
 * one at a time in ultra-thin Geist type on black, each a facet of who
 * Devanshu is. Then the devOS brand materializes. Then the world opens.
 *
 * Phases:
 *   word-1  (0–700ms)    "Devanshu."
 *   word-2  (700–1300ms) "Engineer."
 *   word-3  (1300–1900ms)"Builder."
 *   brand   (1900–2500ms) devOS + hairline rule + v2.0
 *   reveal  (2500–3000ms) dissolve to desktop
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';

type Phase = 'word-1' | 'word-2' | 'word-3' | 'brand' | 'reveal';

const WORDS = ['Devanshu.', 'Engineer.', 'Builder.'];
const PHASE_ORDER: Phase[] = ['word-1', 'word-2', 'word-3', 'brand', 'reveal'];
const PHASE_DURATIONS: Record<Phase, number> = {
  'word-1': 1300,   // "Devanshu." — name, let it land
  'word-2': 1100,   // "Engineer."
  'word-3': 1100,   // "Builder."
  'brand':  1400,   // devOS — breathe before the reveal
  'reveal': 700,    // dissolve to desktop
};

const wordVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.35, ease: 'easeIn' as const } },
};

export default function BootSequence() {
  const setBooted = useOSStore(state => state.setBooted);
  const [phase, setPhase] = useState<Phase>('word-1');

  useEffect(() => {
    let elapsed = 0;
    const timers: NodeJS.Timeout[] = [];

    PHASE_ORDER.forEach((p) => {
      timers.push(
        setTimeout(() => setPhase(p), elapsed)
      );
      elapsed += PHASE_DURATIONS[p];
    });

    // Complete boot after all phases
    timers.push(setTimeout(() => setBooted(), elapsed + 200));

    return () => timers.forEach(clearTimeout);
  }, [setBooted]);

  const currentWord = phase === 'word-1' ? WORDS[0]
    : phase === 'word-2' ? WORDS[1]
    : phase === 'word-3' ? WORDS[2]
    : null;

  const showBrand = phase === 'brand' || phase === 'reveal';
  const showOverlay = phase !== 'reveal';

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          key="boot"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(6px)', transition: { duration: 0.8, ease: 'easeOut' } }}
          className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center"
        >
          {/* Word phases */}
          <AnimatePresence mode="wait">
            {currentWord && (
              <motion.p
                key={phase}
                variants={wordVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-6xl text-white/90 tracking-[0.2em] select-none"
                style={{ fontWeight: 100 }}
              >
                {currentWord}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Brand phase */}
          <AnimatePresence>
            {showBrand && (
              <motion.div
                key="brand"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex flex-col items-center gap-3"
              >
                {/* devOS wordmark */}
                <p
                  className="text-3xl text-white tracking-[0.5em] select-none"
                  style={{ fontWeight: 400 }}
                >
                  devOS
                </p>

                {/* Hairline rule — draws outward from center */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                  className="w-24 h-px bg-white/20"
                  style={{ transformOrigin: 'center' }}
                />

                {/* Version */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="text-xs text-white/25 font-mono tracking-widest"
                >
                  v2.0
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
