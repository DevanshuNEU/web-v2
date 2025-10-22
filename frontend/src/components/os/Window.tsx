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
  const { 
    closeWindow, 
    focusWindow, 
    minimizeWindow, 
    maximizeWindow,
    updateWindowPosition,
    activeWindowId 
  } = useOSStore();

  const isActive = activeWindowId === window.id;
  const isDragging = React.useRef(false);
  const [isDraggingState, setIsDraggingState] = React.useState(false);
  const dragOffset = React.useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    
    focusWindow(window.id);
    isDragging.current = true;
    setIsDraggingState(true);
    dragOffset.current = {
      x: e.clientX - window.position.x,
      y: e.clientY - window.position.y
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
        const newY = Math.max(0, Math.min(
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

  const windowStyle = window.isMaximized 
    ? {
        left: 0,
        top: 0,
        width: '100vw',
        height: 'calc(100vh - 88px)', // Account for floating taskbar (64px) + bottom margin (24px)
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
          ease: [0.4, 0, 1, 1] // Fast exit with easeIn
        }
      }}
      transition={{ 
        layout: {
          type: "spring",
          damping: 22,
          stiffness: 140,
          mass: 0.9
        },
        type: "spring",
        damping: 20,
        stiffness: 120,
        mass: 0.8,
        opacity: { 
          duration: 0.35,
          ease: "easeOut"
        },
        scale: { 
          duration: isDraggingState ? 0.15 : 0.4,
          ease: [0.16, 1, 0.3, 1] // Smooth easeOutExpo
        },
        y: {
          type: "spring",
          damping: 20,
          stiffness: 120,
          mass: 0.8
        }
      }}
      className={`
        absolute
        rounded-xl overflow-hidden
        glass-medium
        border border-white/20 dark:border-white/10
        shadow-glass-lg
        flex flex-col
        will-change-transform
        transition-[border-radius] duration-[450ms] ease-out
        ${isActive ? 'ring-1 ring-accent/20 dark:ring-accent/30 shadow-glass-xl' : ''}
        ${window.isMaximized ? 'rounded-none' : ''}
        before:absolute before:inset-x-0 before:top-0 before:h-px
        before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
      `}
      style={{
        zIndex: window.zIndex,
        ...windowStyle
      }}
      onClick={() => focusWindow(window.id)}
    >
      {/* Window Titlebar - Extra Blur */}
      <div 
        className={`
          flex items-center justify-between px-4 py-3 
          glass-heavy
          border-b border-white/10 dark:border-white/5
          transition-[border-radius] duration-[450ms] ease-out
          ${window.isMaximized ? 'rounded-none' : 'rounded-t-xl'}
          cursor-move select-none
        `}
        onMouseDown={handleMouseDown}
      >
        {/* Window Controls - LEFT SIDE */}
        <div className="flex items-center gap-1.5 p-1 -m-1">
          <button
            onMouseDown={(e) => {
              e.stopPropagation(); // Prevent drag from starting
            }}
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(window.id);
            }}
            className="w-6 h-6 rounded-md bg-red-500/90 hover:bg-red-600 transition-all group relative flex items-center justify-center"
            title="Close"
          >
            <X size={12} className="text-white opacity-70 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <button
            onMouseDown={(e) => {
              e.stopPropagation(); // Prevent drag from starting
            }}
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(window.id);
            }}
            className="w-6 h-6 rounded-md bg-yellow-500/90 hover:bg-yellow-600 transition-all group relative flex items-center justify-center"
            title="Minimize"
          >
            <Minus size={12} className="text-white opacity-70 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <button
            onMouseDown={(e) => {
              e.stopPropagation(); // Prevent drag from starting
            }}
            onClick={(e) => {
              e.stopPropagation();
              maximizeWindow(window.id);
            }}
            className="w-6 h-6 rounded-md bg-green-500/90 hover:bg-green-600 transition-all group relative flex items-center justify-center"
            title="Maximize"
          >
            <Square size={10} className="text-white opacity-70 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
        
        {/* Window Title - CENTER */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <span className="font-medium text-text text-sm">
            {window.title}
          </span>
        </div>
        
        {/* Empty right side for symmetry */}
        <div className="w-[84px]"></div>
      </div>

      {/* Window Content */}
      <div className="flex-1 overflow-auto bg-surface/50" style={{ minHeight: 0 }}>
        {children}
      </div>
    </motion.div>
  );
}
