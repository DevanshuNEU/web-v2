'use client';

/**
 * Spotlight — macOS-style global search overlay.
 *
 * Trigger:  Cmd+K  (or Ctrl+K on Windows/Linux)
 * Dismiss:  Escape, or click the backdrop
 *
 * Searches across:
 *   Apps      → opens the app window
 *   Projects  → opens the Projects app
 *   Skills    → opens the Skills Dashboard app
 *   Commands  → opens Terminal and pre-fills the command
 *
 * Architecture:
 *   - Spotlight manages its own open/close state internally via a
 *     `spotlightOpen` Zustand slice added to osStore, OR simply as local
 *     state here with a global keydown listener. We use the latter to avoid
 *     coupling osStore to UI concerns.
 *   - The keyboard shortcut is registered here (not in useKeyboardShortcuts)
 *     so this component is fully self-contained and can be dropped in anywhere.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Zap, FolderOpen, Activity, Terminal } from 'lucide-react';
import { useOSStore } from '@/store/osStore';
import { useTheme } from '@/store/themeStore';
import {
  searchSpotlight,
  type SpotlightItem,
  type SpotlightCategory,
} from '@/lib/spotlightIndex';

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<SpotlightCategory, { label: string; icon: React.ElementType; color: string }> = {
  app:     { label: 'Apps',     icon: Zap,        color: 'text-blue-400'   },
  project: { label: 'Projects', icon: FolderOpen,  color: 'text-orange-400' },
  skill:   { label: 'Skills',   icon: Activity,    color: 'text-purple-400' },
  command: { label: 'Commands', icon: Terminal,     color: 'text-green-400'  },
};

// ---------------------------------------------------------------------------
// Single result row
// ---------------------------------------------------------------------------

function ResultRow({
  item,
  isSelected,
  onSelect,
}: {
  item: SpotlightItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const meta = CATEGORY_META[item.category];
  const Icon = meta.icon;

  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors duration-75
        ${isSelected
          ? 'bg-white/10 dark:bg-white/8'
          : 'hover:bg-white/6 dark:hover:bg-white/5'}
      `}
    >
      <Icon size={14} className={`flex-shrink-0 ${meta.color}`} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-white/90 truncate block">{item.title}</span>
        <span className="text-[11px] text-white/40 truncate block leading-snug">{item.subtitle}</span>
      </div>
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.color} bg-white/5 flex-shrink-0`}>
        {meta.label}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Spotlight() {
  const [isOpen,    setIsOpen]    = useState(false);
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<SpotlightItem[]>([]);
  const [selIdx,    setSelIdx]    = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const openWindow = useOSStore(state => state.openWindow);
  const { mode }   = useTheme();
  const isDark = mode === 'dark';

  // -- Open/close --

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setResults([]);
    setSelIdx(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setSelIdx(0);
  }, []);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let the animation start before focusing
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // -- Global keyboard listener for Cmd+K / Ctrl+K --
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K → toggle Spotlight
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? close() : open();
        return;
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelIdx(i => Math.min(i + 1, results.length - 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelIdx(i => Math.max(i - 1, 0));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const item = results[selIdx];
        if (item) handleSelect(item);
        return;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, close, open, results, selIdx]);

  // -- Search --

  const handleQueryChange = (value: string) => {
    setQuery(value);
    const hits = searchSpotlight(value);
    setResults(hits);
    setSelIdx(0);
  };

  // -- Action dispatch --

  const handleSelect = useCallback((item: SpotlightItem) => {
    close();

    switch (item.action.type) {
      case 'openApp':
        openWindow(item.action.appType);
        break;

      case 'openProjects':
        openWindow('projects');
        break;

      case 'openTerminal':
        // Open terminal — the user can then run the command manually.
        // We can't auto-run it without coupling deeply into TerminalApp state.
        openWindow('terminal');
        break;
    }
  }, [close, openWindow]);

  // -- Render --

  const glass = isDark
    ? 'bg-[#1c1c1e]/90 border-white/12'
    : 'bg-white/85 border-black/10';

  const inputColor = isDark ? 'text-white placeholder-white/30' : 'text-gray-900 placeholder-gray-400';
  const dividerColor = isDark ? 'border-white/8' : 'border-black/6';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="spotlight-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9000] bg-black/40 backdrop-blur-sm"
            onClick={close}
          />

          {/* Search panel */}
          <motion.div
            key="spotlight-panel"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1,    y: 0    }}
            exit={{ opacity: 0, scale: 0.96,    y: -12  }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={`
              fixed z-[9001] left-1/2 -translate-x-1/2
              w-full max-w-[560px] rounded-2xl overflow-hidden
              border shadow-2xl backdrop-blur-2xl
              ${glass}
            `}
            style={{ top: '18vh' }}
          >
            {/* Input row */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Search size={16} className={isDark ? 'text-white/35 flex-shrink-0' : 'text-gray-400 flex-shrink-0'} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder="Search apps, projects, skills, commands..."
                className={`flex-1 bg-transparent outline-none text-sm ${inputColor}`}
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className={`text-[10px] px-1.5 py-0.5 rounded border font-mono flex-shrink-0
                ${isDark ? 'text-white/25 border-white/15 bg-white/5' : 'text-gray-400 border-gray-200 bg-gray-50'}`}>
                esc
              </kbd>
            </div>

            {/* Results */}
            <AnimatePresence mode="wait">
              {results.length > 0 && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  <div className={`border-t ${dividerColor}`} />
                  <div className="py-1 max-h-[360px] overflow-auto">
                    {results.map((item, i) => (
                      <ResultRow
                        key={item.id}
                        item={item}
                        isSelected={i === selIdx}
                        onSelect={() => handleSelect(item)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {query.length > 0 && results.length === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.1 }}
                >
                  <div className={`border-t ${dividerColor}`} />
                  <p className="text-center text-xs text-white/30 py-6">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer hint */}
            {results.length === 0 && query.length === 0 && (
              <div className={`border-t px-4 py-2.5 flex gap-4 ${dividerColor}`}>
                {(['app', 'project', 'skill', 'command'] as SpotlightCategory[]).map(cat => {
                  const meta = CATEGORY_META[cat];
                  const Icon = meta.icon;
                  return (
                    <span key={cat} className={`flex items-center gap-1 text-[11px] ${meta.color} opacity-60`}>
                      <Icon size={11} />
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
