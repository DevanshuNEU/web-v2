'use client';

import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { 
  Image, 
  Palette, 
  RefreshCw,
  Settings
} from 'lucide-react';
import { useOSStore } from '@/store/osStore';

interface DesktopContextMenuProps {
  children: React.ReactNode;
}

export function DesktopContextMenu({ children }: DesktopContextMenuProps) {
  const { openWindow } = useOSStore();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-56 glass-heavy border border-white/20 dark:border-white/10 shadow-glass-xl">
        <ContextMenuItem 
          onClick={() => {
            // Will implement wallpaper selector later
            console.log('Change wallpaper clicked');
          }}
          className="cursor-pointer text-text"
        >
          <Image className="mr-2 h-4 w-4" />
          <span>Change Wallpaper</span>
        </ContextMenuItem>
        
        <ContextMenuItem 
          onClick={() => openWindow('display-options')}
          className="cursor-pointer text-text"
        >
          <Palette className="mr-2 h-4 w-4" />
          <span>Personalize</span>
        </ContextMenuItem>
        
        <ContextMenuSeparator className="bg-white/10" />
        
        <ContextMenuItem 
          onClick={() => window.location.reload()}
          className="cursor-pointer text-text"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          <span>Refresh</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
