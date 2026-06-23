'use client';

/**
 * SpotlightResults — the inline search results for the App Library page.
 *
 * Extracted verbatim from the old MobileSpotlight bottom sheet: the same shared
 * index (searchSpotlight / getSpotlightIndex), the same grouped section builder
 * (Ask hero + category groups when searching, curated "Jump to" when idle), the
 * same editorial-mono row (glyph / title / subtitle / tag, 44px touch targets,
 * tap-driven active states), and the same action dispatch onto the phone store.
 *
 * The only behaviour change from the old sheet is the command bug fix: a command
 * row now seeds terminalStore.pendingCommand BEFORE opening the Terminal, so the
 * command actually runs instead of opening a blank prompt.
 *
 * Rendered by AppLibraryPage when its search field is non-empty.
 */

import { useMemo } from 'react';
import { useMobileStore } from '@/store/mobileStore';
import { useAssistantUiStore } from '@/store/assistantUiStore';
import { useTerminalStore } from '@/store/terminalStore';
import { useIsMono } from '@/hooks/usePalette';
import {
  searchSpotlight,
  getSpotlightIndex,
  type SpotlightItem,
  type SpotlightCategory,
} from '@/lib/spotlightIndex';
import {
  CATEGORY_LABEL,
  CATEGORY_TAG,
  GLYPH,
  CATEGORY_ORDER,
  SUGGESTED_IDS,
} from '@/lib/spotlightPresentation';

type Row =
  | { key: string; kind: 'ask'; query: string }
  | { key: string; kind: 'item'; item: SpotlightItem };

interface Section { header: string; rows: Row[] }

interface SpotlightResultsProps {
  query: string;
  /** Called after a row's action runs (so the host can reset its query). */
  onRan?: () => void;
}

export default function SpotlightResults({ query, onRan }: SpotlightResultsProps) {
  // Monochrome by default; "fun" (colour) mode lets a single accent through on
  // the Ask hero only — never the old per-category rainbow.
  const mono = useIsMono();
  const openApp = useMobileStore((s) => s.openApp);
  const openAssistant = useAssistantUiStore((s) => s.openAssistant);

  // -- Build grouped sections (no flat row list — touch has no keyboard nav). --
  const sections = useMemo<Section[]>(() => {
    const built: Section[] = [];
    const push = (header: string, rows: Row[]) => {
      if (rows.length) built.push({ header, rows });
    };

    const q = query.trim();
    if (q) {
      push('Ask', [{ key: 'ask', kind: 'ask', query: q }]);
      const results = searchSpotlight(q);
      const byCat = new Map<SpotlightCategory, Row[]>();
      for (const item of results) {
        const arr = byCat.get(item.category) ?? [];
        arr.push({ key: item.id, kind: 'item', item });
        byCat.set(item.category, arr);
      }
      CATEGORY_ORDER.forEach((cat) => push(CATEGORY_LABEL[cat], byCat.get(cat) ?? []));
    } else {
      const idx = new Map(getSpotlightIndex().map((i) => [i.id, i]));
      const rows: Row[] = SUGGESTED_IDS
        .map((id) => idx.get(id))
        .filter((i): i is SpotlightItem => Boolean(i))
        .map((item) => ({ key: item.id, kind: 'item' as const, item }));
      push('Jump to', rows);
    }
    return built;
  }, [query]);

  // -- Action dispatch (maps the shared action union onto the phone store). --
  // The command case seeds terminalStore FIRST so the Terminal auto-runs it on
  // mount — this is the bug fix over the old MobileSpotlight, which only opened
  // a blank Terminal.
  const handleSelect = (item: SpotlightItem) => {
    switch (item.action.type) {
      case 'openApp':
        openApp(item.action.appType);
        break;
      case 'openProjects':
        openApp('projects');
        break;
      case 'openTerminal':
        useTerminalStore.getState().setPendingCommand(item.action.command);
        openApp('terminal');
        break;
    }
    onRan?.();
  };

  const runRow = (row: Row) => {
    if (row.kind === 'ask') {
      openAssistant(row.query.trim());
      onRan?.();
    } else {
      handleSelect(row.item);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain py-2">
      {sections.map((section, si) => (
        <div key={section.header} className={si > 0 ? 'mt-1' : ''}>
          <div className="select-none px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary/40">
            {section.header}
          </div>
          {section.rows.map((row) => (
            <MobileRowView key={row.key} row={row} mono={mono} onRun={() => runRow(row)} />
          ))}
        </div>
      ))}
    </div>
  );
}

function MobileRowView({ row, mono, onRun }: {
  row: Row; mono: boolean; onRun: () => void;
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
      className={`group flex min-h-[44px] w-full items-center gap-3 px-4 py-3 text-left
                  rounded-xl transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.99]
                  ${mono ? 'active:bg-text/[0.06]' : 'active:bg-accent/10'}`}
    >
      <span className={`w-3 shrink-0 text-center font-mono text-[14px] ${askAccent ? 'text-accent' : 'text-text-secondary/70'}`}>
        {glyph}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-text">
          {title}
          {isAsk && <span className={askAccent ? 'text-accent' : 'text-text-secondary'}> “{row.query}”</span>}
        </span>
        <span className="block truncate text-[12.5px] leading-snug text-text-secondary/65">{subtitle}</span>
      </span>

      <span className={`shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] ${askAccent ? 'text-accent/70' : 'text-text-secondary/45'}`}>
        {tag}
      </span>
    </button>
  );
}
