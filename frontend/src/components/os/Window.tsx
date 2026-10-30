'use client';

import React from 'react';
import {
  motion,
  useAnimationControls,
  useReducedMotion,
  type ResolvedValues,
  type Variants,
} from 'framer-motion';
import { X, Minus, Square } from 'lucide-react';
import { useOSStore } from '@/store/osStore';
import { useIsMono } from '@/hooks/usePalette';
import { useThemeStore } from '@/store/themeStore';
import { spring, INSTANT, ease } from '@/lib/motion';
import { getDockIconRect } from '@/lib/dockRegistry';
import { MENUBAR_H, DOCK_H } from '@/lib/windowSnap';
import { DEFAULT_MIN_SIZE, type ResizeDir } from '@/lib/windowGeometry';
import { appRegistry } from '@/lib/appRegistry';
import { useWindowDrag } from '@/hooks/useWindowDrag';
import { useWindowResize } from '@/hooks/useWindowResize';
import type { WindowState } from '../../../../shared/types';

interface WindowProps {
  window: WindowState;
  children: React.ReactNode;
}

// Invisible resize hit areas: 6px edges and 12px corners that straddle the
// window border, like macOS. Corners come last so they sit above the edges.
// Traffic lights in macOS order. `fill`, `ring` and `glyph` are the color
// palette's values (research note on Stripe icons and color, section 5.5): a
// fill with a hairline inset ring a shade darker, and a deeper glyph on hover.
const TRAFFIC_LIGHTS = [
  { kind: 'close', Icon: X, size: 8, fill: 'oklch(0.68 0.20 27)', ring: 'oklch(0.55 0.18 27)', glyph: 'oklch(0.45 0.12 27)' },
  { kind: 'minimize', Icon: Minus, size: 8, fill: 'oklch(0.84 0.16 84)', ring: 'oklch(0.68 0.15 80)', glyph: 'oklch(0.50 0.11 84)' },
  { kind: 'maximize', Icon: Square, size: 6, fill: 'oklch(0.76 0.19 145)', ring: 'oklch(0.60 0.17 145)', glyph: 'oklch(0.45 0.12 145)' },
] as const;

/** All three lights on a window that is not in front (color palette). */
const INACTIVE_LIGHT = 'oklch(0.55 0.015 260 / 0.45)';

// Stripe's layered, navy-tinted window shadows. Neutral in both palettes.
const SHADOW_ACTIVE_DARK =
  '0 0 0 1px oklch(1 0 0 / 0.06), 0 50px 100px -20px rgba(50,50,93,0.25), 0 30px 60px -30px rgba(0,0,0,0.5)';
const SHADOW_ACTIVE_LIGHT =
  '0 0 0 1px oklch(1 0 0 / 0.06), 0 50px 100px -20px rgba(50,50,93,0.25), 0 30px 60px -30px rgba(0,0,0,0.3)';
const SHADOW_INACTIVE = '0 30px 45px -30px rgba(50,50,93,0.25), 0 18px 36px -18px rgba(0,0,0,0.1)';

const RESIZE_HANDLES: { dir: ResizeDir; className: string }[] = [
  { dir: 'n', className: '-top-[3px] left-3 right-3 h-1.5 cursor-ns-resize' },
  { dir: 's', className: '-bottom-[3px] left-3 right-3 h-1.5 cursor-ns-resize' },
  { dir: 'e', className: '-right-[3px] top-3 bottom-3 w-1.5 cursor-ew-resize' },
  { dir: 'w', className: '-left-[3px] top-3 bottom-3 w-1.5 cursor-ew-resize' },
  { dir: 'nw', className: '-top-1 -left-1 w-3 h-3 cursor-nwse-resize' },
  { dir: 'ne', className: '-top-1 -right-1 w-3 h-3 cursor-nesw-resize' },
  { dir: 'sw', className: '-bottom-1 -left-1 w-3 h-3 cursor-nesw-resize' },
  { dir: 'se', className: '-bottom-1 -right-1 w-3 h-3 cursor-nwse-resize' },
];

