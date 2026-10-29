'use client';

/**
 * HomeScreen — paged home screen with sticky dock.
 *
 * No fake status bar: the phone already draws a real one above the browser,
 * so a second clock cost 44px and repeated it. pt-safe clears the notch when
 * the page runs edge to edge (standalone / viewport-fit=cover).
 *
 * Uses CSS scroll-snap for the horizontal page swipe (perf-friendly, no
 * Framer here per the plan's perf budget). A scroll listener keeps
 * mobileStore.currentPage in sync for PageDots.
 */

import { useEffect, useRef } from 'react';
import { useMobileStore } from '@/store/mobileStore';
import { getHomePages } from '@/lib/mobileAppRegistry';
import HomePage from './HomePage';
import AppLibraryPage from './AppLibraryPage';
import PageDots from './PageDots';
import Dock from './Dock';
import IdentityWidget from './IdentityWidget';
import type { AppType } from '../../../../shared/types';

interface HomeScreenProps {
  onOpenApp: (appType: AppType) => void;
}

export default function HomeScreen({ onOpenApp }: HomeScreenProps) {
  const pages = getHomePages();
  const currentPage = useMobileStore((s) => s.currentPage);
  const setPage = useMobileStore((s) => s.setPage);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Sync scroll position → store
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const page = Math.round(el.scrollLeft / el.clientWidth);
      if (page !== currentPage) setPage(page);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [currentPage, setPage]);

  return (
    <div className="absolute inset-0 flex flex-col text-white touch-pan-x">
      <div className="pt-safe flex-shrink-0" />

      {/* Pages */}
      <div
        ref={scrollerRef}
        aria-label={`Home screen, page ${Math.min(currentPage, pages.length) + 1} of ${pages.length + 1}`}
        className="flex-1 min-h-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory hide-scrollbar"
      >
        {pages.map((page, i) => (
          <HomePage
            key={i}
            apps={page}
            onOpen={onOpenApp}
            header={i === 0 ? <IdentityWidget onOpen={onOpenApp} /> : undefined}
          />
        ))}
        {/* App Library — the last page. Swipe past the final home page to reach
            the flat all-apps grid + consolidated search. Reports its index as
            pages.length to the scroll listener above. */}
        <AppLibraryPage />
      </div>

      {/* Page dots — one per home page, plus a trailing search glyph standing in
          for the App Library page (active when currentPage === pages.length). */}
      <div className="flex-shrink-0 py-2" aria-hidden>
        <PageDots count={pages.length} active={currentPage} showLibrary />
      </div>

      {/* Dock */}
      <div className="flex-shrink-0 pb-safe">
        <Dock onOpen={onOpenApp} />
      </div>
    </div>
  );
}
