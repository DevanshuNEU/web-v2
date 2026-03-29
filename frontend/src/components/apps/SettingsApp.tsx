'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, ACCENT_COLORS } from '@/store/themeStore';
import { getWallpapersForTheme } from '@/data/wallpapers';
import type { Wallpaper } from '@/store/themeStore';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  Palette, Info, Sun, Moon, Check,
  Volume2, VolumeX, Sparkles,
} from 'lucide-react';
import { isSoundEnabled, setSoundEnabled, playSound } from '@/hooks/useSoundEffects';

/* ------------------------------------------------------------------ */
/*  Sidebar nav config                                                 */
/* ------------------------------------------------------------------ */

const SECTIONS = [
  { id: 'appearance', label: 'Appearance', icon: Palette, color: '#007AFF' },
  { id: 'about',      label: 'About',      icon: Info,    color: '#8e8e93' },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

/* ------------------------------------------------------------------ */
/*  Wallpaper thumbnail                                                */
/* ------------------------------------------------------------------ */

function WallpaperThumb({
  wp, selected, onSelect,
}: { wp: Wallpaper; selected: boolean; onSelect: (wp: Wallpaper) => void }) {
  return (
    <button
      onClick={() => onSelect(wp)}
      className={`relative w-full rounded-xl overflow-hidden border-2 transition-all duration-200
                  focus:outline-none group
                  ${selected
                    ? 'border-accent shadow-md ring-2 ring-accent/25'
                    : 'border-black/10 dark:border-white/10 hover:border-accent/50 hover:scale-[1.02]'
                  }`}
      style={{ aspectRatio: '16/9' }}
    >
      {wp.imageUrl ? (
        <Image src={wp.imageUrl} alt={wp.name} fill className="object-cover" />
      ) : wp.thumbnail ? (
        <div className="absolute inset-0" style={{ background: wp.thumbnail }} />
      ) : (
        <div className="absolute inset-0 bg-surface" />
      )}

      {/* Live badge */}
      {wp.type === 'animated' && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-[9px] font-semibold tracking-wide">
          <Sparkles size={8} />
          LIVE
        </div>
      )}

      {/* Selected check */}
      {selected && (
        <div className="absolute inset-0 bg-accent/15 flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shadow-lg">
            <Check size={14} className="text-white" strokeWidth={2.5} />
          </div>
        </div>
      )}

      {/* Name on hover/always */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/65 to-transparent pt-5 pb-2 px-2.5">
        <p className="text-white text-[11px] font-medium truncate">{wp.name}</p>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle switch                                                      */
/* ------------------------------------------------------------------ */

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40
                  ${on ? 'bg-accent' : 'bg-black/20 dark:bg-white/20'}`}
      role="switch"
      aria-checked={on}
    >
      <motion.div
        layout
        transition={{ type: 'spring', damping: 20, stiffness: 400 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
        style={{ left: on ? 'calc(100% - 20px)' : '4px' }}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Appearance                                                */
/* ------------------------------------------------------------------ */

function AppearanceSection() {
  const { mode, setMode, accentColor, setAccent, wallpaper, setWallpaper } = useTheme();
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => { setSoundOn(isSoundEnabled()); }, []);

  const available = getWallpapersForTheme(mode);
  const animated = available.filter(w => w.type === 'animated');
  const staticWps = available.filter(w => w.type === 'static');

  const handleWallpaper = (wp: Wallpaper) => {
    setWallpaper(wp);
    toast.success(`Wallpaper: ${wp.name}`);
  };

  const toggleSound = (next: boolean) => {
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) { setTimeout(() => playSound('notify'), 100); toast.success('Sound on. ding!'); }
    else toast.success('Sound off. Silence is golden.');
  };

  return (
    <div className="space-y-7">

      {/* ── Light / Dark ── */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Appearance</h3>
        <div className="flex gap-3">
          {([
            { v: 'light' as const, icon: Sun,  label: 'Light', msg: 'Light mode. Welcome to the bright side.' },
            { v: 'dark'  as const, icon: Moon, label: 'Dark',  msg: 'Dark mode. Very mysterious.'             },
          ]).map(({ v, icon: Icon, label, msg }) => (
            <button
              key={v}
              onClick={() => { setMode(v); toast.success(msg); }}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 transition-all text-sm font-medium
                          ${mode === v
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-black/10 dark:border-white/10 text-text-secondary hover:border-accent/40 hover:text-text'
                          }`}
            >
              <Icon size={16} />
              {label}
              {mode === v && <Check size={13} strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      </section>

      {/* ── Accent color ── */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Accent Color</h3>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(ACCENT_COLORS).map(([name, color]) => (
            <button
              key={name}
              onClick={() => { setAccent(color); toast.success('New accent. Same great developer.'); }}
              title={name.charAt(0).toUpperCase() + name.slice(1)}
              className="relative w-8 h-8 rounded-full transition-all hover:scale-110 focus:outline-none"
              style={{
                background: color,
                boxShadow: accentColor === color
                  ? `0 0 0 3px white, 0 0 0 5px ${color}`
                  : '0 1px 4px rgba(0,0,0,0.18)',
              }}
            >
              {accentColor === color && (
                <Check size={14} className="text-white absolute inset-0 m-auto" strokeWidth={2.5} />
              )}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-text-secondary capitalize">
          {Object.entries(ACCENT_COLORS).find(([, c]) => c === accentColor)?.[0] ?? 'Custom'}
        </p>
      </section>

      {/* ── Wallpaper ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Wallpaper</h3>
          <span className="text-[11px] text-text-secondary">
            Active: <span className="text-text font-medium">{wallpaper?.name ?? 'None'}</span>
            {wallpaper?.type === 'animated' && <span className="text-accent ml-1">· live</span>}
          </span>
        </div>

        {animated.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] text-text-secondary flex items-center gap-1">
              <Sparkles size={10} className="text-accent" /> Live Wallpapers
            </p>
            <div className="grid grid-cols-2 gap-3">
              {animated.map(wp => (
                <WallpaperThumb key={wp.id} wp={wp} selected={wallpaper?.id === wp.id} onSelect={handleWallpaper} />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-[11px] text-text-secondary">Static</p>
          <div className="grid grid-cols-2 gap-3">
            {staticWps.map(wp => (
              <WallpaperThumb key={wp.id} wp={wp} selected={wallpaper?.id === wp.id} onSelect={handleWallpaper} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Sound effects ── */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Sound Effects</h3>
        <div className="flex items-center justify-between p-4 rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            {soundOn
              ? <Volume2 size={18} className="text-accent" />
              : <VolumeX size={18} className="text-text-secondary" />
            }
            <div>
              <p className="text-sm font-medium text-text">{soundOn ? 'Sound On' : 'Sound Off'}</p>
              <p className="text-[11px] text-text-secondary mt-0.5">
                {soundOn ? 'Window open · close · notifications' : 'Silence is golden'}
              </p>
            </div>
          </div>
          <Toggle on={soundOn} onChange={toggleSound} />
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: About                                                     */
/* ------------------------------------------------------------------ */

function AboutSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text mb-0.5">devOS</h2>
        <p className="text-sm text-text-secondary">Version 2.1.0 · Sprint 4</p>
        <p className="text-xs text-text-secondary mt-0.5">Built by Devanshu Chicholikar</p>
      </div>

      <div className="space-y-1.5">
        <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Stack</h4>
        <div className="flex flex-wrap gap-1.5">
          {['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Zustand', 'PostHog'].map(t => (
            <span key={t} className="px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium border border-accent/20">{t}</span>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">What&apos;s in v2.1</h4>
        <ul className="space-y-1.5 text-xs text-text-secondary">
          {[
            'macOS-authentic dock with layout-affecting magnification',
            'MenuBar with mute toggle, theme switch, live clock',
            'Launchpad full-screen launcher + Stage Manager',
            'RPG Skill Tree with SVG Bezier node graph',
            'Finder-style File Explorer with color-coded icons',
            'Interactive Resume + PDF viewer',
            'Arcade: Snake, Minesweeper, 2048',
            'PostHog analytics. Fully transparent, real data.',
          ].map(item => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-accent mt-0.5 flex-shrink-0">·</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-4 border-t border-black/8 dark:border-white/8">
        <p className="text-xs text-text-secondary leading-relaxed">
          An interactive portfolio built as a desktop OS. Every app is a window into who I am, what I&apos;ve built, and how I think about software.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' as const } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.12, ease: 'easeIn' as const } },
};

export default function SettingsApp() {
  const [active, setActive] = useState<SectionId>('appearance');

  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Sidebar ── */}
      <div className="w-44 flex-shrink-0 app-sidebar flex flex-col overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-black/6 dark:border-white/6">
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Preferences</p>
        </div>
        <nav className="flex-1 p-2 pt-2 space-y-0.5">
          {SECTIONS.map(({ id, label, icon: Icon, color }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`app-nav-item ${isActive ? 'active' : ''}`}
                style={isActive ? { background: `${color}18`, color } : undefined}
              >
                <Icon size={14} style={{ color: isActive ? color : undefined, flexShrink: 0 }} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-6"
          >
            {active === 'appearance' && <AppearanceSection />}
            {active === 'about'      && <AboutSection />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
