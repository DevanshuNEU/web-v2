'use client';

/**
 * IdentityWidget: an iOS-style widget at the top of home page 1.
 *
 * Home used to show six secondary icons and empty wallpaper, with nothing
 * saying whose phone this is. The widget names the person, the role and the
 * availability, and offers the two things a recruiter came for in one tap:
 * the resume and an email.
 */

import { FileText, Mail } from 'lucide-react';
import { identity, contactLinks } from '@/data/aboutMe';
import { useIsMono } from '@/hooks/usePalette';
import { useHaptics } from '@/hooks/useHaptics';
import type { AppType } from '../../../../shared/types';

export default function IdentityWidget({ onOpen }: { onOpen: (appType: AppType) => void }) {
  const mono = useIsMono();
  const haptics = useHaptics();

  return (
    <section
      aria-label={`${identity.name}, ${identity.availabilityShort}`}
      className={`rounded-[22px] p-4 text-text ${
        mono
          ? 'border border-border bg-surface/80 backdrop-blur'
          : 'glass-medium border border-white/20 shadow-lg'
      }`}
    >
      <p className="font-display text-[24px] leading-tight">{identity.name}</p>
      <p className="mt-0.5 text-[14px] leading-snug text-text-secondary">
        Software and AI engineer in {identity.location}
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-text">
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${mono ? 'bg-text' : 'bg-accent'}`} />
        {identity.availabilityShort}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            haptics('light');
            onOpen('resume');
          }}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-text text-bg text-[15px] font-medium active:opacity-80 transition-opacity"
        >
          <FileText size={16} strokeWidth={2} aria-hidden />
          Resume
        </button>
        <a
          href={`mailto:${contactLinks.email}`}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border text-[15px] font-medium text-text active:opacity-60 transition-opacity"
        >
          <Mail size={16} strokeWidth={2} aria-hidden />
          Email
        </a>
      </div>
    </section>
  );
}
