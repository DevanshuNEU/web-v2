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
} from '@/components/ui/context-menu';
import { useOSStore } from '@/store/osStore';
import { useSpotlightStore } from '@/store/spotlightStore';
import type { AppType } from '../../../../shared/types';
import { useIsMono } from '@/hooks/usePalette';

/** Each line says what it does, in the shell voice. */
const ITEMS: { app: AppType; label: string }[] = [
  { app: 'about-me', label: 'open About Me' },
  { app: 'projects', label: 'open Projects' },
  { app: 'resume', label: 'open Resume' },
  { app: 'terminal', label: 'open Terminal' },
];

interface DesktopContextMenuProps {
  children: React.ReactNode;
}

const ITEM_BASE =
  'group relative flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-1.5 ' +
  'font-mono text-[13px] text-text-secondary outline-none transition-colors duration-100 ' +
  'focus:text-text data-[highlighted]:text-text';

/** The shell-prompt glyph that leads every command; brightens (or accents) on highlight. */
function Prompt({ mono }: { mono: boolean }) {
  return (
    <span
      aria-hidden
      className={`font-mono text-[12px] text-text-secondary transition-colors duration-100 ${
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
      ? 'focus:bg-text/[0.12] data-[highlighted]:bg-text/[0.12]'
      : 'focus:bg-accent/15 data-[highlighted]:bg-accent/15'
  }`;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>

      <ContextMenuContent
        className="w-64 rounded-xl border border-border/60 bg-surface/90 p-1.5 font-mono shadow-2xl
                   backdrop-blur-2xl duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
      >
        <ContextMenuItem onClick={() => useSpotlightStore.getState().open()} className={ITEM_CLASS}>
          <Prompt mono={mono} />
          <span className="flex-1">search devOS</span>
          <kbd className="font-mono text-[11px] text-text-secondary">⌘K</kbd>
        </ContextMenuItem>

        <ContextMenuSeparator className="my-1 bg-text/10" />

        {ITEMS.map(({ app, label }) => (
          <ContextMenuItem key={app} onClick={() => openWindow(app)} className={ITEM_CLASS}>
            <Prompt mono={mono} />
            <span>{label}</span>
          </ContextMenuItem>
        ))}

        <ContextMenuSeparator className="my-1 bg-text/10" />

        <ContextMenuItem onClick={() => openWindow('display-options')} className={ITEM_CLASS}>
          <Prompt mono={mono} />
          <span>change theme and wallpaper</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
