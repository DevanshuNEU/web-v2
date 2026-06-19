'use client';

/**
 * Cursor — a custom desktop pointer for the OS shell.
 *
 * A spring-followed ring plus a precise center dot. The ring grows when hovering
 * interactive elements and snaps magnetically toward elements tagged
 * `data-magnetic` (dock icons, primary buttons). A quick contract on press gives
 * tactile click feedback.
 *
 * Deliberately desktop-only: it renders nothing — and leaves the native cursor
 * intact — on touch/coarse pointers and when the OS requests reduced motion, so
 * accessibility and mobile are never compromised.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { spring } from '@/lib/motion';

const INTERACTIVE = 'button, a, [role="button"], input, textarea, select, .cursor-pointer';

export default function Cursor() {
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);

  // Raw pointer position, spring-smoothed for the ring; the dot tracks 1:1.
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, spring.cursor);
  const ringY = useSpring(y, spring.cursor);
  const magnetTarget = useRef<HTMLElement | null>(null);

  // Only enable on fine pointers (mouse/trackpad) with motion allowed.
  useEffect(() => {
    if (reduced) return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine) return;
    setEnabled(true);
    document.documentElement.classList.add('cursor-none');
    return () => document.documentElement.classList.remove('cursor-none');
  }, [reduced]);

  useEffect(() => {
    if (!enabled) return;

    const move = (e: PointerEvent) => {
      const magnet = magnetTarget.current;
      if (magnet) {
        // Pull the ring toward the element center for a magnetic feel.
        const r = magnet.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        x.set(cx + (e.clientX - cx) * 0.35);
        y.set(cy + (e.clientY - cy) * 0.35);
      } else {
        x.set(e.clientX);
        y.set(e.clientY);
      }
    };

    const over = (e: PointerEvent) => {
      const el = (e.target as HTMLElement)?.closest(INTERACTIVE) as HTMLElement | null;
      setHovering(!!el);
      magnetTarget.current = (e.target as HTMLElement)?.closest('[data-magnetic]') as HTMLElement | null;
    };

    const down = () => setPressed(true);
    const up = () => setPressed(false);

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerover', over, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', over);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const ringSize = hovering ? 40 : 24;

  return (
    <>
      {/* Ring — spring-followed, grows on interactive hover, contracts on press.
          Accent-colored in both themes (no blend-mode inversion); a dual hairline
          plus a soft accent glow keep it readable on light, dark, and wallpapers. */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[10000] rounded-full"
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
          border: '1.5px solid rgb(var(--color-accent))',
          backgroundColor: 'rgb(var(--color-accent) / 0.06)',
          boxShadow:
            '0 0 0 0.5px rgb(0 0 0 / 0.14), inset 0 0 0 0.5px rgb(255 255 255 / 0.14), 0 0 10px rgb(var(--color-accent) / 0.25)',
        }}
        animate={{
          width: ringSize,
          height: ringSize,
          opacity: hovering ? 1 : 0.75,
          scale: pressed ? 0.82 : 1,
        }}
        transition={spring.cursor}
      />
      {/* Center dot — tracks the pointer exactly; fades as the ring takes over on hover */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[10000] rounded-full"
        style={{
          x,
          y,
          translateX: '-50%',
          translateY: '-50%',
          width: 5,
          height: 5,
          background: 'rgb(var(--color-accent))',
          boxShadow: '0 0 0 0.5px rgb(0 0 0 / 0.18)',
        }}
        animate={{ opacity: hovering ? 0 : 1, scale: pressed ? 0.7 : 1 }}
        transition={{ duration: 0.15 }}
      />
    </>
  );
}
