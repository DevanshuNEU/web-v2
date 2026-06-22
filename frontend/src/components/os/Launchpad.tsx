'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { reveal } from '@/lib/motion';
import { getLaunchpadApps, getAppLabel, appRegistry } from '@/lib/appRegistry';
import AppIcon from './AppIcon';
import { Search } from 'lucide-react';
import type { AppType } from '../../../../shared/types';

interface LaunchpadProps {
  open: boolean;
  onClose: () => void;
}

export function Launchpad({ open, onClose }: LaunchpadProps) {
  const openWindow = useOSStore(s => s.openWindow);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();

  const allApps = getLaunchpadApps();
  const filtered = query.trim()
    ? allApps.filter((app) => {
        const label = getAppLabel(app.appType);
        const q = query.toLowerCase();
        return label.title.toLowerCase().includes(q) || app.appType.includes(q);
      })
    : allApps;

  const handleSelect = (appType: AppType) => {
    openWindow(appType);
    onClose();
    setQuery('');
  };

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
    else setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[998] flex flex-col items-center"
          style={{
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(70px) saturate(200%)',
            WebkitBackdropFilter: 'blur(70px) saturate(200%)',
          }}
          onClick={onClose}
        >
          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.2 }}
            className="mt-12 sm:mt-16 mb-10 sm:mb-14 w-[min(86vw,300px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex items-center">
              <Search
                size={14}
                strokeWidth={1.75}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                ref={inputRef}
                data-no-focus-ring
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search apps"
                className="w-full rounded-xl border border-white/[0.10] bg-white/[0.06]
                           py-2 pl-9 pr-12 text-[13.5px] text-white outline-none
                           transition-colors duration-150 placeholder:text-white/35
                           focus:border-white/20 focus:bg-white/[0.10]"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded
                             border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono
                             text-[10px] uppercase tracking-wide text-white/40">
                esc
              </kbd>
            </div>
          </motion.div>

          {/* App grid — shared reveal variants drive a tight premium stagger;
              container fades the whole grid in and orchestrates the items. */}
          <motion.div
            variants={reveal.container(reduced)}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
            className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-7
                       gap-x-10 sm:gap-x-12 gap-y-8 sm:gap-y-10
                       px-6 sm:px-8 max-w-[900px]"
            onClick={(e) => e.stopPropagation()}
          >
            {filtered.map((app) => {
              const label = getAppLabel(app.appType);
              const reg = appRegistry[app.appType];

              return (
                <motion.button
                  key={app.appType}
                  variants={reveal.item(reduced)}
                  onClick={() => handleSelect(app.appType)}
                  className="flex flex-col items-center gap-2.5 cursor-pointer group"
                >
                  <div className="transition-transform duration-150 ease-out group-hover:scale-110">
                    <AppIcon
                      icon={reg?.icon ?? app.icon}
                      colorKey={reg?.iconColor ?? 'blue'}
                      size={72}
                    />
                  </div>
                  <span
                    className="text-[11px] font-medium text-center leading-tight
                               max-w-[84px] truncate select-none"
                    style={{
                      color: 'rgba(255, 255, 255, 0.82)',
                      textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    {label.title}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>

          {filtered.length === 0 && (
            <p className="text-[13px] text-white/35 mt-16 font-medium select-none">
              No results
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
