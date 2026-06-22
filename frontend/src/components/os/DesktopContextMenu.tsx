'use client';

/**
 * Desktop right-click menu — the command layer's terminal half.
 *
 * Shares the Spotlight language: monochrome, mono type, hairline separators, a
 * graphite highlight. Each entry reads like a shell command behind a `›` prompt
 * glyph. Origin-aware (Radix anchors the scale to the cursor) with the shared
 * ease-out curve. Colours flip with the theme via semantic tokens.
 */

import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuLabel,
} from '@/components/ui/context-menu';
import { useOSStore } from '@/store/osStore';
import { useIsMono } from '@/hooks/usePalette';

interface DesktopContextMenuProps {
  children: React.ReactNode;
}

const ITEM_BASE =
  'group relative flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-1.5 ' +
  'font-mono text-[12.5px] text-text-secondary outline-none transition-colors duration-100 ' +
  'focus:text-text data-[highlighted]:text-text';

/** The shell-prompt glyph that leads every command; brightens (or accents) on highlight. */
function Prompt({ mono }: { mono: boolean }) {
  return (
    <span
      className={`font-mono text-[12px] text-text-secondary/40 transition-colors duration-100 ${
        mono ? 'group-data-[highlighted]:text-text/70' : 'group-data-[highlighted]:text-accent'
      }`}
    >
      ›
    </span>
  );
}

export function DesktopContextMenu({ children }: DesktopContextMenuProps) {
  const openWindow = useOSStore(state => state.openWindow);
  // Monochrome by default; "fun" (colour) mode lets the single accent tint the highlight.
  const mono = useIsMono();
  const ITEM_CLASS = `${ITEM_BASE} ${
    mono
      ? 'focus:bg-text/[0.07] data-[highlighted]:bg-text/[0.07]'
      : 'focus:bg-accent/10 data-[highlighted]:bg-accent/10'
  }`;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>

      <ContextMenuContent
        className="w-64 rounded-xl border border-border/60 bg-surface/80 p-1.5 font-mono shadow-2xl
                   backdrop-blur-2xl duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
      >
        {/* Flavour header — a shell comment, not clickable */}
        <ContextMenuLabel className="select-none px-2.5 py-1.5 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-text-secondary/40">
          # right-click as a service
        </ContextMenuLabel>

        <ContextMenuSeparator className="my-1 bg-text/10" />

        {/* Spotlight search shortcut — triggers the Cmd+K overlay */}
        <ContextMenuItem
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
          }}
          className={ITEM_CLASS}
        >
          <Prompt mono={mono} />
          <span className="flex-1">search devOS</span>
          <kbd className="font-mono text-[10px] text-text-secondary/40">⌘K</kbd>
        </ContextMenuItem>

        <ContextMenuSeparator className="my-1 bg-text/10" />

        <ContextMenuItem onClick={() => openWindow('about-me')} className={ITEM_CLASS}>
          <Prompt mono={mono} />
          <span>open ./about-me</span>
        </ContextMenuItem>

        <ContextMenuItem onClick={() => openWindow('file-explorer')} className={ITEM_CLASS}>
          <Prompt mono={mono} />
          <span>ls -la ~/projects</span>
        </ContextMenuItem>

        <ContextMenuItem onClick={() => openWindow('terminal')} className={ITEM_CLASS}>
          <Prompt mono={mono} />
          <span>open Terminal.app</span>
        </ContextMenuItem>

        <ContextMenuSeparator className="my-1 bg-text/10" />

        <ContextMenuItem onClick={() => openWindow('display-options')} className={ITEM_CLASS}>
          <Prompt mono={mono} />
          <span>theme --customize</span>
        </ContextMenuItem>

        <ContextMenuSeparator className="my-1 bg-text/10" />

        <ContextMenuItem onClick={() => window.location.reload()} className={ITEM_CLASS}>
          <Prompt mono={mono} />
          <span>git pull .</span>
        </ContextMenuItem>

        <ContextMenuItem
          disabled
          className="flex cursor-default select-none items-center gap-2.5 rounded-lg px-2.5 py-1.5 font-mono text-[12px] italic text-text-secondary/35 opacity-70 focus:bg-transparent data-[highlighted]:bg-transparent"
        >
          <span className="font-mono text-[12px] text-text-secondary/25">$</span>
          <span>brew install good-vibes</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
