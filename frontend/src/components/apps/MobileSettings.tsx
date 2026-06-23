'use client';

/**
 * MobileSettings - iOS-style Settings app in the Instrument monochrome
 * register, mounted as the mobile variant of SettingsApp. Keeps the iOS
 * grouped-list / push-navigation feel but drops the colored iOS chrome:
 * in Mono the icon tiles, switches, selection markers, and accent checks are
 * graphite; the original color is opt-in via the Fun palette (useIsMono()).
 *
 * Wires real controls (light/dark mode, palette, accent, wallpaper, sound
 * effects, usage analytics) to themeStore + the sound + analytics stores, so
 * tapping a setting here is functionally equivalent to the desktop Preferences
 * document.
 *
 * View tree:
 *   Root
 *   ├── About            (Profile row at top -> version, stack, build info)
 *   ├── Wi-Fi            (decorative)
 *   ├── Bluetooth        (decorative)
 *   ├── Notifications    (placeholder)
 *   ├── Sounds & Haptics (REAL - sound effects toggle)
 *   ├── Display & Bright (REAL - light/dark + palette + accent picker)
 *   ├── Wallpaper        (REAL - wallpaper picker, mobile-sized grid)
 *   ├── Privacy          (REAL - usage analytics opt-out)
 *   └── Accessibility    (placeholder)
 *
 * Switches are the monochrome MonoSwitch (no green "on"): the track fills
 * graphite when on, hairline-bordered when off. Mono-safe by construction.
 */

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Plane,
  Wifi,
  Bluetooth,
  Bell,
  Volume2,
  Sun,
  Image as ImageIcon,
  Accessibility,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme, ACCENT_COLORS } from '@/store/themeStore';
import { useIsMono } from '@/hooks/usePalette';
import { useAnalyticsStore } from '@/store/analyticsStore';
import type { Wallpaper } from '@/store/themeStore';
import { getWallpapersForTheme } from '@/data/wallpapers';
import {
  isSoundEnabled,
  setSoundEnabled,
  playSound,
} from '@/hooks/useSoundEffects';
import { spring, withReduced } from '@/lib/motion';
import MobilePushView, {
  useMobileNavigation,
  type PushViewEntry,
} from '@/components/mobile/ui/MobilePushView';
import MobileSection from '@/components/mobile/ui/MobileSection';
import MobileListRow from '@/components/mobile/ui/MobileListRow';
import MobileSegmented from '@/components/mobile/ui/MobileSegmented';
import IconTile from '@/components/mobile/ui/IconTile';

/* ────────────────────────────────────────────────────────────────────
 * Monochrome primitives - palette-gated chrome reused across the views.
 * ────────────────────────────────────────────────────────────────── */

/**
 * MonoSwitch - the restrained switch used everywhere in mobile Settings.
 *
 * No colored "on": filled graphite track (bg-text) when on, hairline border
 * when off; knob springs across. role="switch" + aria-checked so the existing
 * tests (and screen readers) read it exactly like the iOS switch it replaces.
 */
