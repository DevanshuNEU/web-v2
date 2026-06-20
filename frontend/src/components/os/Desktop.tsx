'use client';

import React from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMagneticField } from '@/hooks/useMagnetic';
import { AnimatedBackground } from './AnimatedBackground';
import { DesktopContextMenu } from './DesktopContextMenu';
import { ParallaxProvider } from './ParallaxProvider';
import MenuBar from './MenuBar';
import Taskbar from './Taskbar';
import DesktopIcons from './DesktopIcons';
import Cursor from './Cursor';

interface DesktopProps {
  children?: React.ReactNode;
}

export default function Desktop({ children }: DesktopProps) {
  useKeyboardShortcuts();
  // One global driver for magnetic flat buttons (no-op under reduced/coarse).
  useMagneticField();

  return (
    // ParallaxProvider is context-only (no DOM), so it wraps OUTSIDE the menu.
    // It must NOT sit between ContextMenuTrigger (asChild) and the desktop div,
    // or the trigger has no DOM element to bind the right-click handler to.
    <ParallaxProvider>
      <DesktopContextMenu>
        <div className="min-h-screen w-full relative overflow-hidden">
          <Cursor />
          <AnimatedBackground />

          {/* Menu bar at top */}
          <MenuBar />

          {/* Content area — inset by menu bar (28px) at top and dock (~72px) at bottom */}
          <div className="relative z-10 h-screen pt-7 pb-20">
            {/* Desktop shortcut icons — top-left, curated for first-time visitors */}
            <DesktopIcons />
            {children}
          </div>

          <Taskbar />
        </div>
      </DesktopContextMenu>
    </ParallaxProvider>
  );
}
