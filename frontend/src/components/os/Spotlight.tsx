'use client';

/**
 * Spotlight — macOS-style global search overlay + the entry point to Chat.
 *
 * Trigger:  Cmd+K  (or Ctrl+K)
 * Dismiss:  Escape, or click backdrop
 *
 * Searches across apps / projects / skills / commands. The "Ask Devanshu" row
 * hands the query off to the Chat app (a real multi-turn conversation), rather
 * than answering inline.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Search, Zap, FolderOpen, Activity, Terminal, Sparkles } from 'lucide-react';
import { useOSStore } from '@/store/osStore';
import { useTheme } from '@/store/themeStore';
import { useChatStore } from '@/store/chatStore';
import {
  searchSpotlight,
  type SpotlightItem,
  type SpotlightCategory,
} from '@/lib/spotlightIndex';
import type { AppType } from '../../../../shared/types';

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
// Result rows
// ---------------------------------------------------------------------------

function ResultRow({
  item, isSelected, isDark, onSelect,
}: {
  item: SpotlightItem; isSelected: boolean; isDark: boolean; onSelect: () => void;
}) {
  const meta = CATEGORY_META[item.category];
  const Icon = meta.icon;
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors duration-75
        ${isSelected ? (isDark ? 'bg-white/10' : 'bg-black/6') : (isDark ? 'hover:bg-white/6' : 'hover:bg-black/4')}`}
    >
      <Icon size={14} className={`flex-shrink-0 ${meta.color}`} />
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium truncate block ${isDark ? 'text-white/90' : 'text-gray-900'}`}>{item.title}</span>
        <span className={`text-[11px] truncate block leading-snug ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{item.subtitle}</span>
      </div>
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.color} ${isDark ? 'bg-white/5' : 'bg-black/5'} flex-shrink-0`}>
        {meta.label}
      </span>
    </button>
  );
}

function AskRow({
  query, isSelected, isDark, onSelect,
}: {
  query: string; isSelected: boolean; isDark: boolean; onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors duration-75
        ${isSelected ? (isDark ? 'bg-white/10' : 'bg-black/6') : (isDark ? 'hover:bg-white/6' : 'hover:bg-black/4')}`}
    >
      <Sparkles size={14} className="flex-shrink-0 text-accent" />
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium truncate block ${isDark ? 'text-white/90' : 'text-gray-900'}`}>
          Ask Devanshu: <span className="text-accent">{query}</span>
        </span>
        <span className={`text-[11px] truncate block leading-snug ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
          Opens a chat with Devanshu
        </span>
      </div>
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-accent bg-accent/10 flex-shrink-0">AI</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Spotlight() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotlightItem[]>([]);
  const [selIdx, setSelIdx] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const openWindow = useOSStore(state => state.openWindow);
  const setSeed = useChatStore(state => state.setSeed);
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const reduced = useReducedMotion();

  const askAvailable = query.trim().length > 0;
  const selectableCount = (askAvailable ? 1 : 0) + results.length;

  // -- Open/close --
  const open = useCallback(() => {
    setIsOpen(true);
    setQuery(''); setResults([]); setSelIdx(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery(''); setResults([]); setSelIdx(0);
  }, []);

  // -- Focus input on open --
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // -- Action dispatch --
  const handleSelect = useCallback((item: SpotlightItem) => {
    close();
    switch (item.action.type) {
      case 'openApp':       openWindow(item.action.appType); break;
      case 'openProjects':  openWindow('projects'); break;
      case 'openTerminal':  openWindow('terminal'); break;
    }
  }, [close, openWindow]);

  // -- Hand a question off to the Chat app --
  const launchChat = useCallback((q: string) => {
    const question = q.trim();
    close();
    if (question) setSeed(question);
    openWindow('chat' as AppType);
  }, [close, openWindow, setSeed]);

  // -- Keyboard --
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
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
        setSelIdx(i => Math.min(i + 1, Math.max(selectableCount - 1, 0)));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelIdx(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (askAvailable && selIdx === 0) { launchChat(query); return; }
        const item = results[askAvailable ? selIdx - 1 : selIdx];
        if (item) handleSelect(item);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, close, open, results, selIdx, askAvailable, selectableCount, query, launchChat, handleSelect]);

  // -- Search --
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setResults(searchSpotlight(value));
    setSelIdx(0);
  };

  // -- Render --
  const glass = isDark ? 'bg-[#1c1c1e]/90 border-white/8' : 'bg-white/85 border-black/6';
  const inputColor = isDark ? 'text-white placeholder-white/30' : 'text-gray-900 placeholder-gray-400';
  const dividerColor = isDark ? 'border-white/8' : 'border-black/6';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="spotlight-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9000] bg-black/40 backdrop-blur-sm"
            onClick={close}
          />

          <motion.div
            key="spotlight-panel"
            initial={{ opacity: 0, scale: 0.96, x: '-50%', y: 'calc(-50% - 12px)' }}
            animate={{ opacity: 1, scale: 1,    x: '-50%', y: '-50%'               }}
            exit={{ opacity: 0, scale: 0.96,    x: '-50%', y: 'calc(-50% - 12px)'  }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed z-[9001] left-1/2 top-1/2 w-full max-w-[560px] rounded-2xl overflow-hidden
                        border shadow-2xl backdrop-blur-2xl ${glass}`}
          >
            {/* Input row */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Search size={16} className={isDark ? 'text-white/35 flex-shrink-0' : 'text-gray-400 flex-shrink-0'} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder="Search apps, or ask Devanshu anything..."
                className={`flex-1 bg-transparent outline-none text-sm ${inputColor}`}
                style={{ outline: 'none' }}
                data-no-focus-ring
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className={`text-[10px] px-1.5 py-0.5 rounded border font-mono flex-shrink-0
                ${isDark ? 'text-white/25 border-white/15 bg-white/5' : 'text-gray-400 border-gray-200 bg-gray-50'}`}>
                esc
              </kbd>
            </div>

            {/* Search results */}
            <AnimatePresence mode="wait">
              {(askAvailable || results.length > 0) && (
                <motion.div
                  key="results"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                >
                  <div className={`border-t ${dividerColor}`} />
                  <div className="py-1 max-h-[360px] overflow-auto">
                    {askAvailable && (
                      <AskRow
                        query={query.trim()}
                        isSelected={selIdx === 0}
                        isDark={isDark}
                        onSelect={() => launchChat(query)}
                      />
                    )}
                    {results.map((item, i) => (
                      <ResultRow
                        key={item.id}
                        item={item}
                        isSelected={(askAvailable ? i + 1 : i) === selIdx}
                        isDark={isDark}
                        onSelect={() => handleSelect(item)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer hint */}
            {results.length === 0 && query.length === 0 && (
              <div className={`border-t px-4 py-2.5 flex gap-4 flex-wrap ${dividerColor}`}>
                <span className="flex items-center gap-1 text-[11px] text-accent opacity-70">
                  <Sparkles size={11} /> Ask Devanshu
                </span>
                {(['app', 'project', 'skill', 'command'] as SpotlightCategory[]).map(cat => {
                  const meta = CATEGORY_META[cat];
                  const Icon = meta.icon;
                  return (
                    <span key={cat} className={`flex items-center gap-1 text-[11px] ${meta.color} opacity-60`}>
                      <Icon size={11} /> {meta.label}
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