function MonoSwitch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange?: (on: boolean) => void;
  label?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange?.(!on)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-text/30
                  ${on ? 'bg-text' : 'bg-text/15'}`}
    >
      <motion.span
        aria-hidden
        layout
        transition={withReduced(spring.bubble, reduced)}
        className="absolute top-1/2 h-[27px] w-[27px] -translate-y-1/2 rounded-full bg-surface shadow-[var(--shadow-sm)] ring-[0.5px] ring-border/40"
        style={{ left: on ? 'calc(100% - 29px)' : '2px' }}
      />
    </button>
  );
}

/** Convenience: a MonoSwitch wrapped as a MobileListRow custom accessory. */
function switchAccessory(
  on: boolean,
  onChange: (on: boolean) => void,
  label: string,
) {
  return <MonoSwitch on={on} onChange={onChange} label={label} />;
}

/**
 * MonoIconTile - the leading squircle. In Mono it is graphite-on-bg with a
 * hairline; in Fun it keeps the original iOS color. The `color` prop stays the
 * source of truth for the Fun palette so nothing about that path changes.
 */
function MonoIconTile({
  color,
  icon,
}: {
  color: string;
  icon: React.ReactNode;
}) {
  const mono = useIsMono();
  if (mono) {
    return (
      <span
        data-testid="icon-tile"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-border bg-surface text-text dark:bg-white/[0.06]"
      >
        {icon}
      </span>
    );
  }
  return <IconTile color={color} icon={icon} />;
}

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
          icon={<MonoIconTile color="#ff9500" icon={<Plane size={16} strokeWidth={2.2} />} />}
          title="Airplane Mode"
          accessory={switchAccessory(airplane, setAirplane, 'Airplane Mode')}
        />
        <MobileListRow
          icon={<MonoIconTile color="#007AFF" icon={<Wifi size={16} strokeWidth={2.2} />} />}
          title="Wi-Fi"
          value={airplane ? 'Off' : 'Devanshu-5G'}
          onClick={() => nav.push(WIFI_VIEW)}
        />
        <MobileListRow
          icon={<MonoIconTile color="#5856D6" icon={<Bluetooth size={16} strokeWidth={2.2} />} />}
          title="Bluetooth"
          value={airplane ? 'Off' : 'On'}
          onClick={() => nav.push(BLUETOOTH_VIEW)}
        />
      </MobileSection>

      <MobileSection inset>
        <MobileListRow
          icon={<MonoIconTile color="#ff3b30" icon={<Bell size={16} strokeWidth={2.2} />} />}
          title="Notifications"
          onClick={() => nav.push(placeholderView('Notifications'))}
        />
        <MobileListRow
          icon={<MonoIconTile color="#ff2d55" icon={<Volume2 size={16} strokeWidth={2.2} />} />}
          title="Sounds & Haptics"
          onClick={() => nav.push(SOUNDS_VIEW)}
        />
      </MobileSection>

      <MobileSection inset>
        <MobileListRow
          icon={<MonoIconTile color="#007AFF" icon={<Sun size={16} strokeWidth={2.2} />} />}
          title="Display & Brightness"
          onClick={() => nav.push(DISPLAY_VIEW)}
        />
        <MobileListRow
          icon={<MonoIconTile color="#34c759" icon={<ImageIcon size={16} strokeWidth={2.2} />} />}
          title="Wallpaper"
          onClick={() => nav.push(WALLPAPER_VIEW)}
        />
        <MobileListRow
          icon={<MonoIconTile color="#007AFF" icon={<Accessibility size={16} strokeWidth={2.2} />} />}
          title="Accessibility"
          onClick={() => nav.push(placeholderView('Accessibility'))}
        />
      </MobileSection>

      <MobileSection
        inset
        footer="Settings outside Display & Brightness, Wallpaper, Sounds, and Privacy are demo-only - this is a portfolio surface, not your real phone."
      >
        <MobileListRow
          icon={<MonoIconTile color="#007AFF" icon={<ShieldCheck size={16} strokeWidth={2.2} />} />}
          title="Privacy & Security"
          onClick={() => nav.push(PRIVACY_VIEW)}
        />
      </MobileSection>
    </div>
  );
}

function ProfileRow({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="mx-3 flex items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-3 transition-opacity active:opacity-70 dark:bg-white/[0.04]"
    >
      <span
        className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-text font-display text-[24px] text-bg"
        aria-hidden
      >
        DC
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate font-display text-[19px] leading-tight text-text">
          Devanshu Chicholikar
        </span>
        <span className="mt-0.5 block truncate font-mono-meta text-text-secondary">
          Software Engineer · Portfolio Build
        </span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-text-secondary/60" />
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Real sub-views (have side effects)
 * ────────────────────────────────────────────────────────────────── */

function DisplayBrightnessView() {
  const { mode, setMode, palette, setPalette, accentColor, setAccent } =
    useTheme();

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
                  : 'Light mode. Welcome to the bright side.',
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
                  : 'Fun mode. Color, unleashed.',
              );
            }}
          />
        </div>
      </MobileSection>

      {/* Accent picker - inherently colorful, gated to the Fun palette. */}
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
                  className="relative h-9 w-9 rounded-full transition-transform active:scale-90"
                  style={{
                    background: color,
                    boxShadow: isActive
                      ? `0 0 0 3px var(--bg), 0 0 0 5px ${color}`
                      : 'var(--shadow-sm)',
                  }}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute inset-0 m-auto h-3 w-3 rounded-full bg-white/90"
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
        footer="True Tone and Auto-Lock are decorative - devOS doesn't drive your real display."
      >
        <MobileListRow
          title="True Tone"
          accessory={switchAccessory(true, () => {}, 'True Tone')}
        />
        <MobileListRow title="Auto-Lock" value="2 Minutes" />
        <MobileListRow
          title="Raise to Wake"
          accessory={switchAccessory(true, () => {}, 'Raise to Wake')}
        />
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
          <span
            className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border ${mono ? 'grayscale' : ''}`}
            style={
              wallpaper?.imageUrl
                ? { background: `url(${wallpaper.imageUrl}) center/cover` }
                : wallpaper?.thumbnail
                ? { background: wallpaper.thumbnail }
                : wallpaper?.gradientConfig
                ? {
                    background: `linear-gradient(${wallpaper.gradientConfig.angle}deg, ${wallpaper.gradientConfig.colors.join(',')})`,
                  }
                : { background: 'var(--surface)' }
            }
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium text-text">
              {wallpaper?.name ?? 'None'}
            </span>
            <span className="mt-0.5 block font-mono-meta text-text-secondary">
              {wallpaper?.type === 'animated' ? 'Live wallpaper' : 'Static wallpaper'}
            </span>
          </span>
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
            className={`relative aspect-[3/4] overflow-hidden rounded-2xl border transition-transform active:scale-[0.97] ${
              selected ? 'border-text' : 'border-border'
            } ${mono ? 'grayscale' : ''}`}
            style={{ background: bg }}
          >
            {wp.type === 'animated' && (
              <span className="absolute left-1.5 top-1.5 border border-text/70 bg-bg/70 px-1.5 py-0.5 font-mono-meta text-text backdrop-blur">
                Live
              </span>
            )}
            {selected && (
              <span
                aria-hidden
                className="absolute bottom-2 right-2 h-3.5 w-3.5 bg-text shadow-sm ring-1 ring-bg"
              />
            )}
            <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2.5 py-1.5 font-mono-meta text-white">
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
          accessory={switchAccessory(soundOn, toggle, 'UI Sound Effects')}
        />
      </MobileSection>

      <MobileSection
        inset
        header="Ringtone (demo)"
        footer="Decorative - devOS doesn't actually ring."
      >
        <MobileListRow title="Ringtone" value="Reflection" />
        <MobileListRow title="Text Tone" value="Note" />
      </MobileSection>
    </div>
  );
}

