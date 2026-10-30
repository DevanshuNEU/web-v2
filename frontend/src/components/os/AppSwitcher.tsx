'use client';

/**
 * AppSwitcher — macOS Cmd+Tab style window switcher overlay.
 *
 * Shortcut: Alt+Tab / Alt+Shift+Tab  (cycle forward / backward)
 *           Ctrl+` / Ctrl+Shift+`    (same, for Windows/Linux where the OS owns Alt+Tab)
 *
 * Why Alt instead of Cmd?
 *   macOS intercepts Cmd+Tab at the OS level before the browser receives it.
 *   Alt+Tab (Option+Tab on Mac) is NOT intercepted by macOS, and Chrome on
 *   Mac has no default binding for it — so the browser always gets the event.
 *   On Windows, Alt+Tab IS intercepted by the OS, so Ctrl+` opens it there.
 *
 * UX:
 *   - Pressing Alt+Tab while no apps are open: no-op.
 *   - With 1 app open: selects desktop (closes overlay, clears active window).
 *   - With 2+ apps: frosted glass pill shows app icons; cycling is instant.
 *   - Order is most recently used (window z-order), Desktop last, and the
 *     selection starts on the previous window, like Cmd+Tab.
 *   - Releasing the modifier: overlay closes and focus moves to the selected app.
 *   - Escape while open: closes overlay, no focus change.
 *
 * The switcher manages its own keydown/keyup listeners and is self-contained
 * — no changes to useKeyboardShortcuts needed.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor } from 'lucide-react';
import { useOSStore } from '@/store/osStore';
import { useEscapeLayer } from '@/lib/escapeStack';
import { Z } from '@/lib/zLayers';
import { appRegistry, getAppLabel } from '@/lib/appRegistry';
import AppIcon from '@/components/os/AppIcon';
import type { AppType } from '../../../../shared/types';

// ---------------------------------------------------------------------------
// Desktop item (index 0) — selecting it clears focus without opening an app
// ---------------------------------------------------------------------------

interface SwitcherEntry {
  windowId: string | null; // null = "Desktop" pseudo-entry
  appType:  AppType | null;
  title:    string;
}

// ---------------------------------------------------------------------------
// Individual icon cell in the switcher
// ---------------------------------------------------------------------------

function SwitcherCell({
  entry,
  isSelected,
}: {
  entry: SwitcherEntry;
  isSelected: boolean;
}) {
  const reg = entry.appType ? appRegistry[entry.appType] : null;
  const label = entry.appType ? getAppLabel(entry.appType).title : 'Desktop';

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`
          relative w-14 h-14 rounded-2xl flex items-center justify-center
          transition-all duration-100
          ${isSelected
            ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-transparent scale-110'
            : 'scale-100 opacity-70'}
        `}
      >
        {reg ? (
          <AppIcon icon={reg.icon} colorKey={reg.iconColor} size={56} />
        ) : (
          // Desktop pseudo-entry
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
            <Monitor size={24} className="text-white/60" />
          </div>
        )}
      </div>
      {isSelected && (
        <span className="text-[11px] text-white/80 font-medium max-w-[72px] truncate text-center">
          {label}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AppSwitcher() {
  // No subscription to windows: the list is read from the store when the
  // switcher opens and when it cycles, so commits from dragging or resizing
  // never re-render it or rebind its key listeners.
  const focusWindow    = useOSStore(s => s.focusWindow);

  const [isOpen,   setIsOpen]   = useState(false);
  const [selIdx,   setSelIdx]   = useState(0);
  const [entries,  setEntries]  = useState<SwitcherEntry[]>([]);
  const entriesRef = useRef<SwitcherEntry[]>([]);
  const heldKeyRef = useRef<'Alt' | 'Control'>('Alt');

  // Esc closes the switcher with no focus change, and nothing behind it.
  useEscapeLayer(isOpen, () => { setIsOpen(false); setSelIdx(0); });

  // Snapshot the switcher entries from the store. Windows come most recently
  // used first: zIndex rises on every focus, so z-order is MRU order. Desktop
  // goes last.
  const buildEntries = useCallback((): SwitcherEntry[] => {
    const openWins = useOSStore.getState().windows
      .filter(w => w.isOpen)
      .sort((a, b) => {
        // Minimized windows sit behind visible ones.
        if (a.isMinimized !== b.isMinimized) return a.isMinimized ? 1 : -1;
        return b.zIndex - a.zIndex;
      });
    const desktop: SwitcherEntry = { windowId: null, appType: null, title: 'Desktop' };
    const winEntries: SwitcherEntry[] = openWins.map(w => ({
      windowId: w.id,
      appType:  w.appType,
      title:    w.title,
    }));
    return [...winEntries, desktop];
  }, []);

  // -- Keyboard handling --

  useEffect(() => {
    const isTrigger = (e: KeyboardEvent) =>
      (e.key === 'Tab' && e.altKey && !e.ctrlKey && !e.metaKey) ||
      (e.code === 'Backquote' && e.ctrlKey && !e.altKey && !e.metaKey);

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTrigger(e)) return;

      e.preventDefault(); // keep the keystroke from the page and the browser

      const fresh = buildEntries();
      entriesRef.current = fresh;
      setEntries(fresh);

      if (fresh.length <= 1) return; // no apps open, nothing to switch

      if (!isOpen) {
        // Opening: the focused window is entry 0, so a quick tap lands on the
        // previous one. With nothing focused, start on the most recent window.
        heldKeyRef.current = e.altKey ? 'Alt' : 'Control';
        const focusedFirst = fresh[0]?.windowId === useOSStore.getState().activeWindowId;
        const startIdx = e.shiftKey
          ? fresh.length - 1
          : (focusedFirst ? 1 : 0);
        setSelIdx(startIdx);
        setIsOpen(true);
      } else {
        // Already open: cycle
        setSelIdx(i => {
          const next = e.shiftKey
            ? (i - 1 + fresh.length) % fresh.length
            : (i + 1) % fresh.length;
          return next;
        });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      // Releasing the modifier that opened the switcher commits the selection
      if (e.key === heldKeyRef.current && isOpen) {
        commitSelection();
      }
    };

    const commitSelection = () => {
      const entries = entriesRef.current;
      setIsOpen(false);
      // Use functional update to get the latest selIdx at commit time
      setSelIdx(current => {
        const entry = entries[current];
        if (entry?.windowId) {
          focusWindow(entry.windowId);
        }
        // If Desktop (windowId null), just close — no window to focus
        return 0;
      });
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup',   onKeyUp);
    };
  }, [isOpen, focusWindow, buildEntries]);

  // -- Render --

  const selected = entries[selIdx];

  return (
    <>
    {/* Announce the selection as it moves */}
    <div className="sr-only" aria-live="polite">
      {isOpen && selected ? `Switch to ${selected.title}` : ''}
    </div>
    <AnimatePresence>
      {isOpen && entries.length > 1 && (
        <motion.div
          key="app-switcher"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1    }}
          exit={{ opacity: 0, scale: 0.92    }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="fixed inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: Z.switcher }}
        >
          <div
            className="flex items-end gap-4 px-6 py-5 rounded-3xl
                       border border-white/15
                       shadow-2xl"
            style={{
              background:           'rgba(30, 30, 32, 0.82)',
              backdropFilter:       'blur(48px) saturate(180%)',
              WebkitBackdropFilter: 'blur(48px) saturate(180%)',
            }}
          >
            {entries.map((entry, i) => (
              <SwitcherCell
                key={entry.windowId ?? 'desktop'}
                entry={entry}
                isSelected={i === selIdx}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
