'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import Window from './Window';
import AboutMeApp from '@/components/apps/AboutMeApp';
import ProjectsApp from '@/components/apps/ProjectsApp';
import SkillsDashboardApp from '@/components/apps/SkillsDashboardApp';
import ContactApp from '@/components/apps/ContactApp';
import SettingsApp from '@/components/apps/SettingsApp';

// App component mapping
const appComponents = {
  'about-me': AboutMeApp,
  'projects': ProjectsApp,
  'skills-dashboard': SkillsDashboardApp,
  'contact': ContactApp,
  'display-options': SettingsApp,
  'network-monitor': () => <div className="p-6">Network Monitor - Coming Soon</div>,
  'terminal': () => <div className="p-6">Terminal - Coming Soon</div>,
  'games': () => <div className="p-6">Games - Coming Soon</div>,
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
            <AppComponent />
          </Window>
        );
      })}
    </AnimatePresence>
  );
}
