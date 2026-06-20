'use client';

import React from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { X, Minus, Square } from 'lucide-react';
import { useOSStore } from '@/store/osStore';
import { useIsMono } from '@/hooks/usePalette';
import { spring, INSTANT } from '@/lib/motion';
import { getDockIconRect } from '@/lib/dockRegistry';
import { computeSnap, type SnapBounds } from '@/lib/windowSnap';
import type { WindowState } from '../../../../shared/types';

interface WindowProps {
  window: WindowState;
  children: React.ReactNode;
}

export default function Window({ window, children }: WindowProps) {
  const closeWindow = useOSStore(state => state.closeWindow);
  const focusWindow = useOSStore(state => state.focusWindow);
  const minimizeWindow = useOSStore(state => state.minimizeWindow);
  const maximizeWindow = useOSStore(state => state.maximizeWindow);
  const updateWindowPosition = useOSStore(state => state.updateWindowPosition);
  const snapWindow = useOSStore(state => state.snapWindow);
  const isActive = useOSStore(state => state.activeWindowId === window.id);
  const isDragging = React.useRef(false);
  const [isDraggingState, setIsDraggingState] = React.useState(false);
  const [snapPreview, setSnapPreview] = React.useState<SnapBounds | null>(null);
  const snapPreviewRef = React.useRef<SnapBounds | null>(null);
  const dragOffset = React.useRef({ x: 0, y: 0 });
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const elRef = React.useRef<HTMLDivElement>(null);
  const mono = useIsMono();

  // Drive open / drag scale through the same controls the genie minimize uses,
  // so there is one animation owner per window.
  React.useEffect(() => {
    controls.start({
      opacity: 1,
      x: 0,
      y: 0,
      scale: isDraggingState ? 1.02 : 1,
      skewX: 0,
      transition: reduced
        ? INSTANT
        : {
            ...spring.window,
            opacity: { duration: 0.35, ease: 'easeOut' },
            scale: { duration: isDraggingState ? 0.15 : 0.4, ease: [0.16, 1, 0.3, 1] },
          },
    });
  }, [isDraggingState, reduced, controls]);

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
    await controls.start({
      x: dx,
      y: dy,
      scale: 0.06,
      skewX: 8,
      opacity: 0,
      transition: spring.genie,
    });
    minimizeWindow(window.id);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }

    focusWindow(window.id);
    isDragging.current = true;
    setIsDraggingState(true);
    dragOffset.current = {
      x: e.clientX - window.position.x,
      y: e.clientY - window.position.y,
    };

    e.stopPropagation();
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current && !window.isMaximized) {
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;

        const newX = Math.max(0, Math.min(
          viewportWidth - window.size.width,
          e.clientX - dragOffset.current.x
        ));
        const newY = Math.max(28, Math.min(
          viewportHeight - window.size.height - 80,
          e.clientY - dragOffset.current.y
        ));

        updateWindowPosition(window.id, { x: newX, y: newY });

        // Preview a snap region when the pointer reaches a screen edge.
        const snap = computeSnap(e.clientX, e.clientY, viewportWidth, viewportHeight);
        snapPreviewRef.current = snap;
        setSnapPreview(snap);
      }
    };

    const handleMouseUp = () => {
      const wasDragging = isDragging.current;
      isDragging.current = false;
      setIsDraggingState(false);

      // Commit a pending snap on release.
      if (wasDragging && snapPreviewRef.current) {
        snapWindow(window.id, snapPreviewRef.current);
      }
      snapPreviewRef.current = null;
      setSnapPreview(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [window.id, window.size, window.isMaximized, updateWindowPosition, snapWindow]);

  // Menu bar is h-7 = 28px; dock area is ~60px; keep windows inside those bounds
  const MENUBAR_H = 28;
  const DOCK_H = 60;

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
      {/* Snap-zone preview — shown while dragging toward a screen edge */}
      {snapPreview && isDraggingState && (
        <div
          aria-hidden
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
      layout
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
          cursor-move select-none
          ${window.isMaximized ? 'rounded-none' : 'rounded-t-xl'}
          ${isActive ? 'opacity-100' : 'opacity-60'}
        `}
        onMouseDown={handleMouseDown}
      >
        {/* Traffic-light controls */}
        <div className="group flex items-center gap-1.5">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(window.id);
            }}
            className={`w-3 h-3 rounded-full transition-colors flex items-center justify-center ${
              mono
                ? 'bg-black/45 hover:bg-black/65 dark:bg-white/35 dark:hover:bg-white/55'
                : 'bg-red-500 hover:bg-red-600'
            }`}
            title="Close"
          >
            <X
              size={7}
              strokeWidth={2.5}
              className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                mono ? 'text-white dark:text-black' : 'text-red-900'
              }`}
            />
          </button>

          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleMinimize();
            }}
            className={`w-3 h-3 rounded-full transition-colors flex items-center justify-center ${
              mono
                ? 'bg-black/30 hover:bg-black/50 dark:bg-white/25 dark:hover:bg-white/45'
                : 'bg-yellow-400 hover:bg-yellow-500'
            }`}
            title="Minimize"
          >
            <Minus
              size={7}
              strokeWidth={2.5}
              className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                mono ? 'text-white dark:text-black' : 'text-yellow-900'
              }`}
            />
          </button>

          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              maximizeWindow(window.id);
            }}
            className={`w-3 h-3 rounded-full transition-colors flex items-center justify-center ${
              mono
                ? 'bg-black/20 hover:bg-black/40 dark:bg-white/15 dark:hover:bg-white/35'
                : 'bg-green-500 hover:bg-green-600'
            }`}
            title="Maximize"
          >
            <Square
              size={6}
              strokeWidth={2.5}
              className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                mono ? 'text-white dark:text-black' : 'text-green-900'
              }`}
            />
          </button>
        </div>

        {/* Centered title */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <span className="text-sm font-medium text-text">
            {window.title}
          </span>
        </div>

        {/* Spacer for symmetry */}
        <div className="w-[60px] ml-auto" />
      </div>

      {/* Content — app-content makes every window a query container so app
          typography scales with window width (see globals.css → in-window type) */}
      <div className="flex-1 overflow-auto bg-surface/25 app-content" style={{ minHeight: 0 }}>
        {children}
      </div>
    </motion.div>
    </>
  );
}
