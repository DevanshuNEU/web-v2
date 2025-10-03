'use client';

import React from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { AnimatedBackground } from './AnimatedBackground';
import Taskbar from './Taskbar';

interface DesktopProps {
  children?: React.ReactNode;
}

export default function Desktop({ children }: DesktopProps) {
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();
  
  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Desktop content area */}
      <div className="relative z-10 h-screen pb-16">
        {children}
      </div>
      
      {/* Taskbar */}
      <Taskbar />
    </div>
  );
}
