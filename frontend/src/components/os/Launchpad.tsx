'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
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
            className="mt-12 sm:mt-16 mb-10 sm:mb-14 w-[200px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                ref={inputRef}
                data-no-focus-ring
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full pl-8 pr-3 py-[7px] rounded-lg
                           bg-white/[0.08]
                           border border-white/[0.08]
                           text-[13px] text-white placeholder:text-white/35
                           outline-none
                           focus:bg-white/[0.12] focus:border-white/[0.15]
                           transition-all duration-150"
              />
            </div>
          </motion.div>

          {/* App grid */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
            transition={{ delay: 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-7
                       gap-x-10 sm:gap-x-12 gap-y-8 sm:gap-y-10
                       px-6 sm:px-8 max-w-[900px]"
            onClick={(e) => e.stopPropagation()}
          >
            {filtered.map((app, i) => {
              const label = getAppLabel(app.appType);
              const reg = appRegistry[app.appType];

              return (
                <motion.button
                  key={app.appType}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.04 + i * 0.02,
                    type: 'spring',
                    damping: 20,
                    stiffness: 260,
                  }}
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
