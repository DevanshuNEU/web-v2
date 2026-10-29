'use client';

/**
 * AppLibraryPage — the iOS-style App Library, the LAST scroll-snap page of the
 * home screen (swipe past the final home page to reach it).
 *
 * It consolidates ALL search onto one surface. A pinned search field sits at the
 * top; below it:
 *   - empty query  → a flat 4-col grid of EVERY app (dock apps first, then the
 *                     home pages in order, then anything else), scrollable.
 *   - typed query  → inline Spotlight results (the same shared index / grouping /
 *                     Ask routing the old MobileSpotlight sheet used).
 *
 * Strictly monochrome, calm/editorial, reduced-motion safe. The empty↔results
 * swap is a short cross-fade that collapses to an instant cut when the visitor
 * prefers reduced motion.
 */

import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { appRegistry } from '@/lib/appRegistry';
import { getMobileApp, DOCK_ORDER, HOME_PAGES } from '@/lib/mobileAppRegistry';
import { useMobileStore } from '@/store/mobileStore';
import { useIsMono } from '@/hooks/usePalette';
import AppIcon from './AppIcon';
import SpotlightResults from './SpotlightResults';
import type { AppType } from '../../../../shared/types';

/**
 * Every app in a deliberate flat order: dock apps first (the four a visitor sees
 * without scrolling), then the home pages in their authored order, then any app
 * that lives nowhere else (e.g. browser, help) — de-duped, but complete.
 */
function allAppsInOrder(): AppType[] {
  const seen = new Set<AppType>();
  const ordered: AppType[] = [];
  const add = (appType: AppType) => {
    if (seen.has(appType)) return;
    seen.add(appType);
    ordered.push(appType);
  };
  DOCK_ORDER.forEach(add);
  HOME_PAGES.forEach((page) => page.forEach(add));
  (Object.keys(appRegistry) as AppType[]).forEach(add);
  return ordered;
}

export default function AppLibraryPage() {
  const reduced = useReducedMotion();
  const mono = useIsMono();
  const openApp = useMobileStore((s) => s.openApp);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const apps = useMemo(() => allAppsInOrder().map(getMobileApp), []);
  const searching = query.trim().length > 0;

  const clear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <section
      className="snap-start w-full flex-shrink-0 flex flex-col"
      aria-label="App Library"
    >
      {/* Pinned header: the search field. (The 10px "Library" label was
          dropped: the field and the page dot already say where you are.)
          The input hides its own ring, so the wrapper carries the focus state. */}
      <div className="flex-shrink-0 px-5 pt-4">
        <div
          className={`flex min-h-[44px] items-center gap-2.5 rounded-2xl pl-4 pr-1 ${
            mono
              ? 'border border-border bg-surface/70 backdrop-blur focus-within:border-text/60 focus-within:ring-2 focus-within:ring-text/30'
              : 'glass-medium border border-white/20 shadow-lg focus-within:border-text/60 focus-within:ring-2 focus-within:ring-text/30'
          }`}
        >
          <Search size={16} strokeWidth={1.75} className="text-text-secondary" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or ask a question"
            // 16px min so iOS Safari doesn't pinch-zoom on focus.
            // Ink follows the theme tokens in both palettes: the glass surface
            // turns white in light mode, where white text vanished.
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none text-text placeholder:text-text-secondary"
            data-no-focus-ring
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-label="Search apps or ask a question"
          />
          {searching && (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search"
              className="touch-target shrink-0 grid place-items-center rounded-full text-text-secondary transition-transform active:scale-90"
            >
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Body — grid when idle, inline Spotlight results when searching. */}
      <div className="relative mt-2 flex flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {searching ? (
            <motion.div
              key="results"
              initial={{ opacity: reduced ? 1 : 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: reduced ? 1 : 0 }}
              transition={{ duration: reduced ? 0 : 0.14 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <SpotlightResults query={query} onRan={() => setQuery('')} />
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: reduced ? 1 : 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: reduced ? 1 : 0 }}
              transition={{ duration: reduced ? 0 : 0.14 }}
              className="flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-4"
            >
              <div className="grid grid-cols-4 gap-x-3 gap-y-5">
                {apps.map((app) => (
                  <div key={app.appType} className="flex justify-center">
                    <AppIcon appType={app.appType} onOpen={openApp} label={app.label} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