// The close and minimize exit drops the window 20px from wherever it is on
// screen. A fixed `y: 20` would slide a window closed mid-drag back toward its
// stored spot, since y holds the drag offset until release. The label is
// unique so app content with its own variants never matches it.
const WINDOW_VARIANTS: Variants = {
  windowExit: (_custom: unknown, current: ResolvedValues) => ({
    opacity: 0,
    scale: 0.88,
    y: (typeof current.y === 'number' ? current.y : 0) + 20,
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] },
  }),
};

export default function Window({ window, children }: WindowProps) {
  const closeWindow = useOSStore(state => state.closeWindow);
  const focusWindow = useOSStore(state => state.focusWindow);
  const minimizeWindow = useOSStore(state => state.minimizeWindow);
  const maximizeWindow = useOSStore(state => state.maximizeWindow);
  const isActive = useOSStore(state => state.activeWindowId === window.id);
  // Set while the genie flies the window into the dock, so a titlebar press
  // cannot stop that animation (its promise would never settle).
  const genieRef = React.useRef(false);
  const { x, y, snapPreview, layoutKey, titlebarProps } = useWindowDrag(window, { busyRef: genieRef });
  const minSize = appRegistry[window.appType]?.minSize ?? DEFAULT_MIN_SIZE;
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const elRef = React.useRef<HTMLDivElement>(null);
  const { isResizing, handleProps } = useWindowResize(window, elRef, minSize, { busyRef: genieRef });
  const mono = useIsMono();
  const dark = useThemeStore(state => state.mode === 'dark');
  const titleId = React.useId();

  // Drive the open animation through the same controls the genie minimize
  // uses, so there is one animation owner per window. Runs on mount and on a
  // reduced-motion change only: drag never restarts it.
  React.useEffect(() => {
    controls.start({
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      skewX: 0,
      transition: reduced
        ? INSTANT
        : {
            ...spring.window,
            opacity: { duration: 0.35, ease: 'easeOut' },
            scale: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
          },
    });
  }, [reduced, controls]);

  // Genie minimize: fly the window into its dock icon, then commit the state.
  // Falls back to a plain minimize under reduced motion or if the dock icon
  // is not currently measurable.
  const handleMinimize = async () => {
    const dock = getDockIconRect(window.appType);
    const el = elRef.current;
    if (reduced || !dock || !el) {
      minimizeWindow(window.id);
      return;
    }
    const r = el.getBoundingClientRect();
    const dx = dock.left + dock.width / 2 - (r.left + r.width / 2);
    const dy = dock.top + dock.height / 2 - (r.top + r.height / 2);
    genieRef.current = true;
    try {
      await controls.start({
        x: dx,
        y: dy,
        scale: 0.06,
        skewX: 8,
        opacity: 0,
        transition: spring.genie,
      });
    } finally {
      genieRef.current = false;
    }
    minimizeWindow(window.id);
  };

  const windowStyle = window.isMaximized
    ? {
        left: 0,
        top: MENUBAR_H,
        width: '100vw',
        height: `calc(100vh - ${MENUBAR_H}px - ${DOCK_H}px)`,
      }
    : {
        left: window.position.x,
        top: window.position.y,
        width: window.size.width,
        height: window.size.height,
      };

  return (
    <>
      {/* Snap-zone preview, shown while dragging toward a screen edge */}
      {snapPreview && (
        <div
          aria-hidden
          data-snap-preview
          className="fixed pointer-events-none rounded-xl border-2 z-[9998]"
          style={{
            left: snapPreview.x,
            top: snapPreview.y,
            width: snapPreview.width,
            height: snapPreview.height,
            borderColor: 'rgb(var(--color-accent) / 0.7)',
            background: 'rgb(var(--color-accent) / 0.12)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}
    <motion.div
      ref={elRef}
      data-window
      role="region"
      aria-labelledby={titleId}
      layout
      // Measure layout only on maximize and snap. Without this every drag or
      // resize render would start a layout spring from rest.
      layoutDependency={`${window.isMaximized}:${layoutKey}`}
      initial={reduced ? false : { opacity: 0, scale: 0.92, y: 30 }}
      animate={controls}
      variants={WINDOW_VARIANTS}
      exit={reduced ? { opacity: 0, transition: INSTANT } : 'windowExit'}
      transition={{ layout: reduced ? INSTANT : spring.windowLayout }}
      className={`
        absolute
        flex flex-col
        glass-medium
        border border-white/20 dark:border-white/10
        will-change-transform
        transition-[border-radius,box-shadow] duration-300 ease-out
        ${window.isMaximized ? 'rounded-none shadow-none' : 'rounded-xl'}
      `}
      style={{
        x,
        y,
        zIndex: window.zIndex,
        boxShadow: window.isMaximized
          ? 'none'
          : isActive
            ? dark ? SHADOW_ACTIVE_DARK : SHADOW_ACTIVE_LIGHT
            : SHADOW_INACTIVE,
        ...windowStyle,
      }}
      onClick={() => focusWindow(window.id)}
    >
      {/* Titlebar */}
      <div
        className={`
          flex items-center px-4 py-2.5
          border-b border-white/10 dark:border-white/5
          transition-[border-radius,opacity] duration-300 ease-out
          cursor-move select-none touch-none
          ${window.isMaximized ? 'rounded-none' : 'rounded-t-xl'}
          ${isActive ? 'opacity-100' : 'opacity-60'}
        `}
        {...titlebarProps}
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          maximizeWindow(window.id);
        }}
      >
        {/* Traffic-light controls. 12px dots inside 20px hit areas. In mono
            the three dots share one shade that passes 3:1 and always show
            their glyph, since color can't tell them apart; in Color the glyphs
            appear on hover or keyboard focus like macOS, and an inactive
            window's lights go grey with no glyph. */}
        <div className="group/lights -ml-1 flex items-center">
          {TRAFFIC_LIGHTS.map(({ kind, Icon, size, fill, ring, glyph }) => {
            const label = kind === 'close'
              ? 'Close'
              : kind === 'minimize'
                ? 'Minimize'
                : window.isMaximized ? 'Restore' : 'Maximize';
            return (
              <button
                key={kind}
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (kind === 'close') closeWindow(window.id);
                  else if (kind === 'minimize') handleMinimize();
                  else maximizeWindow(window.id);
                }}
                title={label}
                aria-label={`${label} ${window.title}`}
                className="group/btn grid h-5 w-5 place-items-center rounded-full"
              >
                <span
                  aria-hidden
                  data-traffic-light={kind}
                  className={`grid h-3 w-3 place-items-center rounded-full ${
                    mono
                      ? 'transition-colors bg-black/45 group-hover/btn:bg-black/60 dark:bg-white/55 dark:group-hover/btn:bg-white/70'
                      : ''
                  }`}
                  style={
                    mono
                      ? undefined
                      : {
                          background: isActive ? fill : INACTIVE_LIGHT,
                          boxShadow: isActive ? `inset 0 0 0 0.5px ${ring}` : undefined,
                          transition: `background-color 150ms cubic-bezier(${ease.stripe.join(', ')})`,
                        }
                  }
                >
                  {(mono || isActive) && (
                    <Icon
                      size={size}
                      strokeWidth={2.5}
                      style={mono ? undefined : { color: glyph }}
                      className={`transition-opacity ${
                        mono
                          ? 'text-white opacity-70 group-hover/lights:opacity-100 group-focus-within/lights:opacity-100 dark:text-black'
                          : 'opacity-0 group-hover/lights:opacity-100 group-focus-within/lights:opacity-100'
                      }`}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Centered title */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <span id={titleId} className="text-sm font-medium text-text">
            {window.title}
          </span>
        </div>

        {/* Spacer for symmetry */}
        <div className="w-[60px] ml-auto" />
      </div>

      {/* Content — app-content makes every window a query container so app
          typography scales with window width (see globals.css → in-window type) */}
      <div
        className={`flex-1 overflow-auto bg-surface/25 app-content ${isResizing ? 'pointer-events-none select-none' : ''}`}
        style={{ minHeight: 0 }}
      >
        {children}
      </div>

      {/* Resize handles: hidden while maximized */}
      {!window.isMaximized && RESIZE_HANDLES.map(({ dir, className }) => (
        <div
          key={dir}
          aria-hidden
          data-resize={dir}
          className={`absolute z-10 touch-none ${className}`}
          {...handleProps(dir)}
        />
      ))}
    </motion.div>
    </>
  );
}
