'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { 
  User, 
  FolderOpen, 
  Activity, 
  Monitor, 
  Mail, 
  Terminal, 
  Gamepad2,
  Settings,
  Circle
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
  const { windows, activeWindowId, focusWindow, minimizeWindow } = useOSStore();
  const runningApps = windows.filter(w => w.isOpen);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-sm border-t border-gray-200 shadow-lg flex items-center px-4 z-50">
      {/* Running Apps */}
      <div className="flex items-center space-x-2 flex-1">
        {runningApps.map((window) => {
          const IconComponent = appIcons[window.appType];
          const isActive = activeWindowId === window.id;
          const isMinimized = window.isMinimized;

          return (
            <button
              key={window.id}
              onClick={() => focusWindow(window.id)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all
                ${isActive && !isMinimized
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
                ${isMinimized ? 'opacity-60' : ''}
              `}
            >
              <IconComponent size={16} />
              <span className="text-sm font-medium">
                {window.title.replace('.app', '')}
              </span>
            </button>
          );
        })}
      </div>

      {/* System Tray */}
      <div className="text-sm text-gray-600">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}