'use client';

/**
 * DesktopIcons — macOS-style shortcut icons on the desktop surface.
 *
 * Four curated shortcuts, recruiter first: About Me, Projects, Resume, Contact.
 * Help stays in the dock's Launchpad.
 *
 * Premium interactions:
 *   - 3D physics tilt via Framer Motion springs — icon tilts toward cursor like
 *     a physical card held under a light source
 *   - Phosphor duotone/fill icons for proper app-icon visual depth
 *   - Frosted pill labels matching macOS Sonoma desktop icon treatment
 */

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { useLaunchpadStore } from '@/store/launchpadStore';
import { spring, reveal, PARALLAX_DEPTH } from '@/lib/motion';
import { useParallaxDepth } from '@/hooks/useParallaxDepth';
import { appRegistry, getAppLabel } from '@/lib/appRegistry';
import AppIcon from './AppIcon';
import type { AppType } from '../../../../shared/types';

// ---------------------------------------------------------------------------
// Curated desktop app list
// ---------------------------------------------------------------------------

const DESKTOP_APP_TYPES: AppType[] = ['about-me', 'projects', 'resume', 'contact'];

// ---------------------------------------------------------------------------
// Single icon with 3D tilt
// ---------------------------------------------------------------------------

interface DesktopIconProps {
  appType: AppType;
  label: string;
}

function DesktopIcon({ appType, label }: DesktopIconProps) {
  const openWindow = useOSStore(state => state.openWindow);
  const ref = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  // Raw motion values (normalized -0.5 to 0.5 relative to icon center)
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // Map to rotation angles: ±12°
  const rotateY = useTransform(rawX, [-0.5, 0.5], [-12, 12]);
  const rotateX = useTransform(rawY, [-0.5, 0.5], [12, -12]); // inverted: tilt toward cursor

  // Spring-smooth the rotations for physical damping
  const springRotateX = useSpring(rotateX, spring.tilt);
  const springRotateY = useSpring(rotateY, spring.tilt);

  // Brightness increases slightly on hover (light hitting tilted surface)
  const brightness = useMotionValue(1);
  const brightnessStr = useTransform(brightness, (v) => `brightness(${v})`);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reduced) return; // no tilt under reduced motion
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    rawX.set((e.clientX - rect.left - rect.width / 2) / rect.width);
    rawY.set((e.clientY - rect.top - rect.height / 2) / rect.height);
    brightness.set(1.08);
  };

  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
    brightness.set(1);
  };

  return (
    <motion.div
      // Entrance is orchestrated by the grid container via the shared reveal
      // variants (tighter, premium stagger); collapses to instant when reduced.
      variants={reveal.item(reduced)}
      className="w-[80px]"
    >
      {/* One button holds the icon and its label: the visible label is the
          accessible name, and clicking the label opens the app too. */}
      <button
        ref={ref}
        type="button"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => openWindow(appType)}
        className="group flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-lg"
      >
        {/* perspective container: must be separate from the tilting element */}
        <span style={{ perspective: 600 }} className="block">
          <motion.span
            style={{
              rotateX: springRotateX,
              rotateY: springRotateY,
              filter: brightnessStr,
              transformStyle: 'preserve-3d',
            }}
            whileTap={{ scale: 0.92 }}
            className="block"
          >
            <AppIcon appType={appType} size={56} />
          </motion.span>
        </span>

        {/* Frosted pill label, theme-aware so it passes 4.5:1 on any wallpaper */}
        <span
          className="max-w-[80px] truncate rounded-md border px-2 py-0.5 text-center text-[12px] font-medium leading-tight
                     border-black/10 bg-white/80 text-[#1d1d1f]
                     dark:border-white/10 dark:bg-black/55 dark:text-white"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          {label}
        </span>
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export default function DesktopIcons() {
  const reduced = useReducedMotion();
  // Launchpad is modal: hide the shortcuts behind it from Tab and clicks.
  const launchpadOpen = useLaunchpadStore(s => s.isOpen);
  // Mid-depth parallax drift from the shared provider; rests at 0 under
  // reduced motion / coarse pointer. Per-icon 3D tilt is untouched.
  const { x, y } = useParallaxDepth(PARALLAX_DEPTH.mid);

  return (
    <motion.div
      style={{ x, y }}
      variants={reveal.container(reduced)}
      initial="hidden"
      animate="show"
      className={`absolute top-9 left-4 flex flex-col gap-4 z-[1] ${launchpadOpen ? 'invisible' : ''}`}
    >
      {DESKTOP_APP_TYPES.map((appType) => {
        const reg = appRegistry[appType];
        if (!reg) return null;
        const label = getAppLabel(appType);
        return (
          <DesktopIcon
            key={appType}
            appType={appType}
            label={label.title}
          />
        );
      })}
    </motion.div>
  );
}
