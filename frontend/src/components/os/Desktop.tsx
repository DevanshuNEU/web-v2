'use client';

import React from 'react';
import { useOSStore } from '@/store/osStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import Taskbar from './Taskbar';

interface DesktopProps {
  children?: React.ReactNode;
}

// Wallpaper configurations
const wallpapers = {
  gradient: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',  // Light, clean gradient
  mesh: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 20%, #ffecd2 40%, #fcb69f 60%, #ffecd2 80%, #fcb69f 100%)',
  dark: 'linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)',
  light: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',  // Super clean white to light gray
  'posthog-clean': '#faf9f6',  // PostHog's warm background color
};

function getWallpaperStyle(wallpaper: keyof typeof wallpapers) {
  const selected = wallpapers[wallpaper] || wallpapers['posthog-clean'];
  
  // If it's a solid color (like PostHog clean), return as backgroundColor
  if (!selected.includes('gradient')) {
    return null;
  }
  return selected;
}

export default function Desktop({ children }: DesktopProps) {
  const { displaySettings } = useOSStore();
  
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();
  
  const wallpaperStyle = getWallpaperStyle(displaySettings.wallpaper as keyof typeof wallpapers);
  const backgroundColor = wallpapers[displaySettings.wallpaper as keyof typeof wallpapers];
  
  return (
    <div 
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        backgroundColor: wallpaperStyle ? undefined : backgroundColor,
        backgroundImage: wallpaperStyle || undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Subtle overlay for depth */}
      <div className="absolute inset-0 bg-black/[0.02]" />
      
      {/* Desktop content area */}
      <div className="relative z-10 h-screen pb-16">
        {children}
      </div>
      
      {/* Taskbar */}
      <Taskbar />
    </div>
  );
}