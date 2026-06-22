'use client';

/**
 * Spotlight — the devOS command layer.
 *
 * Trigger:  Cmd/Ctrl+K        Dismiss:  Escape / backdrop click
 *
 * A monochrome, editorial-mono command surface. Searches apps / projects /
 * skills / commands; the "Ask Devanshu" row hands the query to the floating
 * assistant. Three signature moves:
 *   1. A single sliding "lozenge" (shared `layoutId` element) glides between
 *      rows as the selection moves — the one motion moment.
 *   2. Results group under mono section headers (the index already groups +
 *      caps per category; we render that structure instead of a flat list).
 *   3. The idle state offers a curated "Jump to" set so the panel is never an
 *      empty void.
 *
 * Fully ink-on-paper: category identity is carried by mono meta-labels, not
 * colour. Colours flip with the theme via the semantic tokens (text / surface /
 * border), so no per-mode branching is needed.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useOSStore } from '@/store/osStore';
import { useAssistantUiStore } from '@/store/assistantUiStore';
import { useIsMono } from '@/hooks/usePalette';
import {
  searchSpotlight,
  getSpotlightIndex,
  type SpotlightItem,
  type SpotlightCategory,
} from '@/lib/spotlightIndex';

const CATEGORY_LABEL: Record<SpotlightCategory, string> = {
  app: 'Apps', project: 'Projects', skill: 'Skills', command: 'Commands',
};
const CATEGORY_TAG: Record<SpotlightCategory, string> = {
  app: 'OPEN', project: 'OPEN', skill: 'VIEW', command: 'RUN',
};
const GLYPH: Record<SpotlightCategory, string> = {
  app: '▸', project: '▸', skill: '▸', command: '›',
};

/** Curated idle suggestions, looked up from the live index by id. */
const SUGGESTED_IDS = [
  'app:about-me',
  'app:projects',
  'app:skills-dashboard',
  'cmd:hire devanshu',
  'app:terminal',
];

type Row =
  | { key: string; index: number; kind: 'ask'; query: string }
  | { key: string; index: number; kind: 'item'; item: SpotlightItem };

interface Section { header: string; rows: Row[] }

