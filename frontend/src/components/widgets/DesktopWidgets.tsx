'use client';

/**
 * DesktopWidgets: the owner card, top-right of the desktop.
 *
 * Says whose desktop this is and gives the two things a recruiter came for,
 * the resume and a way to get in touch. Every line comes from the data files
 * (data/aboutMe.ts, data/projectMeta.ts, data/portfolio.json): nothing here
 * is written twice.
 *
 * Positioning: the menu bar is 28px, notification toasts start at 36px and
 * end near 126px, so the card starts below them. It lives under windows (macOS
 * layering) and fades out while a window overlaps it, so it never shows as a
 * half-clipped sliver beside a window.
 */

import { useEffect, useRef, useState } from 'react';
import { FileText, Mail, MessageSquare } from 'lucide-react';
import { useOSStore } from '@/store/osStore';
import { useLaunchpadStore } from '@/store/launchpadStore';
import { identity, mastheadSpecLine, contactLinks } from '@/data/aboutMe';
import { projectMeta } from '@/data/projectMeta';
import { MENUBAR_H, DOCK_H } from '@/lib/windowSnap';

const NOW_BUILDING = Object.values(projectMeta).find(p => p.displayName === 'OpenCodeIntel');

type Box = { left: number; top: number; right: number; bottom: number };

export function DesktopWidgets() {
  const windows = useOSStore(s => s.windows);
  const openWindow = useOSStore(s => s.openWindow);
  const launchpadOpen = useLaunchpadStore(s => s.isOpen);
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    const measure = () => {
      const r = ref.current?.getBoundingClientRect();
      if (r) setBox({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const covered = !!box && windows.some(w => {
    if (!w.isOpen || w.isMinimized) return false;
    const b = w.isMaximized
      ? { x: 0, y: MENUBAR_H, width: window.innerWidth, height: window.innerHeight - MENUBAR_H - DOCK_H }
      : { ...w.position, ...w.size };
    return b.x < box.right && b.x + b.width > box.left && b.y < box.bottom && b.y + b.height > box.top;
  });

  const btn =
    'inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[12px] font-medium ' +
    'text-text hover:bg-text/[0.08] transition-colors';

  return (
    <aside
      ref={ref}
      aria-label={`About ${identity.name}`}
      aria-hidden={covered || undefined}
      className={`absolute right-5 top-[140px] z-[1] w-[272px] select-none transition-opacity duration-200 ${
        covered ? 'pointer-events-none opacity-0' : 'opacity-100'
      } ${launchpadOpen ? 'invisible' : ''}`}
    >
      <div className="rounded-2xl border border-border/70 bg-surface/75 px-5 py-4 shadow-lg backdrop-blur-xl">
        <p className="font-serif text-[22px] leading-tight text-text">{identity.name}</p>
        <p className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-text-secondary">
          {mastheadSpecLine.map(part => <span key={part}>{part}</span>)}
        </p>

        <p className="mt-3 flex items-center gap-2 text-[13px] text-text">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 bg-text" />
          {identity.availabilityShort}
        </p>

        {NOW_BUILDING && (
          <p className="mt-2 text-[13px] leading-snug text-text-secondary">
            <span className="text-text">Now building {NOW_BUILDING.displayName}:</span>{' '}
            {NOW_BUILDING.tagline.charAt(0).toLowerCase() + NOW_BUILDING.tagline.slice(1)}.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" tabIndex={covered ? -1 : 0} onClick={() => openWindow('resume')} className={btn}>
            <FileText size={13} aria-hidden /> Resume
          </button>
          <button type="button" tabIndex={covered ? -1 : 0} onClick={() => openWindow('contact')} className={btn}>
            <MessageSquare size={13} aria-hidden /> Contact
          </button>
          <a href={`mailto:${contactLinks.email}`} tabIndex={covered ? -1 : 0} className={btn}>
            <Mail size={13} aria-hidden /> Email
          </a>
        </div>
      </div>
    </aside>
  );
}
