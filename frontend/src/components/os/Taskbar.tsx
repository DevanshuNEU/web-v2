'use client';

import React, { useState, useEffect } from 'react';
import { useOSStore } from '@/store/osStore';
import { useTheme } from '@/store/themeStore';
import { StartMenu } from './StartMenu';
import { 
  User, 
  FolderOpen, 
  Activity, 
  Monitor, 
  Mail, 
  Terminal, 
  Gamepad2,
  Settings,
  Sun,
  Moon,
  Grid3x3
} from 'lucide-react';

const appIcons = {
  'about-me': User,
  'projects': FolderOpen,
  'skills-dashboard': Activity,
  'network-monitor': Monitor,
  'contact': Mail,
  'terminal': Terminal,
  'games': Gamepad2,
  'display-options': Settings,
};

export default function Taskbar() {
  const { windows, activeWindowId, focusWindow } = useOSStore();
  const { mode, toggleMode } = useTheme();
  const runningApps = windows.filter(w => w.isOpen);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  
  // Live clock
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Start Menu */}
      <StartMenu open={startMenuOpen} onClose={() => setStartMenuOpen(false)} />
      
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 h-16 px-4 z-50
                      w-[calc(100%-2rem)] max-w-7xl
                      glass-heavy
                      bg-white/10 dark:bg-white/5
                      border border-white/20 dark:border-white/10
                      rounded-2xl
                      shadow-glass-xl
                      flex items-center justify-between">
      
      {/* Left: Start Button */}
      <div className="flex items-center">
        <button
          onClick={() => setStartMenuOpen(!startMenuOpen)}
          className={`p-2 rounded-lg transition-all duration-200 hover:scale-105
                     ${startMenuOpen ? 'bg-accent/20 text-accent' : 'text-text hover:bg-surface/50'}`}
          title="Start Menu"
        >
          <Grid3x3 size={20} />
        </button>
      </div>
      
      {/* Center: Running Apps */}
      <div className="flex items-center justify-center gap-1 flex-1">
        {runningApps.length === 0 ? (
          <div className="text-xs text-text-secondary/50">No apps running</div>
        ) : (
          runningApps.map((window) => {
            const IconComponent = appIcons[window.appType];
            const isActive = activeWindowId === window.id;
            const isMinimized = window.isMinimized;

            return (
              <button
                key={window.id}
                onClick={() => focusWindow(window.id)}
                className={`
                  relative p-2.5 rounded-lg cursor-pointer 
                  transition-all duration-200
                  hover:scale-110 hover:bg-surface/50
                  ${isActive && !isMinimized
                    ? 'bg-accent/10 text-accent' 
                    : 'text-text-secondary'
                  }
                  ${isMinimized ? 'opacity-50' : ''}
                `}
                title={window.title}
              >
                <IconComponent size={20} />
                
                {/* Running indicator dot */}
                {!isMinimized && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Right: System Tray */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleMode}
          className="p-2 rounded-lg hover:bg-surface/50 transition-all duration-200 text-text hover:scale-105"
          title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {mode === 'dark' ? (
            <Sun size={18} />
          ) : (
            <Moon size={18} />
          )}
        </button>
        
        {/* Clock */}
        <div className="text-sm font-medium text-text min-w-[60px] text-right">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      </div>
    </>
  );
}
