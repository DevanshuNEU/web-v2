'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  FolderOpen, 
  Activity, 
  Monitor, 
  Mail, 
  Terminal, 
  Gamepad2,
  Settings
} from 'lucide-react';
import { useOSStore } from '@/store/osStore';
import type { AppType } from '../../../../shared/types';

interface DesktopIconProps {
  appType: AppType;
  icon: React.ReactNode;
  label: string;
  position: { x: number; y: number };
}

function DesktopIcon({ appType, icon, label, position }: DesktopIconProps) {
  const { openWindow } = useOSStore();

  return (
    <motion.div
      className="absolute cursor-pointer group"
      style={{ left: position.x, top: position.y }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => openWindow(appType)}
    >
      <div className="flex flex-col items-center space-y-2 p-3 rounded-xl hover:bg-gray-100 transition-colors">
        <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-700 shadow-sm hover:shadow-md transition-shadow">
          {icon}
        </div>
        <span className="text-xs text-gray-700 font-medium text-center max-w-16 leading-tight">
          {label}
        </span>
      </div>
    </motion.div>
  );
}

export default function DesktopIcons() {
  const icons: Array<Omit<DesktopIconProps, 'position'> & { x: number; y: number }> = [
    {
      appType: 'about-me',
      icon: <User size={24} />,
      label: 'About Me',
      x: 50,
      y: 50
    },
    {
      appType: 'projects',
      icon: <FolderOpen size={24} />,
      label: 'Projects',
      x: 50,
      y: 150
    },
    {
      appType: 'skills-dashboard',
      icon: <Activity size={24} />,
      label: 'Skills',
      x: 50,
      y: 250
    },
    {
      appType: 'network-monitor',
      icon: <Monitor size={24} />,
      label: 'Network',
      x: 150,
      y: 50
    },
    {
      appType: 'contact',
      icon: <Mail size={24} />,
      label: 'Contact',
      x: 150,
      y: 150
    },
    {
      appType: 'terminal',
      icon: <Terminal size={24} />,
      label: 'Terminal',
      x: 150,
      y: 250
    },
    {
      appType: 'games',
      icon: <Gamepad2 size={24} />,
      label: 'Games',
      x: 250,
      y: 50
    },
    {
      appType: 'display-options',
      icon: <Settings size={24} />,
      label: 'Display',
      x: 250,
      y: 150
    }
  ];

  return (
    <>
      {icons.map((iconProps) => (
        <DesktopIcon
          key={iconProps.appType}
          appType={iconProps.appType}
          icon={iconProps.icon}
          label={iconProps.label}
          position={{ x: iconProps.x, y: iconProps.y }}
        />
      ))}
    </>
  );
}
