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
import { useTheme } from '@/store/themeStore';

interface DesktopContextMenuProps {
  children: React.ReactNode;
}

export function DesktopContextMenu({ children }: DesktopContextMenuProps) {
  const openWindow = useOSStore(state => state.openWindow);
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const menuBg = isDark
    ? 'rgba(28, 28, 32, 0.88)'
    : 'rgba(250, 250, 252, 0.90)';
  const borderClass = isDark ? 'border-white/12' : 'border-black/6';
  const separatorClass = isDark ? 'bg-white/8' : 'bg-black/6';
  const itemClass = isDark
    ? 'cursor-pointer text-white/85 focus:bg-white/8 focus:text-white/85 data-[highlighted]:bg-white/8 data-[highlighted]:text-white/85'
    : 'cursor-pointer text-gray-800 focus:bg-black/5 focus:text-gray-800 data-[highlighted]:bg-black/5 data-[highlighted]:text-gray-800';
  const labelClass = isDark ? 'text-white/35' : 'text-gray-400';
  const kbdClass = isDark ? 'text-white/35 font-mono ml-2' : 'text-gray-400 font-mono ml-2';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>

      <ContextMenuContent
        className={`w-60 border ${borderClass} shadow-glass-xl`}
        style={{ background: menuBg, backdropFilter: 'blur(40px) saturate(160%)', WebkitBackdropFilter: 'blur(40px) saturate(160%)' }}
      >
        {/* Flavour header — not clickable */}
        <ContextMenuLabel className={`text-[11px] font-normal px-2 py-1.5 leading-tight select-none ${labelClass}`}>
          devOS · right-click as a service
        </ContextMenuLabel>

        <ContextMenuSeparator className={separatorClass} />

        {/* Spotlight search shortcut — triggers the Cmd+K overlay */}
        <ContextMenuItem
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
          }}
          className={itemClass}
        >
          <Search className="mr-2 h-4 w-4 opacity-60" />
          <span className="flex-1">Search devOS</span>
          <kbd className={`text-[10px] ${kbdClass}`}>⌘K</kbd>
        </ContextMenuItem>

        <ContextMenuSeparator className={separatorClass} />

        <ContextMenuItem onClick={() => openWindow('about-me')} className={itemClass}>
          <User className="mr-2 h-4 w-4 opacity-60" />
          <span>open ./about-me</span>
        </ContextMenuItem>

        <ContextMenuItem onClick={() => openWindow('file-explorer')} className={itemClass}>
          <FolderOpen className="mr-2 h-4 w-4 opacity-60" />
          <span>ls -la ~/projects</span>
        </ContextMenuItem>

        <ContextMenuItem onClick={() => openWindow('terminal')} className={itemClass}>
          <Terminal className="mr-2 h-4 w-4 opacity-60" />
          <span>open Terminal.app</span>
        </ContextMenuItem>

        <ContextMenuSeparator className={separatorClass} />

        <ContextMenuItem onClick={() => openWindow('display-options')} className={itemClass}>
          <Palette className="mr-2 h-4 w-4 opacity-60" />
          <span>Make it yours</span>
        </ContextMenuItem>

        <ContextMenuSeparator className={separatorClass} />

        <ContextMenuItem onClick={() => window.location.reload()} className={itemClass}>
          <RefreshCw className="mr-2 h-4 w-4 opacity-60" />
          <span>git pull .</span>
        </ContextMenuItem>

        <ContextMenuItem
          disabled
          className={`opacity-40 cursor-default focus:bg-transparent data-[highlighted]:bg-transparent ${isDark ? 'text-white/40' : 'text-gray-400'}`}
        >
          <Coffee className="mr-2 h-4 w-4 opacity-40" />
          <span className="italic text-[12px]">brew install good-vibes</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
