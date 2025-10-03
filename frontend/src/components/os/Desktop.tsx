'use client';

import React from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { AnimatedBackground } from './AnimatedBackground';
import { DesktopContextMenu } from './DesktopContextMenu';
import Taskbar from './Taskbar';

interface DesktopProps {
  children?: React.ReactNode;
}

export default function Desktop({ children }: DesktopProps) {
  useKeyboardShortcuts();
  
  return (
    <DesktopContextMenu>
      <div className="min-h-screen w-full relative overflow-hidden">
        <AnimatedBackground />
        
        <div className="relative z-10 h-screen pb-16">
          {children}
        </div>
        
        <Taskbar />
      </div>
    </DesktopContextMenu>
  );
}
