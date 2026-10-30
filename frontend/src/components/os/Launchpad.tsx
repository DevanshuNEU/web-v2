'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { reveal } from '@/lib/motion';
import { getLaunchpadApps, getAppLabel } from '@/lib/appRegistry';
import { useEscapeLayer } from '@/lib/escapeStack';
import { Z } from '@/lib/zLayers';
import AppIcon from './AppIcon';
import { Search } from 'lucide-react';
import type { AppType } from '../../../../shared/types';

interface LaunchpadProps {
  open: boolean;
  onClose: () => void;
}

/** The four apps a recruiter came for get their own first row. */
const START_HERE: AppType[] = ['about-me', 'projects', 'resume', 'contact'];

export function Launchpad({ open, onClose }: LaunchpadProps) {
  const openWindow = useOSStore(s => s.openWindow);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();

  const allApps = getLaunchpadApps();
  const q = query.trim().toLowerCase();
  const filtered = q
    ? allApps.filter((app) => {
        const label = getAppLabel(app.appType);
        return label.title.toLowerCase().includes(q) || app.appType.includes(q);
      })
    : allApps;
  const startHere = q ? [] : START_HERE.filter(t => allApps.some(a => a.appType === t));
  const rest = q ? filtered : filtered.filter(a => !START_HERE.includes(a.appType));

  const handleSelect = (appType: AppType) => {
    openWindow(appType);
    onClose();
    setQuery('');
  };

  /** Close without opening anything: focus returns to the grid button. */
  const dismiss = () => {
    onClose();
    const back = returnFocusRef.current;
    if (back && back.isConnected) setTimeout(() => back.focus(), 0);
  };

  useEffect(() => {
    if (open) {
      const active = document.activeElement;
      returnFocusRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
    setQuery('');
  }, [open]);

  useEscapeLayer(open, dismiss);

  // Keep Tab inside the overlay: it is visually modal, so focus must be too.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const items = [...dialogRef.current.querySelectorAll<HTMLElement>('input, button')];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const tile = (appType: AppType) => {
    const label = getAppLabel(appType);
    return (
      <motion.button
        key={appType}
        type="button"
        variants={reveal.item(reduced)}
        onClick={() => handleSelect(appType)}
        title={label.description}
        className="flex flex-col items-center gap-2.5 cursor-pointer group rounded-xl"
      >
        <div className="transition-transform duration-150 ease-out group-hover:scale-110">
          <AppIcon appType={appType} size={72} />
        </div>
        <span
          className="text-[12px] font-medium text-center leading-tight text-white
                     max-w-[96px] truncate select-none"
          style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)' }}
        >
          {label.title}
        </span>
        {q && (
          <span className="-mt-1.5 max-w-[120px] text-center text-[11px] leading-snug text-white/75">
            {label.description}
          </span>
        )}
      </motion.button>
    );
  };

  const grid = 'grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-7 gap-x-10 sm:gap-x-12 gap-y-8 sm:gap-y-10';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="All apps"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 flex flex-col items-center overflow-y-auto"
          style={{
            zIndex: Z.launchpad,
            // Dark enough in both themes for white labels to pass 4.5:1.
            background: 'rgba(0, 0, 0, 0.58)',
            backdropFilter: 'blur(70px) saturate(160%)',
            WebkitBackdropFilter: 'blur(70px) saturate(160%)',
          }}
          onClick={dismiss}
          onKeyDown={onKeyDown}
        >
          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.2 }}
            className="mt-12 sm:mt-16 mb-10 sm:mb-12 w-[min(86vw,300px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex items-center">
              <Search
                size={14}
                strokeWidth={1.75}
                aria-hidden
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search apps"
                aria-label="Search apps"
                className="w-full rounded-xl border border-white/20 bg-white/[0.08]
                           py-2 pl-9 pr-12 text-[14px] text-white outline-none
                           transition-colors duration-150 placeholder:text-white/70
                           focus:border-white/60 focus:bg-white/[0.12]"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded
                             border border-white/25 bg-white/[0.06] px-1.5 py-0.5 font-mono
                             text-[11px] text-white/75">
                esc
              </kbd>
            </div>
          </motion.div>

          {/* App grid: shared reveal variants drive the stagger. */}
          <motion.div
            variants={reveal.container(reduced)}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
            className="flex flex-col items-center gap-8 px-6 sm:px-8 pb-28 max-w-[900px]"
            onClick={(e) => e.stopPropagation()}
          >
            {startHere.length > 0 && (
              <section aria-label="Start here" className="flex flex-col items-center gap-4">
                <h2 className="text-[12px] font-medium text-white/80 select-none">Start here</h2>
                <div className="grid grid-cols-4 gap-x-10 sm:gap-x-12">{startHere.map(tile)}</div>
              </section>
            )}
            {rest.length > 0 && (
              <section aria-label={q ? 'Results' : 'More apps'} className="flex flex-col items-center gap-4">
                {!q && <h2 className="text-[12px] font-medium text-white/80 select-none">More</h2>}
                <div className={grid}>{rest.map(a => tile(a.appType))}</div>
              </section>
            )}
          </motion.div>

          {filtered.length === 0 && (
            <p role="status" className="-mt-16 max-w-[320px] text-center text-[13px] leading-relaxed text-white/80 font-medium select-none">
              No apps match &ldquo;{query.trim()}&rdquo;. Press ⌘K to search projects and skills, or ask Devanshu.
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
