'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Compass, 
  Lightbulb, 
  Heart, 
  PenTool, 
  Activity, 
  Mail 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
}

interface AboutMeSidebarProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  className?: string;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'intro',
    label: 'Who I Am',
    icon: <User size={18} />,
    description: 'Personal introduction'
  },
  {
    id: 'journey',
    label: 'My Journey',
    icon: <Compass size={18} />,
    description: 'Professional story'
  },
  {
    id: 'excites',
    label: 'What Excites Me',
    icon: <Lightbulb size={18} />,
    description: 'Tech vision & future'
  },
  {
    id: 'philosophy',
    label: 'Philosophy',
    icon: <Heart size={18} />,
    description: 'Engineering principles'
  },
  {
    id: 'thoughts',
    label: 'Thoughts & Writing',
    icon: <PenTool size={18} />,
    description: 'Blog posts & reflections'
  },
  {
    id: 'currently',
    label: 'Currently',
    icon: <Activity size={18} />,
    description: 'What I\'m working on'
  },
  {
    id: 'contact',
    label: 'Get in Touch',
    icon: <Mail size={18} />,
    description: 'Let\'s connect'
  }
];

export default function AboutMeSidebar({ 
  activeSection, 
  onSectionChange, 
  className 
}: AboutMeSidebarProps) {
  return (
    <div className={cn(
      "w-64 bg-white/60 backdrop-blur-sm border-r border-gray-200 h-full overflow-y-auto",
      className
    )}>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          About Me
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Get to know Devanshu
        </p>

        <nav className="space-y-1">
          {sidebarItems.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                activeSection === item.id
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <div className={cn(
                "mt-0.5 flex-shrink-0",
                activeSection === item.id ? "text-blue-600" : "text-gray-500"
              )}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                  {item.label}
                </div>
                {item.description && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {item.description}
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </nav>
      </div>
    </div>
  );
}