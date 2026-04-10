'use client';

/**
 * AppSwitcher — macOS Cmd+Tab style window switcher overlay.
 *
 * Shortcut: Alt+Tab / Alt+Shift+Tab  (cycle forward / backward)
 *
 * Why Alt instead of Cmd?
 *   macOS intercepts Cmd+Tab at the OS level before the browser receives it.
 *   Alt+Tab (Option+Tab on Mac) is NOT intercepted by macOS, and Chrome on
 *   Mac has no default binding for it — so the browser always gets the event.
 *   On Windows, Alt+Tab IS intercepted by the OS; the switcher simply won't
 *   trigger there, which is acceptable (the portfolio targets Mac/desktop).
 *
 * UX:
 *   - Pressing Alt+Tab while no apps are open: no-op.
 *   - With 1 app open: selects desktop (closes overlay, clears active window).
 *   - With 2+ apps: frosted glass pill shows app icons; cycling is instant.
 *   - Releasing Alt: overlay closes and focus moves to the selected app.
 *   - Escape while open: closes overlay, no focus change.
 *
 * The switcher manages its own keydown/keyup listeners and is self-contained
 * — no changes to useKeyboardShortcuts needed.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor } from 'lucide-react';
import { useOSStore } from '@/store/osStore';
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
  const windows        = useOSStore(s => s.windows);
  const focusWindow    = useOSStore(s => s.focusWindow);
  const activeWindowId = useOSStore(s => s.activeWindowId);

  const [isOpen,   setIsOpen]   = useState(false);
  const [selIdx,   setSelIdx]   = useState(0);
  const entriesRef = useRef<SwitcherEntry[]>([]);

  // Build the list of switcher entries whenever windows change.
  // Desktop is always first (index 0), then open non-minimized windows.
  const buildEntries = useCallback((): SwitcherEntry[] => {
    const openWins = windows.filter(w => w.isOpen);
    const desktop: SwitcherEntry = { windowId: null, appType: null, title: 'Desktop' };
    const winEntries: SwitcherEntry[] = openWins.map(w => ({
      windowId: w.id,
      appType:  w.appType,
      title:    w.title,
    }));
    return [desktop, ...winEntries];
  }, [windows]);

  // -- Keyboard handling --

  useEffect(() => {
    let altHeld = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !e.altKey) return;

      e.preventDefault(); // suppress browser tab-switching (Ctrl+Tab in Chrome)

      const entries = buildEntries();
      entriesRef.current = entries;

      if (entries.length <= 1) return; // no apps open, nothing to switch

      if (!isOpen) {
        // Opening: start one step past the currently active window (or at 1)
        altHeld = true;
        const currentIdx = entries.findIndex(en => en.windowId === activeWindowId);
        const startIdx = e.shiftKey
          ? (currentIdx <= 0 ? entries.length - 1 : currentIdx - 1)
          : (currentIdx < 0 ? 1 : (currentIdx + 1) % entries.length);
        setSelIdx(startIdx);
        setIsOpen(true);
      } else {
        // Already open: cycle
        setSelIdx(i => {
          const next = e.shiftKey
            ? (i - 1 + entries.length) % entries.length
            : (i + 1) % entries.length;
          return next;
        });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        altHeld = false;
        // Releasing Alt commits the selection
        if (isOpen) {
          commitSelection();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSelIdx(0);
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
  // Rebuilding on isOpen/activeWindowId/windows so the entries stay fresh
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeWindowId, windows, focusWindow, buildEntries]);

  // -- Render --

  const entries = buildEntries();

  return (
    <AnimatePresence>
      {isOpen && entries.length > 1 && (
        <motion.div
          key="app-switcher"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1    }}
          exit={{ opacity: 0, scale: 0.92    }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="fixed z-[9500] inset-0 flex items-center justify-center pointer-events-none"
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
  );
}
