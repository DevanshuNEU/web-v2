'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { appRegistry, getAppLabel } from '@/lib/appRegistry';
import AppIcon from './AppIcon';

export default function StageManager() {
  const windows = useOSStore(s => s.windows);
  const activeWindowId = useOSStore(s => s.activeWindowId);
  const focusWindow = useOSStore(s => s.focusWindow);

  const openWindows = windows.filter(w => w.isOpen);
  const sidebar = openWindows.filter(w => w.id !== activeWindowId);

  if (openWindows.length < 2) return null;

  return (
    <div className="fixed left-2.5 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2.5">
      <AnimatePresence mode="popLayout">
        {sidebar.map((win) => {
          const reg = appRegistry[win.appType];
          if (!reg) return null;
          const label = getAppLabel(win.appType);

          return (
            <motion.button
              key={win.id}
              layout
              initial={{ opacity: 0, x: -16, scale: 0.85 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -16, scale: 0.85 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              onClick={() => focusWindow(win.id)}
              className={`group relative cursor-pointer hover:scale-105 transition-transform duration-150
                          ${win.isMinimized ? 'opacity-35' : ''}`}
              title={label.windowTitle}
            >
              <AppIcon icon={reg.icon} colorKey={reg.iconColor} size={40} />

              {/* Tooltip */}
              <div
                className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2
                           px-2.5 py-1 rounded-md
                           bg-gray-900/85 dark:bg-gray-900/80
                           text-[11px] font-medium text-white whitespace-nowrap
                           opacity-0 group-hover:opacity-100 pointer-events-none
                           transition-opacity duration-100
                           backdrop-blur-md shadow-lg"
              >
                {win.title}
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
