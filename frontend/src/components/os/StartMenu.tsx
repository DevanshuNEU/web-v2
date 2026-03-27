'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { getStartMenuApps, getAppLabel } from '@/lib/appRegistry';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from '@/components/ui/command';
import type { AppType } from '../../../../shared/types';

interface StartMenuProps {
  open: boolean;
  onClose: () => void;
}

export function StartMenu({ open, onClose }: StartMenuProps) {
  const openWindow = useOSStore(state => state.openWindow);
  const [searchQuery, setSearchQuery] = useState('');
  const startMenuApps = getStartMenuApps();

  const handleSelectApp = (appId: string) => {
    openWindow(appId as AppType);
    onClose();
    setSearchQuery('');
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-[998] backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Start Menu */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bottom-20 left-8 z-[999] w-[600px]"
          >
            <Command
              className="rounded-2xl border border-white/20 dark:border-white/10
                         shadow-glass-xl glass-heavy overflow-hidden"
            >
              <CommandInput
                placeholder="Search apps..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="border-b border-white/10 dark:border-white/5 bg-transparent text-text"
              />

              <CommandList className="max-h-[400px]">
                <CommandEmpty className="py-6 text-center text-sm text-text-secondary">
                  Nothing found. Try a different search, or blame the algorithm.
                </CommandEmpty>

                {/* All Apps */}
                <CommandGroup heading="Apps" className="text-text-secondary">
                  <div className="grid grid-cols-4 gap-3 p-4">
                    {startMenuApps.map((app, index) => {
                      const IconComponent = app.icon;
                      const label = getAppLabel(app.appType);
                      return (
                        <motion.button
                          key={app.appType}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleSelectApp(app.appType)}
                          className="flex flex-col items-center gap-2 p-3 rounded-xl
                                    hover:bg-surface/50 transition-all duration-200
                                    hover:scale-105 cursor-pointer group"
                        >
                          <div
                            className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center
                                      group-hover:bg-accent/20 transition-colors"
                          >
                            <IconComponent size={24} className="text-accent" />
                          </div>
                          <div className="text-center">
                            <span className="text-xs font-medium text-text block">
                              {label.title}
                            </span>
                            <span className="text-[10px] text-text-secondary block mt-0.5">
                              {label.description}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </CommandGroup>

              </CommandList>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
