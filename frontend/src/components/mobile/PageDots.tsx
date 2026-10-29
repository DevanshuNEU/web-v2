'use client';

import { Search } from 'lucide-react';
import { useWallpaperTone } from './useWallpaperTone';

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

/**
 * Decorative page indicator. Not interactive and not tabs, so it carries no
 * roles; the home scroller announces "page N of M" instead.
 */
export default function PageDots({ count, active, showLibrary = false }: PageDotsProps) {
  const libraryActive = active >= count;
  const light = useWallpaperTone() === 'light';
  const on = light ? 'bg-[#1d1d1f]' : 'bg-white';
  const off = light ? 'bg-[#1d1d1f]/30' : 'bg-white/35';

  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === active ? on : off}`} />
      ))}

      {showLibrary && (
        <span
          className={`ml-1 flex h-3.5 w-3.5 items-center justify-center transition-colors ${
            libraryActive
              ? light ? 'text-[#1d1d1f]' : 'text-white'
              : light ? 'text-[#1d1d1f]/30' : 'text-white/35'
          }`}
        >
          <Search size={11} strokeWidth={2.25} />
        </span>
      )}
    </div>
  );
}
