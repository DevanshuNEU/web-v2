'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  FolderOpen, 
  Activity, 
  Monitor, 
  Mail, 
  Terminal, 
  Gamepad2,
  Settings,
  Image,
  Palette
} from 'lucide-react';
import { useOSStore } from '@/store/osStore';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface StartMenuProps {
  open: boolean;
  onClose: () => void;
}

const allApps = [
  { id: 'about-me', name: 'About Me', icon: User, description: 'Learn about me' },
  { id: 'projects', name: 'Projects', icon: FolderOpen, description: 'My work' },
  { id: 'skills-dashboard', name: 'Skills', icon: Activity, description: 'Technical skills' },
  { id: 'network-monitor', name: 'Network', icon: Monitor, description: 'Network monitor' },
  { id: 'contact', name: 'Contact', icon: Mail, description: 'Get in touch' },
  { id: 'terminal', name: 'Terminal', icon: Terminal, description: 'Command line' },
  { id: 'games', name: 'Games', icon: Gamepad2, description: 'Mini games' },
  { id: 'display-options', name: 'Display', icon: Settings, description: 'Display settings' },
];

export function StartMenu({ open, onClose }: StartMenuProps) {
  const { openWindow } = useOSStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectApp = (appId: string) => {
    openWindow(appId as any);
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
            transition={{ 
              type: "spring",
              damping: 20,
              stiffness: 300
            }}
            className="fixed bottom-20 left-8 z-[999] w-[600px]"
          >
        <Command 
          className="rounded-2xl border border-white/20 dark:border-white/10 
                     shadow-glass-xl glass-heavy overflow-hidden"
        >
          <CommandInput 
            placeholder="Search apps, files..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="border-b border-white/10 dark:border-white/5 bg-transparent text-text"
          />
          
          <CommandList className="max-h-[400px]">
            <CommandEmpty className="py-6 text-center text-sm text-text-secondary">
              No results found.
            </CommandEmpty>
            
            {/* All Apps */}
            <CommandGroup heading="Apps" className="text-text-secondary">
              <div className="grid grid-cols-4 gap-3 p-4">
                {allApps.map((app, index) => {
                  const IconComponent = app.icon;
                  return (
                    <motion.button
                      key={app.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleSelectApp(app.id)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl
                                hover:bg-surface/50 transition-all duration-200
                                hover:scale-105 cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center
                                    group-hover:bg-accent/20 transition-colors">
                        <IconComponent size={24} className="text-accent" />
                      </div>
                      <span className="text-xs font-medium text-text text-center">
                        {app.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </CommandGroup>
            
            {/* Quick Actions */}
            <CommandGroup heading="Quick Actions" className="text-text-secondary border-t border-white/10">
              <CommandItem 
                onSelect={() => {
                  // Will implement wallpaper selector later
                  onClose();
                }}
                className="cursor-pointer text-text"
              >
                <Image className="mr-2 h-4 w-4" />
                <span>Change Wallpaper</span>
              </CommandItem>
              
              <CommandItem 
                onSelect={() => {
                  handleSelectApp('display-options');
                }}
                className="cursor-pointer text-text"
              >
                <Palette className="mr-2 h-4 w-4" />
                <span>Personalize</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