function PrivacyView() {
  const isOptedOut = useAnalyticsStore((s) => s.isOptedOut);
  const setOptOut = useAnalyticsStore((s) => s.setOptOut);
  const analyticsOn = !isOptedOut;

  const toggle = (next: boolean) => {
    setOptOut(!next);
    toast.success(
      next
        ? 'Analytics on. Anonymous usage only.'
        : 'Analytics off. Nothing leaves this tab.',
    );
  };

  return (
    <div className="py-4 flex flex-col gap-6 pb-12">
      <MobileSection
        inset
        header="Usage Analytics"
        footer="Anonymous, session-only. No accounts, no personal data, no cross-site tracking. Turn it off to keep everything in this tab."
      >
        <MobileListRow
          title="Usage Analytics"
          accessory={switchAccessory(analyticsOn, toggle, 'Usage Analytics')}
        />
      </MobileSection>

      <MobileSection
        inset
        header="Tracking (demo)"
        footer="Decorative - this portfolio never tracks you across sites."
      >
        <MobileListRow
          title="Allow Apps to Request to Track"
          accessory={switchAccessory(false, () => {}, 'Allow Apps to Request to Track')}
        />
      </MobileSection>
    </div>
  );
}

function AboutView() {
  return (
    <div className="py-4 flex flex-col gap-6 pb-12">
      <div className="px-5 pt-2">
        <h2 className="font-display text-[28px] text-text">devOS</h2>
        <p className="mt-0.5 font-mono-meta text-text-secondary">
          Version 2.2.0 · Sprint 4
        </p>
        <p className="mt-1 font-mono-meta text-text-secondary">
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
        <div className="px-4 py-3 flex flex-wrap items-baseline gap-x-1 gap-y-1" data-testid="stack-chips">
          {STACK.map((tech, i) => (
            <React.Fragment key={tech}>
              {i > 0 && (
                <span aria-hidden className="font-mono-meta opacity-40">
                  &middot;
                </span>
              )}
              <span className="font-mono text-[13px] leading-snug text-text">
                {tech}
              </span>
            </React.Fragment>
          ))}
        </div>
      </MobileSection>

      <MobileSection
        inset
        header="What's in v2.2"
        footer="An interactive portfolio built as a desktop OS, and now a phone. Every app is a window into who I am, what I've built, and how I think about software."
      >
        <ul className="px-4 py-3 space-y-2 text-[13px] text-text-secondary">
          {V22_HIGHLIGHTS.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span aria-hidden className="mt-[0.6em] h-px w-2.5 shrink-0 bg-text/40" />
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
  'iOS-style phone shell: squircle home screen, paged dock, lock screen',
  'iOS-style push navigation with edge-swipe back across mobile apps',
  'Visible Done button in open apps + system back closes the app',
  'Live GitHub Activity: contribution heatmap, events, active repos',
  'Fluid type so heroes scale smoothly from 360px Android to desktop',
  'File Explorer star counts live from /api/github/repos, no stale snapshots',
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
        <MobileListRow
          title="Wi-Fi"
          accessory={switchAccessory(on, setOn, 'Wi-Fi')}
        />
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
            footer="Tap a network to join. These are decorative - they don't actually do anything."
          >
            {['Devanshu-Guest', 'Starbucks WiFi', 'Library Public', 'CityNet 2.4'].map(
              (ssid) => (
                <MobileListRow
                  key={ssid}
                  title={ssid}
                  icon={<Wifi size={16} strokeWidth={2.2} className="text-text-secondary/70" />}
                  onClick={() => nav.push(placeholderView(ssid))}
                />
              ),
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
        <MobileListRow
          title="Bluetooth"
          accessory={switchAccessory(on, setOn, 'Bluetooth')}
        />
      </MobileSection>

      {on && (
        <MobileSection
          inset
          header="My Devices"
          footer="Decorative - devOS doesn't pair with real Bluetooth devices."
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
      <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface text-text-secondary dark:bg-white/[0.06]">
        <Sparkles size={20} />
      </span>
      <h3 className="text-[17px] font-semibold text-text">{title}</h3>
      <p className="max-w-[260px] text-[14px] text-text-secondary">
        This screen isn&apos;t part of the portfolio demo - only Display &amp;
        Brightness, Wallpaper, Sounds &amp; Haptics, Privacy, and About do real
        work.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * View registry - defined at the bottom so all view bodies above are in
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

const PRIVACY_VIEW: PushViewEntry = {
  id: 'privacy',
  title: 'Privacy & Security',
  element: <PrivacyView />,
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