export default function Spotlight() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotlightItem[]>([]);
  const [selIdx, setSelIdx] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const openWindow = useOSStore(state => state.openWindow);
  const openAssistant = useAssistantUiStore(state => state.openAssistant);
  const reduced = useReducedMotion();
  // Fully monochrome by default; "fun" (colour) mode lets a single accent through
  // on the moving selection and the Ask hero glyph — never the old per-category rainbow.
  const mono = useIsMono();

  // -- Build sections + a flat row list (the flat list drives keyboard nav). --
  const { sections, flatRows } = useMemo(() => {
    const builtSections: Section[] = [];
    const builtFlat: Row[] = [];
    const push = (header: string, rows: Row[]) => {
      if (!rows.length) return;
      rows.forEach(r => { r.index = builtFlat.length; builtFlat.push(r); });
      builtSections.push({ header, rows });
    };

    const q = query.trim();
    if (q) {
      push('Ask', [{ key: 'ask', index: 0, kind: 'ask', query: q }]);
      const byCat = new Map<SpotlightCategory, Row[]>();
      for (const item of results) {
        const arr = byCat.get(item.category) ?? [];
        arr.push({ key: item.id, index: 0, kind: 'item', item });
        byCat.set(item.category, arr);
      }
      (['app', 'project', 'skill', 'command'] as SpotlightCategory[]).forEach(cat => {
        push(CATEGORY_LABEL[cat], byCat.get(cat) ?? []);
      });
    } else {
      const idx = new Map(getSpotlightIndex().map(i => [i.id, i]));
      const rows: Row[] = SUGGESTED_IDS
        .map(id => idx.get(id))
        .filter((i): i is SpotlightItem => Boolean(i))
        .map(item => ({ key: item.id, index: 0, kind: 'item' as const, item }));
      push('Jump to', rows);
    }
    return { sections: builtSections, flatRows: builtFlat };
  }, [query, results]);

  const maxIdx = Math.max(flatRows.length - 1, 0);

  // -- Open / close --
  const open = useCallback(() => { setIsOpen(true); setQuery(''); setResults([]); setSelIdx(0); }, []);
  const close = useCallback(() => { setIsOpen(false); setQuery(''); setResults([]); setSelIdx(0); }, []);

  // -- Focus the input on open --
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [isOpen]);

  // -- Action dispatch --
  const handleSelect = useCallback((item: SpotlightItem) => {
    close();
    switch (item.action.type) {
      case 'openApp':      openWindow(item.action.appType); break;
      case 'openProjects': openWindow('projects'); break;
      case 'openTerminal': openWindow('terminal'); break;
    }
  }, [close, openWindow]);

  const launchChat = useCallback((q: string) => {
    const question = q.trim();
    close();
    openAssistant(question);
  }, [close, openAssistant]);

  const runRow = useCallback((row: Row) => {
    if (row.kind === 'ask') launchChat(row.query);
    else handleSelect(row.item);
  }, [launchChat, handleSelect]);

  // -- Keyboard --
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? close() : open();
        return;
      }
      if (!isOpen) return;
      if (e.key === 'Escape')    { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(i => Math.min(i + 1, maxIdx)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter')     { e.preventDefault(); const row = flatRows[selIdx]; if (row) runRow(row); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close, open, flatRows, selIdx, maxIdx, runRow]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setResults(searchSpotlight(value));
    setSelIdx(0);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="cmd-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            onClick={close}
            className="fixed inset-0 z-[9000] bg-black/55 backdrop-blur-[3px]"
            style={{ backgroundImage: 'radial-gradient(ellipse at 50% 38%, transparent 28%, rgba(0,0,0,0.4) 100%)' }}
          />

          <motion.div
            key="cmd-panel"
            initial={reduced ? { opacity: 0, x: '-50%', y: '-50%' } : { opacity: 0, x: '-50%', y: '-50%', scale: 0.97 }}
            animate={{ opacity: 1, x: '-50%', y: '-50%', scale: 1 }}
            exit={reduced ? { opacity: 0, x: '-50%', y: '-50%' } : { opacity: 0, x: '-50%', y: '-50%', scale: 0.985 }}
            transition={reduced ? { duration: 0.12 } : { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
            style={{ transformOrigin: 'center top' }}
            className="fixed left-1/2 top-[42%] z-[9001] w-[min(92vw,580px)] overflow-hidden rounded-[20px]
                       border border-border/60 bg-surface/80 shadow-2xl backdrop-blur-2xl"
          >
            {/* Masthead */}
            <div className="px-4 pt-3">
              <span className="select-none font-mono text-[10px] uppercase tracking-[0.22em] text-text-secondary/45">
                ⌘ devOS · command
              </span>
            </div>

            {/* Input */}
            <div className="flex items-center gap-3 px-4 pb-3 pt-2">
              <Search size={17} strokeWidth={1.75} className="shrink-0 text-text-secondary/50" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder="Search apps, or ask Devanshu anything…"
                className="flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-text-secondary/40"
                data-no-focus-ring
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="shrink-0 rounded border border-border/70 bg-text/[0.04] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-secondary/50">
                esc
              </kbd>
            </div>

            <div className="h-px bg-border/55" />

            {/* Results */}
            <div className="max-h-[min(56vh,420px)] overflow-auto py-2">
              {sections.map((section, si) => (
                <div key={section.header} className={si > 0 ? 'mt-1' : ''}>
                  <div className="select-none px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary/40">
                    {section.header}
                  </div>
                  {section.rows.map(row => (
                    <RowView
                      key={row.key}
                      row={row}
                      selected={row.index === selIdx}
                      reduced={!!reduced}
                      mono={mono}
                      onRun={() => runRow(row)}
                      onHover={() => setSelIdx(row.index)}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="h-px bg-border/55" />

            {/* Action bar */}
            <div className="flex items-center gap-4 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-secondary/55">
              <span className="flex items-center gap-1.5"><Hint>↑↓</Hint> navigate</span>
              <span className="flex items-center gap-1.5"><Hint>↵</Hint> open</span>
              <span className="ml-auto flex items-center gap-1.5"><Hint>esc</Hint> dismiss</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border/60 bg-text/[0.03] px-1 py-px font-mono text-[9px] leading-none text-text-secondary/70">
      {children}
    </kbd>
  );
}

function RowView({ row, selected, reduced, mono, onRun, onHover }: {
  row: Row; selected: boolean; reduced: boolean; mono: boolean; onRun: () => void; onHover: () => void;
}) {
  const isAsk = row.kind === 'ask';
  const glyph = isAsk ? '✦' : GLYPH[row.item.category];
  const title = isAsk ? 'Ask Devanshu' : row.item.title;
  const tag = isAsk ? 'ASK' : CATEGORY_TAG[row.item.category];
  const subtitle = isAsk ? 'Opens a chat with Devanshu' : row.item.subtitle;
  // In fun mode the Ask hero carries the single accent; everything else stays ink.
  const askAccent = isAsk && !mono;

  return (
    <button
      type="button"
      onClick={onRun}
      onMouseMove={() => { if (!selected) onHover(); }}
      className="group relative flex w-full items-center gap-3 px-4 py-2.5 text-left
                 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.992]"
    >
      {selected && (
        <motion.div
          layoutId="cmd-selection"
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 560, damping: 44, mass: 0.6 }}
          className={`absolute inset-x-2 inset-y-0 z-0 rounded-xl ${mono ? 'bg-text/[0.06]' : 'bg-accent/10'}`}
        >
          <span className={`absolute left-0 top-1/2 h-[56%] w-[2px] -translate-y-1/2 rounded-full ${mono ? 'bg-text/70' : 'bg-accent'}`} />
        </motion.div>
      )}

      <span className={`relative z-10 w-3 shrink-0 text-center font-mono text-[13px] ${askAccent ? 'text-accent' : 'text-text-secondary/70'}`}>
        {glyph}
      </span>

      <span className="relative z-10 min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-text">
          {title}
          {isAsk && <span className={askAccent ? 'text-accent' : 'text-text-secondary'}> “{row.query}”</span>}
        </span>
        <span className="block truncate text-[11.5px] leading-snug text-text-secondary/65">{subtitle}</span>
      </span>

      <span className={`relative z-10 shrink-0 font-mono text-[9.5px] uppercase tracking-[0.16em] ${askAccent ? 'text-accent/70' : 'text-text-secondary/45'}`}>
        {tag}
      </span>
      {selected && (
        <span className="relative z-10 shrink-0 font-mono text-[11px] text-text-secondary/70">↵</span>
      )}
    </button>
  );
}
