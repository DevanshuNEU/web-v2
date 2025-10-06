'use client';

import { useState } from 'react';
import { useTheme, ACCENT_COLORS } from '@/store/themeStore';
import { toast } from 'sonner';
import { WallpaperPicker } from '@/components/shared/WallpaperPicker';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Palette, Info, Sun, Moon, Check } from 'lucide-react';

export default function SettingsApp() {
  const { mode, setMode, accentColor, setAccent } = useTheme();

  return (
    <div className="h-full flex flex-col bg-surface/30">
      <Tabs defaultValue="appearance" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b border-white/10 rounded-none bg-transparent px-4">
          <TabsTrigger value="appearance" className="gap-2">
            <Palette size={16} />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="about" className="gap-2">
            <Info size={16} />
            About
          </TabsTrigger>
        </TabsList>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Theme Toggle */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text">Theme</h3>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMode('light');
                  toast.success('Switched to Light Mode');
                }}
                className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200
                          ${mode === 'light' 
                            ? 'border-accent bg-accent/10' 
                            : 'border-border hover:border-accent/50'
                          }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <Sun size={20} className={mode === 'light' ? 'text-accent' : 'text-text-secondary'} />
                  <span className="font-medium text-text">Light</span>
                  {mode === 'light' && <Check size={16} className="text-accent" />}
                </div>
              </button>
              
              <button
                onClick={() => {
                  setMode('dark');
                  toast.success('Switched to Dark Mode');
                }}
                className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200
                          ${mode === 'dark' 
                            ? 'border-accent bg-accent/10' 
                            : 'border-border hover:border-accent/50'
                          }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <Moon size={20} className={mode === 'dark' ? 'text-accent' : 'text-text-secondary'} />
                  <span className="font-medium text-text">Dark</span>
                  {mode === 'dark' && <Check size={16} className="text-accent" />}
                </div>
              </button>
            </div>
          </div>

          {/* Accent Color Picker */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text">Accent Color</h3>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(ACCENT_COLORS).map(([name, color]) => (
                <button
                  key={name}
                  onClick={() => {
                    setAccent(color);
                    toast.success(`Accent color changed to ${name}`);
                  }}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105
                            ${accentColor === color 
                              ? 'border-white/50 ring-2 ring-offset-2 ring-offset-surface' 
                              : 'border-transparent hover:border-white/30'
                            }`}
                  style={{ 
                    backgroundColor: color,
                    borderColor: accentColor === color ? color : undefined
                  }}
                  title={name.charAt(0).toUpperCase() + name.slice(1)}
                >
                  {accentColor === color && (
                    <Check size={20} className="text-white absolute inset-0 m-auto" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-secondary">
              Current: {Object.entries(ACCENT_COLORS).find(([_, c]) => c === accentColor)?.[0] || 'Custom'}
            </p>
          </div>

          {/* Wallpaper Section */}
          <WallpaperPicker />
        </TabsContent>

        {/* About Settings */}
        <TabsContent value="about" className="flex-1 p-6 space-y-4 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text mb-2">Portfolio OS</h2>
              <p className="text-sm text-text-secondary">Version 0.1.0 - Development Build</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text">Developer</h3>
              <p className="text-sm text-text-secondary">Devanshu Chicholikar</p>
              <p className="text-xs text-text-secondary">MS Software Engineering @ Northeastern University</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text">Tech Stack</h3>
              <div className="flex flex-wrap gap-2">
                {['Next.js 15', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Zustand', 'shadcn/ui'].map(tech => (
                  <span key={tech} className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-text-secondary">
                An interactive portfolio experience reimagining the traditional portfolio as a desktop operating system.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
