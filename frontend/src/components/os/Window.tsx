'use client';

import React from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { X, Minus, Square } from 'lucide-react';
import { useOSStore } from '@/store/osStore';
import { useIsMono } from '@/hooks/usePalette';
import { spring, INSTANT } from '@/lib/motion';
import { getDockIconRect } from '@/lib/dockRegistry';
import { MENUBAR_H, DOCK_H } from '@/lib/windowSnap';
import { resizeBounds, DEFAULT_MIN_SIZE, type ResizeDir, type WindowBounds } from '@/lib/windowGeometry';
import { appRegistry } from '@/lib/appRegistry';
import { useWindowDrag } from '@/hooks/useWindowDrag';
import type { WindowState } from '../../../../shared/types';

interface WindowProps {
  window: WindowState;
  children: React.ReactNode;
}

// Invisible resize hit areas: 6px edges and 12px corners that straddle the
// window border, like macOS. Corners come last so they sit above the edges.
// Traffic lights in macOS order. `fun` / `funGlyph` are the Fun palette colors.
const TRAFFIC_LIGHTS = [
  { kind: 'close', Icon: X, size: 8, fun: 'bg-red-500 group-hover/btn:bg-red-600', funGlyph: 'text-red-900' },
  { kind: 'minimize', Icon: Minus, size: 8, fun: 'bg-yellow-400 group-hover/btn:bg-yellow-500', funGlyph: 'text-yellow-900' },
  { kind: 'maximize', Icon: Square, size: 6, fun: 'bg-green-500 group-hover/btn:bg-green-600', funGlyph: 'text-green-900' },
] as const;

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

export default function Window({ window, children }: WindowProps) {
  const closeWindow = useOSStore(state => state.closeWindow);
  const focusWindow = useOSStore(state => state.focusWindow);
  const minimizeWindow = useOSStore(state => state.minimizeWindow);
  const maximizeWindow = useOSStore(state => state.maximizeWindow);
  const updateWindowPosition = useOSStore(state => state.updateWindowPosition);
  const updateWindowSize = useOSStore(state => state.updateWindowSize);
  const isActive = useOSStore(state => state.activeWindowId === window.id);
  // Set while the genie flies the window into the dock, so a titlebar press
  // cannot stop that animation (its promise would never settle).
  const genieRef = React.useRef(false);
  const { x, y, snapPreview, layoutKey, titlebarProps } = useWindowDrag(window, { busyRef: genieRef });
  const resizeStart = React.useRef<{ dir: ResizeDir; px: number; py: number; bounds: WindowBounds } | null>(null);
  const [isResizing, setIsResizing] = React.useState(false);
  const minSize = appRegistry[window.appType]?.minSize ?? DEFAULT_MIN_SIZE;
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const elRef = React.useRef<HTMLDivElement>(null);
  const mono = useIsMono();
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

  // Resize from an edge or corner. Pointer capture keeps the move/up events on
  // the handle even when the pointer races ahead of the window edge.
  const handleResizeStart = (dir: ResizeDir) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || window.isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    focusWindow(window.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeStart.current = {
      dir,
      px: e.clientX,
      py: e.clientY,
      bounds: { ...window.position, ...window.size },
    };
    setIsResizing(true);
  };

  const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = resizeStart.current;
    if (!start) return;
    const next = resizeBounds(
      start.bounds,
      start.dir,
      e.clientX - start.px,
      e.clientY - start.py,
      document.documentElement.clientWidth,
      document.documentElement.clientHeight,
      minSize
    );
    updateWindowSize(window.id, { width: next.width, height: next.height });
    // Left and top edges move the origin so the opposite edge stays put.
    if (start.dir.includes('n') || start.dir.includes('w')) {
      updateWindowPosition(window.id, { x: next.x, y: next.y });
    }
  };

  const handleResizeEnd = () => {
    resizeStart.current = null;
    setIsResizing(false);
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
      exit={
        reduced
          ? { opacity: 0, transition: INSTANT }
          : {
              opacity: 0,
              scale: 0.88,
              y: 20,
              transition: { duration: 0.25, ease: [0.4, 0, 1, 1] },
            }
      }
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
        boxShadow: window.isMaximized ? 'none' : isActive
          ? `0 0 0 1px rgb(var(--color-accent) / 0.15), 0 20px 60px rgba(0,0,0,0.3)`
          : `0 8px 32px rgba(0,0,0,0.12)`,
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
            their glyph, since color can't tell them apart; in Fun the glyphs
            appear on hover or keyboard focus like macOS. */}
        <div className="group/lights -ml-1 flex items-center">
          {TRAFFIC_LIGHTS.map(({ kind, Icon, size, fun, funGlyph }) => {
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
                  className={`grid h-3 w-3 place-items-center rounded-full transition-colors ${
                    mono
                      ? 'bg-black/45 group-hover/btn:bg-black/60 dark:bg-white/55 dark:group-hover/btn:bg-white/70'
                      : fun
                  }`}
                >
                  <Icon
                    size={size}
                    strokeWidth={2.5}
                    className={`transition-opacity ${
                      mono
                        ? 'text-white opacity-70 group-hover/lights:opacity-100 group-focus-within/lights:opacity-100 dark:text-black'
                        : `${funGlyph} opacity-0 group-hover/lights:opacity-100 group-focus-within/lights:opacity-100`
                    }`}
                  />
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
          onPointerDown={handleResizeStart(dir)}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          onLostPointerCapture={handleResizeEnd}
        />
      ))}
    </motion.div>
    </>
  );
}
