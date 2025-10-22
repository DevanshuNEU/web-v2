'use client';

import React, { lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import Window from './Window';

// Lazy load apps for better performance
const AboutMeApp = lazy(() => import('@/components/apps/AboutMeApp'));
const ProjectsApp = lazy(() => import('@/components/apps/ProjectsApp'));
const SkillsDashboardApp = lazy(() => import('@/components/apps/SkillsDashboardApp'));
const ContactApp = lazy(() => import('@/components/apps/ContactApp'));
const SettingsApp = lazy(() => import('@/components/apps/SettingsApp'));
const TerminalApp = lazy(() => import('@/components/apps/TerminalApp'));
const SnakeGame = lazy(() => import('@/components/apps/SnakeGame'));
const AnalyticsApp = lazy(() => import('@/components/apps/AnalyticsApp'));

// Loading component
function WindowLoading() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
    </div>
  );
}

// App component mapping
const appComponents = {
  'about-me': AboutMeApp,
  'projects': ProjectsApp,
  'skills-dashboard': SkillsDashboardApp,
  'contact': ContactApp,
  'display-options': SettingsApp,
  'terminal': TerminalApp,
  'games': SnakeGame,
  'analytics': AnalyticsApp,
};

export default function WindowManager() {
  const { windows } = useOSStore();
  const visibleWindows = windows.filter(w => w.isOpen && !w.isMinimized);

  return (
    <AnimatePresence mode="popLayout">
      {visibleWindows.map((window) => {
        const AppComponent = appComponents[window.appType];
        
        return (
          <Window key={window.id} window={window}>
            <Suspense fallback={<WindowLoading />}>
              <AppComponent />
            </Suspense>
          </Window>
        );
      })}
    </AnimatePresence>
  );
}
