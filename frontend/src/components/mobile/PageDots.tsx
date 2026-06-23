'use client';

import { Search } from 'lucide-react';

interface PageDotsProps {
  /** Number of real home pages (dots). */
  count: number;
  /** Currently visible page index. The App Library is index === count. */
  active: number;
  /**
   * When true, render a trailing search/library glyph after the dots that reads
   * as active when the App Library page (index === count) is showing.
   */
  showLibrary?: boolean;
}

export default function PageDots({ count, active, showLibrary = false }: PageDotsProps) {
  const libraryActive = active >= count;

  return (
    <div className="flex items-center justify-center gap-1.5" role="tablist">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          aria-current={i === active}
          className={`w-1.5 h-1.5 rounded-full transition-colors ${
            i === active ? 'bg-white' : 'bg-white/35'
          }`}
        />
      ))}

      {showLibrary && (
        <span
          aria-current={libraryActive}
          aria-label="App Library"
          className={`ml-1 flex h-3.5 w-3.5 items-center justify-center transition-colors ${
            libraryActive ? 'text-white' : 'text-white/35'
          }`}
        >
          <Search size={11} strokeWidth={2.25} />
        </span>
      )}
    </div>
  );
}
