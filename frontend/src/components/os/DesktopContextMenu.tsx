'use client';

import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuLabel,
} from '@/components/ui/context-menu';
import { Palette, RefreshCw, FolderOpen, Terminal, User, Coffee, Search } from 'lucide-react';
import { useOSStore } from '@/store/osStore';

interface DesktopContextMenuProps {
  children: React.ReactNode;
}

export function DesktopContextMenu({ children }: DesktopContextMenuProps) {
  const openWindow = useOSStore(state => state.openWindow);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>

      <ContextMenuContent className="w-60 border border-white/12 shadow-glass-xl" style={{ background: 'rgba(28, 28, 32, 0.88)', backdropFilter: 'blur(40px) saturate(160%)', WebkitBackdropFilter: 'blur(40px) saturate(160%)' }}>
        {/* Flavour header — not clickable */}
        <ContextMenuLabel className="text-[11px] font-normal text-text-secondary px-2 py-1.5 leading-tight select-none">
          devOS · right-click as a service
        </ContextMenuLabel>

        <ContextMenuSeparator className="bg-white/10" />

        {/* Spotlight search shortcut — triggers the Cmd+K overlay */}
        <ContextMenuItem
          onClick={() => {
            // Dispatch a synthetic keyboard event to open Spotlight
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
          }}
          className="cursor-pointer text-text focus:bg-white/10 focus:text-text data-[highlighted]:bg-white/10 data-[highlighted]:text-text"
        >
          <Search className="mr-2 h-4 w-4 opacity-60" />
          <span className="flex-1">Search devOS</span>
          <kbd className="text-[10px] text-text-secondary/50 font-mono ml-2">⌘K</kbd>
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-white/10" />

        <ContextMenuItem
          onClick={() => openWindow('about-me')}
          className="cursor-pointer text-text focus:bg-white/10 focus:text-text data-[highlighted]:bg-white/10 data-[highlighted]:text-text"
        >
          <User className="mr-2 h-4 w-4 opacity-60" />
          <span>open ./about-me</span>
        </ContextMenuItem>

        <ContextMenuItem
          onClick={() => openWindow('file-explorer')}
          className="cursor-pointer text-text focus:bg-white/10 focus:text-text data-[highlighted]:bg-white/10 data-[highlighted]:text-text"
        >
          <FolderOpen className="mr-2 h-4 w-4 opacity-60" />
          <span>ls -la ~/projects</span>
        </ContextMenuItem>

        <ContextMenuItem
          onClick={() => openWindow('terminal')}
          className="cursor-pointer text-text focus:bg-white/10 focus:text-text data-[highlighted]:bg-white/10 data-[highlighted]:text-text"
        >
          <Terminal className="mr-2 h-4 w-4 opacity-60" />
          <span>open Terminal.app</span>
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-white/10" />

        <ContextMenuItem
          onClick={() => openWindow('display-options')}
          className="cursor-pointer text-text focus:bg-white/10 focus:text-text data-[highlighted]:bg-white/10 data-[highlighted]:text-text"
        >
          <Palette className="mr-2 h-4 w-4 opacity-60" />
          <span>Make it yours</span>
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-white/10" />

        <ContextMenuItem
          onClick={() => window.location.reload()}
          className="cursor-pointer text-text focus:bg-white/10 focus:text-text data-[highlighted]:bg-white/10 data-[highlighted]:text-text"
        >
          <RefreshCw className="mr-2 h-4 w-4 opacity-60" />
          <span>git pull .</span>
        </ContextMenuItem>

        <ContextMenuItem
          disabled
          className="text-text-secondary opacity-40 cursor-default focus:bg-transparent data-[highlighted]:bg-transparent"
        >
          <Coffee className="mr-2 h-4 w-4 opacity-40" />
          <span className="italic text-[12px]">brew install good-vibes</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
