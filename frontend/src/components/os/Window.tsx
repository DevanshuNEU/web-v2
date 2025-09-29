'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Square } from 'lucide-react';
import { useOSStore } from '@/store/osStore';
import type { WindowState } from '../../../../../shared/types';

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
  const dragOffset = React.useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    focusWindow(window.id);
    isDragging.current = true;
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
          viewportHeight - window.size.height - 80, // Account for taskbar
          e.clientY - dragOffset.current.y
        ));
        
        updateWindowPosition(window.id, { x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    // Always add listeners, check dragging state inside handlers
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
        height: 'calc(100vh - 64px)',
      }
    : {
        left: window.position.x,
        top: window.position.y,
        width: window.size.width,
        height: window.size.height,
      };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`
        absolute
        rounded-lg shadow-lg border border-window-border
        ${isActive ? 'shadow-xl' : 'shadow-md'}
        ${window.isMaximized ? 'rounded-none' : ''}
        overflow-hidden
      `}
      style={{
        ...windowStyle,
        zIndex: window.zIndex,
      }}
      onClick={() => focusWindow(window.id)}
    >
      {/* Window Titlebar */}
      <div 
        className={`
          window-titlebar flex items-center justify-between px-4 py-3 
          bg-window-titlebar border-b border-window-border
          ${window.isMaximized ? 'rounded-none' : 'rounded-t-lg'}
          cursor-move select-none
        `}
        onMouseDown={handleMouseDown}
      >
        {/* Window Title */}
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-gradient-to-br from-brand-orange to-brand-pink rounded-full" />
          <span className="font-medium text-content-primary text-sm">
            {window.title}
          </span>
        </div>

        {/* Window Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(window.id);
            }}
            className="w-6 h-6 rounded-full bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center transition-colors"
          >
            <Minus size={12} className="text-yellow-800" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              maximizeWindow(window.id);
            }}
            className="w-6 h-6 rounded-full bg-green-400 hover:bg-green-500 flex items-center justify-center transition-colors"
          >
            <Square size={10} className="text-green-800" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(window.id);
            }}
            className="w-6 h-6 rounded-full bg-red-400 hover:bg-red-500 flex items-center justify-center transition-colors"
          >
            <X size={12} className="text-red-800" />
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div className="flex-1 overflow-hidden h-full">
        {children}
      </div>
    </motion.div>
  );
}
