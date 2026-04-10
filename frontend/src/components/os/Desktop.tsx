'use client';

import React from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { AnimatedBackground } from './AnimatedBackground';
import { DesktopContextMenu } from './DesktopContextMenu';
import MenuBar from './MenuBar';
import Taskbar from './Taskbar';
import DesktopIcons from './DesktopIcons';

interface DesktopProps {
  children?: React.ReactNode;
}

export default function Desktop({ children }: DesktopProps) {
  useKeyboardShortcuts();

  return (
    <DesktopContextMenu>
      <div className="min-h-screen w-full relative overflow-hidden">
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
  );
}
