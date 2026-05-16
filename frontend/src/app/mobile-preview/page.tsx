'use client';

/**
 * /mobile-preview — internal dev page showing every mobile UI primitive
 * inside a phone-shaped frame. Not linked from anywhere in the product;
 * exists purely to review primitives in isolation as they're built.
 *
 * Open at http://localhost:3000/mobile-preview
 */

import { useState } from 'react';
import {
  Plus,
  MoreHorizontal,
  Sun,
  Moon,
  Bell,
  Bluetooth,
  Wifi,
  Lock,
  Palette,
  Info,
  HardDrive,
  Globe,
  Mail,
  Github,
  Linkedin,
  Music,
  Camera,
  MessageSquare,
  Map,
  Settings as SettingsIcon,
} from 'lucide-react';
import MobileNavBar from '@/components/mobile/ui/MobileNavBar';
import MobileSwitch from '@/components/mobile/ui/MobileSwitch';
import MobileListRow from '@/components/mobile/ui/MobileListRow';
import MobileSection from '@/components/mobile/ui/MobileSection';
import MobileSegmented from '@/components/mobile/ui/MobileSegmented';
import MobileBottomSheet from '@/components/mobile/ui/MobileBottomSheet';
import MobilePushView, {
  useMobileNavigation,
  type PushViewEntry,
} from '@/components/mobile/ui/MobilePushView';
import MobileAppIcon from '@/components/mobile/ui/MobileAppIcon';
import MobileActionRow from '@/components/mobile/ui/MobileActionRow';
import IconTile from '@/components/mobile/ui/IconTile';
import MobileSettings from '@/components/apps/MobileSettings';
import GitHubActivityApp from '@/components/apps/GitHubActivityApp';

