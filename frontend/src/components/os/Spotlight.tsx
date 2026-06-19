'use client';

/**
 * Spotlight — macOS-style global search overlay, now with an AI concierge mode.
 *
 * Trigger:  Cmd+K  (or Ctrl+K)
 * Dismiss:  Escape (in ask mode, Escape returns to search), or click backdrop
 *
 * Search mode searches across apps / projects / skills / commands.
 * Ask mode ("Ask devOS") streams a grounded answer from /api/concierge — the
 * portfolio answering questions about Devanshu in his own voice. It degrades
 * gracefully when the concierge is unconfigured or rate-limited.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Zap, FolderOpen, Activity, Terminal, Sparkles, ArrowLeft } from 'lucide-react';
import { useOSStore } from '@/store/osStore';
import { useTheme } from '@/store/themeStore';
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

type AskState = 'loading' | 'streaming' | 'done' | 'error' | 'offline' | 'rate_limited';

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
          Ask devOS: <span className="text-accent">{query}</span>
        </span>
        <span className={`text-[11px] truncate block leading-snug ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
          Get a grounded answer about Devanshu
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

  const [view, setView] = useState<'search' | 'ask'>('search');
  const [askQuery, setAskQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [askState, setAskState] = useState<AskState>('loading');
  const abortRef = useRef<AbortController | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const askPanelRef = useRef<HTMLDivElement>(null);
  const openWindow = useOSStore(state => state.openWindow);
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const askAvailable = view === 'search' && query.trim().length > 0;
  const selectableCount = (askAvailable ? 1 : 0) + results.length;

  // -- Open/close --

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery(''); setResults([]); setSelIdx(0);
    setView('search'); setAnswer('');
  }, []);

  const close = useCallback(() => {
    abortRef.current?.abort();
    setIsOpen(false);
    setQuery(''); setResults([]); setSelIdx(0);
    setView('search'); setAnswer('');
  }, []);

  const backToSearch = useCallback(() => {
    abortRef.current?.abort();
    setView('search'); setAnswer('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // -- Concierge ask --

  const enterAsk = useCallback(async (q: string) => {
    const question = q.trim();
    if (!question) return;
    setView('ask'); setAskQuery(question); setAnswer(''); setAskState('loading');
    // Move focus into the answer region so screen-reader users land on it.
    setTimeout(() => askPanelRef.current?.focus(), 0);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: question }),
        signal: ctrl.signal,
      });
      if (res.status === 503) { setAskState('offline'); return; }
      if (res.status === 429) { setAskState('rate_limited'); return; }
      if (!res.ok || !res.body) { setAskState('error'); return; }

      setAskState('streaming');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer(a => a + decoder.decode(value, { stream: true }));
      }
      setAskState('done');
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') setAskState('error');
    }
  }, []);

  // -- Focus input on open --
  useEffect(() => {
    if (isOpen && view === 'search') {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isOpen, view]);

  // -- Action dispatch --
  const handleSelect = useCallback((item: SpotlightItem) => {
    close();
    switch (item.action.type) {
      case 'openApp':       openWindow(item.action.appType); break;
      case 'openProjects':  openWindow('projects'); break;
      case 'openTerminal':  openWindow('terminal'); break;
    }
  }, [close, openWindow]);

  const openApp = useCallback((appType: AppType) => {
    close();
    openWindow(appType);
  }, [close, openWindow]);

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
        view === 'ask' ? backToSearch() : close();
        return;
      }
      if (view === 'ask') return; // no list nav while reading an answer

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
        if (askAvailable && selIdx === 0) { enterAsk(query); return; }
        const item = results[askAvailable ? selIdx - 1 : selIdx];
        if (item) handleSelect(item);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, view, close, open, backToSearch, results, selIdx, askAvailable, selectableCount, query, enterAsk, handleSelect]);

  // -- Search --
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setResults(searchSpotlight(value));
    setSelIdx(0);
  };

  // -- Render --
  const glass = isDark ? 'bg-[#1c1c1e]/90 border-white/12' : 'bg-white/85 border-black/10';
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
              {view === 'ask' ? (
                <button onClick={backToSearch} aria-label="Back to search" className="flex-shrink-0">
                  <ArrowLeft size={16} className={isDark ? 'text-white/50' : 'text-gray-500'} />
                </button>
              ) : (
                <Search size={16} className={isDark ? 'text-white/35 flex-shrink-0' : 'text-gray-400 flex-shrink-0'} />
              )}
              <input
                ref={inputRef}
                type="text"
                value={view === 'ask' ? askQuery : query}
                onChange={e => handleQueryChange(e.target.value)}
                readOnly={view === 'ask'}
                placeholder="Search, or ask devOS anything about Devanshu..."
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

            {/* Ask view */}
            {view === 'ask' && (
              <motion.div
                ref={askPanelRef}
                tabIndex={-1}
                role="region"
                aria-label="devOS Concierge answer"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className={`border-t ${dividerColor} px-4 py-4 outline-none`}
                data-no-focus-ring
              >
                <div className="flex items-center gap-1.5 text-[11px] text-accent mb-3">
                  <Sparkles size={12} /> devOS Concierge
                </div>

                {askState === 'loading' && <ThinkingDots isDark={isDark} />}

                {(askState === 'streaming' || askState === 'done') && (
                  <p
                    role="status"
                    aria-live="polite"
                    className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-white/85' : 'text-gray-800'}`}
                  >
                    {answer}
                    {askState === 'streaming' && (
                      <span className="inline-block w-1.5 h-4 align-text-bottom bg-accent/70 ml-0.5 animate-pulse" />
                    )}
                  </p>
                )}

                {(askState === 'offline' || askState === 'rate_limited' || askState === 'error') && (
                  <p role="alert" className={`text-sm leading-relaxed ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                    {askState === 'offline' &&
                      'The concierge is offline right now. You can still explore everything directly through the apps below.'}
                    {askState === 'rate_limited' &&
                      'A lot of questions are coming in right now. Give it a minute and try again, or browse the apps below.'}
                    {askState === 'error' &&
                      'Something went wrong reaching the concierge. Try again, or open the apps below.'}
                  </p>
                )}

                {/* Actions */}
                {askState !== 'loading' && askState !== 'streaming' && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {(askState === 'error' || askState === 'rate_limited') && (
                      <button
                        onClick={() => enterAsk(askQuery)}
                        className="text-[12px] px-2.5 py-1.5 rounded-md border border-accent/40 text-accent
                                   hover:bg-accent/10 active:scale-95 transition cursor-pointer"
                      >
                        Retry
                      </button>
                    )}
                    {([['about-me', 'About Me'], ['projects', 'Projects'], ['resume', 'Resume']] as [AppType, string][]).map(
                      ([app, label]) => (
                        <button
                          key={app}
                          onClick={() => openApp(app)}
                          className={`text-[12px] px-2.5 py-1.5 rounded-md border transition active:scale-95 cursor-pointer
                            ${isDark ? 'border-white/12 text-white/70 hover:bg-white/8' : 'border-black/10 text-gray-600 hover:bg-black/5'}`}
                        >
                          Open {label}
                        </button>
                      )
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Search results */}
            {view === 'search' && (
              <AnimatePresence mode="wait">
                {(askAvailable || results.length > 0) && (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                  >
                    <div className={`border-t ${dividerColor}`} />
                    <div className="py-1 max-h-[360px] overflow-auto">
                      {askAvailable && (
                        <AskRow
                          query={query.trim()}
                          isSelected={selIdx === 0}
                          isDark={isDark}
                          onSelect={() => enterAsk(query)}
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
            )}

            {/* Footer hint */}
            {view === 'search' && results.length === 0 && query.length === 0 && (
              <div className={`border-t px-4 py-2.5 flex gap-4 flex-wrap ${dividerColor}`}>
                <span className="flex items-center gap-1 text-[11px] text-accent opacity-70">
                  <Sparkles size={11} /> Ask devOS
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

function ThinkingDots({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex items-center gap-1" aria-label="Thinking">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-white/40' : 'bg-gray-400'} animate-pulse`}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
