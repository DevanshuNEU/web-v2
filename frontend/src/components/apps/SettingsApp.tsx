'use client';

import { useState, useEffect } from 'react';
import { useTheme, ACCENT_COLORS } from '@/store/themeStore';
import { toast } from 'sonner';
import { WallpaperPicker } from '@/components/shared/WallpaperPicker';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Palette, Info, Sun, Moon, Check, Volume2, VolumeX } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled, playSound } from '@/hooks/useSoundEffects';

export default function SettingsApp() {
  const { mode, setMode, accentColor, setAccent } = useTheme();
  const [soundOn, setSoundOn] = useState(false);

  // Read sound preference after mount
  useEffect(() => { setSoundOn(isSoundEnabled()); }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) {
      setTimeout(() => playSound('notify'), 100);
      toast.success('Sound effects on. ding!');
    } else {
      toast.success('Sound effects off. Silence is golden.');
    }
  };

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

        {/* Appearance */}
        <TabsContent value="appearance" className="flex-1 p-6 space-y-6 overflow-auto">

          {/* Theme */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text">Theme</h3>
            <div className="flex gap-3">
              <button
                onClick={() => { setMode('light'); toast.success('Light mode. Welcome back to the light side.'); }}
                className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200
                          ${mode === 'light' ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'}`}
              >
                <div className="flex items-center justify-center gap-3">
                  <Sun size={20} className={mode === 'light' ? 'text-accent' : 'text-text-secondary'} />
                  <span className="font-medium text-text">Light</span>
                  {mode === 'light' && <Check size={16} className="text-accent" />}
                </div>
              </button>

              <button
                onClick={() => { setMode('dark'); toast.success('Dark mode. Very mysterious.'); }}
                className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200
                          ${mode === 'dark' ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'}`}
              >
                <div className="flex items-center justify-center gap-3">
                  <Moon size={20} className={mode === 'dark' ? 'text-accent' : 'text-text-secondary'} />
                  <span className="font-medium text-text">Dark</span>
                  {mode === 'dark' && <Check size={16} className="text-accent" />}
                </div>
              </button>
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text">Accent Color</h3>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(ACCENT_COLORS).map(([name, color]) => (
                <button
                  key={name}
                  onClick={() => { setAccent(color); toast.success('New accent color. Same great developer.'); }}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105
                            ${accentColor === color ? 'border-white/50 ring-2 ring-offset-2 ring-offset-surface' : 'border-transparent hover:border-white/30'}`}
                  style={{ backgroundColor: color, borderColor: accentColor === color ? color : undefined }}
                  title={name.charAt(0).toUpperCase() + name.slice(1)}
                >
                  {accentColor === color && (
                    <Check size={20} className="text-white absolute inset-0 m-auto" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-secondary">
              Current: {Object.entries(ACCENT_COLORS).find(([, c]) => c === accentColor)?.[0] ?? 'Custom'}
            </p>
          </div>

          {/* Wallpaper */}
          <WallpaperPicker />

          {/* Sound Effects */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text">Sound Effects</h3>
            <button
              onClick={toggleSound}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200
                        ${soundOn ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'}`}
            >
              <div className="flex items-center gap-3">
                {soundOn
                  ? <Volume2 size={20} className="text-accent" />
                  : <VolumeX size={20} className="text-text-secondary" />
                }
                <div className="text-left">
                  <div className="font-medium text-text text-sm">
                    {soundOn ? 'Sound On' : 'Sound Off'}
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    {soundOn ? 'Window open/close, notifications' : 'Silence is golden'}
                  </div>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors relative
                            ${soundOn ? 'bg-accent' : 'bg-white/20'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
                              ${soundOn ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
            </button>
          </div>

        </TabsContent>

        {/* About */}
        <TabsContent value="about" className="flex-1 p-6 space-y-4 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text mb-1">devOS</h2>
              <p className="text-sm text-text-secondary">Version 2.1.0 — Sprint 4</p>
              <p className="text-xs text-text-secondary mt-1">
                Built by Devanshu Chicholikar · Open source
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text">Developer</h3>
              <p className="text-sm text-text-secondary">Devanshu Chicholikar</p>
              <p className="text-xs text-text-secondary">MS Software Engineering Systems @ Northeastern University</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text">Stack</h3>
              <div className="flex flex-wrap gap-2">
                {['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Zustand', 'shadcn/ui'].map(tech => (
                  <span key={tech} className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text">What&apos;s new in v2.1</h3>
              <ul className="space-y-1 text-xs text-text-secondary">
                {[
                  'Desktop clock + rotating quotes widget',
                  'Animated wallpapers: Neural Network, Deep Space, Aurora',
                  'Sound effects via Web Audio API',
                  'RPG Skill Tree with SVG Bezier connections',
                  'Finder-style File Explorer',
                  'Interactive Resume + PDF viewer',
                  'Arcade: Snake (fixed), Minesweeper, 2048',
                  'Changelog timeline app',
                ].map(item => (
                  <li key={item} className="flex items-start gap-1.5">
                    <span className="text-accent mt-0.5">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-text-secondary leading-relaxed">
                An interactive portfolio built as a desktop OS. Every app is a window into who I am,
                what I&apos;ve built, and how I think about software.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