export default function MobilePreviewPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [airplane, setAirplane] = useState(false);
  const [wifi, setWifi] = useState(true);
  const [bluetooth, setBluetooth] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [projectsTab, setProjectsTab] = useState<'story' | 'tech' | 'impact'>('story');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [photosTab, setPhotosTab] = useState<'years' | 'months' | 'days' | 'all'>('months');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [skillSheetOpen, setSkillSheetOpen] = useState(false);
  const [stickySheetOpen, setStickySheetOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-200 dark:bg-neutral-900 flex flex-col items-center gap-10 py-10 px-4">
      <header className="text-center">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Mobile UI Primitives
        </h1>
        <p className="text-sm text-neutral-500 mt-1">Dev preview · iOS-native primitives in isolation</p>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="mt-4 px-4 py-2 rounded-lg bg-neutral-800 dark:bg-neutral-700 text-white text-sm"
        >
          Toggle preview theme: {theme}
        </button>
      </header>

      {/* MobileNavBar */}
      <Group title="MobileNavBar">
        <PhoneFrame theme={theme}>
          <MobileNavBar title="Settings" />
          <Divider />
          <MobileNavBar title="Detail" onBack={() => {}} />
          <Divider />
          <MobileNavBar title="Detail" onBack={() => {}} backLabel="Projects" />
          <Divider />
          <MobileNavBar
            title="Projects"
            rightAction={<NavIconButton icon={<Plus size={22} />} label="Add" />}
          />
          <Divider />
          <MobileNavBar
            title="A really long title that has to truncate"
            onBack={() => {}}
            backLabel="Settings"
            rightAction={<NavIconButton icon={<MoreHorizontal size={22} />} label="More" />}
          />
        </PhoneFrame>
      </Group>

      {/* MobileSwitch */}
      <Group title="MobileSwitch">
        <PhoneFrame theme={theme}>
          <div className="flex items-center justify-around p-6">
            <MobileSwitch on={false} onChange={() => {}} label="off" />
            <MobileSwitch on onChange={() => {}} label="on" />
            <MobileSwitch on={true} disabled label="disabled on" />
            <MobileSwitch on={false} disabled label="disabled off" />
          </div>
        </PhoneFrame>
      </Group>

      {/* MobileListRow */}
      <Group title="MobileListRow — every accessory">
        <PhoneFrame theme={theme}>
          <div className="py-4">
            <MobileSection inset>
              <MobileListRow
                icon={<IconTile color="#007AFF" icon={<Wifi size={16} strokeWidth={2.4} />} />}
                title="Wi-Fi"
                value="Devanshu's iPhone"
                onClick={() => {}}
              />
              <MobileListRow
                icon={<IconTile color="#5856D6" icon={<Bluetooth size={16} strokeWidth={2.4} />} />}
                title="Bluetooth"
                value="On"
                onClick={() => {}}
              />
              <MobileListRow
                icon={<IconTile color="#FF9500" icon={<Bell size={16} strokeWidth={2.4} />} />}
                title="Notifications"
                subtitle="Banners, Sounds, Badges"
                onClick={() => {}}
              />
              <MobileListRow
                icon={<IconTile color="#FF3B30" icon={<Lock size={16} strokeWidth={2.4} />} />}
                title="Privacy & Security"
                accessory="check"
              />
              <MobileListRow
                icon={<IconTile color="#34C759" icon={<Globe size={16} strokeWidth={2.4} />} />}
                title="VPN"
                accessory="switch"
                switchOn={false}
                onSwitchToggle={() => {}}
              />
              <MobileListRow title="Sign Out" destructive onClick={() => {}} />
              <MobileListRow title="Disabled action" onClick={() => {}} disabled />
            </MobileSection>
          </div>
        </PhoneFrame>
      </Group>

      {/* MobileSegmented */}
      <Group title="MobileSegmented">
        <PhoneFrame theme={theme}>
          <div className="flex flex-col gap-6 px-4 py-6">
            {/* Centered, hugging content — Projects detail tabs */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-text-secondary">
                Projects detail
              </span>
              <MobileSegmented
                options={[
                  { value: 'story', label: 'Story' },
                  { value: 'tech', label: 'Tech' },
                  { value: 'impact', label: 'Impact' },
                ]}
                value={projectsTab}
                onChange={setProjectsTab}
                label="Project section"
              />
              <span className="text-xs text-text-secondary mt-1">
                Selected: <span className="text-text">{projectsTab}</span>
              </span>
            </div>

            {/* Full-width — toolbar style */}
            <div className="flex flex-col items-stretch gap-2">
              <span className="text-[11px] uppercase tracking-wider text-text-secondary">
                Photos toolbar (full-width)
              </span>
              <MobileSegmented
                options={[
                  { value: 'years', label: 'Years' },
                  { value: 'months', label: 'Months' },
                  { value: 'days', label: 'Days' },
                  { value: 'all', label: 'All Photos' },
                ]}
                value={photosTab}
                onChange={setPhotosTab}
                fullWidth
                label="Photos timeline"
              />
            </div>

            {/* Icon-only — view mode toggle */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-text-secondary">
                Icon-only (Finder view mode)
              </span>
              <MobileSegmented
                options={[
                  { value: 'grid', label: <span aria-hidden>▦</span>, ariaLabel: 'Grid view' },
                  { value: 'list', label: <span aria-hidden>≡</span>, ariaLabel: 'List view' },
                ]}
                value={viewMode}
                onChange={setViewMode}
                label="View mode"
              />
            </div>
          </div>
        </PhoneFrame>
      </Group>

      {/* MobileSection */}
      <Group title="MobileSection — grouped settings list">
        <PhoneFrame theme={theme}>
          <div className="pt-4 pb-6 flex flex-col gap-6">
            <MobileSection inset>
              <MobileListRow
                icon={<IconTile color="#FF9500" icon={<Sun size={16} strokeWidth={2.4} />} />}
                title="Airplane Mode"
                accessory="switch"
                switchOn={airplane}
                onSwitchToggle={setAirplane}
              />
              <MobileListRow
                icon={<IconTile color="#007AFF" icon={<Wifi size={16} strokeWidth={2.4} />} />}
                title="Wi-Fi"
                value={wifi ? 'Connected' : 'Off'}
                onClick={() => setWifi(!wifi)}
              />
              <MobileListRow
                icon={<IconTile color="#5856D6" icon={<Bluetooth size={16} strokeWidth={2.4} />} />}
                title="Bluetooth"
                value={bluetooth ? 'On' : 'Off'}
                accessory="switch"
                switchOn={bluetooth}
                onSwitchToggle={setBluetooth}
              />
            </MobileSection>

            <MobileSection header="Appearance" inset>
              <MobileListRow
                icon={<IconTile color="#0a0a0a" icon={<Moon size={16} strokeWidth={2.4} />} />}
                title="Dark Mode"
                accessory="switch"
                switchOn={darkMode}
                onSwitchToggle={setDarkMode}
              />
              <MobileListRow
                icon={<IconTile color="#AF52DE" icon={<Palette size={16} strokeWidth={2.4} />} />}
                title="Accent Color"
                value="Blue"
                onClick={() => {}}
              />
            </MobileSection>

            <MobileSection
              header="About"
              footer="devOS is an interactive portfolio by Devanshu Chicholikar. Built with Next.js."
              inset
            >
              <MobileListRow
                icon={<IconTile color="#8e8e93" icon={<Info size={16} strokeWidth={2.4} />} />}
                title="Version"
                value="2.0"
              />
              <MobileListRow
                icon={<IconTile color="#34C759" icon={<HardDrive size={16} strokeWidth={2.4} />} />}
                title="Storage"
                value="1.2 GB of 64 GB"
                onClick={() => {}}
              />
            </MobileSection>

            <MobileSection inset={false}>
              <MobileListRow title="Reset All Settings" destructive onClick={() => {}} />
            </MobileSection>
          </div>
        </PhoneFrame>
      </Group>

      {/* MobileBottomSheet */}
      <Group title="MobileBottomSheet — drag the handle down to dismiss">
        <PhoneFrame theme={theme}>
          {/* Phone-frame interior. Sheets render to the document body via
              Portal, so they'll cover the whole page when opened. */}
          <div className="flex flex-col gap-3 p-5 min-h-[420px]">
            <button
              onClick={() => setSheetOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-accent text-white text-[15px] font-medium active:opacity-80"
            >
              Open share sheet
            </button>
            <button
              onClick={() => setSkillSheetOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-surface text-text text-[15px] font-medium active:opacity-80 border border-black/[0.08] dark:border-white/[0.08]"
            >
              Open skill detail (long content scrolls)
            </button>
            <button
              onClick={() => setStickySheetOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-[15px] font-medium active:opacity-80"
            >
              Open non-dismissible sheet (must tap Done)
            </button>
            <p className="text-[12px] text-text-secondary mt-2 leading-relaxed">
              Try: tap backdrop · drag handle down · press Escape · scroll long
              content (drag only initiates from the handle, content scrolls).
            </p>
          </div>

          <MobileBottomSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            title="Share"
          >
            <div className="px-5 py-4 flex flex-col gap-3">
              {['Copy Link', 'Send to Notes', 'Open in Safari', 'AirDrop'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSheetOpen(false)}
                  className="text-left px-3 py-3 rounded-lg text-[15px] active:bg-black/5 dark:active:bg-white/5"
                >
                  {opt}
                </button>
              ))}
            </div>
          </MobileBottomSheet>

          <MobileBottomSheet
            open={skillSheetOpen}
            onClose={() => setSkillSheetOpen(false)}
            title="TypeScript"
          >
            <div className="px-5 py-4 flex flex-col gap-3 text-[14px] leading-relaxed text-text-secondary">
              {Array.from({ length: 25 }).map((_, i) => (
                <p key={i}>
                  Paragraph {i + 1}. Lorem ipsum dolor sit amet, consectetur
                  adipiscing elit. Aenean commodo ligula eget dolor — content here
                  is intentionally long so you can verify that the body scrolls
                  independently and dragging the handle still dismisses.
                </p>
              ))}
            </div>
          </MobileBottomSheet>

          <MobileBottomSheet
            open={stickySheetOpen}
            onClose={() => setStickySheetOpen(false)}
            title="Confirm action"
            dismissible={false}
            hideHandle
          >
            <div className="px-5 py-5 flex flex-col gap-4">
              <p className="text-[15px]">
                This sheet ignores backdrop taps, Escape, and drag. You must use
                the explicit action below to dismiss.
              </p>
              <button
                onClick={() => setStickySheetOpen(false)}
                className="px-4 py-3 rounded-xl bg-accent text-white text-[15px] font-medium active:opacity-80"
              >
                Done
              </button>
            </div>
          </MobileBottomSheet>
        </PhoneFrame>
      </Group>

      {/* MobileAppIcon */}
      <Group title="MobileAppIcon — Home-screen squircles">
        <PhoneFrame theme={theme}>
          <div className="p-6 pt-10">
            <div className="grid grid-cols-4 gap-x-3 gap-y-5">
              <MobileAppIcon
                icon={<Mail size={28} strokeWidth={2.2} />}
                label="Mail"
                background="linear-gradient(180deg,#5ec1ff 0%,#1c84ff 100%)"
                badge={12}
                onClick={() => {}}
              />
              <MobileAppIcon
                icon={<MessageSquare size={28} strokeWidth={2.2} />}
                label="Messages"
                background="linear-gradient(180deg,#5ce374 0%,#11a838 100%)"
                badge={3}
                onClick={() => {}}
              />
              <MobileAppIcon
                icon={<Camera size={26} strokeWidth={2.2} />}
                label="Camera"
                background="#3a3a3c"
                onClick={() => {}}
              />
              <MobileAppIcon
                icon={<Music size={28} strokeWidth={2.2} />}
                label="Music"
                background="linear-gradient(180deg,#ff5a8a 0%,#fa233b 100%)"
                badge={true}
                onClick={() => {}}
              />
              <MobileAppIcon
                icon={<Map size={28} strokeWidth={2.2} />}
                label="Maps"
                background="linear-gradient(180deg,#79e26f 0%,#37b34a 100%)"
                onClick={() => {}}
              />
              <MobileAppIcon
                icon={<SettingsIcon size={28} strokeWidth={2.2} />}
                label="Settings"
                background="linear-gradient(180deg,#bdbdbd 0%,#6e6e6e 100%)"
                onClick={() => {}}
              />
              <MobileAppIcon
                icon={<Bell size={28} strokeWidth={2.2} />}
                label="Notifications"
                background="linear-gradient(180deg,#ff9f5a 0%,#ff5a1f 100%)"
                badge={123}
                onClick={() => {}}
              />
              <MobileAppIcon
                icon={<Github size={28} strokeWidth={2.2} />}
                label="GitHub"
                background="#0a0a0a"
                onClick={() => {}}
              />
            </div>
          </div>
        </PhoneFrame>
        <p className="text-[12px] text-text-secondary mt-1 leading-relaxed px-1">
          Badge variants: number (12, 3), capped (123 → "99+"), boolean dot
          (Music), none.
        </p>
      </Group>

      {/* MobileActionRow */}
      <Group title="MobileActionRow — primary CTAs (Ping Me pattern)">
        <PhoneFrame theme={theme}>
          <div className="px-4 py-6 flex flex-col gap-3">
            <h1 className="text-[28px] font-bold text-text px-1">Ping Me</h1>
            <p className="text-[15px] text-text-secondary px-1 mb-2">
              Reach out — I usually reply within a day.
            </p>
            <MobileActionRow
              icon={<Mail size={22} strokeWidth={2.4} />}
              iconBackground="linear-gradient(135deg,#5ec1ff,#1c84ff)"
              title="Send Email"
              subtitle="devanshu@example.com"
              href="mailto:devanshu@example.com"
            />
            <MobileActionRow
              icon={<Linkedin size={22} strokeWidth={2.4} />}
              iconBackground="#0a66c2"
              title="Open on LinkedIn"
              subtitle="Connect or message me there"
              href="https://linkedin.com/in/devanshu"
            />
            <MobileActionRow
              icon={<Github size={22} strokeWidth={2.4} />}
              iconBackground="#0a0a0a"
              title="GitHub"
              subtitle="See what I'm building"
              href="https://github.com/devanshu"
            />
            <MobileActionRow
              icon={<MessageSquare size={22} strokeWidth={2.4} />}
              iconBackground="linear-gradient(135deg,#5ce374,#11a838)"
              title="Open in-app chat"
              subtitle="If you'd rather talk here"
              onClick={() => alert('Would open chat')}
            />
          </div>
        </PhoneFrame>
      </Group>

      {/* Composed app: GitHub Activity */}
      <Group title="STEP 2 — GitHub Activity (live data, recruiter's first stop)">
        <PhoneFrame theme={theme}>
          <div className="h-[640px]">
            <GitHubActivityApp variant="mobile" />
          </div>
        </PhoneFrame>
        <p className="text-[12px] text-text-secondary mt-1 leading-relaxed px-1">
          Pulls from /api/github/activity (10-min cache). Contribution heatmap
          via the jogruber.de community scraper; events + repos via the GitHub
          REST API. Degrades gracefully — the calendar section hides itself if
          the scraper is unreachable.
        </p>
      </Group>

      {/* Composed app: Settings */}
      <Group title="STEP 2 — Settings app (composed from primitives)">
        <PhoneFrame theme={theme}>
          <div className="h-[640px]">
            <MobileSettings />
          </div>
        </PhoneFrame>
        <p className="text-[12px] text-text-secondary mt-1 leading-relaxed px-1">
          Real toggles: Display & Brightness changes the global theme;
          Wallpaper switches the active wallpaper; Sounds & Haptics flips the
          UI sound effects flag. Wi-Fi / Bluetooth / Notifications / etc. are
          decorative.
        </p>
      </Group>

      {/* MobilePushView */}
      <Group title="MobilePushView — drill-down navigation (3 levels)">
        <PhoneFrame theme={theme}>
          <div className="h-[560px]">
            <MobilePushView rootView={SETTINGS_ROOT} />
          </div>
        </PhoneFrame>
        <p className="text-[12px] text-text-secondary mt-1 leading-relaxed px-1">
          Try: tap rows to push · tap NavBar back button · drag from the left
          edge (~24px) to the right and release past 100px to swipe-back-pop.
        </p>
      </Group>
    </div>
  );
}

/* ─── push-view demo data ─────────────────────────────────────────── */

/**
 * A multi-level demo that exercises every code path:
 *   Root (Settings) → Wi-Fi → Choose Network → (network detail)
 * Each level pushes the next via useMobileNavigation().
 */

function SettingsRootBody() {
  const nav = useMobileNavigation();
  return (
    <div className="py-4 flex flex-col gap-6">
      <MobileSection inset>
        <MobileListRow
          icon={<IconTile color="#007AFF" icon={<Wifi size={16} strokeWidth={2.4} />} />}
          title="Wi-Fi"
          value="devanshu-iPhone"
          onClick={() => nav.push(WIFI_VIEW)}
        />
        <MobileListRow
          icon={<IconTile color="#5856D6" icon={<Bluetooth size={16} strokeWidth={2.4} />} />}
          title="Bluetooth"
          value="On"
          onClick={() => nav.push(BLUETOOTH_VIEW)}
        />
        <MobileListRow
          icon={<IconTile color="#FF9500" icon={<Bell size={16} strokeWidth={2.4} />} />}
          title="Notifications"
          onClick={() => nav.push(NOTIFICATIONS_VIEW)}
        />
      </MobileSection>
      <p className="px-5 text-[12px] text-text-secondary">
        Stack depth: <DepthBadge />
      </p>
    </div>
  );
}

function DepthBadge() {
  const nav = useMobileNavigation();
  return <span className="font-mono text-text">{nav.depth}</span>;
}

function WiFiBody() {
  const nav = useMobileNavigation();
  return (
    <div className="py-4 flex flex-col gap-6">
      <MobileSection inset header="My Networks">
        <MobileListRow
          title="devanshu-iPhone"
          accessory="check"
          onClick={() => {}}
        />
      </MobileSection>
      <MobileSection inset header="Other Networks">
        {['Devanshu-5G', 'Devanshu-Guest', 'Starbucks WiFi', 'Library Public'].map(
          (ssid) => (
            <MobileListRow
              key={ssid}
              title={ssid}
              icon={<IconTile color="#007AFF" icon={<Wifi size={16} strokeWidth={2.4} />} />}
              onClick={() => nav.push(networkDetailView(ssid))}
            />
          )
        )}
      </MobileSection>
    </div>
  );
}

function BluetoothBody() {
  return (
    <div className="py-4">
      <MobileSection inset header="My Devices">
        <MobileListRow title="AirPods Pro" value="Connected" />
        <MobileListRow title="MacBook Pro" value="Not Connected" />
      </MobileSection>
    </div>
  );
}

function NotificationsBody() {
  return (
    <div className="py-4">
      <MobileSection inset>
        <MobileListRow title="Allow Notifications" accessory="switch" switchOn />
        <MobileListRow title="Show Previews" value="Always" onClick={() => {}} />
      </MobileSection>
    </div>
  );
}

function NetworkDetailBody({ ssid }: { ssid: string }) {
  const nav = useMobileNavigation();
  return (
    <div className="py-4 flex flex-col gap-6">
      <MobileSection inset>
        <MobileListRow title="Forget This Network" destructive onClick={() => nav.pop()} />
        <MobileListRow title="Auto-Join" accessory="switch" switchOn />
      </MobileSection>
      <MobileSection
        inset
        header="Network Info"
        footer={`Drill-down demo — three pushes deep. Swipe back from the left edge to pop one level at a time, or tap the back button.`}
      >
        <MobileListRow title="SSID" value={ssid} />
        <MobileListRow title="IP Address" value="192.168.1.42" />
        <MobileListRow title="Router" value="192.168.1.1" />
        <MobileListRow title="DNS" value="1.1.1.1" />
      </MobileSection>
      <div className="px-5">
        <button
          onClick={() => nav.popToRoot()}
          className="text-accent text-[15px]"
        >
          ← Pop to root (skip all levels)
        </button>
      </div>
    </div>
  );
}

const SETTINGS_ROOT: PushViewEntry = {
  id: 'settings-root',
  title: 'Settings',
  element: <SettingsRootBody />,
};

const WIFI_VIEW: PushViewEntry = {
  id: 'wifi',
  title: 'Wi-Fi',
  element: <WiFiBody />,
};

const BLUETOOTH_VIEW: PushViewEntry = {
  id: 'bluetooth',
  title: 'Bluetooth',
  element: <BluetoothBody />,
};

const NOTIFICATIONS_VIEW: PushViewEntry = {
  id: 'notifications',
  title: 'Notifications',
  element: <NotificationsBody />,
};

function networkDetailView(ssid: string): PushViewEntry {
  return {
    id: `net-${ssid}`,
    title: ssid,
    element: <NetworkDetailBody ssid={ssid} />,
  };
}

/* ─── helpers ─────────────────────────────────────────────────────── */

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="w-full max-w-md flex flex-col gap-3">
      <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-500">{title}</h2>
      {children}
    </section>
  );
}

function PhoneFrame({ theme, children }: { theme: 'light' | 'dark'; children: React.ReactNode }) {
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="rounded-[36px] border-[10px] border-neutral-900 dark:border-neutral-700 overflow-hidden shadow-xl bg-bg text-text">
        {children}
      </div>
    </div>
  );
}

function Divider({ inset = false }: { inset?: boolean }) {
  return <div className={`h-px bg-black/8 dark:bg-white/8 ${inset ? 'ml-[56px]' : ''}`} />;
}

function NavIconButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="touch-target flex items-center justify-center text-accent active:opacity-50 transition-opacity"
    >
      {icon}
    </button>
  );
}

