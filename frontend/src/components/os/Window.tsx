'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Square } from 'lucide-react';
import { useOSStore } from '@/store/osStore';
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
  const isActive = useOSStore(state => state.activeWindowId === window.id);
  const isDragging = React.useRef(false);
  const [isDraggingState, setIsDraggingState] = React.useState(false);
  const dragOffset = React.useRef({ x: 0, y: 0 });

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
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      setIsDraggingState(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [window.id, window.size, window.isMaximized, updateWindowPosition]);

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
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92, y: 30 }}
      animate={{
        opacity: 1,
        scale: isDraggingState ? 1.02 : 1,
        y: 0,
      }}
      exit={{
        opacity: 0,
        scale: 0.88,
        y: 20,
        transition: {
          duration: 0.25,
          ease: [0.4, 0, 1, 1],
        },
      }}
      transition={{
        layout: {
          type: 'spring',
          damping: 22,
          stiffness: 140,
          mass: 0.9,
        },
        type: 'spring',
        damping: 20,
        stiffness: 120,
        mass: 0.8,
        opacity: {
          duration: 0.35,
          ease: 'easeOut',
        },
        scale: {
          duration: isDraggingState ? 0.15 : 0.4,
          ease: [0.16, 1, 0.3, 1],
        },
        y: {
          type: 'spring',
          damping: 20,
          stiffness: 120,
          mass: 0.8,
        },
      }}
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
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600
                       transition-colors flex items-center justify-center"
            title="Close"
          >
            <X
              size={7}
              strokeWidth={2.5}
              className="text-red-900 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </button>

          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(window.id);
            }}
            className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500
                       transition-colors flex items-center justify-center"
            title="Minimize"
          >
            <Minus
              size={7}
              strokeWidth={2.5}
              className="text-yellow-900 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </button>

          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              maximizeWindow(window.id);
            }}
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600
                       transition-colors flex items-center justify-center"
            title="Maximize"
          >
            <Square
              size={6}
              strokeWidth={2.5}
              className="text-green-900 opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* Content */}
      <div className="flex-1 overflow-auto bg-surface/25" style={{ minHeight: 0 }}>
        {children}
      </div>
    </motion.div>
  );
}
