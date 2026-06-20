'use client';

/**
 * Monochrome thinking indicator + streaming caret, driven by framer-motion so
 * they share the shell's physics. Both use the theme text color (via CSS var)
 * at low alpha, so they read correctly in light and dark with zero accent.
 * Reduced-motion freezes them.
 */

import { motion } from 'framer-motion';

export function TypingDots({ reduced }: { reduced: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-4 align-middle" aria-label="Thinking">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'rgb(var(--color-text) / 0.5)' }}
          animate={reduced ? undefined : { opacity: [0.3, 0.9, 0.3], scale: [0.85, 1, 0.85] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

export function StreamCaret({ reduced }: { reduced: boolean }) {
  return (
    <motion.span
      className="inline-block w-[2px] h-[1em] align-text-bottom ml-0.5 rounded-full"
      style={{ background: 'rgb(var(--color-text) / 0.7)' }}
      animate={reduced ? undefined : { opacity: [1, 0.15, 1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}
