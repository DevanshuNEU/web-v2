'use client';

/**
 * MobileSettings — iOS-style Settings app, mounted as the mobile variant of
 * SettingsApp. Wires real controls (light/dark mode, accent color, wallpaper,
 * sound effects) to themeStore + the existing sound preference helpers, so
 * tapping a setting here is functionally equivalent to using the desktop
 * Preferences sidebar.
 *
 * View tree:
 *   Root
 *   ├── About            (Profile row at top → version, stack, build info)
 *   ├── Wi-Fi            (decorative — toy networks list)
 *   ├── Bluetooth        (decorative)
 *   ├── Notifications    (placeholder)
 *   ├── Sounds & Haptics (REAL — sound effects toggle)
 *   ├── Display & Bright (REAL — light/dark + accent picker)
 *   ├── Wallpaper        (REAL — wallpaper picker, mobile-sized grid)
 *   └── Accessibility    (placeholder)
 *
 * "Real" sub-views are the only ones with side effects; the rest are pure
 * portfolio dressing so the app feels populated without lying about
 * functionality.
 */

import { useEffect, useState } from 'react';
import {
  Plane,
  Wifi,
  Bluetooth,
  Bell,
  Volume2,
  Moon,
  Sun,
  Palette,
  Image as ImageIcon,
  Accessibility,
  ShieldCheck,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme, ACCENT_COLORS } from '@/store/themeStore';
import { useIsMono } from '@/hooks/usePalette';
import type { Wallpaper } from '@/store/themeStore';
import { getWallpapersForTheme } from '@/data/wallpapers';
import {
  isSoundEnabled,
  setSoundEnabled,
  playSound,
} from '@/hooks/useSoundEffects';
import MobilePushView, {
  useMobileNavigation,
  type PushViewEntry,
} from '@/components/mobile/ui/MobilePushView';
import MobileSection from '@/components/mobile/ui/MobileSection';
import MobileListRow from '@/components/mobile/ui/MobileListRow';
import MobileSegmented from '@/components/mobile/ui/MobileSegmented';
import IconTile from '@/components/mobile/ui/IconTile';

/* ────────────────────────────────────────────────────────────────────
 * Public entry
 * ────────────────────────────────────────────────────────────────── */

