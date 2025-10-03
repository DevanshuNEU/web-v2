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

interface IconConfig {
  appType: AppType;
  icon: React.ElementType;
  label: string;
  gradient: string;
}

interface DesktopIconProps extends IconConfig {
  position: { x: number; y: number };
}

function DesktopIcon({ appType, icon: Icon, label, gradient, position }: DesktopIconProps) {
  const { openWindow } = useOSStore();

  return (
    <motion.div
      className="absolute cursor-pointer group"
      style={{ left: position.x, top: position.y }}
      whileHover={{ scale: 1.08, y: -4 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onDoubleClick={() => openWindow(appType)}
    >
      <div className="flex flex-col items-center gap-2 p-2">
        {/* Icon with gradient background */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center
                        shadow-lg group-hover:shadow-xl transition-all duration-200
                        ${gradient}`}>
          <Icon size={28} className="text-white drop-shadow-md" />
        </div>
        
        {/* Label with background for readability */}
        <span className="text-xs font-medium text-center px-2 py-1 rounded-md
                       bg-surface/80 backdrop-blur-sm shadow-sm
                       text-text max-w-[80px] leading-tight">
          {label}
        </span>
      </div>
    </motion.div>
  );
}

export default function DesktopIcons() {
  const iconConfigs: Array<Omit<DesktopIconProps, 'position'> & { x: number; y: number }> = [
    {
      appType: 'about-me',
      icon: User,
      label: 'About Me',
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
      x: 50,
      y: 50
    },
    {
      appType: 'projects',
      icon: FolderOpen,
      label: 'Projects',
      gradient: 'bg-gradient-to-br from-orange-500 to-orange-600',
      x: 50,
      y: 170
    },
    {
      appType: 'skills-dashboard',
      icon: Activity,
      label: 'Skills',
      gradient: 'bg-gradient-to-br from-purple-500 to-purple-600',
      x: 50,
      y: 290
    },
    {
      appType: 'network-monitor',
      icon: Monitor,
      label: 'Network',
      gradient: 'bg-gradient-to-br from-teal-500 to-teal-600',
      x: 170,
      y: 50
    },
    {
      appType: 'contact',
      icon: Mail,
      label: 'Contact',
      gradient: 'bg-gradient-to-br from-pink-500 to-pink-600',
      x: 170,
      y: 170
    },
    {
      appType: 'terminal',
      icon: Terminal,
      label: 'Terminal',
      gradient: 'bg-gradient-to-br from-gray-700 to-gray-800',
      x: 170,
      y: 290
    },
    {
      appType: 'games',
      icon: Gamepad2,
      label: 'Games',
      gradient: 'bg-gradient-to-br from-green-500 to-green-600',
      x: 290,
      y: 50
    },
    {
      appType: 'display-options',
      icon: Settings,
      label: 'Display',
      gradient: 'bg-gradient-to-br from-red-500 to-red-600',
      x: 290,
      y: 170
    }
  ];

  return (
    <>
      {iconConfigs.map((config) => (
        <DesktopIcon
          key={config.appType}
          appType={config.appType}
          icon={config.icon}
          label={config.label}
          gradient={config.gradient}
          position={{ x: config.x, y: config.y }}
        />
      ))}
    </>
  );
}
