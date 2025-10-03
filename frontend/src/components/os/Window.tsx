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
    focusWindow(window.id);
    isDragging.current = true;
    setIsDraggingState(true);
    dragOffset.current = {
      x: e.clientX - window.position.x,
      y: e.clientY - window.position.y
    };
    
    e.preventDefault();
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

  if (window.isMinimized) {
    return null;
  }

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
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: isDraggingState ? 1.02 : 1, 
        y: 0,
        ...windowStyle
      }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ 
        type: "spring",
        damping: 25,
        stiffness: 300,
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 }
      }}
      className={`
        absolute
        rounded-xl overflow-hidden
        glass-medium
        border border-white/20 dark:border-white/10
        shadow-glass-lg
        ${isActive ? 'ring-1 ring-accent/20 dark:ring-accent/30 shadow-glass-xl' : ''}
        ${window.isMaximized ? 'rounded-none' : ''}
        before:absolute before:inset-x-0 before:top-0 before:h-px
        before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
      `}
      style={{
        zIndex: window.zIndex,
      }}
      onClick={() => focusWindow(window.id)}
    >
      {/* Window Titlebar - Extra Blur */}
      <div 
        className={`
          flex items-center justify-between px-4 py-3 
          glass-heavy
          border-b border-white/10 dark:border-white/5
          ${window.isMaximized ? 'rounded-none' : 'rounded-t-xl'}
          cursor-move select-none
        `}
        onMouseDown={handleMouseDown}
      >
        {/* macOS Traffic Light Controls - LEFT SIDE */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(window.id);
            }}
            className="w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors group relative"
            title="Close"
          >
            <X size={10} className="absolute inset-0 m-auto text-red-900 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(window.id);
            }}
            className="w-4 h-4 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors group relative"
            title="Minimize"
          >
            <Minus size={10} className="absolute inset-0 m-auto text-yellow-900 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              maximizeWindow(window.id);
            }}
            className="w-4 h-4 rounded-full bg-green-500 hover:bg-green-600 transition-colors group relative"
            title="Maximize"
          >
            <Square size={8} className="absolute inset-0 m-auto text-green-900 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
        
        {/* Window Title - CENTER */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <span className="font-medium text-text text-sm">
            {window.title}
          </span>
        </div>
        
        {/* Empty right side for symmetry */}
        <div className="w-[72px]"></div>
      </div>

      {/* Window Content */}
      <div className="flex-1 overflow-auto h-full bg-surface/50">
        {children}
      </div>
    </motion.div>
  );
}