export default function MobileSettings() {
  return (
    <div data-testid="mobile-settings" className="h-full">
      <MobilePushView rootView={SETTINGS_ROOT} className="bg-bg" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Root view
 * ────────────────────────────────────────────────────────────────── */

function SettingsRoot() {
  const nav = useMobileNavigation();
  const [airplane, setAirplane] = useState(false);

  return (
    <div className="py-4 flex flex-col gap-6 pb-12">
      <ProfileRow onOpen={() => nav.push(ABOUT_VIEW)} />

      <MobileSection inset>
        <MobileListRow
          icon={<IconTile color="#ff9500" icon={<Plane size={16} strokeWidth={2.4} />} />}
          title="Airplane Mode"
          accessory="switch"
          switchOn={airplane}
          onSwitchToggle={setAirplane}
        />
        <MobileListRow
          icon={<IconTile color="#007AFF" icon={<Wifi size={16} strokeWidth={2.4} />} />}
          title="Wi-Fi"
          value={airplane ? 'Off' : 'Devanshu-5G'}
          onClick={() => nav.push(WIFI_VIEW)}
        />
        <MobileListRow
          icon={<IconTile color="#5856D6" icon={<Bluetooth size={16} strokeWidth={2.4} />} />}
          title="Bluetooth"
          value={airplane ? 'Off' : 'On'}
          onClick={() => nav.push(BLUETOOTH_VIEW)}
        />
      </MobileSection>

      <MobileSection inset>
        <MobileListRow
          icon={<IconTile color="#ff3b30" icon={<Bell size={16} strokeWidth={2.4} />} />}
          title="Notifications"
          onClick={() => nav.push(placeholderView('Notifications'))}
        />
        <MobileListRow
          icon={<IconTile color="#ff2d55" icon={<Volume2 size={16} strokeWidth={2.4} />} />}
          title="Sounds & Haptics"
          onClick={() => nav.push(SOUNDS_VIEW)}
        />
      </MobileSection>

      <MobileSection inset>
        <MobileListRow
          icon={<IconTile color="#007AFF" icon={<Sun size={16} strokeWidth={2.4} />} />}
          title="Display & Brightness"
          onClick={() => nav.push(DISPLAY_VIEW)}
        />
        <MobileListRow
          icon={<IconTile color="#34c759" icon={<ImageIcon size={16} strokeWidth={2.4} />} />}
          title="Wallpaper"
          onClick={() => nav.push(WALLPAPER_VIEW)}
        />
        <MobileListRow
          icon={<IconTile color="#007AFF" icon={<Accessibility size={16} strokeWidth={2.4} />} />}
          title="Accessibility"
          onClick={() => nav.push(placeholderView('Accessibility'))}
        />
      </MobileSection>

      <MobileSection
        inset
        footer="Settings outside Display & Brightness, Wallpaper, and Sounds are demo-only — this is a portfolio surface, not your real phone."
      >
        <MobileListRow
          icon={<IconTile color="#007AFF" icon={<ShieldCheck size={16} strokeWidth={2.4} />} />}
          title="Privacy & Security"
          onClick={() => nav.push(placeholderView('Privacy & Security'))}
        />
      </MobileSection>
    </div>
  );
}

function ProfileRow({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="mx-3 flex items-center gap-4 px-4 py-3 rounded-2xl bg-surface dark:bg-white/[0.04] active:opacity-70 transition-opacity"
    >
      <div
        className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-white text-[24px] font-semibold shrink-0"
        style={{
          background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
          boxShadow: '0 4px 10px -2px rgba(0,0,0,0.2)',
        }}
        aria-hidden
      >
        DC
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text-[17px] font-semibold text-text truncate">
          Devanshu Chicholikar
        </div>
        <div className="text-[13px] text-text-secondary mt-0.5 truncate">
          Software Engineer · Portfolio Build
        </div>
      </div>
      <ChevronRight size={20} className="text-text-secondary/60 shrink-0" />
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Real sub-views (have side effects)
 * ────────────────────────────────────────────────────────────────── */

function DisplayBrightnessView() {
  const { mode, setMode, palette, setPalette, accentColor, setAccent } = useTheme();

  return (
    <div className="py-4 flex flex-col gap-6">
      <MobileSection inset header="Appearance">
        <div className="px-4 py-3">
          <MobileSegmented<'light' | 'dark'>
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={mode}
            onChange={(next) => {
              setMode(next);
              toast.success(
                next === 'dark'
                  ? 'Dark mode. Very mysterious.'
                  : 'Light mode. Welcome to the bright side.'
              );
            }}
          />
        </div>
      </MobileSection>

      <MobileSection
        inset
        header="Palette"
        footer="Mono is premium black & white, the default. Fun restores the full color theme and accent picker."
      >
        <div className="px-4 py-3">
          <MobileSegmented<'mono' | 'color'>
            options={[
              { value: 'mono', label: 'Mono' },
              { value: 'color', label: 'Fun' },
            ]}
            value={palette}
            onChange={(next) => {
              setPalette(next);
              toast.success(
                next === 'mono'
                  ? 'Mono. Premium black and white.'
                  : 'Fun mode. Color, unleashed.'
              );
            }}
          />
        </div>
      </MobileSection>

      {palette === 'color' && (
      <MobileSection
        inset
        header="Accent Color"
        footer="Used for buttons, switches, and highlights across devOS."
      >
        <div className="px-4 py-4 flex gap-3 flex-wrap" data-testid="accent-swatches">
          {Object.entries(ACCENT_COLORS).map(([name, color]) => {
            const isActive = accentColor === color;
            return (
              <button
                key={name}
                onClick={() => {
                  setAccent(color);
                  toast.success('New accent. Same great developer.');
                }}
                aria-label={`Set accent ${name}`}
                aria-pressed={isActive}
                className="relative w-9 h-9 rounded-full transition-transform active:scale-90"
                style={{
                  background: color,
                  boxShadow: isActive
                    ? `0 0 0 3px var(--bg, #fff), 0 0 0 5px ${color}`
                    : '0 1px 4px rgba(0,0,0,0.18)',
                }}
              >
                {isActive && (
                  <Check
                    size={16}
                    className="absolute inset-0 m-auto text-white"
                    strokeWidth={2.6}
                  />
                )}
              </button>
            );
          })}
        </div>
      </MobileSection>
      )}

      <MobileSection
        inset
        footer="True Tone and Auto-Lock are decorative — devOS doesn't drive your real display."
      >
        <MobileListRow title="True Tone" accessory="switch" switchOn={true} onSwitchToggle={() => {}} />
        <MobileListRow title="Auto-Lock" value="2 Minutes" />
        <MobileListRow title="Raise to Wake" accessory="switch" switchOn={true} onSwitchToggle={() => {}} />
      </MobileSection>
    </div>
  );
}

function WallpaperView() {
  const { mode, wallpaper, setWallpaper } = useTheme();
  const mono = useIsMono();
  const available = getWallpapersForTheme(mode);
  const animated = available.filter((w) => w.type === 'animated');
  const staticWps = available.filter((w) => w.type === 'static');

  const choose = (wp: Wallpaper) => {
    setWallpaper(wp);
    toast.success(`Wallpaper: ${wp.name}`);
  };

  return (
    <div className="py-4 flex flex-col gap-6 pb-12">
      <MobileSection
        inset
        header="Current"
        footer="Live wallpapers animate behind the home screen and lock screen."
      >
        <div className="px-4 py-3 flex items-center gap-3">
          <div
            className={`w-16 h-16 rounded-xl overflow-hidden border border-text-secondary/15 shrink-0 ${mono ? 'grayscale' : ''}`}
            style={
              wallpaper?.imageUrl
                ? { background: `url(${wallpaper.imageUrl}) center/cover` }
                : wallpaper?.thumbnail
                ? { background: wallpaper.thumbnail }
                : wallpaper?.gradientConfig
                ? {
                    background: `linear-gradient(${wallpaper.gradientConfig.angle}deg, ${wallpaper.gradientConfig.colors.join(',')})`,
                  }
                : { background: 'var(--surface, #eee)' }
            }
            aria-hidden
          />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-medium text-text truncate">
              {wallpaper?.name ?? 'None'}
            </div>
            <div className="text-[12px] text-text-secondary mt-0.5">
              {wallpaper?.type === 'animated' ? 'Live wallpaper' : 'Static wallpaper'}
            </div>
          </div>
        </div>
      </MobileSection>

      {animated.length > 0 && (
        <MobileSection inset header="Live Wallpapers">
          <WallpaperGrid
            wps={animated}
            selectedId={wallpaper?.id}
            onSelect={choose}
            variant="live"
          />
        </MobileSection>
      )}

      <MobileSection inset header="Static Wallpapers">
        <WallpaperGrid
          wps={staticWps}
          selectedId={wallpaper?.id}
          onSelect={choose}
          variant="static"
        />
      </MobileSection>
    </div>
  );
}

function WallpaperGrid({
  wps,
  selectedId,
  onSelect,
  variant,
}: {
  wps: Wallpaper[];
  selectedId?: string;
  onSelect: (wp: Wallpaper) => void;
  /** Discriminator for tests (and screen readers). */
  variant: 'live' | 'static';
}) {
  const mono = useIsMono();
  return (
    <div
      className="grid grid-cols-2 gap-3 px-3 py-3"
      data-testid={`wallpaper-grid-${variant}`}
    >
      {wps.map((wp) => {
        const selected = selectedId === wp.id;
        const bg = wp.imageUrl
          ? `url(${wp.imageUrl}) center/cover`
          : wp.thumbnail
          ? wp.thumbnail
          : wp.gradientConfig
          ? `linear-gradient(${wp.gradientConfig.angle}deg, ${wp.gradientConfig.colors.join(',')})`
          : 'var(--surface)';
        return (
          <button
            key={wp.id}
            onClick={() => onSelect(wp)}
            aria-label={`Use ${wp.name} wallpaper`}
            aria-pressed={selected}
            className={`relative aspect-[3/4] rounded-2xl overflow-hidden transition-transform active:scale-[0.97] ${
              selected ? 'ring-2 ring-accent' : 'ring-1 ring-text-secondary/15'
            } ${mono ? 'grayscale' : ''}`}
            style={{ background: bg }}
          >
            {wp.type === 'animated' && (
              <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/55 backdrop-blur text-white text-[9px] font-semibold tracking-wide">
                <Sparkles size={8} />
                LIVE
              </span>
            )}
            {selected && (
              <span className="absolute inset-0 bg-accent/20 flex items-end justify-end p-2 pointer-events-none">
                <span className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                  <Check size={14} className="text-white" strokeWidth={2.6} />
                </span>
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[11px] font-medium px-2.5 py-1.5 truncate">
              {wp.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SoundsView() {
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  const toggle = (next: boolean) => {
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) {
      setTimeout(() => playSound('notify'), 100);
      toast.success('Sound on. ding!');
    } else {
      toast.success('Sound off. Silence is golden.');
    }
  };

  return (
    <div className="py-4 flex flex-col gap-6">
      <MobileSection
        inset
        header="Sound Effects"
        footer="When enabled, devOS plays a gentle chime on window open, close, and notifications."
      >
        <MobileListRow
          title="UI Sound Effects"
          accessory="switch"
          switchOn={soundOn}
          onSwitchToggle={toggle}
        />
      </MobileSection>

      <MobileSection
        inset
        header="Ringtone (demo)"
        footer="Decorative — devOS doesn't actually ring."
      >
        <MobileListRow title="Ringtone" value="Reflection" />
        <MobileListRow title="Text Tone" value="Note" />
      </MobileSection>
    </div>
  );
}

function AboutView() {
  return (
    <div className="py-4 flex flex-col gap-6 pb-12">
      <div className="px-5 pt-2">
        <h2 className="font-display text-[28px] text-text">devOS</h2>
        <p className="text-[15px] text-text-secondary mt-0.5">
          Version 2.2.0 · Sprint 4
        </p>
        <p className="text-[12px] text-text-secondary mt-1">
          Built by Devanshu Chicholikar
        </p>
      </div>

      <MobileSection inset header="Device">
        <MobileListRow title="Name" value="Devanshu's iPhone" />
        <MobileListRow title="Software Version" value="2.2.0" />
        <MobileListRow title="Model Name" value="devOS Phone" />
        <MobileListRow title="Build" value="Sprint 4" />
      </MobileSection>

      <MobileSection inset header="Stack">
        <div className="px-4 py-3 flex flex-wrap gap-1.5" data-testid="stack-chips">
          {STACK.map((tech) => (
            <span
              key={tech}
              className="px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-[12px] font-medium border border-accent/20"
            >
              {tech}
            </span>
          ))}
        </div>
      </MobileSection>

      <MobileSection inset header="What's in v2.2" footer="An interactive portfolio built as a desktop OS — and now a phone. Every app is a window into who I am, what I've built, and how I think about software.">
        <ul className="px-4 py-3 space-y-2 text-[13px] text-text-secondary">
          {V22_HIGHLIGHTS.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-accent mt-0.5 shrink-0">·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </MobileSection>
    </div>
  );
}

const STACK = [
  'Next.js 15',
  'React 19',
  'TypeScript',
  'Tailwind CSS',
  'Framer Motion',
  'Zustand',
  'PostHog',
];

const V22_HIGHLIGHTS = [
  'iOS-style phone shell — squircle home screen, paged dock, lock screen',
  'iOS-style push navigation with edge-swipe back across mobile apps',
  'Visible Done button in open apps + system back closes the app',
  'Live GitHub Activity — contribution heatmap, events, active repos',
  'Fluid type so heroes scale smoothly from 360px Android to desktop',
  'File Explorer star counts live from /api/github/repos — no stale snapshots',
  'Native mobile variants for Projects, Resume, Contact, Terminal, Games',
  'Safe-area handling across notches and home indicators',
];

/* ────────────────────────────────────────────────────────────────────
 * Decorative sub-views
 * ────────────────────────────────────────────────────────────────── */

function WiFiView() {
  const nav = useMobileNavigation();
  const [on, setOn] = useState(true);
  return (
    <div className="py-4 flex flex-col gap-6">
      <MobileSection inset>
        <MobileListRow title="Wi-Fi" accessory="switch" switchOn={on} onSwitchToggle={setOn} />
      </MobileSection>

      {on && (
        <>
          <MobileSection inset header="My Networks">
            <MobileListRow
              title="Devanshu-5G"
              accessory="check"
              onClick={() => nav.push(placeholderView('Devanshu-5G'))}
            />
          </MobileSection>

          <MobileSection
            inset
            header="Other Networks"
            footer="Tap a network to join. These are decorative — they don't actually do anything."
          >
            {['Devanshu-Guest', 'Starbucks WiFi', 'Library Public', 'CityNet 2.4'].map(
              (ssid) => (
                <MobileListRow
                  key={ssid}
                  title={ssid}
                  icon={<Wifi size={16} strokeWidth={2.4} className="text-text-secondary/70" />}
                  onClick={() => nav.push(placeholderView(ssid))}
                />
              )
            )}
          </MobileSection>

          <MobileSection inset>
            <MobileListRow
              title="Ask to Join Networks"
              value="Notify"
              onClick={() => nav.push(placeholderView('Ask to Join Networks'))}
            />
          </MobileSection>
        </>
      )}
    </div>
  );
}

function BluetoothView() {
  const [on, setOn] = useState(true);
  return (
    <div className="py-4 flex flex-col gap-6">
      <MobileSection inset>
        <MobileListRow title="Bluetooth" accessory="switch" switchOn={on} onSwitchToggle={setOn} />
      </MobileSection>

      {on && (
        <MobileSection
          inset
          header="My Devices"
          footer="Decorative — devOS doesn't pair with real Bluetooth devices."
        >
          <MobileListRow title="AirPods Pro" value="Connected" />
          <MobileListRow title="MacBook Pro" value="Not Connected" />
          <MobileListRow title="Magic Trackpad" value="Not Connected" />
        </MobileSection>
      )}
    </div>
  );
}

function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 text-center gap-2 pb-20">
      <div className="w-12 h-12 rounded-2xl bg-text-secondary/10 flex items-center justify-center mb-2">
        <Sparkles size={20} className="text-text-secondary/70" />
      </div>
      <h3 className="text-[17px] font-semibold text-text">{title}</h3>
      <p className="text-[14px] text-text-secondary max-w-[260px]">
        This screen isn't part of the portfolio demo — only Display & Brightness,
        Wallpaper, Sounds & Haptics, and About do real work.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * View registry — defined at the bottom so all view bodies above are in
 * scope (function declarations are hoisted, so JSX references are safe).
 * ────────────────────────────────────────────────────────────────── */

const SETTINGS_ROOT: PushViewEntry = {
  id: 'settings-root',
  title: 'Settings',
  element: <SettingsRoot />,
};

const WIFI_VIEW: PushViewEntry = {
  id: 'wifi',
  title: 'Wi-Fi',
  element: <WiFiView />,
};

const BLUETOOTH_VIEW: PushViewEntry = {
  id: 'bluetooth',
  title: 'Bluetooth',
  element: <BluetoothView />,
};

const SOUNDS_VIEW: PushViewEntry = {
  id: 'sounds',
  title: 'Sounds & Haptics',
  element: <SoundsView />,
};

const DISPLAY_VIEW: PushViewEntry = {
  id: 'display',
  title: 'Display & Brightness',
  element: <DisplayBrightnessView />,
};

const WALLPAPER_VIEW: PushViewEntry = {
  id: 'wallpaper',
  title: 'Wallpaper',
  element: <WallpaperView />,
};

const ABOUT_VIEW: PushViewEntry = {
  id: 'about',
  title: 'About',
  element: <AboutView />,
};

function placeholderView(title: string): PushViewEntry {
  return {
    id: `placeholder-${title.toLowerCase().replace(/\s+/g, '-')}`,
    title,
    element: <PlaceholderView title={title} />,
  };
}
