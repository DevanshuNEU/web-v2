'use client';

import React from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMagneticField } from '@/hooks/useMagnetic';
import { Z } from '@/lib/zLayers';
import { AnimatedBackground } from './AnimatedBackground';
import { DesktopContextMenu } from './DesktopContextMenu';
import { ParallaxProvider } from './ParallaxProvider';
import MenuBar from './MenuBar';
import Taskbar from './Taskbar';
import DesktopIcons from './DesktopIcons';
import Cursor from './Cursor';

interface DesktopProps {
  /** Windows, widgets: everything that lives under the dock and menu bar. */
  children?: React.ReactNode;
  /**
   * Notifications, Spotlight, the app switcher, the assistant. Rendered after
   * the dock at the root, outside the content box, so their z-index competes
   * with the dock and menu bar instead of being trapped under them.
   */
  overlays?: React.ReactNode;
}

/**
 * Right-clicks inside a window (links, selected text) get the browser's own
 * menu. Stopping the event here means the desktop menu's trigger never sees
 * it; the browser's default is untouched.
 */
function keepNativeMenuInWindows(e: React.MouseEvent) {
  if ((e.target as Element).closest?.('[data-window]')) e.stopPropagation();
}

export default function Desktop({ children, overlays }: DesktopProps) {
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

          {/* Content box: inset by the menu bar (28px) and the dock (~72px).
              Its z-index makes it one stacking context, so window z-indexes
              stay below the dock, menu bar and overlays (lib/zLayers.ts). */}
          <div
            className="relative h-screen pt-7 pb-20"
            style={{ zIndex: Z.content }}
            onContextMenu={keepNativeMenuInWindows}
          >
            {/* Desktop shortcut icons, top-left, curated for first-time visitors */}
            <DesktopIcons />
            {children}
          </div>

          <Taskbar />

          {overlays}
        </div>
      </DesktopContextMenu>
    </ParallaxProvider>
  );
}
