'use client';

/**
 * Wi-Fi and battery tray menus for the desktop MenuBar.
 *
 * Both look like the system menus they parody: a small panel under the icon,
 * hairline rows, mono labels. Esc or a click outside closes them. Copy and
 * edge cases live in lib/easterEggs.ts.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Wifi, Lock, BatteryMedium, Check } from 'lucide-react';
import { useOSStore } from '@/store/osStore';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useTerminalStore } from '@/store/terminalStore';
import {
  WIFI_NETWORKS,
  WIFI_WRONG_PASSWORD,
  BATTERY_MINE,
  formatPing,
  measurePing,
  readVisitorBattery,
  visitorBatteryLine,
  isLowBattery,
  type VisitorBattery,
} from '@/lib/easterEggs';

interface TrayProps {
  isDark: boolean;
}

function useTray(egg: string) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trackEvent = useAnalyticsStore(s => s.trackEvent);

  const toggle = useCallback(() => {
    setOpen(prev => {
      if (!prev) trackEvent('interaction', `Easter egg: ${egg}`, { egg });
      return !prev;
    });
  }, [egg, trackEvent]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return { open, setOpen, toggle, ref };
}

function Panel({ open, isDark, label, children }: { open: boolean; isDark: boolean; label: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label={label}
          initial={reduced ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          className="absolute right-0 top-7 w-72 rounded-lg py-1.5 text-[12px] shadow-2xl"
          style={{
            background: isDark ? 'rgba(28, 28, 28, 0.985)' : 'rgba(250, 250, 250, 0.985)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.10)',
            color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.82)',
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pt-1 pb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] opacity-55">
      {children}
    </p>
  );
}

function Hairline({ isDark }: { isDark: boolean }) {
  return <div className="my-1.5 h-px mx-3" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />;
}

function TrayButton({ isDark, label, onClick, expanded, children }: { isDark: boolean; label: string; onClick: () => void; expanded: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      title={label}
      className="flex items-center justify-center w-7 h-6 rounded-md cursor-pointer
                 hover:bg-white/10 dark:hover:bg-white/8 transition-colors duration-100"
      style={{
        color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)',
        background: expanded ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)') : undefined,
      }}
    >
      {children}
    </button>
  );
}

export function WifiTray({ isDark }: TrayProps) {
  const { open, setOpen, toggle, ref } = useTray('wifi');
  const [ping, setPing] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const openWindow = useOSStore(s => s.openWindow);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setHint(null);
    setPing(null);
    measurePing().then(ms => { if (!cancelled) setPing(ms); });
    return () => { cancelled = true; };
  }, [open]);

  const join = (ssid: string) => {
    const network = WIFI_NETWORKS.find(n => n.ssid === ssid);
    if (!network || network.connected) return;
    if (network.secured) {
      setHint(WIFI_WRONG_PASSWORD);
      return;
    }
    if (network.hire) {
      useTerminalStore.getState().setPendingCommand('hire devanshu');
      openWindow('terminal');
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <TrayButton isDark={isDark} label="Wi-Fi" onClick={toggle} expanded={open}>
        <Wifi size={13} strokeWidth={2} />
      </TrayButton>
      <Panel open={open} isDark={isDark} label="Wi-Fi networks">
        <Heading>Wi-Fi</Heading>
        <ul>
          {WIFI_NETWORKS.map(n => (
            <li key={n.ssid}>
              <button
                type="button"
                onClick={() => join(n.ssid)}
                disabled={n.connected}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left rounded-md
                           hover:bg-black/[0.05] dark:hover:bg-white/[0.07] disabled:cursor-default disabled:hover:bg-transparent"
              >
                <Wifi size={12} strokeWidth={2} className={n.connected ? '' : 'opacity-50'} />
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-medium">{n.ssid}</span>
                  {n.connected && (
                    <span className="block font-mono text-[10px] opacity-55">{formatPing(ping)}</span>
                  )}
                </span>
                {n.connected && <Check size={12} strokeWidth={2.2} aria-label="Connected" />}
                {n.secured && <Lock size={11} strokeWidth={2} className="opacity-50" aria-label="Secured" />}
              </button>
            </li>
          ))}
        </ul>
        {hint && (
          <>
            <Hairline isDark={isDark} />
            <p role="status" className="px-3 py-1 opacity-75">{hint}</p>
          </>
        )}
      </Panel>
    </div>
  );
}

export function BatteryTray({ isDark }: TrayProps) {
  const { open, setOpen, toggle, ref } = useTray('battery');
  const [visitor, setVisitor] = useState<VisitorBattery | null>(null);
  const openWindow = useOSStore(s => s.openWindow);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    readVisitorBattery().then(b => { if (!cancelled) setVisitor(b); });
    return () => { cancelled = true; };
  }, [open]);

  const theirs = visitorBatteryLine(visitor);
  const rows: Array<[string, string]> = [
    ['Power source', BATTERY_MINE.source],
    ['Time remaining', BATTERY_MINE.remaining],
  ];

  return (
    <div ref={ref} className="relative">
      <TrayButton isDark={isDark} label="Battery" onClick={toggle} expanded={open}>
        <BatteryMedium size={14} strokeWidth={1.8} />
      </TrayButton>
      <Panel open={open} isDark={isDark} label="Battery">
        <div className="flex items-baseline justify-between px-3 pb-1">
          <Heading>Battery</Heading>
          <span className="font-mono text-[12px] font-medium">{BATTERY_MINE.level}</span>
        </div>
        <dl className="px-3">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-0.5">
              <dt className="opacity-55">{k}</dt>
              <dd className="font-medium text-right">{v}</dd>
            </div>
          ))}
        </dl>
        {theirs && (
          <>
            <Hairline isDark={isDark} />
            <p role="status" className="px-3 py-0.5 opacity-80">{theirs}</p>
            {isLowBattery(visitor) && (
              <button
                type="button"
                onClick={() => { openWindow('resume'); setOpen(false); }}
                className="mx-3 mt-1.5 mb-0.5 font-mono text-[10px] uppercase tracking-[0.14em] underline underline-offset-4 opacity-80 hover:opacity-100"
              >
                Open the resume
              </button>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
