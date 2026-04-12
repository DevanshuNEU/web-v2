'use client';

/**
 * DesktopIcons — macOS-style shortcut icons on the desktop surface.
 *
 * Three curated shortcuts for first-time visitors: About Me, Resume, Projects.
 *
 * Premium interactions:
 *   - 3D physics tilt via Framer Motion springs — icon tilts toward cursor like
 *     a physical card held under a light source
 *   - Phosphor duotone/fill icons for proper app-icon visual depth
 *   - Frosted pill labels matching macOS Sonoma desktop icon treatment
 */

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { appRegistry, getAppLabel } from '@/lib/appRegistry';
import AppIcon from './AppIcon';
import type { AppType } from '../../../../shared/types';

// ---------------------------------------------------------------------------
// Curated desktop app list
// ---------------------------------------------------------------------------

const DESKTOP_APP_TYPES: AppType[] = ['about-me', 'resume', 'projects'];

// ---------------------------------------------------------------------------
// Single icon with 3D tilt
// ---------------------------------------------------------------------------

interface DesktopIconProps {
  appType: AppType;
  icon: React.ElementType;
  label: string;
  iconColor: string;
  delay: number;
}

function DesktopIcon({ appType, icon, label, iconColor, delay }: DesktopIconProps) {
  const openWindow = useOSStore(state => state.openWindow);
  const ref = useRef<HTMLButtonElement>(null);

  // Raw motion values (normalized -0.5 to 0.5 relative to icon center)
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // Map to rotation angles: ±12°
  const rotateY = useTransform(rawX, [-0.5, 0.5], [-12, 12]);
  const rotateX = useTransform(rawY, [-0.5, 0.5], [12, -12]); // inverted: tilt toward cursor

  // Spring-smooth the rotations for physical damping
  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 25, mass: 0.5 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 25, mass: 0.5 });

  // Brightness increases slightly on hover (light hitting tilted surface)
  const brightness = useMotionValue(1);
  const brightnessStr = useTransform(brightness, (v) => `brightness(${v})`);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      // perspective container — must be on a separate div, not the motion element itself
      style={{ perspective: 600 }}
      className="flex flex-col items-center gap-1.5 w-[72px]"
    >
      <motion.button
        ref={ref}
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          filter: brightnessStr,
          transformStyle: 'preserve-3d',
        }}
        whileTap={{ scale: 0.92 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => openWindow(appType)}
        title={`Open ${label}`}
        className="cursor-pointer"
      >
        <AppIcon icon={icon} colorKey={iconColor} size={56} />
      </motion.button>

      {/* Frosted pill label — macOS Sonoma desktop icon style */}
      <span
        className="px-2 py-0.5 rounded-md text-[11px] font-medium text-white text-center
                   max-w-[72px] truncate border border-white/10 leading-tight"
        style={{
          background: 'rgba(0,0,0,0.28)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {label}
      </span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export default function DesktopIcons() {
  return (
    <div className="absolute top-9 left-5 flex flex-col gap-5 z-[1]">
      {DESKTOP_APP_TYPES.map((appType, i) => {
        const reg = appRegistry[appType];
        if (!reg) return null;
        const label = getAppLabel(appType);
        return (
          <DesktopIcon
            key={appType}
            appType={appType}
            icon={reg.icon}
            label={label.title}
            iconColor={reg.iconColor}
            delay={i * 0.08}
          />
        );
      })}
    </div>
  );
}
