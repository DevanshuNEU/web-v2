'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import Window from './Window';
import AboutMeApp from '@/components/apps/AboutMeApp';
import ProjectsApp from '@/components/apps/ProjectsApp';
import SkillsDashboardApp from '@/components/apps/SkillsDashboardApp';
import ContactApp from '@/components/apps/ContactApp';

// App component mapping
const appComponents = {
  'about-me': AboutMeApp,
  'projects': ProjectsApp,
  'skills-dashboard': SkillsDashboardApp,
  'contact': ContactApp,
  'network-monitor': () => <div className="p-6">Network Monitor - Coming Soon</div>,
  'terminal': () => <div className="p-6">Terminal - Coming Soon</div>,
  'games': () => <div className="p-6">Games - Coming Soon</div>,
  'display-options': () => <div className="p-6">Display Options - Coming Soon</div>
};

export default function WindowManager() {
  const { windows } = useOSStore();
  const visibleWindows = windows.filter(w => w.isOpen && !w.isMinimized);

  return (
    <AnimatePresence>
      {visibleWindows.map((window) => {
        const AppComponent = appComponents[window.appType];
        
        return (
          <Window key={window.id} window={window}>
            <AppComponent isMaximized={window.isMaximized} />
          </Window>
        );
      })}
    </AnimatePresence>
  );
}
